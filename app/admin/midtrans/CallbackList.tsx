"use client";

import { cn } from "cn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Th } from "../ui";

type Row = { id: number; webhook: boolean; node: React.ReactNode };

export default function CallbackList({ orderId, rows }: { orderId?: string; rows: Row[] }) {
  const webhooksOnly = useSearchParams().get("source") === "webhook";
  const webhookCount = rows.filter((row) => row.webhook).length;
  const shown = webhooksOnly ? rows.filter((row) => row.webhook) : rows;

  function setWebhooksOnly(next: boolean) {
    const query = new URLSearchParams();
    if (orderId) query.set("order", orderId);
    if (next) query.set("source", "webhook");
    const qs = query.toString();
    window.history.pushState(null, "", qs ? `/admin/midtrans?${qs}` : "/admin/midtrans");
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-white/12 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Source" className="flex border border-white/15 p-0.5 text-[13px]">
          {[
            { label: "Everything", count: rows.length, value: false },
            { label: "Webhooks", count: webhookCount, value: true },
          ].map((option) => {
            const active = webhooksOnly === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                onClick={() => setWebhooksOnly(option.value)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 px-3 whitespace-nowrap transition-colors sm:flex-none",
                  active ? "bg-white text-ink" : "text-white/60 hover:text-white",
                )}
              >
                {option.label}
                <span className={cn("tabular-nums", active ? "text-ink/50" : "text-white/35")}>
                  {option.count}
                </span>
              </button>
            );
          })}
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
          <tbody className="divide-y divide-white/8">{shown.map((row) => row.node)}</tbody>
        </table>
      )}
    </>
  );
}
