import { cn } from "cn";

import { formatIdr } from "@/lib/tables";

import { dateTime, Dot, PageHeader, Stat, Th } from "../ui";
import { saveVipLimit } from "./actions";

export type VipBookingRow = {
  code: string;
  guest: string;
  table: string | null;
  night: string;
  limit: number;
  sold: number;
  held: number;
};

export type VipOrderRow = {
  orderId: string;
  code: string;
  guest: string | null;
  table: string | null;
  night: string;
  quantity: number;
  amountIdr: number;
  status: "paid" | "pending" | "expired";
  payment: string | null;
  createdAt: Date | null;
};

const STATUS = {
  paid: { label: "Paid", tone: "paid" },
  pending: { label: "Awaiting payment", tone: "pending" },
  expired: { label: "Expired", tone: "none" },
} as const;

export default function VipAdminView({
  priceIdr,
  nightTotals,
  bookings,
  orders,
}: {
  priceIdr: number | null;
  nightTotals: { night: string; sold: number }[];
  bookings: VipBookingRow[];
  orders: VipOrderRow[];
}) {
  const paid = orders.filter((order) => order.status === "paid");
  const sold = paid.reduce((total, order) => total + order.quantity, 0);
  const revenue = paid.reduce((total, order) => total + order.amountIdr, 0);
  const awaiting = orders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.quantity, 0);

  return (
    <>
      <PageHeader title="VIP tickets">
        <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
          <Stat label="Sold" value={String(sold)} />
          {nightTotals.map((night) => (
            <Stat key={night.night} label={night.night} value={String(night.sold)} />
          ))}
          <Stat label="Awaiting payment" value={String(awaiting)} />
          <Stat label="Collected" value={formatIdr(revenue)} />
        </dl>
      </PageHeader>

      <p className="border-b border-white/12 py-4 text-[13px] text-white/50">
        {priceIdr === null
          ? "The page is closed: no price is set yet (VIP_PRICE_IDR in lib/vip.ts)."
          : `${formatIdr(priceIdr)} per ticket.`}{" "}
        Guests enter their booking code at <span className="text-white/70">/vip</span>. A booking with a
        limit of 0 cannot buy yet.
      </p>

      <section aria-labelledby="limits" className="pt-10">
        <h2 id="limits" className="font-heading text-lg tracking-[0.14em] text-white">
          Booking limits
        </h2>
        {bookings.length === 0 ? (
          <p className="py-12 text-sm text-white/50">No paid table bookings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] tracking-[0.14em] text-white/40 uppercase">
                  <Th>Guest</Th>
                  <Th>Table</Th>
                  <Th>Booking code</Th>
                  <Th className="text-right">Bought</Th>
                  <Th className="text-right">Awaiting</Th>
                  <Th>Limit</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {bookings.map((booking) => (
                  <tr key={booking.code} className="transition-colors hover:bg-white/[0.03]">
                    <td className="py-3 pr-5 text-white">{booking.guest}</td>
                    <td className="py-3 pr-5 whitespace-nowrap">
                      {booking.table ?? "—"} <span className="text-white/40">· {booking.night}</span>
                    </td>
                    <td className="py-3 pr-5 whitespace-nowrap text-white/60 select-all tabular-nums">
                      {booking.code}
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums">{booking.sold}</td>
                    <td className="py-3 pr-5 text-right tabular-nums">{booking.held || "—"}</td>
                    <td className="py-3">
                      <form action={saveVipLimit} className="flex items-center gap-2">
                        <input type="hidden" name="code" value={booking.code} />
                        <label className="sr-only" htmlFor={`max-${booking.code}`}>
                          VIP ticket limit for {booking.guest}
                        </label>
                        <input
                          id={`max-${booking.code}`}
                          name="max"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={99}
                          defaultValue={booking.limit}
                          className="w-16 border border-white/15 bg-black/40 px-2 py-1.5 text-white tabular-nums outline-none focus:border-white/70"
                        />
                        <button
                          type="submit"
                          className="border border-white/20 px-3 py-1.5 text-[13px] text-white/70 transition-colors hover:border-white/50 hover:text-white"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="orders" className="pt-14">
        <h2 id="orders" className="font-heading text-lg tracking-[0.14em] text-white">
          Orders
        </h2>
        {orders.length === 0 ? (
          <p className="py-12 text-sm text-white/50">No VIP orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] tracking-[0.14em] text-white/40 uppercase">
                  <Th>When</Th>
                  <Th>Guest</Th>
                  <Th>Table</Th>
                  <Th className="text-right">Tickets</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Order</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className={cn(
                      "transition-colors hover:bg-white/[0.03]",
                      order.status === "expired" && "text-white/45",
                    )}
                  >
                    <td className="py-3 pr-5 whitespace-nowrap text-white/60 tabular-nums">
                      {order.createdAt ? dateTime.format(order.createdAt) : "—"}
                    </td>
                    <td className="py-3 pr-5 text-white">{order.guest ?? order.code}</td>
                    <td className="py-3 pr-5 whitespace-nowrap">
                      {order.table ?? "—"} <span className="text-white/40">· {order.night}</span>
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums">{order.quantity}</td>
                    <td className="py-3 pr-5 text-right tabular-nums">{formatIdr(order.amountIdr)}</td>
                    <td className="py-3 pr-5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <Dot tone={STATUS[order.status].tone} />
                        {STATUS[order.status].label}
                        {order.payment ? <span className="text-white/40">· {order.payment}</span> : null}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap text-white/50 select-all tabular-nums">
                      {order.orderId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
