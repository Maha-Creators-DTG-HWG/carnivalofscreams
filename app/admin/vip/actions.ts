"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { insertAuditLogSafe } from "@/lib/audit";
import { getReservation, isManualBooking } from "@/lib/reservations";
import { BOOKING_CODE_RE, setVipLimit } from "@/lib/vip";

const MAX_LIMIT = 99;

// Used straight as a <form action>, so it returns nothing; a bad value is
// ignored and the page reloads showing the limit as it really is.
export async function saveVipLimit(formData: FormData) {
  const admin = await requireAdmin("/admin/vip");
  const code = String(formData.get("code") ?? "").trim();
  const max = Number(formData.get("max"));

  if (BOOKING_CODE_RE.test(code) && Number.isInteger(max) && max >= 0 && max <= MAX_LIMIT) {
    const reservation = await getReservation(code);
    if (reservation?.status === "paid" && !isManualBooking(reservation)) {
      await setVipLimit(code, max);
      await insertAuditLogSafe({
        event: "admin.vip.limit",
        path: "/admin/vip",
        payload: { admin, code, max },
      });
    }
  }
  refresh();
}
