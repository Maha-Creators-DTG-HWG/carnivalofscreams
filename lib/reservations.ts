import { insertAuditLogSafe } from "./audit";
import { getDb } from "./db";
import { PublicError } from "./errors";
import { getSeat } from "./seats";
import { asPackageId, getTablePackage, type NightId, type TablePackageId } from "./tables";

export type ReservationRecord = {
  orderId: string;
  name: string;
  nik: string | null;
  email: string;
  phone: string;
  nightId: NightId;
  packageId: TablePackageId;
  partySize: number;
  notes: string | null;
  amountIdr: number;
  status: string;
  paymentUrl: string | null;
  paymentToken: string | null;
  channelId: string | null;
  transactionStatus: string | null;
  paidAt: Date | null;
  seatId: string | null;
  expiresAt: Date | null;
  whatsappMessageId: string | null;
  whatsappSentAt: Date | null;
  invoiceEmailSentAt: Date | null;
  createdAt: Date | null;
};

type ReservationRow = {
  order_id: string;
  name: string;
  nik: string | null;
  email: string;
  phone: string;
  night_id: string;
  package_id: string;
  party_size: number;
  notes: string | null;
  amount_idr: number;
  status: string;
  payment_url: string | null;
  payment_token: string | null;
  channel_id: string | null;
  transaction_status: string | null;
  paid_at: string | null;
  seat_id: string | null;
  expires_at: string | null;
  whatsapp_message_id: string | null;
  whatsapp_sent_at: string | null;
  invoice_email_sent_at: string | null;
  created_at: string | null;
};

function asNightId(value: string): NightId | undefined {
  if (value === "oct-30" || value === "oct-31") return value;
  return undefined;
}


function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

const RESERVATION_COLUMNS =
  "order_id, name, nik, email, phone, night_id, package_id, party_size, notes, amount_idr, status, payment_url, payment_token, channel_id, transaction_status, paid_at, seat_id, expires_at, whatsapp_message_id, whatsapp_sent_at, invoice_email_sent_at, created_at";

function nowIso() {
  return new Date().toISOString();
}

function mapReservation(row: ReservationRow): ReservationRecord | null {
  const nightId = asNightId(row.night_id);
  const packageId = asPackageId(row.package_id);
  if (!nightId || !packageId) return null;

  return {
    orderId: row.order_id,
    name: row.name,
    nik: row.nik,
    email: row.email,
    phone: row.phone,
    nightId,
    packageId,
    partySize: row.party_size,
    notes: row.notes,
    amountIdr: row.amount_idr,
    status: row.status,
    paymentUrl: row.payment_url,
    paymentToken: row.payment_token,
    channelId: row.channel_id,
    transactionStatus: row.transaction_status,
    paidAt: toDate(row.paid_at),
    seatId: row.seat_id,
    expiresAt: toDate(row.expires_at),
    whatsappMessageId: row.whatsapp_message_id,
    whatsappSentAt: toDate(row.whatsapp_sent_at),
    invoiceEmailSentAt: toDate(row.invoice_email_sent_at),
    createdAt: toDate(row.created_at),
  };
}

export function isUniqueViolation(error: unknown) {
  const codes: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i += 1) {
    if ("code" in current && current.code != null) {
      codes.push(String(current.code));
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return codes.includes("23505");
}

export async function insertReservation(entry: {
  orderId: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  nightId: NightId;
  packageId: TablePackageId;
  partySize: number;
  notes?: string;
  amountIdr: number;
  paymentUrl?: string | null;
  paymentToken?: string | null;
  seatId?: string | null;
  expiresAt?: Date | null;
}) {
  const { error } = await getDb()
    .from("reservations")
    .insert({
      order_id: entry.orderId,
      name: entry.name,
      nik: entry.nik,
      email: entry.email,
      phone: entry.phone,
      night_id: entry.nightId,
      package_id: entry.packageId,
      party_size: entry.partySize,
      notes: entry.notes ?? null,
      amount_idr: entry.amountIdr,
      payment_url: entry.paymentUrl ?? null,
      payment_token: entry.paymentToken ?? null,
      seat_id: entry.seatId ?? null,
      expires_at: entry.expiresAt?.toISOString() ?? null,
      status: "pending",
    });
  if (error) throw error;
}

export async function insertReservationSafe(
  entry: Parameters<typeof insertReservation>[0],
) {
  try {
    await insertReservation(entry);
  } catch (error) {
    console.error("[reservations] failed to insert reservation", error);
  }
}

export async function updateReservationCheckout(
  orderId: string,
  entry: {
    paymentUrl: string;
    paymentToken: string;
    expiresAt?: Date | null;
  },
) {
  const { error } = await getDb()
    .from("reservations")
    .update({
      payment_url: entry.paymentUrl,
      payment_token: entry.paymentToken,
      ...(entry.expiresAt ? { expires_at: entry.expiresAt.toISOString() } : {}),
    })
    .eq("order_id", orderId);
  if (error) throw error;
}

export async function getReservation(orderId: string) {
  const { data, error } = await getDb()
    .from("reservations")
    .select(RESERVATION_COLUMNS)
    .eq("order_id", orderId)
    .maybeSingle<ReservationRow>();
  if (error) throw error;
  return data ? mapReservation(data) : null;
}

export async function getReservationSafe(orderId: string) {
  try {
    return await getReservation(orderId);
  } catch (error) {
    console.error("[reservations] failed to load reservation", error);
    return null;
  }
}

export async function listReservations() {
  await releaseExpiredHolds();
  const { data, error } = await getDb()
    .from("reservations")
    .select(RESERVATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<ReservationRow[]>();
  if (error) throw error;
  return data
    .map(mapReservation)
    .filter((row): row is ReservationRecord => row !== null);
}

export async function releaseExpiredHolds() {
  const { error } = await getDb()
    .from("reservations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .not("expires_at", "is", null)
    .lte("expires_at", nowIso());
  if (error) throw error;
}

export async function releaseExpiredHoldsSafe() {
  try {
    await releaseExpiredHolds();
  } catch (error) {
    console.error("[reservations] failed to release expired holds", error);
  }
}

export async function expireReservationHold(
  orderId: string,
  transactionStatus?: string | null,
) {
  const { error } = await getDb()
    .from("reservations")
    .update(
      transactionStatus
        ? { status: "expired", transaction_status: transactionStatus }
        : { status: "expired" },
    )
    .eq("order_id", orderId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function expireReservationHoldSafe(
  orderId: string,
  transactionStatus?: string | null,
) {
  try {
    await expireReservationHold(orderId, transactionStatus);
  } catch (error) {
    console.error("[reservations] failed to expire reservation hold", error);
  }
}

export async function listTakenSeatIds(nightId: NightId) {
  await releaseExpiredHolds();
  const { data, error } = await getDb()
    .from("reservations")
    .select("seat_id")
    .eq("night_id", nightId)
    .not("seat_id", "is", null)
    .or(
      `status.eq.paid,and(status.eq.pending,or(expires_at.is.null,expires_at.gt.${nowIso()}))`,
    );
  if (error) throw error;
  return (data as { seat_id: string }[]).map((row) => row.seat_id);
}

export async function listTakenSeatIdsSafe(nightId: NightId) {
  try {
    return await listTakenSeatIds(nightId);
  } catch (error) {
    console.error("[reservations] failed to load taken seats", error);
    return [] as string[];
  }
}

/**
 * Midtrans took the money but the hold was already released and the seat is
 * gone. The row keeps the seat it asked for but leaves the unique index, and
 * the team has to refund or reseat the guest by hand.
 */
export const PAID_CONFLICT = "paid_conflict";

type PaidEntry = {
  orderId: string;
  transactionStatus: string;
  channelId?: string | null;
};

// A payment settled after releaseExpiredHolds flipped the row to expired.
// Try to take the seat back; the unique index decides whether it is still free.
async function recoverLatePayment(entry: PaidEntry) {
  const db = getDb();
  const paidFields = {
    transaction_status: entry.transactionStatus,
    channel_id: entry.channelId ?? null,
    paid_at: nowIso(),
  };

  const reclaimed = await db
    .from("reservations")
    .update({ status: "paid", ...paidFields })
    .eq("order_id", entry.orderId)
    .eq("status", "expired")
    .select(RESERVATION_COLUMNS)
    .maybeSingle<ReservationRow>();
  if (!reclaimed.error) {
    if (reclaimed.data) {
      await insertAuditLogSafe({
        event: "reservation.paid_after_expiry.reclaimed",
        orderId: entry.orderId,
        payload: { seatId: reclaimed.data.seat_id, ...paidFields },
      });
      return mapReservation(reclaimed.data);
    }
    // Not expired: a repeat notification for a conflict we already recorded.
    const current = await getReservation(entry.orderId);
    return current?.status === PAID_CONFLICT ? current : null;
  }
  if (!isUniqueViolation(reclaimed.error)) throw reclaimed.error;

  const conflict = await db
    .from("reservations")
    .update({ status: PAID_CONFLICT, ...paidFields })
    .eq("order_id", entry.orderId)
    .eq("status", "expired")
    .select(RESERVATION_COLUMNS)
    .maybeSingle<ReservationRow>();
  if (conflict.error) throw conflict.error;
  if (!conflict.data) return null;

  console.error(
    `[reservations] PAID AFTER EXPIRY, SEAT TAKEN: order ${entry.orderId} paid ` +
      `(${entry.transactionStatus}) for ${conflict.data.night_id} seat ` +
      `${conflict.data.seat_id} but someone else holds it. Refund or reseat the guest.`,
  );
  await insertAuditLogSafe({
    event: "reservation.paid_after_expiry.conflict",
    orderId: entry.orderId,
    payload: {
      seatId: conflict.data.seat_id,
      nightId: conflict.data.night_id,
      amountIdr: conflict.data.amount_idr,
      ...paidFields,
    },
  });
  return mapReservation(conflict.data);
}

/**
 * Called when Midtrans says the order is paid. Returns the row with status
 * "paid", or PAID_CONFLICT when it settled after the hold was released and the
 * seat was taken meanwhile. Null means no such order.
 */
export async function markReservationPaid(entry: PaidEntry) {
  const db = getDb();
  const { data, error } = await db
    .from("reservations")
    .update({
      status: "paid",
      transaction_status: entry.transactionStatus,
      channel_id: entry.channelId ?? null,
    })
    .eq("order_id", entry.orderId)
    .in("status", ["pending", "paid"])
    .select(RESERVATION_COLUMNS)
    .maybeSingle<ReservationRow>();
  if (error) throw error;
  if (!data) return recoverLatePayment(entry);

  // Keep the first paid_at when the notification is delivered twice.
  if (!data.paid_at) {
    const stamped = await db
      .from("reservations")
      .update({ paid_at: nowIso() })
      .eq("order_id", entry.orderId)
      .is("paid_at", null)
      .select(RESERVATION_COLUMNS)
      .maybeSingle<ReservationRow>();
    if (stamped.error) throw stamped.error;
    if (stamped.data) return mapReservation(stamped.data);
  }
  return mapReservation(data);
}

export async function markReservationPaidSafe(
  entry: Parameters<typeof markReservationPaid>[0],
) {
  try {
    return await markReservationPaid(entry);
  } catch (error) {
    console.error("[reservations] failed to mark reservation paid", error);
    return null;
  }
}

export async function claimReservationSeat(orderId: string, seatId: string) {
  const reservation = await getReservation(orderId);
  if (!reservation || reservation.status !== "paid") {
    throw new PublicError("Payment is not confirmed yet.");
  }

  const seat = getSeat(seatId);
  if (!seat || seat.packageId !== reservation.packageId) {
    throw new PublicError("That table is not in the area you paid for.");
  }

  if (reservation.seatId) {
    return reservation;
  }

  await releaseExpiredHolds();

  const { data, error } = await getDb()
    .from("reservations")
    .update({ seat_id: seatId })
    .eq("order_id", orderId)
    .eq("status", "paid")
    .is("seat_id", null)
    .select(RESERVATION_COLUMNS)
    .maybeSingle<ReservationRow>();
  if (error) {
    if (isUniqueViolation(error)) {
      throw new PublicError("That table was just taken. Pick another.");
    }
    throw error;
  }
  if (!data) {
    throw new PublicError("That table was just taken. Pick another.");
  }
  return mapReservation(data);
}

export async function markWhatsAppSent(orderId: string, messageId: string) {
  const { error } = await getDb()
    .from("reservations")
    .update({ whatsapp_message_id: messageId, whatsapp_sent_at: nowIso() })
    .eq("order_id", orderId);
  if (error) throw error;
}

export async function markWhatsAppSentSafe(orderId: string, messageId: string) {
  try {
    await markWhatsAppSent(orderId, messageId);
  } catch (error) {
    console.error("[reservations] failed to store WhatsApp message id", error);
  }
}

export async function markInvoiceEmailSent(orderId: string) {
  const { error } = await getDb()
    .from("reservations")
    .update({ invoice_email_sent_at: nowIso() })
    .eq("order_id", orderId);
  if (error) throw error;
}

export async function markInvoiceEmailSentSafe(orderId: string) {
  try {
    await markInvoiceEmailSent(orderId);
  } catch (error) {
    console.error("[reservations] failed to store invoice email time", error);
  }
}

// A table the team booked by hand (WhatsApp, walk-in). It is stored as a paid
// reservation so the night+seat unique index blocks online checkout for it
// with no extra check; channel_id "manual" tells it apart from Midtrans, and
// every reader that counts money must check isManualBooking first.
export const MANUAL_CHANNEL = "manual";

export function isManualBooking(reservation: Pick<ReservationRecord, "channelId">) {
  return reservation.channelId === MANUAL_CHANNEL;
}

/** nik is "" when not given; a given one has already been checked to be 16 digits. */
export type GuestDetails = { name: string; phone: string; nik: string; notes: string | null };

export type ManualBooking = GuestDetails & { nightId: NightId; seatId: string };

export async function insertManualBooking(entry: ManualBooking) {
  const seat = getSeat(entry.seatId);
  const pack = seat ? getTablePackage(seat.packageId) : undefined;
  if (!seat || !pack) throw new PublicError("Unknown table.");

  await releaseExpiredHolds();
  const { error } = await getDb()
    .from("reservations")
    .insert({
      order_id: `MAN-${entry.nightId}-${seat.short}-${Date.now().toString(36)}`,
      name: entry.name,
      nik: entry.nik || null,
      email: "",
      phone: entry.phone,
      night_id: entry.nightId,
      package_id: seat.packageId,
      party_size: pack.seats,
      notes: entry.notes,
      amount_idr: 0,
      status: "paid",
      channel_id: MANUAL_CHANNEL,
      transaction_status: MANUAL_CHANNEL,
      paid_at: nowIso(),
      seat_id: seat.id,
    });
  if (error) {
    if (isUniqueViolation(error)) {
      throw new PublicError("Someone is already holding or has booked this table.");
    }
    throw error;
  }
}

export async function updateManualBooking(entry: ManualBooking) {
  const { data, error } = await getDb()
    .from("reservations")
    .update({ name: entry.name, phone: entry.phone, nik: entry.nik || null, notes: entry.notes })
    .eq("night_id", entry.nightId)
    .eq("seat_id", entry.seatId)
    .eq("channel_id", MANUAL_CHANNEL)
    .select("order_id");
  if (error) throw error;
  if (!data.length) throw new PublicError("This table is no longer switched off.");
}

export async function deleteManualBooking(nightId: NightId, seatId: string) {
  const { data, error } = await getDb()
    .from("reservations")
    .delete()
    .eq("night_id", nightId)
    .eq("seat_id", seatId)
    .eq("channel_id", MANUAL_CHANNEL)
    .select(RESERVATION_COLUMNS)
    .returns<ReservationRow[]>();
  if (error) throw error;
  // Nothing to delete means another admin already switched it back on; say so
  // rather than offering an undo built from a stale copy.
  if (!data.length) throw new PublicError("This table is already bookable online.");
  return data;
}
