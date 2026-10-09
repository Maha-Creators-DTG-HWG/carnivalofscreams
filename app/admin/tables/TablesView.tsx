"use client";

import { cn } from "cn";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";

import { getSeat, SEATS, type VenueSeat } from "@/lib/seats";
import type { GuestDetails } from "@/lib/reservations";
import { formatIdr, getTablePackage, NIGHTS, TABLE_PACKAGES, type NightId } from "@/lib/tables";
import { TABLE_POINTS, VENUE_MAP } from "@/lib/venue-areas";

import { PageHeader, Segmented, Stat, STATUS_COLOR, time } from "../ui";
import { saveGuestDetails, switchTableOff, switchTableOn } from "./actions";

export type TableBooking = {
  nightId: NightId;
  seatId: string;
  /** paid and pending came through the site; manual was switched off here. */
  kind: "paid" | "pending" | "manual";
  name: string;
  phone: string;
  notes: string | null;
  email: string;
  orderId: string;
  amountIdr: number;
  expiresAt: Date | null;
};

type StateId = "open" | TableBooking["kind"];

// Open tables are outlined; taken ones are filled, so state reads by shape as
// well as by hue.
const STATE: Record<StateId, { label: string; color: string; filled: boolean }> = {
  open: { label: "Bookable online", color: "var(--gold-bright)", filled: false },
  manual: { label: "Booked by hand", color: STATUS_COLOR.manual, filled: true },
  paid: { label: "Paid online", color: STATUS_COLOR.paid, filled: true },
  pending: { label: "Paying online now", color: STATUS_COLOR.pending, filled: true },
};

function stateOf(booking: TableBooking | undefined): StateId {
  return booking?.kind ?? "open";
}

// One label for a table wherever it's announced: the plan and the picker.
function describeTable(seat: VenueSeat, booking: TableBooking | undefined) {
  const { label } = STATE[stateOf(booking)];
  return booking?.name ? `${seat.label}: ${label}, ${booking.name}` : `${seat.label}: ${label}`;
}

// Shape of a booking the browser shows before the server has confirmed it.
function optimisticManualBooking(
  nightId: NightId,
  seatId: string,
  guest: GuestDetails = { name: "", phone: "", notes: null },
): TableBooking {
  return { nightId, seatId, kind: "manual", ...guest, email: "", orderId: "", amountIdr: 0, expiresAt: null };
}

const LEGEND: StateId[] = ["open", "manual", "paid", "pending"];

// ponytail: polling, not Supabase Realtime. Realtime would need a read policy on
// reservations (phone, email, NIK) for every signed-in user. Switch if 5s feels slow.
const LIVE_MS = 5_000;

type BookingChange = { seatId: string; booking: TableBooking | null };

export default function TablesView({ bookings }: { bookings: TableBooking[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const nightId = NIGHTS.find((night) => night.id === params.get("night"))?.id ?? NIGHTS[0].id;
  const night = NIGHTS.find((value) => value.id === nightId)!;
  const [selected, setSelected] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Guests book while this page is open; pull their tables in as they happen.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, LIVE_MS);
    return () => clearInterval(id);
  }, [router]);

  const bySeat = useMemo(() => {
    const map = new Map<string, TableBooking>();
    for (const booking of bookings) {
      if (booking.nightId === nightId) map.set(booking.seatId, booking);
    }
    return map;
  }, [bookings, nightId]);

  // A switch flips the moment it's clicked, everywhere the table shows; the
  // server catches up behind it.
  const [optimisticBySeat, applyChange] = useOptimistic(bySeat, (current, change: BookingChange) => {
    const next = new Map(current);
    if (change.booking) next.set(change.seatId, change.booking);
    else next.delete(change.seatId);
    return next;
  });

  const counts = { open: 0, paid: 0, pending: 0, manual: 0 };
  for (const seat of SEATS) counts[stateOf(optimisticBySeat.get(seat.id))] += 1;

  const booked = SEATS.flatMap((seat) => {
    const booking = optimisticBySeat.get(seat.id);
    return booking ? [{ seat, booking }] : [];
  });

  function setNight(id: NightId) {
    window.history.pushState(null, "", id === NIGHTS[0].id ? "/admin/tables" : `/admin/tables?night=${id}`);
  }

  function select(seatId: string) {
    setSelected(seatId);
    // On narrow screens the panel sits below the picker; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  const seat = selected ? getSeat(selected) : undefined;

  return (
    <>
      <PageHeader title="Tables">
        <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
          <Stat label="Bookable" value={String(counts.open)} />
          <Stat label="By hand" value={String(counts.manual)} />
          <Stat label="Online" value={String(counts.paid + counts.pending)} />
        </dl>
      </PageHeader>

      <nav aria-label="Night" className="flex border-b border-white/12 py-5">
        <Segmented
          label="Night"
          options={NIGHTS.map((value) => ({
            label: `${value.day} · ${value.short}`,
            active: nightId === value.id,
            onSelect: () => setNight(value.id),
          }))}
        />
      </nav>

      <div className="grid gap-x-10 gap-y-8 pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <FloorPlan bySeat={optimisticBySeat} selected={selected} onSelect={select} />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
            {LEGEND.map((id) => (
              <li key={id} className="flex items-center gap-2">
                <Swatch state={id} />
                {STATE[id].label}
              </li>
            ))}
          </ul>
          <TablePicker bySeat={optimisticBySeat} selected={selected} onSelect={select} />
        </div>

        <div ref={panelRef} className="scroll-mt-4">
          <div className="space-y-8 lg:sticky lg:top-6">
            {seat ? (
              <TablePanel
                key={`${nightId}-${seat.id}`}
                seat={seat}
                nightId={nightId}
                booking={optimisticBySeat.get(seat.id)}
                applyChange={applyChange}
              />
            ) : (
              <div className="border border-dashed border-white/20 px-5 py-8 text-center">
                <p className="text-sm text-white">Pick a table on the plan</p>
                <p className="mx-auto mt-1 max-w-xs text-[13px] text-white/55">
                  Switch it off when it&rsquo;s booked by WhatsApp or at the door, so online guests
                  can&rsquo;t pick it.
                </p>
              </div>
            )}

            <section aria-labelledby="booked-heading">
              <h2 id="booked-heading" className="flex items-baseline justify-between border-b border-white/12 pb-2 text-sm text-white">
                Booked for {night.day}
                <span className="text-[13px] text-white/55 tabular-nums">{booked.length}</span>
              </h2>
              {booked.length === 0 ? (
                <p className="py-6 text-[13px] text-white/55">
                  No tables booked for {night.label} yet.
                </p>
              ) : (
                <ul className="divide-y divide-white/8">
                  {booked.map(({ seat: row, booking }) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => select(row.id)}
                        aria-pressed={selected === row.id}
                        className={cn(
                          "flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
                          selected === row.id && "bg-white/[0.06]",
                        )}
                      >
                        <Swatch state={booking.kind} />
                        <span className="w-9 text-sm font-semibold text-white">{row.short}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-white" title={booking.name || undefined}>
                          {booking.name || <span className="text-white/55">No guest details yet</span>}
                        </span>
                        <span className="shrink-0 text-[13px] text-white/55">{STATE[booking.kind].label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function TablePicker({
  bySeat,
  selected,
  onSelect,
}: {
  bySeat: Map<string, TableBooking>;
  selected: string | null;
  onSelect: (seatId: string) => void;
}) {
  return (
    <div className="mt-8 space-y-5">
      {TABLE_PACKAGES.map((pack) => {
        const seats = SEATS.filter((seat) => seat.packageId === pack.id);
        const taken = seats.filter((seat) => bySeat.has(seat.id)).length;
        return (
          <section key={pack.id} aria-labelledby={`area-${pack.id}`}>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 id={`area-${pack.id}`} className="text-[13px] text-white">
                {pack.name}
                <span className="text-white/55"> · {pack.furniture}</span>
              </h2>
              <p className="text-[13px] text-white/55 tabular-nums">
                {taken} of {seats.length} taken
              </p>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {seats.map((seat) => {
                const booking = bySeat.get(seat.id);
                const state = STATE[stateOf(booking)];
                const isSelected = selected === seat.id;
                return (
                  <li key={seat.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(seat.id)}
                      aria-pressed={isSelected}
                      aria-label={describeTable(seat, booking)}
                      style={
                        state.filled
                          ? { backgroundColor: state.color, borderColor: state.color }
                          : { borderColor: "color-mix(in oklab, var(--gold-bright) 45%, transparent)" }
                      }
                      className={cn(
                        "btn-press h-10 min-w-12 border px-2 text-[13px] font-semibold tabular-nums",
                        state.filled ? "text-ink" : "text-white hover:bg-white/[0.06]",
                        isSelected && "outline-2 outline-offset-2 outline-white",
                      )}
                    >
                      {seat.short}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TablePanel({
  seat,
  nightId,
  booking,
  applyChange,
}: {
  seat: VenueSeat;
  nightId: NightId;
  booking: TableBooking | undefined;
  applyChange: (change: BookingChange) => void;
}) {
  const [undo, setUndo] = useState<GuestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  // `pending` only disables the controls after React re-renders; this blocks a
  // second click that lands before then, so one click is one request.
  const busy = useRef(false);

  function once(work: () => Promise<void>) {
    if (busy.current) return false;
    busy.current = true;
    startTransition(async () => {
      try {
        await work();
      } finally {
        busy.current = false;
      }
    });
    return true;
  }
  const pack = getTablePackage(seat.packageId);
  const stateId = stateOf(booking);
  const state = STATE[stateId];
  const bookable = !booking;
  const manual = booking?.kind === "manual";
  const errorId = `error-${seat.id}`;

  function toggle() {
    if (busy.current) return;
    setError(null);
    setSaved(false);
    if (bookable) {
      setUndo(null);
      once(async () => {
        applyChange({
          seatId: seat.id,
          booking: optimisticManualBooking(nightId, seat.id),
        });
        const result = await switchTableOff({ nightId, seatId: seat.id });
        if (!result.ok) setError(result.error);
      });
      // The guest fields appear with the optimistic state; put the cursor there.
      requestAnimationFrame(() => nameRef.current?.focus());
    } else {
      const removed =
        booking && (booking.name || booking.phone || booking.notes)
          ? { name: booking.name, phone: booking.phone, notes: booking.notes }
          : null;
      once(async () => {
        applyChange({ seatId: seat.id, booking: null });
        const result = await switchTableOn({ nightId, seatId: seat.id });
        if (result.ok) setUndo(removed);
        else setError(result.error);
      });
    }
  }

  function restore() {
    if (!undo) return;
    const guest = undo;
    const started = once(async () => {
      applyChange({ seatId: seat.id, booking: optimisticManualBooking(nightId, seat.id, guest) });
      const result = await switchTableOff({ nightId, seatId: seat.id, ...guest });
      if (!result.ok) setError(result.error);
    });
    if (started) setUndo(null);
  }

  function save(form: FormData) {
    setError(null);
    setSaved(false);
    once(async () => {
      const result = await saveGuestDetails({
        nightId,
        seatId: seat.id,
        name: form.get("name"),
        phone: form.get("phone"),
        notes: form.get("notes"),
      });
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <section aria-labelledby={`panel-${seat.id}`} className="border border-white/15 bg-white/[0.02]">
      <div className="flex items-start gap-4 border-b border-white/12 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id={`panel-${seat.id}`} className="flex items-center gap-2.5 text-lg text-white">
            <Swatch state={stateId} />
            <span className="font-semibold">{seat.short}</span>
          </h2>
          <p className="mt-0.5 text-[13px] text-white/55">
            {pack?.name} · {pack?.furniture} · {pack?.seats} seats
          </p>
        </div>
        <p className="pt-1 text-[13px] text-white">{state.label}</p>
      </div>

      {booking && !manual ? (
        <div className="px-5 py-4">
          <p className="text-sm text-white">{booking.name}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-white/55">WhatsApp</dt>
            <dd className="text-white tabular-nums">{booking.phone}</dd>
            <dt className="text-white/55">Email</dt>
            <dd className="break-all text-white">{booking.email}</dd>
            <dt className="text-white/55">Booking fee</dt>
            <dd className="text-white tabular-nums">{formatIdr(booking.amountIdr)}</dd>
            <dt className="text-white/55">Booking code</dt>
            <dd className="text-white">
              <a
                href={`/admin/midtrans?order=${encodeURIComponent(booking.orderId)}`}
                className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
              >
                {booking.orderId}
              </a>
            </dd>
          </dl>
          <p className="mt-3 text-[13px] text-white/55">
            {booking.kind === "pending"
              ? `Still paying. The hold ends${booking.expiresAt ? ` at ${time.format(booking.expiresAt)}` : ""} if payment doesn’t finish, and the table opens again.`
              : "Booked through the website, so it can’t be switched here."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">Bookable online</p>
              <p className="text-[13px] text-white/55">
                {bookable ? "Guests can pick this table on the website." : "Hidden from guests on the website."}
              </p>
            </div>
            <Switch
              checked={bookable}
              label={`${seat.label} bookable online`}
              disabled={pending}
              onToggle={toggle}
            />
          </div>

          {undo ? (
            <p role="status" className="flex flex-wrap items-center gap-x-3 border-t border-white/12 px-5 py-3 text-[13px] text-white/60">
              {undo.name || "The guest"}&rsquo;s details were removed.
              <button
                type="button"
                onClick={restore}
                className="h-8 text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
              >
                Undo
              </button>
            </p>
          ) : null}

          {manual ? (
            <form action={save} className="grid gap-3 border-t border-white/12 px-5 pt-4 pb-5">
              <p className="text-sm text-white">
                Who booked it? <span className="text-white/55">Optional</span>
              </p>
              <Field label="Guest name">
                <input
                  ref={nameRef}
                  name="name"
                  maxLength={80}
                  autoComplete="off"
                  defaultValue={booking?.name}
                  className={INPUT}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="WhatsApp number">
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="0812 3456 7890"
                    defaultValue={booking?.phone}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(INPUT, "tabular-nums")}
                  />
                </Field>
                <Field label="Notes">
                  <input
                    name="notes"
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Paid cash, DP 50%"
                    defaultValue={booking?.notes ?? ""}
                    className={INPUT}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={pending} className={cn(BUTTON, "bg-white text-ink")}>
                  {pending ? "Saving…" : "Save guest"}
                </button>
                <span role="status" className="text-[13px] text-white/60">
                  {saved ? "Saved" : null}
                </span>
              </div>
            </form>
          ) : null}
        </>
      )}

      {error ? (
        <div className="border-t border-white/12 px-5 py-3">
          <PanelError id={errorId} error={error} />
        </div>
      ) : null}
    </section>
  );
}

const INPUT =
  "h-10 w-full border border-white/20 bg-white/[0.03] px-3 text-base text-white placeholder:text-white/40 focus-visible:border-white/60 sm:text-sm aria-invalid:border-destructive";

const BUTTON =
  "btn-press inline-flex h-10 items-center px-4 text-[13px] whitespace-nowrap disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] text-white/60">{label}</span>
      {children}
    </label>
  );
}

// Same treatment as the guest-facing errors: a red signal light, white text.
function PanelError({ id, error }: { id: string; error: string }) {
  return (
    <p id={id} role="alert" className="inline-flex items-center gap-2 text-[13px] text-white/80">
      <span className="pass-signal shrink-0" aria-hidden="true" />
      {error}
    </p>
  );
}

function Switch({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-wait"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-9 items-center border p-0.5 transition-colors duration-150",
          checked ? "border-white bg-white" : "border-white/30 bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "size-3.5 transition-transform duration-150",
            checked ? "translate-x-4 bg-ink" : "bg-white/70",
          )}
        />
      </span>
    </button>
  );
}

function Swatch({ state }: { state: StateId }) {
  const { color, filled } = STATE[state];
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 shrink-0">
      <circle cx="6" cy="6" r="4.75" fill={filled ? color : "none"} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// The tables sit in the middle of the venue drawing; crop to that part so the
// labels stay legible at admin widths.
const PLAN_VIEW = { x: 420, y: 1060, width: 2360, height: 1600 };
const TABLE_RADIUS = 22;

function FloorPlan({
  bySeat,
  selected,
  onSelect,
}: {
  bySeat: Map<string, TableBooking>;
  selected: string | null;
  onSelect: (seatId: string) => void;
}) {
  return (
    <div className="overflow-hidden bg-black outline outline-1 -outline-offset-1 outline-white/10">
      <svg
        viewBox={`${PLAN_VIEW.x} ${PLAN_VIEW.y} ${PLAN_VIEW.width} ${PLAN_VIEW.height}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Floor plan. Pick a table to manage it."
      >
        <image href={VENUE_MAP.src} width={VENUE_MAP.width} height={VENUE_MAP.height} />
        <rect
          x={PLAN_VIEW.x}
          y={PLAN_VIEW.y}
          width={PLAN_VIEW.width}
          height={PLAN_VIEW.height}
          fill="rgba(5,3,8,0.3)"
        />
        {SEATS.map((seat) => {
          const point = TABLE_POINTS[seat.id];
          if (!point) return null;
          const booking = bySeat.get(seat.id);
          const state = STATE[stateOf(booking)];
          const isSelected = selected === seat.id;
          return (
            <g
              key={seat.id}
              role="button"
              tabIndex={0}
              aria-label={describeTable(seat, booking)}
              aria-pressed={isSelected}
              className="group cursor-pointer outline-none"
              onClick={() => onSelect(seat.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(seat.id);
                }
              }}
            >
              <circle
                cx={point[0]}
                cy={point[1]}
                r={TABLE_RADIUS + 9}
                fill="none"
                stroke="white"
                strokeWidth={4}
                className={cn(
                  "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-100",
                  isSelected && "opacity-100",
                )}
              />
              <circle
                cx={point[0]}
                cy={point[1]}
                r={TABLE_RADIUS}
                fill={state.filled ? state.color : "rgba(5,3,8,0.01)"}
                fillOpacity={state.filled ? 0.5 : 1}
                stroke={state.color}
                strokeWidth={3}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
