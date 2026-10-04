import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin-auth";

import { listMidtransCallbacks, statusTone, type MidtransCallback } from "@/lib/midtrans/log";

import { dateTime, Dot, PageHeader, paymentTypeLabel, Stat } from "../ui";
import CallbackList from "./CallbackList";

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
  const [, params] = await Promise.all([requireAdmin("/admin/midtrans"), searchParams]);
  const order = one(params.order);
  const orderId = order && ORDER_ID_RE.test(order) ? order : undefined;

  const callbacks = await listMidtransCallbacks({ orderId });
  const webhooks = callbacks.filter((row) => row.source === "http_notification");
  const signed = webhooks.filter((row) => row.signatureValid === true);

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

      {/* Rows render here on the server; the Everything/Webhooks switch only
          picks which of them to show, in the browser. */}
      <CallbackList
        orderId={orderId}
        rows={callbacks.map((row) => ({
          id: row.id,
          webhook: row.source === "http_notification",
          node: <CallbackRow key={row.id} row={row} />,
        }))}
      />
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
