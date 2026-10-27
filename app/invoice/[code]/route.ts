import { invoiceFields } from "@/lib/invoice";
import { invoicePdf } from "@/lib/invoice-pdf";
import { getReservation } from "@/lib/reservations";
import { BOOKING_CODE_RE, normalizeBookingCode } from "@/lib/vip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The invoice PDF for a paid table, found by its booking code, like the email's
// VIP link. The code is the secret; the NIK on it is masked as in the email.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeBookingCode(decodeURIComponent(raw).replace(/\.pdf$/i, ""));
  if (!BOOKING_CODE_RE.test(code)) return new Response("Not found", { status: 404 });

  try {
    const reservation = await getReservation(code);
    const fields = reservation?.status === "paid" ? invoiceFields(reservation) : null;
    if (!fields) return new Response("Not found", { status: 404 });

    const pdf = await invoicePdf(fields);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Carnaval-of-Screams-${code}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[invoice] failed to build the PDF", error);
    return new Response("Could not build the invoice. Try again.", { status: 500 });
  }
}
