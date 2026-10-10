import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VIP_TICKET_URL } from "@/lib/site";
import { isPaidTableBooking, normalizeBookingCode } from "@/lib/vip";

import VipView from "./VipView";

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
  const code = normalizeBookingCode(first(params.code));

  // A paid table booking is the only thing that opens the door.
  let valid = false;
  let error: string | undefined;
  if (code) {
    try {
      valid = await isPaidTableBooking(code);
      if (!valid) error = "code";
    } catch (cause) {
      console.error("[vip] failed to check booking code", cause);
      error = "lookup";
    }
  }

  // redirect() throws, so it stays outside the try.
  if (valid && VIP_TICKET_URL) redirect(VIP_TICKET_URL);
  if (valid) error = "closed";

  return <VipView code={code} error={error} />;
}
