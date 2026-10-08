import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-auth";
import { isManualBooking, listReservations } from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import { getNight, NIGHTS } from "@/lib/tables";
import { DEFAULT_VIP_LIMIT, holdsTickets, listVipLimits, listVipOrders, VIP_PRICE_IDR } from "@/lib/vip";

import { paymentTypeLabel } from "../ui";
import VipAdminView, { type VipBookingRow, type VipOrderRow } from "./VipAdminView";

export const metadata: Metadata = {
  title: "VIP tickets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VipAdminPage() {
  await requireAdmin("/admin/vip");

  const [reservations, orders, limits] = await Promise.all([
    listReservations(),
    listVipOrders(),
    listVipLimits(),
  ]);

  const paidBookings = reservations.filter(
    (reservation) => reservation.status === "paid" && !isManualBooking(reservation),
  );
  const byCode = new Map(paidBookings.map((reservation) => [reservation.orderId, reservation]));
  const label = (code: string) => {
    const reservation = byCode.get(code);
    const seat = reservation?.seatId ? getSeat(reservation.seatId) : undefined;
    return {
      guest: reservation?.name ?? null,
      table: seat?.label ?? null,
      night: getNight(reservation?.nightId ?? "")?.short ?? "",
    };
  };

  const orderRows: VipOrderRow[] = orders.map((order) => ({
    orderId: order.orderId,
    code: order.reservationOrderId,
    ...label(order.reservationOrderId),
    quantity: order.quantity,
    amountIdr: order.amountIdr,
    // A pending order past its payment window no longer holds anything.
    status: order.status === "paid" ? "paid" : holdsTickets(order) ? "pending" : "expired",
    payment: paymentTypeLabel(order.channelId),
    createdAt: order.createdAt,
  }));

  const bookings: VipBookingRow[] = paidBookings.map((reservation) => {
    const mine = orders.filter((order) => order.reservationOrderId === reservation.orderId);
    const count = (status: string) =>
      mine
        .filter((order) => (status === "paid" ? order.status === "paid" : order.status === "pending" && holdsTickets(order)))
        .reduce((total, order) => total + order.quantity, 0);
    const { guest, table, night } = label(reservation.orderId);
    return {
      code: reservation.orderId,
      guest: guest ?? "",
      table,
      night,
      limit: limits.get(reservation.orderId) ?? DEFAULT_VIP_LIMIT,
      sold: count("paid"),
      held: count("pending"),
    };
  });

  const nightTotals = NIGHTS.map((night) => ({
    night: `${night.short} sold`,
    sold: orderRows
      .filter((order) => order.status === "paid" && order.night === night.short)
      .reduce((total, order) => total + order.quantity, 0),
  }));

  return (
    <VipAdminView
      priceIdr={VIP_PRICE_IDR}
      nightTotals={nightTotals}
      bookings={bookings}
      orders={orderRows}
    />
  );
}
