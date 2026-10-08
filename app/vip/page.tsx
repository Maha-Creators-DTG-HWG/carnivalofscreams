import type { Metadata } from "next";

import { getSeat } from "@/lib/seats";
import { getNight } from "@/lib/tables";
import { getVipAllowance, getVipPrice } from "@/lib/vip";

import VipView, { type VipAllowanceView } from "./VipView";

export const metadata: Metadata = {
  title: "VIP tickets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function VipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = first(params.code).trim();
  let error = first(params.error) || undefined;

  let allowance: VipAllowanceView | null = null;
  let priceIdr: number | null = null;
  if (code) {
    try {
      priceIdr = await getVipPrice();
      const found = await getVipAllowance(code);
      if (found) {
        const night = getNight(found.reservation.nightId);
        const seat = found.reservation.seatId ? getSeat(found.reservation.seatId) : undefined;
        allowance = {
          code,
          night: night ? `${night.day} · ${night.label}` : found.reservation.nightId,
          table: seat?.label ?? null,
          limit: found.limit,
          sold: found.sold,
          held: found.held,
          remaining: found.remaining,
        };
      } else {
        error ??= "code";
      }
    } catch (cause) {
      console.error("[vip] failed to load allowance", cause);
      error ??= "payment";
    }
  }

  return <VipView code={code} error={error} priceIdr={priceIdr} allowance={allowance} />;
}
