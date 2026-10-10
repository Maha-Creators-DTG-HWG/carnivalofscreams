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
    `GET VIP TICKETS (ADD ON) with this booking code: ${fields.vipUrl}`,
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

const FONT = "'Angie Sans','Avenir Next',Helvetica,Arial,sans-serif";

/**
 * Table-based and inline-styled so it survives Gmail, Outlook and phone mail apps.
 * Responsive without media queries: the cave artwork is a background that scales
 * with the card width, the logo and title are images sized in %, and the details
 * are live text. Assets live in public/email/ (bg-top, bg-bottom, logo, title) and
 * are sliced from the design at 2x. Outlook for Windows ignores backgrounds and
 * shows the same text on plain black. Angie Sans only shows for readers who have it
 * installed: mail apps can't load web fonts.
 */
export function invoiceHtml(fields: InvoiceFields) {
  const assets = `${getSiteUrl()}/email`;
  // Shorter than the plain-text rows: the card has room for one line each.
  const rows = invoiceRows(fields)
    .map(([label, value]): [string, string] =>
      label.startsWith("Minimum spend")
        ? ["Min. spend (at venue)", fields.minSpendLabel]
        : [label.replace(" included", ""), value],
    )
    .map(
      ([label, value]) =>
        `<tr><td style="padding:5px 0;border-bottom:1px solid #1b2340;color:#8d9bc0;font-size:10px;letter-spacing:1px;text-transform:uppercase;vertical-align:middle;width:44%">${escapeHtml(label)}</td>` +
        `<td style="padding:5px 0 5px 8px;border-bottom:1px solid #1b2340;color:#e9eefb;font-size:13px;vertical-align:middle">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const img = (name: string, alt: string, width: string) =>
    `<img src="${assets}/${name}" alt="${escapeHtml(alt)}" style="display:block;width:${width};height:auto;margin:0 auto;border:0">`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#000000;font-family:${FONT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td background="${assets}/bg-top.jpg" bgcolor="#000000" valign="top" style="background-color:#000000;background-image:url('${assets}/bg-top.jpg');background-size:100% auto;background-repeat:no-repeat;background-position:top center;padding:8% 0 0;text-align:center">
${img("logo.png", "Carnaval of Screams: The Arrival. 30–31 October 2026, Hosel Driving Range.", "77%")}
<div style="height:0;padding-top:9%;line-height:0;font-size:0">&nbsp;</div>
${img("title.png", "Your reservation confirmed", "74%")}
<div style="padding:22px 12% 0">
<p style="margin:0;color:#8d9bc0;font-size:10px;letter-spacing:4px;text-transform:uppercase">Booking code</p>
<p style="margin:6px 0 0;padding:10px 6px;border:1px solid #2a3a6e;background:#0a1020;color:#cfe0ff;font-size:17px;letter-spacing:1px;font-family:Menlo,Consolas,monospace;word-break:break-all">${escapeHtml(fields.bookingCode)}</p>
<p style="margin:8px 0 12px;color:#aeb8d6;font-size:11px;line-height:1.4">Show this code at the door. It is also your code for VIP tickets.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1b2340;text-align:left">${rows}</table>
<p style="margin:16px 0 0"><a href="${escapeHtml(fields.vipUrl)}" style="display:inline-block;background:#e9eefb;color:#000000;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:12px 22px">Get VIP tickets (add on)</a></p>
<p style="margin:12px 0 0;color:#8d9bc0;font-size:11px">Questions? <a href="${WHATSAPP_URL}" style="color:#e9eefb">Message us on WhatsApp</a></p>
</div>
</td></tr>
<tr><td style="padding:0;line-height:0;font-size:0"><img src="${assets}/bg-bottom.jpg" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>
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
