import type { Metadata } from "next";
import Link from "next/link";

import SeatPicker from "@/components/SeatPicker";
import {
  insertAuditLogSafe,
  insertMidtransCallbackSafe,
  requestMeta,
} from "@/lib/audit";
import { sendReservationInvoice } from "@/lib/invoice";
import {
  getTransactionStatus,
  isExpiredStatus,
  isFailedStatus,
  isPaidStatus,
  isPendingStatus,
  summarizeReservation,
} from "@/lib/midtrans";
import {
  expireReservationHoldSafe,
  getReservationSafe,
  listTakenSeatIdsSafe,
  markReservationPaidSafe,
  PAID_CONFLICT,
  releaseExpiredHoldsSafe,
} from "@/lib/reservations";
import { PAYMENT_DUE_MINUTES } from "@/lib/midtrans";
import { getSeat } from "@/lib/seats";

export const metadata: Metadata = {
  title: "Reservation status",
  description: "Your Carnaval of Screams table reservation status.",
};

export const dynamic = "force-dynamic";

const ORDER_ID_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function flattenSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value[0]) flat[key] = value[0];
    } else if (typeof value === "string" && value.length > 0) {
      flat[key] = value;
    }
  }
  return flat;
}

export default async function ReservationConfirmedPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const query = flattenSearchParams(params);
  const orderId = (query.order_id ?? query.orderId ?? "").trim();
  const meta = await requestMeta();

  await insertMidtransCallbackSafe({
    source: "window_redirect",
    event: "finish",
    orderId: orderId || null,
    statusCode: query.status_code ?? null,
    transactionStatus: query.transaction_status ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    payload: query,
  });

  await insertAuditLogSafe({
    event: "reservation.confirmed.view",
    orderId: orderId || null,
    method: "GET",
    path: "/reserve/confirmed",
    ip: meta.ip,
    userAgent: meta.userAgent,
    payload: query,
  });

  if (!orderId || !ORDER_ID_RE.test(orderId)) {
    return (
      <StatusShell
        kicker="Reservation"
        title="We could not find that order."
        body="Check the link from Midtrans, or start a new table hold."
        action={{ href: "/reserve", label: "Reserve a table" }}
      />
    );
  }

  let reservation = await getReservationSafe(orderId);
  await releaseExpiredHoldsSafe();
  if (reservation) {
    reservation = (await getReservationSafe(orderId)) ?? reservation;
  }
  let status;
  try {
    status = await getTransactionStatus(orderId);
  } catch {
    if (!reservation) {
      return (
        <StatusShell
          kicker="Reservation"
          title="We could not check that payment."
          body="Try again in a moment. If you already paid, keep your Midtrans receipt."
          action={{ href: "/reserve", label: "Reserve a table" }}
        />
      );
    }
  }

  const transactionStatus =
    status?.transactionStatus ?? reservation?.transactionStatus ?? undefined;
  const paid =
    reservation?.status === "paid" ||
    isPaidStatus(status?.transactionStatus, status?.fraudStatus);
  const failed = isFailedStatus(transactionStatus);
  const pending = isPendingStatus(transactionStatus);

  if (
    paid &&
    reservation?.status !== "paid" &&
    reservation?.status !== PAID_CONFLICT
  ) {
    reservation =
      (await markReservationPaidSafe({
        orderId,
        transactionStatus: transactionStatus ?? "settlement",
        channelId: status?.paymentType ?? reservation?.channelId,
      })) ?? reservation;
  }

  if (paid) {
    reservation = (await getReservationSafe(orderId)) ?? reservation;
  }

  const summary = summarizeReservation({
    orderId,
    amount:
      reservation?.amountIdr ??
      (status?.grossAmount ? Number.parseFloat(status.grossAmount) : undefined),
    nightId: reservation?.nightId,
    packageId: reservation?.packageId,
  });
  // Paid after the hold lapsed and the table went to someone else: the seat on
  // the row is not the guest's, so never show it as theirs.
  const conflict = reservation?.status === PAID_CONFLICT;
  const seat =
    reservation?.seatId && !conflict ? getSeat(reservation.seatId) : undefined;

  const details = (
    <div className="pass-panel mt-10 text-left">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <p className="font-heading text-[11px] tracking-[0.32em] text-white/55">
          Booking code
        </p>
        <p className="mt-1.5 text-lg font-medium tracking-[0.04em] text-gold-bright normal-case tabular-nums select-all">
          {orderId}
        </p>
      </div>
      <DetailList
        rows={[
          ["Day", summary.night && `${summary.night.day} · ${summary.night.label}`],
          ["Area", summary.table?.name],
          ["Table", seat?.label],
          ["Booking fee", summary.amountLabel],
        ]}
      />
      <DetailList
        className="border-t border-white/10"
        rows={[
          ["Name", reservation?.name],
          ["NIK", reservation?.nik && maskNik(reservation.nik)],
          ["Phone", reservation?.phone],
          ["Email", reservation?.email],
        ]}
      />
    </div>
  );

  if (conflict) {
    return (
      <StatusShell
        kicker="Payment received"
        title="We have your payment."
        body="Your payment arrived after the hold on your table ended, and that table has since been booked. We will contact you by WhatsApp or email to move you to another table or refund you. Keep your booking code."
        action={{ href: "/", label: "Back home" }}
      >
        {details}
      </StatusShell>
    );
  }

  if (paid && reservation && !reservation.seatId) {
    const takenSeatIds = await listTakenSeatIdsSafe(reservation.nightId);
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
        <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
          Payment received
        </p>
        <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-white sm:text-5xl">
          Pick your table.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
          Choose a table in {summary.table?.name ?? "the paid area"}. We send
          the invoice by email and WhatsApp after you confirm.
        </p>
        <div className="mt-10">
          <SeatPicker
            orderId={orderId}
            packageId={reservation.packageId}
            takenSeatIds={takenSeatIds}
          />
        </div>
      </div>
    );
  }

  if (paid && reservation?.seatId) {
    await sendReservationInvoice(reservation, "/reserve/confirmed");
    return (
      <StatusShell
        kicker="Reservation held"
        title="Your table is held."
        body="The invoice is on its way by email and WhatsApp. Bring the booking code to the door."
        action={{ href: "/", label: "Back home" }}
      >
        {details}
      </StatusShell>
    );
  }

  const expired =
    reservation?.status === "expired" ||
    isExpiredStatus(transactionStatus);

  if (expired) {
    if (reservation?.status === "pending") {
      await expireReservationHoldSafe(orderId, transactionStatus ?? "expire");
    }
    return (
      <StatusShell
        kicker="Hold released"
        title="This table is free again."
        body="The payment window closed, so the hold expired with it. Start a new table hold if you still want a table."
        action={{ href: "/reserve", label: "Reserve a table" }}
      >
        {details}
      </StatusShell>
    );
  }

  if (pending || (reservation && !failed)) {
    return (
      <StatusShell
        kicker="Awaiting payment"
        title="Finish paying to keep this table."
        body={`Complete the transfer in Midtrans. This table stays held until the ${PAYMENT_DUE_MINUTES}-minute payment window closes.`}
        action={{ href: "/reserve", label: "Start again" }}
      >
        {details}
      </StatusShell>
    );
  }

  if (!status?.transactionStatus) {
    return (
      <StatusShell
        kicker="Reservation"
        title="We could not find that order."
        body="If you just paid, wait a few seconds and refresh. Otherwise start a new table hold."
        action={{ href: "/reserve", label: "Reserve a table" }}
      />
    );
  }

  return (
    <StatusShell
      kicker="Reservation"
      title="This payment is not confirmed."
      body="If you already paid, wait a moment and refresh. Otherwise try another table hold."
      action={{ href: "/reserve", label: "Reserve a table" }}
    >
      {details}
    </StatusShell>
  );
}

// The page is reachable by anyone holding the order link, so keep the ID number partial.
function maskNik(nik: string) {
  return nik.length > 4 ? `•••• ${nik.slice(-4)}` : nik;
}

function DetailList({
  rows,
  className = "",
}: {
  rows: [label: string, value: string | null | undefined][];
  className?: string;
}) {
  const visible = rows.filter(([, value]) => value);
  if (visible.length === 0) return null;
  return (
    <dl
      className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4 gap-y-2.5 px-5 py-4 text-sm sm:px-6 ${className}`}
    >
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-white/55">{label}</dt>
          <dd className="min-w-0 break-words text-white/90 tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatusShell({
  kicker,
  title,
  body,
  action,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  action: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
        {kicker}
      </p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-balance text-white sm:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-pretty text-white/65 sm:text-base">
        {body}
      </p>
      {children}
      <Link
        href={action.href}
        className="btn-press mt-10 inline-flex items-center justify-center self-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white"
      >
        {action.label}
      </Link>
    </div>
  );
}
