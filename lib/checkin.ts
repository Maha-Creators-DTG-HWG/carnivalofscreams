import { insertAuditLog } from "./audit";
import { getDb } from "./db";
import { getReservation, isManualBooking, listReservations, type ReservationRecord } from "./reservations";
import { getSeat } from "./seats";
import { getNight, getTablePackage, type NightId } from "./tables";
import { BOOKING_CODE_RE, normalizeBookingCode } from "./vip";

/**
 * Gate check on the day. Check-ins are rows in audit_logs (event "admin.checkin",
 * and "admin.checkin.undo" to take one back), so no schema change is needed.
 * ponytail: one audit query per lookup; add a checked_in_at column if the gate gets busy.
 */
export const CHECKIN_EVENT = "admin.checkin";
export const UNDO_EVENT = "admin.checkin.undo";

export type Verdict = "valid" | "wrong-day" | "checked-in" | "invalid";

export type CheckinBooking = {
  orderId: string;
  name: string;
  nik: string;
  phone: string;
  day: string;
  area: string;
  table: string;
  seats: number;
  tickets: number;
  source: string;
};

export type CheckinView = {
  verdict: Verdict;
  /** One line a gate person can read out. */
  message: string;
  booking?: CheckinBooking;
  checkedInAt?: string;
};

/** Today's date in the venue's time zone, as YYYY-MM-DD. */
export function todayInJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

async function checkedInAt(orderId: string) {
  const { data, error } = await getDb()
    .from("audit_logs")
    .select("event, created_at")
    .eq("order_id", orderId)
    .in("event", [CHECKIN_EVENT, UNDO_EVENT])
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<{ event: string; created_at: string }[]>();
  if (error) throw error;
  const last = data[0];
  return last?.event === CHECKIN_EVENT ? last.created_at : null;
}

function describe(reservation: ReservationRecord): CheckinBooking | null {
  const night = getNight(reservation.nightId);
  const pack = getTablePackage(reservation.packageId);
  const seat = reservation.seatId ? getSeat(reservation.seatId) : undefined;
  if (!night || !pack || !seat) return null;
  return {
    orderId: reservation.orderId,
    name: reservation.name,
    nik: reservation.nik ?? "",
    phone: reservation.phone,
    day: `${night.day} · ${night.label}`,
    area: pack.name,
    table: seat.label,
    seats: reservation.partySize,
    tickets: pack.tickets,
    source: isManualBooking(reservation) ? "Booked by hand" : "Paid online",
  };
}

export async function verifyBooking(raw: string, today = todayInJakarta()): Promise<CheckinView> {
  const code = normalizeBookingCode(raw);
  if (!BOOKING_CODE_RE.test(code)) {
    return { verdict: "invalid", message: "That doesn't look like a booking code." };
  }
  const reservation = await getReservation(code);
  if (!reservation) {
    return { verdict: "invalid", message: "No reservation with this code." };
  }
  if (reservation.channelId === "referral") {
    return { verdict: "invalid", message: "Referral code. It is not a table reservation." };
  }
  if (reservation.status !== "paid") {
    return {
      verdict: "invalid",
      message: `Not confirmed. This booking is ${reservation.status.replace("_", " ")}.`,
    };
  }
  const booking = describe(reservation);
  if (!booking) {
    return { verdict: "invalid", message: "Paid, but no table was chosen. Ask the team." };
  }

  const at = await checkedInAt(reservation.orderId);
  if (at) {
    return { verdict: "checked-in", message: "Already checked in.", booking, checkedInAt: at };
  }
  const night = getNight(reservation.nightId)!;
  if (night.date !== today) {
    return {
      verdict: "wrong-day",
      message: `Valid booking, but for ${night.day} (${night.label}), not today.`,
      booking,
    };
  }
  return { verdict: "valid", message: "Valid reservation for today.", booking };
}

export async function recordCheckin(orderId: string, admin: string, event = CHECKIN_EVENT) {
  await insertAuditLog({
    event,
    orderId,
    path: "/admin/checkin",
    payload: { admin },
  });
}

export type SeatState = "holding" | "booked" | "checked-in";

export type BoardEntry = { seatId: string; orderId: string; name: string; state: SeatState };

/**
 * Every taken table for a night, and whether its guest has arrived. Tables not
 * listed are available. Referral codes hold no table, so they never show.
 */
export async function checkinBoard(nightId: NightId): Promise<BoardEntry[]> {
  const rows = (await listReservations()).filter(
    (reservation) =>
      reservation.nightId === nightId &&
      reservation.seatId &&
      reservation.channelId !== "referral" &&
      (reservation.status === "paid" || reservation.status === "pending"),
  );
  const paid = rows.filter((reservation) => reservation.status === "paid").map((reservation) => reservation.orderId);

  // Newest event first, so the first one seen per order is its current state.
  const latest = new Map<string, string>();
  if (paid.length) {
    const { data, error } = await getDb()
      .from("audit_logs")
      .select("order_id, event")
      .in("order_id", paid)
      .in("event", [CHECKIN_EVENT, UNDO_EVENT])
      .order("created_at", { ascending: false })
      .returns<{ order_id: string; event: string }[]>();
    if (error) throw error;
    for (const row of data) if (!latest.has(row.order_id)) latest.set(row.order_id, row.event);
  }

  return rows.map((reservation) => ({
    seatId: reservation.seatId!,
    orderId: reservation.orderId,
    name: reservation.name,
    state:
      reservation.status === "pending"
        ? "holding"
        : latest.get(reservation.orderId) === CHECKIN_EVENT
          ? "checked-in"
          : "booked",
  }));
}
