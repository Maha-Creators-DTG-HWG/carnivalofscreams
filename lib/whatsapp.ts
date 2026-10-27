import type { ReservationRecord } from "./reservations";
import { getSiteUrl } from "./site";
import { toWaMeNumber } from "./wa-me";

/**
 * Invoice over WhatsApp through Fonnte (https://docs.fonnte.com/api-send-message/).
 * The PDF goes as a link in the text, not as an attachment: attachments (`url`/`file`)
 * need a paid Fonnte plan, and on the free plan Fonnte silently sends the text only.
 * The link opens /invoice/<code>.pdf, so that route must stay public.
 * ponytail: add `url` and `filename` to the body to attach the file once the plan allows it.
 */
const FONNTE_SEND_URL = "https://api.fonnte.com/send";

type FonnteResponse = {
  status?: boolean;
  id?: string[];
  reason?: string;
  detail?: string;
};

export function isWhatsAppConfigured() {
  return Boolean(process.env.FONNTE_TOKEN);
}

/** What goes to Fonnte for one reservation. Pure, so it can be tested without the network. */
export function fonnteMessage(reservation: ReservationRecord, siteUrl = getSiteUrl()) {
  const name = reservation.name.trim();
  return {
    // Fonnte takes 62… or 08…; the wa.me helper already normalises both.
    target: toWaMeNumber(reservation.phone),
    message: [
      `${name ? `Hi ${name}` : "Hi"}, your table at Carnaval of Screams is confirmed.`,
      "",
      `Booking code: ${reservation.orderId}`,
      "Show this code at the door. It is also your code for VIP tickets.",
      "",
      "Your invoice (PDF):",
      `${siteUrl}/invoice/${reservation.orderId}.pdf`,
    ].join("\n"),
  };
}

export async function sendReservationWhatsApp(reservation: ReservationRecord) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("FONNTE_TOKEN is not configured");

  const response = await fetch(FONNTE_SEND_URL, {
    method: "POST",
    // No "Bearer": Fonnte wants the bare token.
    headers: { Authorization: token },
    body: new URLSearchParams(fonnteMessage(reservation)),
  });
  const data = (await response.json().catch(() => ({}))) as FonnteResponse;
  if (!response.ok || !data.status) {
    throw new Error(data.reason ?? data.detail ?? "Could not send the WhatsApp invoice.");
  }
  // "queued" when Fonnte accepts the message without an id (device reconnecting).
  return { messageId: data.id?.[0] ?? "queued" };
}
