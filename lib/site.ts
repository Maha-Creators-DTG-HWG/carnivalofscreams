export const TICKETS_URL =
  "https://artatix.co.id/event/carnval_of_scream_2026";

/**
 * Where a correct VIP booking code sends the guest. Empty until the link is
 * decided: the page then says VIP tickets are not on sale yet.
 */
export const VIP_TICKET_URL =
  "https://artatix.co.id/event/carnaval_of_scream_2026_vip_ticket_reservation_only";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// wa.me wants the number in international format without "+" or spaces.
export const WHATSAPP_NUMBER = "6285284652067";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
