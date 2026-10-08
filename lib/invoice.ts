import { insertAuditLogSafe } from "./audit";
import {
  markInvoiceEmailSentSafe,
  markWhatsAppSentSafe,
  type ReservationRecord,
} from "./reservations";
import { getSeat } from "./seats";
import { formatIdr, getNight } from "./tables";
import {
  isWhatsAppConfigured,
  sendReservationWhatsApp,
} from "./whatsapp";

export type InvoiceFields = {
  day: string;
  name: string;
  nik: string;
  phone: string;
  email: string;
  table: string;
  bookingCode: string;
  amountLabel: string;
};

export function invoiceFields(
  reservation: ReservationRecord,
): InvoiceFields | null {
  if (!reservation.seatId) return null;
  const night = getNight(reservation.nightId);
  const seat = getSeat(reservation.seatId);
  if (!night || !seat) return null;

  return {
    day: `${night.day} · ${night.label}`,
    name: reservation.name,
    nik: reservation.nik ?? "",
    phone: reservation.phone,
    email: reservation.email,
    table: seat.label,
    bookingCode: reservation.orderId,
    amountLabel: formatIdr(reservation.amountIdr),
  };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function invoiceText(fields: InvoiceFields) {
  return [
    "Carnaval of Screams",
    "",
    `Day: ${fields.day}`,
    `Name: ${fields.name}`,
    `NIK: ${fields.nik}`,
    `Phone: ${fields.phone}`,
    `Email: ${fields.email}`,
    `Table: ${fields.table}`,
    `Booking code: ${fields.bookingCode}`,
    `Amount: ${fields.amountLabel}`,
  ].join("\n");
}

export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "Carnaval of Screams <noreply@carnivalofscreams.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Could not send email.");
  }
}

function sendInvoiceEmail(reservation: ReservationRecord, fields: InvoiceFields) {
  return sendEmail(
    reservation.email,
    `Your table hold · ${fields.bookingCode}`,
    invoiceText(fields),
  );
}

export async function sendReservationInvoice(
  reservation: ReservationRecord | null,
  sourcePath: string,
) {
  if (!reservation || reservation.status !== "paid" || !reservation.seatId) {
    return;
  }

  const fields = invoiceFields(reservation);
  if (!fields) return;

  const emailNeeded = isEmailConfigured() && !reservation.invoiceEmailSentAt;
  const whatsappNeeded = isWhatsAppConfigured() && !reservation.whatsappSentAt;
  if (!emailNeeded && !whatsappNeeded) return;

  if (emailNeeded) {
    try {
      await sendInvoiceEmail(reservation, fields);
      await markInvoiceEmailSentSafe(reservation.orderId);
      await insertAuditLogSafe({
        event: "reservation.invoice.email.sent",
        orderId: reservation.orderId,
        method: "POST",
        path: sourcePath,
        payload: { to: reservation.email },
      });
    } catch (error) {
      console.error("[invoice] failed to send email", error);
      await insertAuditLogSafe({
        event: "reservation.invoice.email.error",
        orderId: reservation.orderId,
        method: "POST",
        path: sourcePath,
        payload: {
          error: error instanceof Error ? error.message : "unknown",
        },
      });
    }
  }

  if (whatsappNeeded) {
    try {
      const result = await sendReservationWhatsApp(reservation);
      if (result.messageId) {
        await markWhatsAppSentSafe(reservation.orderId, result.messageId);
        await insertAuditLogSafe({
          event: "reservation.whatsapp.sent",
          orderId: reservation.orderId,
          method: "POST",
          path: sourcePath,
          payload: { messageId: result.messageId, status: result.status },
        });
      }
    } catch (error) {
      console.error("[invoice] failed to send WhatsApp", error);
      await insertAuditLogSafe({
        event: "reservation.whatsapp.error",
        orderId: reservation.orderId,
        method: "POST",
        path: sourcePath,
        payload: {
          error: error instanceof Error ? error.message : "unknown",
        },
      });
    }
  }
}
