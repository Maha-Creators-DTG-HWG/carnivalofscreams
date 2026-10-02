import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";

import { digestByOrder, listMidtransCallbacks, type MidtransDigest } from "@/lib/midtrans/log";
import { listReservations, type ReservationRecord } from "@/lib/reservations";
import { getSeat } from "@/lib/seats";
import { formatIdr, getNight, getTablePackage, NIGHTS, type NightId } from "@/lib/tables";
import { waMeUrl } from "@/lib/wa-me";

import { dateTime, Dot, PageHeader, paymentTypeLabel, Stat, Th, time } from "./ui";

export const metadata: Metadata = {
  title: "Reservations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUSES = [
  { id: "paid", label: "Paid", tone: "paid" },
  { id: "pending", label: "Holding", tone: "pending" },
  { id: "expired", label: "Expired", tone: "none" },
] as const;

type StatusId = (typeof STATUSES)[number]["id"];

function paymentLabel(reservation: ReservationRecord) {
  return paymentTypeLabel(reservation.channelId);
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStatus(id: string) {
  return STATUSES.find((status) => status.id === id) ?? STATUSES[2];
}

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

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin("/admin");
  const params = await searchParams;
  const nightId = NIGHTS.find((night) => night.id === one(params.night))?.id as
    | NightId
    | undefined;
  const status = STATUSES.find((value) => value.id === one(params.status))?.id as
    | StatusId
    | undefined;

  // One read; counts for every filter come from the same rows.
  const [all, callbacks] = await Promise.all([
    listReservations(),
    listMidtransCallbacks({ limit: 5000 }),
  ]);
  const digests = digestByOrder(callbacks);
  const inNight = nightId ? all.filter((row) => row.nightId === nightId) : all;
  const shown = status ? inNight.filter((row) => row.status === status) : inNight;
  const paid = inNight.filter((row) => row.status === "paid");
  const holding = inNight.filter((row) => row.status === "pending");

  function href(next: { night?: string; status?: string }) {
    const query = new URLSearchParams();
    const n = "night" in next ? next.night : nightId;
    const s = "status" in next ? next.status : status;
    if (n) query.set("night", n);
    if (s) query.set("status", s);
    const qs = query.toString();
    return qs ? `/admin?${qs}` : "/admin";
  }

  return (
    <>
        <PageHeader title="Reservations">
          <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
            <Stat label="Paid" value={String(paid.length)} />
            <Stat label="Holding" value={String(holding.length)} />
            <Stat
              label="Collected"
              value={formatIdr(paid.reduce((sum, row) => sum + row.amountIdr, 0))}
            />
          </dl>
        </PageHeader>

        <nav
          aria-label="Filters"
          className="flex flex-col gap-4 border-b border-white/12 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <Segmented
            label="Night"
            options={[
              { label: "Both nights", href: href({ night: undefined }), active: !nightId },
              ...NIGHTS.map((night) => ({
                label: night.short,
                href: href({ night: night.id }),
                active: nightId === night.id,
              })),
            ]}
          />
          <Segmented
            label="Status"
            options={[
              {
                label: "All",
                count: inNight.length,
                href: href({ status: undefined }),
                active: !status,
              },
              ...STATUSES.map((value) => ({
                label: value.label,
                count: inNight.filter((row) => row.status === value.id).length,
                href: href({ status: value.id }),
                active: status === value.id,
              })),
            ]}
          />
        </nav>

        {shown.length === 0 ? (
          <p className="py-24 text-center text-sm text-white/50">
            No reservations here yet.
            {status || nightId ? (
              <>
                {" "}
                <Link href="/admin" className="text-white underline underline-offset-4">
                  Show all
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-white/8 xl:hidden">
              {shown.map((reservation) => (
                <ReservationCard
                  key={reservation.orderId}
                  reservation={reservation}
                  midtrans={digests.get(reservation.orderId)}
                />
              ))}
            </ul>

            <table className="hidden w-full text-left text-sm xl:table">
              <thead>
                <tr className="text-[11px] tracking-[0.14em] text-white/40 uppercase">
                  <Th>Guest</Th>
                  <Th>Table</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Paid</Th>
                  <Th>Booking</Th>
                  <Th>
                    <span className="sr-only">Contact</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {shown.map((reservation) => (
                  <ReservationRow
                    key={reservation.orderId}
                    reservation={reservation}
                    midtrans={digests.get(reservation.orderId)}
                  />
                ))}
              </tbody>
            </table>
          </>
        )}
    </>
  );
}

type RowProps = { reservation: ReservationRecord; midtrans?: MidtransDigest };

function ReservationRow({ reservation, midtrans }: RowProps) {
  const { table, area, night } = describe(reservation);
  const faded = reservation.status === "expired";

  return (
    <tr className={cn("transition-colors hover:bg-white/[0.03]", faded && "text-white/45")}>
      <td className="py-4 pr-5">
        <GuestName reservation={reservation} faded={faded} />
        <div className="mt-1 text-[13px] text-white/45 tabular-nums">
          {reservation.phone}
          <span className="px-1.5 text-white/20">·</span>
          {reservation.email}
        </div>
      </td>
      <td className="py-4 pr-5 whitespace-nowrap">
        <div className={cn(faded ? "text-white/55" : "text-white")}>
          {table ?? <span className="text-white/45">No table yet</span>}
        </div>
        <div className="mt-1 text-[13px] text-white/45">
          {night} · {area}
        </div>
      </td>
      <td className="py-4 pr-5 whitespace-nowrap">
        <StatusLabel reservation={reservation} />
        <MidtransLine reservation={reservation} midtrans={midtrans} />
      </td>
      <td className="py-4 pr-5 text-right whitespace-nowrap tabular-nums">
        {reservation.status === "paid" ? (
          <span className="text-white">{formatIdr(reservation.amountIdr)}</span>
        ) : (
          <span className="text-white/45">{formatIdr(reservation.amountIdr)}</span>
        )}
        {paymentLabel(reservation) ? (
          <div className="mt-1 text-[13px] text-white/45">{paymentLabel(reservation)}</div>
        ) : null}
      </td>
      <td className="py-4 pr-5 whitespace-nowrap">
        <OrderLink orderId={reservation.orderId} />
        <div className="mt-1 text-[13px] text-white/40 tabular-nums">
          {reservation.createdAt ? dateTime.format(reservation.createdAt) : "—"}
          {reservation.nik ? (
            <>
              <span className="px-1.5 text-white/20">·</span>NIK {reservation.nik}
            </>
          ) : null}
        </div>
      </td>
      <td className="py-4 text-right">
        <WhatsAppLink reservation={reservation} />
      </td>
    </tr>
  );
}

function ReservationCard({ reservation, midtrans }: RowProps) {
  const { table, area, night } = describe(reservation);
  const faded = reservation.status === "expired";

  return (
    <li className={cn("py-5", faded && "text-white/45")}>
      <div className="flex items-start justify-between gap-4">
        <GuestName reservation={reservation} faded={faded} />
        <StatusLabel reservation={reservation} />
      </div>
      <p className="mt-1.5 text-sm">
        <span className={cn(faded ? "text-white/55" : "text-white")}>
          {table ?? "No table yet"}
        </span>
        <span className="text-white/45">
          {" "}
          · {night} · {area} · {formatIdr(reservation.amountIdr)}
          {paymentLabel(reservation) ? ` via ${paymentLabel(reservation)}` : null}
        </span>
      </p>
      <p className="mt-1 text-[13px] text-white/40">
        <OrderLink orderId={reservation.orderId} />
        {reservation.createdAt ? ` · ${dateTime.format(reservation.createdAt)}` : null}
      </p>
      {reservation.nik ? (
        <p className="mt-1 text-[13px] text-white/40 tabular-nums">NIK {reservation.nik}</p>
      ) : null}
      <MidtransLine reservation={reservation} midtrans={midtrans} />
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-sm text-white/60 tabular-nums">{reservation.phone}</span>
        <WhatsAppLink reservation={reservation} />
      </div>
    </li>
  );
}

function GuestName({
  reservation,
  faded,
}: {
  reservation: ReservationRecord;
  faded: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 font-medium", faded ? "text-white/60" : "text-white")}>
      {reservation.name}
      {isTest(reservation) ? (
        <span className="border border-white/15 px-1.5 py-px text-[10px] font-normal tracking-[0.14em] text-white/45 uppercase">
          Test
        </span>
      ) : null}
    </div>
  );
}

function StatusLabel({ reservation }: { reservation: ReservationRecord }) {
  const status = getStatus(reservation.status);
  return (
    <div className="text-sm">
      <span className="inline-flex items-center gap-2">
        <Dot tone={status.tone} />
        <span className={status.id === "expired" ? "text-white/45" : "text-white"}>
          {status.label}
        </span>
      </span>
      {status.id === "pending" && reservation.expiresAt ? (
        <div className="mt-1 pl-3.5 text-[13px] text-white/45 tabular-nums">
          until {time.format(reservation.expiresAt)}
        </div>
      ) : null}
    </div>
  );
}

function MidtransLine({ reservation, midtrans }: RowProps) {
  let tone: "paid" | "pending" | "none" | "alert" = "none";
  let text = "No webhook yet";
  if (midtrans?.midtransPaid && reservation.status !== "paid") {
    tone = "alert";
    text = "Midtrans says paid";
  } else if (midtrans?.lastStatus) {
    tone = midtrans.midtransPaid ? "paid" : "none";
    text = `Webhook: ${midtrans.lastStatus}${
      midtrans.lastAt ? ` · ${dateTime.format(midtrans.lastAt)}` : ""
    }`;
  } else if (midtrans?.awaitingWebhook) {
    tone = "pending";
    text = "Popup done, webhook not in";
  }

  return (
    <Link
      href={`/admin/midtrans?order=${encodeURIComponent(reservation.orderId)}`}
      className="mt-1 flex items-center gap-2 text-[13px] text-white/45 transition-colors hover:text-white"
    >
      <Dot tone={tone} />
      <span className={cn(tone === "alert" && "text-white")}>{text}</span>
    </Link>
  );
}

function OrderLink({ orderId }: { orderId: string }) {
  return (
    <Link
      href={`/admin/midtrans?order=${encodeURIComponent(orderId)}`}
      className="font-mono text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
    >
      {orderId}
    </Link>
  );
}

function WhatsAppLink({ reservation }: { reservation: ReservationRecord }) {
  return (
    <a
      href={waMeUrl(reservation.phone, whatsappText(reservation))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Message ${reservation.name} on WhatsApp`}
      className="btn-press inline-flex h-9 shrink-0 items-center gap-2 border border-white/20 px-3 text-[13px] text-white transition-[transform,border-color,background-color] hover:border-[#25D366]/60 hover:bg-[#25D366]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <WhatsAppGlyph />
      Message
    </a>
  );
}

function WhatsAppGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 text-[#25D366]" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}



function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex border border-white/15 p-0.5 text-[13px]">
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          aria-current={option.active ? "page" : undefined}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 px-3 whitespace-nowrap transition-colors sm:flex-none",
            option.active ? "bg-white text-ink" : "text-white/60 hover:text-white",
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className={cn("tabular-nums", option.active ? "text-ink/50" : "text-white/35")}>
              {option.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
