// Click-to-chat links. wa.me wants international digits without "+":
// 0812… and +62812… both become 62812…. A number typed with "+" already
// carries its country code.
export function toWaMeNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") || digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function waMeUrl(phone: string, text?: string) {
  const url = `https://wa.me/${toWaMeNumber(phone)}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

/** Where a guest opens their invoice PDF. Only paid tables with a seat have one. */
export function invoicePdfUrl(siteUrl: string, orderId: string) {
  return `${siteUrl}/invoice/${orderId}.pdf`;
}

/**
 * The admin's "Message" button: a chat with the guest about their table. With an
 * invoiceUrl it also carries the invoice PDF link, and the team presses send.
 */
export function reservationWhatsAppUrl(booking: {
  phone: string;
  name: string;
  orderId: string;
  table: string;
  nightLabel: string;
  invoiceUrl?: string;
}) {
  const name = booking.name.trim();
  const lines = [
    `${name ? `Hi ${name}` : "Hi"}, this is Carnaval of Screams about your table reservation (${booking.table}, ${booking.nightLabel}). Booking code: ${booking.orderId}.`,
  ];
  if (booking.invoiceUrl) lines.push("", `Invoice (PDF): ${booking.invoiceUrl}`);
  return waMeUrl(booking.phone, lines.join("\n"));
}
