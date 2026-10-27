import type { ReservationRecord } from "./reservations";
import { getSiteUrl } from "./site";
import { toWaMeNumber } from "./wa-me";

/**
 * Invoice over WhatsApp through Fonnte (https://docs.fonnte.com/api-send-message/):
 * one POST with the guest's number, a caption and the address of the PDF. Fonnte
 * fetches the PDF from /invoice/<code>.pdf, so that route must stay public.
 * Needs a Fonnte plan that can send files, and the linked phone must stay online.
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
      "Your invoice is attached.",
    ].join("\n"),
    url: `${siteUrl}/invoice/${reservation.orderId}.pdf`,
    filename: `Carnaval-of-Screams-${reservation.orderId}.pdf`,
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
