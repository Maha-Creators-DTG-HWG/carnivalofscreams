import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-auth";
import { isManualBooking, listReservations } from "@/lib/reservations";

import TablesView, { type TableBooking } from "./TablesView";

export const metadata: Metadata = {
  title: "Tables",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  await requireAdmin("/admin/tables");

  // listReservations expires stale holds first, so "pending" here is a live hold.
  const all = await listReservations();
  const bookings: TableBooking[] = all.flatMap((reservation) => {
    if (!reservation.seatId) return [];
    if (reservation.status !== "paid" && reservation.status !== "pending") return [];
    return [
      {
        nightId: reservation.nightId,
        seatId: reservation.seatId,
        kind: isManualBooking(reservation)
          ? "manual"
          : reservation.status === "paid"
            ? "paid"
            : "pending",
        name: reservation.name,
        phone: reservation.phone,
        nik: reservation.nik ?? "",
        notes: reservation.notes,
        email: reservation.email,
        orderId: reservation.orderId,
        amountIdr: reservation.amountIdr,
        expiresAt: reservation.expiresAt,
      },
    ];
  });

  return <TablesView bookings={bookings} />;
}
