"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { insertAuditLogSafe } from "@/lib/audit";
import { publicMessage } from "@/lib/errors";
import {
  deleteManualBooking,
  insertManualBooking,
  updateManualBooking,
  type ManualBooking,
} from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import { getNight } from "@/lib/tables";

export type TableActionResult = { ok: true } | { ok: false; error: string };

const PHONE_RE = /^\+?[0-9]{9,16}$/;
const NIK_RE = /^\d{16}$/;
const NAME_MAX = 80;
const NOTES_MAX = 200;

// Guest details are optional: a table can be switched off first and the
// details filled in once they're known.
function parse(raw: unknown): { ok: true; booking: ManualBooking } | { ok: false; error: string } {
  const input = (raw ?? {}) as Record<string, unknown>;
  const nightId = typeof input.nightId === "string" ? getNight(input.nightId)?.id : undefined;
  const seatId = String(input.seatId ?? "");
  const name = String(input.name ?? "").trim();
  const phone = String(input.phone ?? "").replace(/[\s()-]/g, "");
  const nik = String(input.nik ?? "").replace(/\D/g, "");
  const notes = String(input.notes ?? "").trim() || null;

  if (!nightId || !getSeat(seatId)) return { ok: false, error: "Unknown table." };
  if (name.length > NAME_MAX) {
    return { ok: false, error: `Keep the name under ${NAME_MAX} characters.` };
  }
  if (notes && notes.length > NOTES_MAX) {
    return { ok: false, error: `Keep the notes under ${NOTES_MAX} characters.` };
  }
  if (phone && !PHONE_RE.test(phone)) {
    return {
      ok: false,
      error: "Enter the WhatsApp number as digits, e.g. 081234567890, or leave it empty.",
    };
  }
  if (nik && !NIK_RE.test(nik)) {
    return { ok: false, error: "Enter the NIK as 16 digits, or leave it empty." };
  }
  return { ok: true, booking: { nightId, seatId, name, phone, nik, notes } };
}

// Every table action runs the same way: admin check, parse, write, audit,
// refresh the page. Only the write and what goes in the audit log differ.
async function runTableAction(
  raw: unknown,
  action: {
    event: string;
    fallback: string;
    write: (booking: ManualBooking) => Promise<unknown>;
  },
): Promise<TableActionResult> {
  const admin = await requireAdmin("/admin/tables");
  const input = parse(raw);
  if (!input.ok) return input;
  const { booking } = input;

  let written: unknown;
  try {
    written = await action.write(booking);
  } catch (error) {
    console.error(`[admin] ${action.event} failed`, error);
    // Usually another admin or a guest got there first; reload so the page
    // shows the table as it really is now.
    refresh();
    return {
      ok: false,
      error: publicMessage(error, `${action.fallback} Check your connection and try again.`),
    };
  }
  await insertAuditLogSafe({
    event: action.event,
    path: "/admin/tables",
    // A deleted row lives on here, so switching a table on loses almost
    // nothing: nik and phone are masked on the way in (see redactPii).
    payload: { admin, ...booking, ...(written ? { removed: written } : {}) },
  });
  refresh();
  return { ok: true };
}

export async function switchTableOff(raw: unknown) {
  return runTableAction(raw, {
    event: "admin.table.off",
    fallback: "Unable to switch it off.",
    write: insertManualBooking,
  });
}

export async function saveGuestDetails(raw: unknown) {
  return runTableAction(raw, {
    event: "admin.table.guest",
    fallback: "Unable to save.",
    write: updateManualBooking,
  });
}

export async function switchTableOn(raw: unknown) {
  return runTableAction(raw, {
    event: "admin.table.on",
    fallback: "Unable to switch it on.",
    write: (booking) => deleteManualBooking(booking.nightId, booking.seatId),
  });
}
