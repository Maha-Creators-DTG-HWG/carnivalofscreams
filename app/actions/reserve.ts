"use server";

import { insertAuditLogSafe, requestMeta, requestOrigin } from "@/lib/audit";
import { publicMessage } from "@/lib/errors";
import { sendReservationInvoice } from "@/lib/invoice";
import {
  createSnapTransaction,
  holdWindow,
  isMidtransConfigured,
  newOrderId,
} from "@/lib/midtrans";
import {
  claimReservationSeat,
  expireReservationHoldSafe,
  getReservationSafe,
  insertReservation,
  isUniqueViolation,
  listTakenSeatIds,
  releaseExpiredHoldsSafe,
  updateReservationCheckout,
} from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import {
  asPackageId,
  getNight,
  getTablePackage,
  type NightId,
  isWhatsAppOnly,
} from "@/lib/tables";

/** dueAt and releasesAt are epoch ms: see holdWindow for what each one means. */
export type CreateReservationResult =
  | {
      ok: true;
      snapToken: string;
      redirectUrl: string;
      orderId: string;
      dueAt: number;
      releasesAt: number;
    }
  | { ok: false; error: string };

export type SelectSeatResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{9,16}$/;
const NIK_RE = /^\d{16}$/;
const ORDER_ID_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;

function asNightId(value: unknown): NightId | undefined {
  if (value === "oct-30" || value === "oct-31") return value;
  return undefined;
}

// Server actions take whatever the client posts, so check it is an object
// before reading fields off it.
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/** null means availability could not be read; the page must not show tables as free. */
export async function listTakenSeatIdsAction(
  nightId: unknown,
): Promise<string[] | null> {
  const id = asNightId(nightId);
  if (!id) return null;
  try {
    return await listTakenSeatIds(id);
  } catch (error) {
    console.error("[reserve] failed to load taken seats", error);
    return null;
  }
}

export async function createReservation(
  raw: unknown,
): Promise<CreateReservationResult> {
  const meta = await requestMeta();

  await insertAuditLogSafe({
    event: "reservation.create.request",
    method: "POST",
    path: "/reserve",
    ip: meta.ip,
    userAgent: meta.userAgent,
    payload: raw ?? {},
  });

  const respond = async (
    result: CreateReservationResult,
    orderId?: string,
  ) => {
    await insertAuditLogSafe({
      event: result.ok
        ? "reservation.create.response"
        : "reservation.create.error",
      orderId,
      method: "POST",
      path: "/reserve",
      ip: meta.ip,
      userAgent: meta.userAgent,
      payload: result,
    });
    return result;
  };

  if (!isMidtransConfigured()) {
    return respond({ ok: false, error: "Payment is not configured yet." });
  }

  const input = asRecord(raw);
  if (!input) {
    return respond({ ok: false, error: "Please fill in the reservation form." });
  }
  const name = String(input.name ?? "").trim();
  const nik = String(input.nik ?? "").replace(/\D/g, "");
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").replace(/[\s()-]/g, "");
  const nightId = asNightId(input.nightId);
  const packageId = asPackageId(input.packageId);
  const seatId = String(input.seatId ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    return respond({ ok: false, error: "Please enter your full name." });
  }
  if (!NIK_RE.test(nik)) {
    return respond({ ok: false, error: "Please enter a 16-digit NIK." });
  }
  if (!EMAIL_RE.test(email)) {
    return respond({ ok: false, error: "Please enter a valid email." });
  }
  if (!PHONE_RE.test(phone)) {
    return respond({ ok: false, error: "Please enter a valid phone number." });
  }
  if (!nightId || !getNight(nightId)) {
    return respond({ ok: false, error: "Please choose a night." });
  }
  if (!packageId) {
    return respond({ ok: false, error: "Please choose an area." });
  }

  const table = getTablePackage(packageId);
  if (!table) {
    return respond({ ok: false, error: "Please choose an area." });
  }
  if (isWhatsAppOnly(table.id)) {
    return respond({
      ok: false,
      error: `${table.name} tables are reserved through our team on WhatsApp.`,
    });
  }

  const seat = getSeat(seatId);
  if (!seat || seat.packageId !== packageId) {
    return respond({ ok: false, error: "Please pick a table in that area." });
  }

  const orderId = newOrderId(packageId, nightId);
  const origin = await requestOrigin();
  const reservation = {
    name,
    nik,
    email,
    phone,
    nightId,
    packageId,
    seatId,
  };
  // Snap expires at dueAt; the seat stays ours until releasesAt, so a payment
  // that settles late still finds it held.
  const { dueAt, releasesAt } = holdWindow();

  await releaseExpiredHoldsSafe();

  try {
    await insertReservation({
      orderId,
      ...reservation,
      partySize: table.seats,
      amountIdr: table.priceIdr,
      expiresAt: releasesAt,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return respond(
        { ok: false, error: "That table was just taken. Pick another." },
        orderId,
      );
    }
    console.error("[reserve] failed to hold table", error);
    return respond(
      { ok: false, error: publicMessage(error, "Could not hold that table.") },
      orderId,
    );
  }

  try {
    const snap = await createSnapTransaction(orderId, reservation, {
      finishUrl: `${origin}/reserve/confirmed`,
      notificationUrl: `${origin}/api/midtrans/notification`,
    });

    try {
      await updateReservationCheckout(orderId, {
        paymentUrl: snap.redirectUrl,
        paymentToken: snap.token,
        expiresAt: releasesAt,
      });
    } catch (error) {
      console.error("[reservations] failed to store checkout", error);
    }

    return respond(
      {
        ok: true,
        snapToken: snap.token,
        redirectUrl: snap.redirectUrl,
        orderId,
        dueAt: dueAt.getTime(),
        releasesAt: releasesAt.getTime(),
      },
      orderId,
    );
  } catch (error) {
    await expireReservationHoldSafe(orderId);
    console.error("[reserve] failed to start payment", error);
    return respond(
      { ok: false, error: publicMessage(error, "Could not start payment.") },
      orderId,
    );
  }
}

export async function selectReservationSeat(
  raw: unknown,
): Promise<SelectSeatResult> {
  const meta = await requestMeta();
  const input = asRecord(raw);
  if (!input) return { ok: false, error: "Please pick a table." };
  const orderId = String(input.orderId ?? "").trim();
  const seatId = String(input.seatId ?? "").trim();

  await insertAuditLogSafe({
    event: "reservation.seat.request",
    orderId,
    method: "POST",
    path: "/reserve/confirmed",
    ip: meta.ip,
    userAgent: meta.userAgent,
    payload: { seatId },
  });

  if (!ORDER_ID_RE.test(orderId) || !getSeat(seatId)) {
    return { ok: false, error: "Please pick a table." };
  }

  try {
    const claimed = await claimReservationSeat(orderId, seatId);
    if (!claimed) {
      return { ok: false, error: "That table was just taken. Pick another." };
    }
    await sendReservationInvoice(claimed, "/reserve/confirmed");
    await insertAuditLogSafe({
      event: "reservation.seat.response",
      orderId,
      method: "POST",
      path: "/reserve/confirmed",
      ip: meta.ip,
      userAgent: meta.userAgent,
      payload: { ok: true, seatId },
    });
    return { ok: true };
  } catch (error) {
    console.error("[reserve] failed to claim seat", error);
    const detail = error instanceof Error ? error.message : String(error);
    const latest = await getReservationSafe(orderId);
    await insertAuditLogSafe({
      event: "reservation.seat.error",
      orderId,
      method: "POST",
      path: "/reserve/confirmed",
      ip: meta.ip,
      userAgent: meta.userAgent,
      payload: { error: detail, seatId },
    });
    if (latest?.seatId === seatId) return { ok: true };
    return {
      ok: false,
      error: publicMessage(error, "Could not hold that table."),
    };
  }
}
