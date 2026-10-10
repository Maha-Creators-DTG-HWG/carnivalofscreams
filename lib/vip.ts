import { getReservation } from "./reservations";

/** The booking code is the reservation's order id (COS-30-LUX-…). */
export const BOOKING_CODE_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;

/**
 * Guests type or paste the code from an email, so forgive what a keyboard does
 * to it: spaces and invisible characters go, and the case is put back
 * (COS-30-LUX-ab12cd34ef: letters up in the middle, hex down at the end).
 */
export function normalizeBookingCode(raw: string) {
  const clean = raw.replace(/[\s​-‍⁠﻿]/g, "");
  const match = /^cos-(30|31)-([a-z]{3})-([0-9a-f]{10})$/i.exec(clean);
  return match ? `COS-${match[1]}-${match[2].toUpperCase()}-${match[3].toLowerCase()}` : clean;
}

/** A paid table booking, online or by hand, opens VIP tickets. */
export async function isPaidTableBooking(code: string) {
  if (!BOOKING_CODE_RE.test(code)) return false;
  const reservation = await getReservation(code);
  return reservation?.status === "paid";
}
