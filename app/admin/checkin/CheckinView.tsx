"use client";

import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import VenuePlan, { type SeatLook } from "@/components/VenuePlan";
import type { BoardEntry, CheckinView as View, SeatState, Verdict } from "@/lib/checkin";
import { getSeat, SEATS } from "@/lib/seats";
import { getSiteUrl } from "@/lib/site";
import { NIGHTS, type NightId } from "@/lib/tables";
import { invoiceWhatsAppUrl } from "@/lib/wa-me";

import { dateTime, PageHeader, Segmented, Stat } from "../ui";
import { checkCode, confirmCheckin, undoCheckin, type CheckinResult } from "./actions";

const TONE: Record<Verdict, { label: string; box: string; text: string }> = {
  valid: { label: "Valid", box: "border-emerald-400/70 bg-emerald-400/10", text: "text-emerald-300" },
  "wrong-day": { label: "Wrong day", box: "border-amber-300/70 bg-amber-300/10", text: "text-amber-200" },
  "checked-in": { label: "Already checked in", box: "border-amber-300/70 bg-amber-300/10", text: "text-amber-200" },
  invalid: { label: "Not valid", box: "border-destructive/80 bg-destructive/10", text: "text-red-300" },
};

const SEAT_LOOK: Record<SeatState | "available", { label: string; color: string; filled: boolean }> = {
  available: { label: "Available", color: "var(--gold-bright)", filled: false },
  booked: { label: "Sold out, not arrived", color: "var(--color-destructive)", filled: true },
  "checked-in": { label: "Checked in", color: "var(--color-emerald-400)", filled: true },
  holding: { label: "Paying now", color: "var(--color-amber-300)", filled: true },
};

const LEGEND = ["available", "booked", "checked-in", "holding"] as const;

// Same refresh rhythm as the Tables page; guests check in on other phones too.
const LIVE_MS = 5_000;

const BUTTON =
  "btn-press inline-flex h-12 items-center justify-center px-6 text-sm whitespace-nowrap disabled:opacity-60";

export default function CheckinView({
  boards,
  defaultNight,
}: {
  boards: Record<NightId, BoardEntry[]>;
  defaultNight: NightId;
}) {
  const router = useRouter();
  const [night, setNight] = useState<NightId>(defaultNight);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<CheckinResult>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.ok) {
        setView(result.view);
        router.refresh();
      } else setError(result.error);
    });
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, LIVE_MS);
    return () => clearInterval(id);
  }, [router]);

  const bySeat = new Map(boards[night].map((entry) => [entry.seatId, entry]));
  const counts = { booked: 0, "checked-in": 0, holding: 0 };
  for (const entry of boards[night]) counts[entry.state] += 1;
  const available = SEATS.length - boards[night].length;

  function look(seatId: string): SeatLook {
    const entry = bySeat.get(seatId);
    const base = SEAT_LOOK[entry?.state ?? "available"];
    const table = getSeat(seatId)?.label ?? seatId;
    return {
      color: base.color,
      filled: base.filled,
      label: entry ? `${table}: ${base.label}, ${entry.name || "no name"}` : `${table}: ${base.label}`,
    };
  }

  function pickSeat(seatId: string) {
    setSelectedSeat(seatId);
    const entry = bySeat.get(seatId);
    if (!entry) {
      setView(null);
      setError(null);
      return;
    }
    setCode(entry.orderId);
    run(() => checkCode(entry.orderId));
  }

  function next() {
    setView(null);
    setError(null);
    setCode("");
    inputRef.current?.focus();
  }

  const booking = view?.booking;
  const tone = view ? TONE[view.verdict] : null;

  return (
    <>
      <PageHeader title="Check-in">
        <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
          <Stat label="Checked in" value={String(counts["checked-in"])} />
          <Stat label="Not arrived" value={String(counts.booked)} />
          <Stat label="Available" value={String(available)} />
        </dl>
      </PageHeader>

      <nav aria-label="Night" className="flex border-b border-white/12 py-5">
        <Segmented
          label="Night"
          options={NIGHTS.map((value) => ({
            label: `${value.day} · ${value.short}`,
            active: night === value.id,
            onSelect: () => {
              setNight(value.id);
              setSelectedSeat(null);
            },
          }))}
        />
      </nav>

      <div className="grid gap-x-10 gap-y-8 pt-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="min-w-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) run(() => checkCode(code));
          }}
          className="flex gap-2"
        >
          <label htmlFor="booking-code" className="sr-only">
            Booking code
          </label>
          <input
            ref={inputRef}
            id="booking-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="COS-30-ETI-…"
            className="h-12 min-w-0 flex-1 border border-white/25 bg-white/[0.03] px-4 text-base text-white placeholder:text-white/40 focus-visible:border-white/70"
          />
          <button type="submit" disabled={pending || !code.trim()} className={cn(BUTTON, "bg-white text-ink")}>
            {pending && !view ? "Checking…" : "Check"}
          </button>
        </form>
        <p className="mt-2 text-[13px] text-white/50">
          Type or paste the guest&rsquo;s booking code, or scan it with a barcode reader.
        </p>

        {error ? (
          <p role="alert" className="mt-6 inline-flex items-center gap-2 text-[13px] text-white/80">
            <span className="pass-signal shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {view && tone ? (
          <section
            aria-live="polite"
            className={cn("mt-8 border-2 px-5 py-6 sm:px-7", tone.box, pending && "opacity-70")}
          >
            <p className={cn("font-heading text-3xl tracking-[0.12em] sm:text-4xl", tone.text)}>{tone.label}</p>
            <p className="mt-2 text-sm text-white">{view.message}</p>
            {view.checkedInAt ? (
              <p className="mt-1 text-[13px] text-white/60">
                Checked in at {dateTime.format(new Date(view.checkedInAt))}
              </p>
            ) : null}

            {booking ? (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-[15px]">
                <Row label="Name" value={booking.name || "No name"} strong />
                <Row label="NIK" value={booking.nik || "Not given"} />
                <Row label="Phone" value={booking.phone || "Not given"} />
                <Row label="Day" value={booking.day} />
                <Row label="Area" value={booking.area} />
                <Row label="Table" value={booking.table} strong />
                <Row label="Seats" value={`${booking.seats}`} />
                <Row label="Event tickets" value={`${booking.tickets}`} />
                <Row label="Booked" value={booking.source} />
                <Row label="Code" value={booking.orderId} />
              </dl>
            ) : null}

            {booking?.phone ? (
              <a
                href={invoiceWhatsAppUrl(booking.phone, booking.name, booking.orderId, getSiteUrl())}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-[13px] text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white hover:decoration-white"
              >
                Send invoice (PDF) on WhatsApp
              </a>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              {view.verdict === "valid" && booking ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => confirmCheckin(booking.orderId, false))}
                  className={cn(BUTTON, "bg-white text-ink")}
                >
                  {pending ? "Checking in…" : "Check in guest"}
                </button>
              ) : null}
              {view.verdict === "wrong-day" && booking ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`This booking is for ${booking.day}, not today. Check in anyway?`)) {
                      run(() => confirmCheckin(booking.orderId, true));
                    }
                  }}
                  className={cn(BUTTON, "border border-white/40 text-white hover:bg-white/[0.06]")}
                >
                  Check in anyway
                </button>
              ) : null}
              {view.verdict === "checked-in" && booking ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Undo this check-in?")) run(() => undoCheckin(booking.orderId));
                  }}
                  className={cn(BUTTON, "border border-white/40 text-white hover:bg-white/[0.06]")}
                >
                  Undo check-in
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                className={cn(BUTTON, "text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white")}
              >
                Next guest
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <div className="min-w-0">
        <VenuePlan look={look} selected={selectedSeat} onSelect={pickSeat} />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
          {LEGEND.map((state) => (
            <li key={state} className="flex items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
                <circle
                  cx="6"
                  cy="6"
                  r="4.75"
                  fill={SEAT_LOOK[state].filled ? SEAT_LOOK[state].color : "none"}
                  stroke={SEAT_LOOK[state].color}
                  strokeWidth="1.5"
                />
              </svg>
              {SEAT_LOOK[state].label}
              {state !== "available" ? <span className="text-white/35 tabular-nums">{counts[state === "booked" ? "booked" : state]}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-white/55">{label}</dt>
      <dd className={cn("break-all text-white", strong && "font-semibold")}>{value}</dd>
    </>
  );
}
