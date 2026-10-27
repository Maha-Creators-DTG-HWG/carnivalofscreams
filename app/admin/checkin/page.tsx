import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin-auth";
import { checkinBoard, todayInJakarta, type BoardEntry } from "@/lib/checkin";
import { NIGHTS, type NightId } from "@/lib/tables";

import CheckinView from "./CheckinView";

export const metadata: Metadata = {
  title: "Check-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requireAdmin("/admin/checkin");

  const entries = await Promise.all(NIGHTS.map(async (night) => [night.id, await checkinBoard(night.id)] as const));
  const boards = Object.fromEntries(entries) as Record<NightId, BoardEntry[]>;
  // On the day the gate opens on tonight's table plan; any other day, on Day 1.
  const today = todayInJakarta();
  const defaultNight = NIGHTS.find((night) => night.date === today)?.id ?? NIGHTS[0].id;

  return <CheckinView boards={boards} defaultNight={defaultNight} />;
}
