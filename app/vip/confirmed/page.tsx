import type { Metadata } from "next";
import Link from "next/link";

import { formatIdr } from "@/lib/tables";
import { getVipOrder, syncVipOrder, VIP_ORDER_ID_RE } from "@/lib/vip";

export const metadata: Metadata = {
  title: "VIP tickets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VipConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.order_id ?? params.orderId;
  const orderId = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  let order = null;
  let checkFailed = false;
  if (VIP_ORDER_ID_RE.test(orderId)) {
    try {
      // Midtrans is the source of truth; this also covers a slow webhook.
      order = await syncVipOrder(orderId, "/vip/confirmed");
    } catch (error) {
      console.error("[vip] failed to check order", error);
      checkFailed = true;
      order = await getVipOrder(orderId).catch(() => null);
    }
  }

  const paid = order?.status === "paid";
  const closed = order?.status === "expired";
  const [kicker, title, body] = !order
    ? ["VIP tickets", "We could not find that order.", "Check the link from Midtrans, or start again with your booking code."]
    : paid
      ? ["Payment received", "Your VIP tickets are confirmed.", "We send the confirmation by email and WhatsApp."]
      : closed
        ? ["VIP tickets", "That payment did not go through.", "Your tickets were released. You can try again with your booking code."]
        : ["VIP tickets", checkFailed ? "We could not check that payment." : "Waiting for your payment.", "If you already paid, give it a minute and refresh. Keep your Midtrans receipt."];

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">{kicker}</p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-balance text-white sm:text-5xl">{title}</h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-pretty text-white/65 sm:text-base">{body}</p>
      {order ? (
        <dl className="pass-panel mt-10 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-5 text-left text-sm sm:px-6">
          <dt className="text-white/50">VIP order</dt>
          <dd className="text-gold-bright select-all tabular-nums">{order.orderId}</dd>
          <dt className="text-white/50">Tickets</dt>
          <dd className="text-white">{order.quantity}</dd>
          <dt className="text-white/50">Amount</dt>
          <dd className="text-white">{formatIdr(order.amountIdr)}</dd>
        </dl>
      ) : null}
      <Link
        href={order ? `/vip?code=${encodeURIComponent(order.reservationOrderId)}` : "/vip"}
        className="btn-press mt-10 inline-flex items-center justify-center self-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white"
      >
        Back to VIP tickets
      </Link>
    </div>
  );
}
