"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { recordCheckin, UNDO_EVENT, verifyBooking, type CheckinView } from "@/lib/checkin";

export type CheckinResult = { ok: true; view: CheckinView } | { ok: false; error: string };

const FAILED = "Could not reach the database. Check the connection and try again.";

export async function checkCode(raw: unknown): Promise<CheckinResult> {
  await requireAdmin("/admin/checkin");
  try {
    return { ok: true, view: await verifyBooking(String(raw ?? "")) };
  } catch (error) {
    console.error("[checkin] lookup failed", error);
    return { ok: false, error: FAILED };
  }
}

// The code is looked up again here, so a stale screen can't check in a booking
// that was cancelled or already checked in a moment ago.
export async function confirmCheckin(raw: unknown, anyDay: boolean): Promise<CheckinResult> {
  const admin = await requireAdmin("/admin/checkin");
  try {
    const view = await verifyBooking(String(raw ?? ""));
    const allowed = view.verdict === "valid" || (view.verdict === "wrong-day" && anyDay);
    if (!allowed || !view.booking) return { ok: true, view };
    await recordCheckin(view.booking.orderId, admin);
    return { ok: true, view: await verifyBooking(view.booking.orderId) };
  } catch (error) {
    console.error("[checkin] check-in failed", error);
    return { ok: false, error: FAILED };
  }
}

export async function undoCheckin(raw: unknown): Promise<CheckinResult> {
  const admin = await requireAdmin("/admin/checkin");
  try {
    const view = await verifyBooking(String(raw ?? ""));
    if (view.verdict !== "checked-in" || !view.booking) return { ok: true, view };
    await recordCheckin(view.booking.orderId, admin, UNDO_EVENT);
    return { ok: true, view: await verifyBooking(view.booking.orderId) };
  } catch (error) {
    console.error("[checkin] undo failed", error);
    return { ok: false, error: FAILED };
  }
}
