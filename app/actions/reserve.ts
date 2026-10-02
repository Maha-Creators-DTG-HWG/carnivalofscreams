"use server";

import { headers } from "next/headers";

import { insertAuditLogSafe, requestMeta } from "@/lib/audit";
import { publicMessage } from "@/lib/errors";
import { sendReservationInvoice } from "@/lib/invoice";
import {
  createSnapTransaction,
  isMidtransConfigured,
  newOrderId,
  PAYMENT_DUE_MINUTES,
} from "@/lib/midtrans";
import {
  claimReservationSeat,
  expireReservationHoldSafe,
  getReservationSafe,
  insertReservation,
  isUniqueViolation,
  listTakenSeatIdsSafe,
  releaseExpiredHoldsSafe,
  updateReservationCheckout,
} from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import { getSiteUrl } from "@/lib/site";
import {
  asPackageId,
  getNight,
  getTablePackage,
  type NightId,
} from "@/lib/tables";

export type CreateReservationResult =
  | { ok: true; snapToken: string; redirectUrl: string; orderId: string }
  | { ok: false; error: string };

export type SelectSeatResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{9,16}$/;
const NIK_RE = /^\d{16}$/;
const ORDER_ID_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;

async function requestOrigin() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return getSiteUrl();
}

function asNightId(value: unknown): NightId | undefined {
  if (value === "oct-30" || value === "oct-31") return value;
  return undefined;
}

export async function listTakenSeatIdsAction(
  nightId: unknown,
): Promise<string[]> {
  const id = asNightId(nightId);
  if (!id) return [];
  return listTakenSeatIdsSafe(id);
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

  const input = raw as Record<string, unknown>;
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
  const expiresAt = new Date(
    Date.now() + PAYMENT_DUE_MINUTES * 60 * 1000,
  );

  await releaseExpiredHoldsSafe();

  try {
    await insertReservation({
      orderId,
      ...reservation,
      partySize: table.seats,
      amountIdr: table.priceIdr,
      expiresAt,
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
        expiresAt,
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
  const input = raw as Record<string, unknown>;
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
