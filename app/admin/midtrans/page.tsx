import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";

import { listMidtransCallbacks, statusTone, type MidtransCallback } from "@/lib/midtrans/log";

import { dateTime, Dot, PageHeader, paymentTypeLabel, Stat, Th } from "../ui";

export const metadata: Metadata = {
  title: "Midtrans",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SOURCES: Record<string, string> = {
  http_notification: "Webhook",
  snap_js: "Snap popup",
  window_redirect: "Redirect",
};

const ORDER_ID_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MidtransPage({ searchParams }: PageProps<"/admin/midtrans">) {
  await requireAdmin("/admin/midtrans");
  const params = await searchParams;
  const order = one(params.order);
  const orderId = order && ORDER_ID_RE.test(order) ? order : undefined;
  const webhooksOnly = one(params.source) === "webhook";

  const callbacks = await listMidtransCallbacks({ orderId });
  const webhooks = callbacks.filter((row) => row.source === "http_notification");
  const signed = webhooks.filter((row) => row.signatureValid === true);
  const shown = webhooksOnly ? webhooks : callbacks;

  function href(next: { webhook?: boolean }) {
    const query = new URLSearchParams();
    if (orderId) query.set("order", orderId);
    if (next.webhook) query.set("source", "webhook");
    const qs = query.toString();
    return qs ? `/admin/midtrans?${qs}` : "/admin/midtrans";
  }

  return (
    <>
      <PageHeader title="Midtrans">
        <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
          <Stat
            label="Last webhook"
            value={signed[0] ? dateTime.format(signed[0].createdAt) : "None yet"}
          />
          <Stat label="Signed" value={signed.length} />
          <Stat
            label="Rejected"
            value={webhooks.filter((row) => row.signatureValid !== true).length}
          />
        </dl>
      </PageHeader>

      <div className="flex flex-col gap-4 border-b border-white/12 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Source" className="flex border border-white/15 p-0.5 text-[13px]">
          {[
            { label: "Everything", count: callbacks.length, href: href({}), active: !webhooksOnly },
            {
              label: "Webhooks",
              count: webhooks.length,
              href: href({ webhook: true }),
              active: webhooksOnly,
            },
          ].map((option) => (
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
              <span className={cn("tabular-nums", option.active ? "text-ink/50" : "text-white/35")}>
                {option.count}
              </span>
            </Link>
          ))}
        </div>
        {orderId ? (
          <p className="flex items-center gap-3 text-[13px]">
            <span className="text-white/45">Booking</span>
            <span className="font-mono text-xs text-white">{orderId}</span>
            <Link href="/admin/midtrans" className="text-white/60 underline underline-offset-4 hover:text-white">
              Clear
            </Link>
          </p>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <p className="py-24 text-center text-sm text-white/50">
          Nothing from Midtrans{orderId ? " for this booking" : ""} yet.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="text-[11px] tracking-[0.14em] text-white/40 uppercase">
              <Th>Received</Th>
              <Th>From</Th>
              <Th>Booking</Th>
              <Th>Midtrans status</Th>
              <Th>Signature</Th>
              <Th>
                <span className="sr-only">Payload</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {shown.map((row) => (
              <CallbackRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function CallbackRow({ row }: { row: MidtransCallback }) {
  const isWebhook = row.source === "http_notification";
  const tone = statusTone(row.transactionStatus);
  const payment = paymentTypeLabel(row.paymentType);

  return (
    <tr className="grid grid-cols-2 gap-x-4 gap-y-2 py-4 align-top md:table-row md:py-0">
      <td className="text-white/60 tabular-nums md:py-4 md:pr-6 md:whitespace-nowrap">
        {dateTime.format(row.createdAt)}
        <div className="mt-1 text-[13px] text-white/35">#{row.id}</div>
      </td>
      <td className="md:py-4 md:pr-6 md:whitespace-nowrap">
        <span className={isWebhook ? "text-white" : "text-white/60"}>
          {SOURCES[row.source] ?? row.source}
        </span>
        <div className="mt-1 text-[13px] text-white/40">
          {row.event && row.event !== "notification" ? row.event : row.ip ?? "—"}
        </div>
      </td>
      <td className="col-span-2 md:col-span-1 md:py-4 md:pr-6 md:whitespace-nowrap">
        {row.orderId ? (
          <Link
            href={`/admin/midtrans?order=${encodeURIComponent(row.orderId)}`}
            className="font-mono text-xs text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            {row.orderId}
          </Link>
        ) : (
          <span className="text-white/45">No order id</span>
        )}
      </td>
      <td className="md:py-4 md:pr-6 md:whitespace-nowrap">
        {row.transactionStatus ? (
          <span className="inline-flex items-center gap-2 text-white">
            <Dot tone={tone} />
            {row.transactionStatus}
            {row.fraudStatus && row.fraudStatus !== "accept" ? (
              <span className="text-white/45">· fraud {row.fraudStatus}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-white/40">—</span>
        )}
        {payment || row.grossAmount ? (
          <div className="mt-1 text-[13px] text-white/45">
            {[payment, row.grossAmount ? `Rp ${Number(row.grossAmount).toLocaleString("id-ID")}` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        ) : null}
      </td>
      <td className="md:py-4 md:pr-6 md:whitespace-nowrap">
        <Signature row={row} />
      </td>
      <td className="col-span-2 md:col-span-1 md:py-4 md:text-right">
        <details className="group text-left">
          <summary className="cursor-pointer list-none text-[13px] text-white/50 transition-colors hover:text-white md:text-right [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show payload</span>
            <span className="hidden group-open:inline">Hide payload</span>
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto border border-white/12 bg-white/[0.03] p-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-white/70 md:w-96">
            {JSON.stringify(row.payload, null, 2)}
          </pre>
        </details>
      </td>
    </tr>
  );
}

function Signature({ row }: { row: MidtransCallback }) {
  if (row.source !== "http_notification") {
    return <span className="text-white/35">Not signed</span>;
  }
  if (row.signatureValid === true) {
    return (
      <span className="inline-flex items-center gap-2 text-white">
        <Dot tone="paid" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-white">
      <Dot tone="alert" />
      {row.signatureValid === false ? "Invalid" : "Missing"}
    </span>
  );
}
