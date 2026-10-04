import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-auth";
import { listMidtransDigests } from "@/lib/midtrans/log";
import { listReservations, type ReservationRecord } from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import { getNight, getTablePackage } from "@/lib/tables";
import { waMeUrl } from "@/lib/wa-me";

import { paymentTypeLabel } from "./ui";
import ReservationsView, { type AdminReservation } from "./ReservationsView";

export const metadata: Metadata = {
  title: "Reservations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function isTest(reservation: ReservationRecord) {
  return reservation.email.endsWith("@example.com");
}

function describe(reservation: ReservationRecord) {
  const seat = reservation.seatId ? getSeat(reservation.seatId) : undefined;
  const pack = getTablePackage(reservation.packageId);
  const night = getNight(reservation.nightId);
  return {
    table: seat?.label ?? null,
    area: pack?.name ?? reservation.packageId,
    night: night?.short ?? reservation.nightId,
    nightLong: night?.label ?? reservation.nightId,
  };
}

function whatsappText(reservation: ReservationRecord) {
  const { table, area, nightLong } = describe(reservation);
  return `Hi ${reservation.name}, this is Carnaval of Screams about your table reservation (${table ?? area}, ${nightLong}). Booking code: ${reservation.orderId}.`;
}

export default async function AdminPage() {
  await requireAdmin("/admin");

  // Fetch everything once; the night and status filters run in the browser,
  // so switching them never waits on the database.
  const [all, digests] = await Promise.all([listReservations(), listMidtransDigests()]);
  const rows: AdminReservation[] = all.map((reservation) => {
    const { table, area, night } = describe(reservation);
    return {
      orderId: reservation.orderId,
      name: reservation.name,
      email: reservation.email,
      phone: reservation.phone,
      nik: reservation.nik,
      status: reservation.status,
      amountIdr: reservation.amountIdr,
      payment: paymentTypeLabel(reservation.channelId),
      nightId: reservation.nightId,
      table,
      area,
      night,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      whatsappUrl: waMeUrl(reservation.phone, whatsappText(reservation)),
      test: isTest(reservation),
      midtrans: digests.get(reservation.orderId) ?? null,
    };
  });

  return <ReservationsView rows={rows} />;
}

