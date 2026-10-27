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

/** A chat with the guest that carries their invoice PDF link; the team presses send. */
export function invoiceWhatsAppUrl(phone: string, name: string, orderId: string, siteUrl: string) {
  const greeting = name.trim() ? `Hi ${name.trim()}` : "Hi";
  return waMeUrl(
    phone,
    `${greeting}, your table at Carnaval of Screams is confirmed. Here is your invoice (PDF):\n${siteUrl}/invoice/${orderId}.pdf\n\nBooking code: ${orderId}\nShow this code at the door.`,
  );
}
