import { insertAuditLogSafe } from "./audit";
import {
  markInvoiceEmailSentSafe,
  markWhatsAppSentSafe,
  type ReservationRecord,
} from "./reservations";
import { getSeat } from "./seats";
import { getSiteUrl, WHATSAPP_URL } from "./site";
import { formatIdr, getNight, getTablePackage } from "./tables";
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
  area: string;
  table: string;
  bookingCode: string;
  feeLabel: string;
  minSpendLabel: string;
  ticketsIncluded: number;
  vipUrl: string;
};

/** Shows the first and last four digits only; the full NIK stays with us. */
export function maskNik(nik: string) {
  const digits = nik.replace(/\D/g, "");
  if (digits.length < 8) return digits ? "••••" : "";
  return `${digits.slice(0, 4)}${"•".repeat(digits.length - 8)}${digits.slice(-4)}`;
}

export function invoiceFields(
  reservation: ReservationRecord,
): InvoiceFields | null {
  if (!reservation.seatId) return null;
  const night = getNight(reservation.nightId);
  const seat = getSeat(reservation.seatId);
  const pack = getTablePackage(reservation.packageId);
  if (!night || !seat || !pack) return null;

  return {
    day: `${night.day} · ${night.label}`,
    name: reservation.name,
    nik: maskNik(reservation.nik ?? ""),
    phone: reservation.phone,
    email: reservation.email,
    area: pack.name,
    table: seat.label,
    bookingCode: reservation.orderId,
    feeLabel: formatIdr(reservation.amountIdr),
    minSpendLabel: formatIdr(pack.minSpendIdr),
    ticketsIncluded: pack.tickets,
    vipUrl: `${getSiteUrl()}/vip?code=${encodeURIComponent(reservation.orderId)}`,
  };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * How the confirmation actually reaches the guest, for copy that promises it:
 * "by email and WhatsApp", "by email", "by WhatsApp", or null when neither is
 * set up (then the site asks the guest to keep their booking code instead).
 */
export function deliveryChannels() {
  const email = isEmailConfigured();
  const whatsapp = isWhatsAppConfigured();
  if (email && whatsapp) return "by email and WhatsApp";
  if (email) return "by email";
  if (whatsapp) return "by WhatsApp";
  return null;
}

export function invoiceSubject(fields: InvoiceFields) {
  return `Your table is confirmed · Carnaval of Screams · ${fields.bookingCode}`;
}

function invoiceRows(fields: InvoiceFields): [string, string][] {
  return [
    ["Day", fields.day],
    ["Area", fields.area],
    ["Table", fields.table],
    ["Name", fields.name],
    ["NIK", fields.nik],
    ["Phone", fields.phone],
    ["Booking fee (paid)", fields.feeLabel],
    ["Event tickets included", `${fields.ticketsIncluded}`],
    ["Minimum spend at the venue", `${fields.minSpendLabel} (not included in the booking fee)`],
  ];
}

export function invoiceText(fields: InvoiceFields) {
  return [
    "Carnaval of Screams: your table is confirmed",
    "",
    `Booking code: ${fields.bookingCode}`,
    "Show this code at the door. It is also your code for VIP tickets.",
    "",
    ...invoiceRows(fields).map(([label, value]) => `${label}: ${value}`),
    "",
    `Get VIP tickets with this booking code: ${fields.vipUrl}`,
    "",
    "Carnaval of Screams · Yogyakarta, Indonesia · 30–31 October 2026",
    `Questions? Message us on WhatsApp: ${WHATSAPP_URL}`,
  ].join("\n");
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Table-based and inline-styled so it survives Gmail, Outlook and phone mail apps. */
export function invoiceHtml(fields: InvoiceFields) {
  const rows = invoiceRows(fields)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#8e8a99;font-size:13px;vertical-align:top;width:45%">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;color:#ffffff;font-size:14px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#050308;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050308;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0d0714;border:1px solid #2a2433">
<tr><td style="padding:28px 28px 8px;text-align:center">
<p style="margin:0;color:#8e8a99;font-size:11px;letter-spacing:4px;text-transform:uppercase">Carnaval of Screams</p>
<h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;letter-spacing:2px;font-weight:normal">Your table is confirmed</h1>
</td></tr>
<tr><td style="padding:20px 28px 4px;text-align:center">
<p style="margin:0;color:#8e8a99;font-size:12px;letter-spacing:2px;text-transform:uppercase">Booking code</p>
<p style="margin:6px 0 0;color:#f3cf8a;font-size:22px;letter-spacing:1px;font-family:Menlo,Consolas,monospace">${escapeHtml(fields.bookingCode)}</p>
<p style="margin:8px 0 0;color:#c9c5d2;font-size:13px;line-height:1.5">Show this code at the door. It is also your code for VIP tickets.</p>
</td></tr>
<tr><td style="padding:16px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2433">${rows}</table></td></tr>
<tr><td style="padding:4px 28px 24px;text-align:center">
<a href="${escapeHtml(fields.vipUrl)}" style="display:inline-block;background:#ffffff;color:#050308;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;padding:14px 26px">Get VIP tickets</a>
</td></tr>
<tr><td style="padding:16px 28px 26px;border-top:1px solid #2a2433;text-align:center;color:#8e8a99;font-size:12px;line-height:1.6">
Carnaval of Screams · Yogyakarta, Indonesia · 30–31 October 2026<br>
Questions? <a href="${WHATSAPP_URL}" style="color:#ffffff">Message us on WhatsApp</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "Carnaval of Screams <noreply@carnavalofscreams.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Could not send email.");
  }
}

function sendInvoiceEmail(reservation: ReservationRecord, fields: InvoiceFields) {
  return sendEmail(
    reservation.email,
    invoiceSubject(fields),
    invoiceText(fields),
    invoiceHtml(fields),
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
        payload: { email: reservation.email },
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
