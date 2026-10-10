"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import "@/types/midtrans-snap";
import { waitForSnap } from "@/lib/snap-client";
import { HOLD_GRACE_SECONDS, PAYMENT_DUE_MINUTES } from "@/lib/midtrans/types";
import type { Availability } from "@/components/ReserveWorkspace";
import { createReservation } from "@/app/actions/reserve";
import { getSeat, seatsForPackage } from "@/lib/seats";
import {
  formatIdr,
  NIGHTS,
  TABLE_PACKAGES,
  type NightId,
  type TablePackageId,
  isWhatsAppOnly,
} from "@/lib/tables";

export type ReserveStep = "night" | "area" | "table" | "details" | "pay";

export type ReservePreview = {
  step: ReserveStep;
  packageId: TablePackageId | null;
  nightId: NightId;
  seatId: string | null;
};

type Props = {
  enabled: boolean;
  snapJsUrl: string;
  clientKey: string;
  takenSeatIds: string[];
  /** Whether takenSeatIds is a real answer yet; tables are never shown free on a failed read. */
  availability: Availability;
  onRetryAvailability: () => void;
  /** "by email and WhatsApp", "by email", … or null when no confirmation is sent. */
  delivery: string | null;
  /** Seat selection is lifted so the floor plan can drive it too. */
  seatId: string | null;
  onSeatChange: (seatId: string | null) => void;
  onPreviewChange?: (preview: ReservePreview) => void;
};

const STEPS: ReserveStep[] = ["night", "area", "table", "details", "pay"];
const STEP_LABELS = ["Day", "Area", "Table", "Details", "Pay"] as const;

function AvailabilityNotice({ state, onRetry }: { state: Availability; onRetry: () => void }) {
  if (state === "ready") return null;
  if (state === "loading") {
    return (
      <p role="status" className="mt-3 text-sm text-white/70">
        Checking which tables are free…
      </p>
    );
  }
  return (
    <p role="alert" className="mt-3 border border-gold-bright/40 bg-white/5 p-3 text-sm text-white">
      We could not check which tables are free right now.{" "}
      <button type="button" onClick={onRetry} className="underline underline-offset-4 hover:text-white/80">
        Try again
      </button>
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="block">
      <span className="block text-[11px] tracking-[0.1em] text-white/60 uppercase">{label}</span>
      <span className="mt-0.5 block text-sm text-white">{value}</span>
    </span>
  );
}

const NIK_RE = /^\d{16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{9,16}$/;

/** A table hold and the Snap payment that goes with it, kept so Pay can reopen it. */
type Hold = {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  /** When the payment window (and the Snap token) ends, epoch ms. */
  dueAt: number;
  /** When the seat is freed for others, epoch ms. */
  releasesAt: number;
  seatId: string;
  nightId: NightId;
  /** The form values the hold was made for. */
  key: string;
};

function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ReserveForm({
  enabled,
  snapJsUrl,
  clientKey,
  takenSeatIds,
  availability,
  onRetryAvailability,
  delivery,
  seatId,
  onSeatChange,
  onPreviewChange,
}: Props) {
  const known = availability === "ready";
  const router = useRouter();
  const [step, setStep] = useState<ReserveStep>("night");
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nightId, setNightId] = useState<NightId>("oct-30");
  const [packageId, setPackageId] = useState<TablePackageId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const orderIdRef = useRef<string | null>(null);
  const holdRef = useRef<Hold | null>(null);

  const table = packageId
    ? TABLE_PACKAGES.find((pack) => pack.id === packageId)
    : undefined;
  const seat = seatId ? getSeat(seatId) : undefined;
  const busy = pending || paying;
  const stepIndex = STEPS.indexOf(step);
  const areaSeats = packageId ? seatsForPackage(packageId) : [];
  const freeAreaSeats = areaSeats.filter(
    (item) => !takenSeatIds.includes(item.id),
  );

  useEffect(() => {
    onPreviewChange?.({ step, packageId, nightId, seatId });
  }, [step, packageId, nightId, seatId, onPreviewChange]);

  function logSnapCallback(event: string, payload: unknown) {
    void fetch("/api/midtrans/snap-callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        orderId: orderIdRef.current,
        payload: payload ?? {},
      }),
      keepalive: true,
    }).catch(() => {
      // Persistence is best-effort from the browser; HTTP notification is source of truth.
    });
  }

  function identityError() {
    if (name.trim().length < 2 || name.trim().length > 80) {
      return "Please enter your full name.";
    }
    if (!NIK_RE.test(nik.replace(/\s/g, ""))) {
      return "Please enter a 16-digit NIK.";
    }
    if (!PHONE_RE.test(phone.replace(/[\s()-]/g, ""))) {
      return "Please enter a valid phone number.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      return "Please enter a valid email.";
    }
    return null;
  }

  function freeSeatCount(id: TablePackageId) {
    return seatsForPackage(id).filter((item) => !takenSeatIds.includes(item.id))
      .length;
  }

  function goNext() {
    setError(null);
    if (step === "night") {
      setStep("area");
      return;
    }
    if (step === "area") {
      if (!packageId) {
        setError("Please choose an area.");
        return;
      }
      setStep("table");
      return;
    }
    if (step === "table") {
      if (!seatId || takenSeatIds.includes(seatId)) {
        setError(
          freeAreaSeats.length === 0
            ? "Every table in this area is taken. Choose another area."
            : "Please pick a table.",
        );
        return;
      }
      setStep("details");
      return;
    }
    if (step === "details") {
      const message = identityError();
      if (message) {
        setError(message);
        return;
      }
      setStep("pay");
    }
  }

  function goBack() {
    setError(null);
    if (step === "area") setStep("night");
    if (step === "table") setStep("area");
    if (step === "details") setStep("table");
    if (step === "pay") setStep("details");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== "pay") {
      goNext();
      return;
    }

    if (!seatId || !packageId) {
      setError("Please pick a table.");
      return;
    }

    const form = { name, nik, email, phone, nightId, packageId, seatId };
    const key = JSON.stringify(form);

    setError(null);
    startTransition(async () => {
      // Closing the popup leaves our own hold on the seat, so a new order for
      // it would hit the unique index. Reopen the same payment while it lives.
      const held = holdRef.current;
      if (held) {
        const now = Date.now();
        if (now < held.dueAt && held.key === key) {
          await openSnap(held);
          return;
        }
        if (held.seatId === seatId && held.nightId === nightId && now < held.releasesAt) {
          setError(
            now < held.dueAt
              ? "You changed your details after this table was held. Change them back to keep paying, or pick another table."
              : `Your payment window ended. This table is released at ${clockTime(held.releasesAt)}; try again then.`,
          );
          return;
        }
      }

      const result = await createReservation(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const hold: Hold = {
        orderId: result.orderId,
        snapToken: result.snapToken,
        redirectUrl: result.redirectUrl,
        dueAt: result.dueAt,
        releasesAt: result.releasesAt,
        seatId,
        nightId,
        key,
      };
      holdRef.current = hold;
      await openSnap(hold);
    });
  }

  async function openSnap(hold: Hold) {
    orderIdRef.current = hold.orderId;
    const confirmedUrl = `/reserve/confirmed?order_id=${encodeURIComponent(hold.orderId)}`;
    setPaying(true);
    try {
      const snap = await waitForSnap();
      snap.pay(hold.snapToken, {
        onSuccess: (payload) => {
          logSnapCallback("onSuccess", payload);
          router.push(confirmedUrl);
        },
        onPending: (payload) => {
          logSnapCallback("onPending", payload);
          router.push(confirmedUrl);
        },
        onError: (payload) => {
          logSnapCallback("onError", payload);
          setError("Payment failed. Please try again.");
        },
        onClose: () => {
          logSnapCallback("onClose", {});
          setError(
            `Payment window closed. Your table stays held until ${clockTime(hold.dueAt)}. Press Pay to continue.`,
          );
        },
      });
    } catch (err) {
      logSnapCallback("load_error", {
        message: err instanceof Error ? err.message : "unknown",
      });
      window.location.assign(hold.redirectUrl);
    } finally {
      setPaying(false);
    }
  }

  const night = NIGHTS.find((item) => item.id === nightId);

  return (
    <>
      {enabled && snapJsUrl ? (
        <Script
          id="midtrans-snap"
          src={snapJsUrl}
          data-client-key={clientKey}
          strategy="afterInteractive"
        />
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <p className="sr-only" aria-live="polite">
          Step {stepIndex + 1} of {STEPS.length}: {STEP_LABELS[stepIndex]}
        </p>
        <ol className="grid grid-cols-5 gap-1 text-center">
          {STEPS.map((item, index) => (
            <li
              key={item}
              aria-current={index === stepIndex ? "step" : undefined}
              className={`font-heading text-[10px] tracking-[0.18em] ${
                index === stepIndex
                  ? "text-white"
                  : index < stepIndex
                    ? "text-white/65"
                    : "text-white/55"
              }`}
            >
              {STEP_LABELS[index]}
            </li>
          ))}
        </ol>

        {step === "night" ? (
          <div className="min-w-0">
            <h2 className="font-heading text-[11px] tracking-[0.32em] text-white/50">
              Choose a night
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {NIGHTS.map((item) => {
                const selected = nightId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setNightId(item.id);
                      onSeatChange(null);
                      setPackageId(null);
                      setError(null);
                    }}
                    className={`border p-4 text-left transition-colors ${
                      selected
                        ? "border-white/80 bg-white/10 text-white"
                        : "border-white/15 bg-black/30 text-white/55 hover:border-white/35"
                    }`}
                  >
                    <span className="font-heading text-sm tracking-[0.16em] text-white">
                      {item.day}
                    </span>
                    <span className="mt-1 block text-sm text-white/70">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === "area" ? (
          <div className="min-w-0">
            <h2 className="font-heading text-[11px] tracking-[0.32em] text-white/50">
              Choose an area
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Tap an area to see it lit up on the floor plan. Table numbers come
              next.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              Seats is how many people the table fits. Event tickets are the
              entry tickets included in the booking fee.
            </p>
            <AvailabilityNotice state={availability} onRetry={onRetryAvailability} />
            <div className="mt-4 flex flex-col gap-3">
              {TABLE_PACKAGES.map((pack) => {
                const free = freeSeatCount(pack.id);
                const selected = packageId === pack.id;
                if (isWhatsAppOnly(pack.id)) {
                  return (
                    <a
                      key={pack.id}
                      href={`/reserve/${pack.id}?night=${nightId}`}
                      className="block w-full border border-white/15 bg-black/30 p-4 text-left transition-colors hover:border-white/50 hover:bg-white/5 sm:p-5"
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-white/40" />
                          <span className="font-heading text-base tracking-[0.14em] text-white">
                            {pack.name.replace(" Area", "")}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[11px] tracking-[0.1em] text-white/60 uppercase">
                            Reserve through
                          </span>
                          <span className="mt-0.5 block font-heading text-base tracking-[0.06em] text-white">
                            WhatsApp
                          </span>
                        </span>
                      </span>
                      <span className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                        <Fact label="Seats" value={`${pack.capacity}\u00a0people`} />
                        <Fact label="Type" value={pack.furniture} />
                        <Fact label="Booking fee" value="Free" />
                        <Fact label="Min. consumption" value={formatIdr(pack.minSpendIdr)} />
                        <Fact label="Event tickets included" value={`${pack.tickets}\u00a0tickets`} />
                      </span>
                      <span className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                        <span className="text-white/70">
                          Tables <span className="font-medium text-white">{pack.range}</span>
                        </span>
                        <span className="text-white/90">Chat with us →</span>
                      </span>
                    </a>
                  );
                }
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={!known || free === 0}
                    aria-pressed={selected}
                    onClick={() => {
                      setPackageId(pack.id);
                      onSeatChange(null);
                      setError(null);
                    }}
                    className={`block w-full border p-4 text-left transition-colors sm:p-5 ${
                      !known || free === 0
                        ? "cursor-not-allowed border-white/10 bg-black/20 opacity-70"
                        : selected
                          ? "border-gold-bright bg-white/10 ring-1 ring-gold-bright/60"
                          : "border-white/15 bg-black/30 hover:border-white/50 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className={`size-3 shrink-0 rounded-full border ${
                            selected ? "border-gold-bright bg-gold-bright" : "border-white/40"
                          }`}
                        />
                        <span className="font-heading text-base tracking-[0.14em] text-white">
                          {pack.name.replace(" Area", "")}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[11px] tracking-[0.1em] text-white/60 uppercase">
                          Booking fee
                        </span>
                        <span className="mt-0.5 block font-heading text-base tracking-[0.06em] text-white tabular-nums">
                          {formatIdr(pack.priceIdr)}
                        </span>
                      </span>
                    </span>
                    <span className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                      <Fact label="Seats" value={`${pack.capacity}\u00a0people`} />
                      <Fact label="Type" value={pack.furniture} />
                      <Fact label="Min. consumption" value={formatIdr(pack.minSpendIdr)} />
                      <Fact label="Event tickets included" value={`${pack.tickets}\u00a0tickets`} />
                    </span>
                    <span className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                      <span className="text-white/70">
                        Tables <span className="font-medium text-white">{pack.range}</span>
                      </span>
                      <span className={!known || free === 0 ? "text-white/70" : "text-white/90"}>
                        {!known ? "Checking…" : free === 0 ? "Fully booked" : `${free}\u00a0open`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {table ? (
              <p className="mt-4 border border-gold-bright/40 bg-white/5 p-3 text-sm text-white">
                <span className="font-heading text-[11px] tracking-[0.22em] text-gold-bright">
                  Selected
                </span>{" "}
                {table.name} · {table.furniture} · {table.capacity} pax. Lit up
                on the floor plan.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "table" ? (
          <div className="min-w-0">
            <h2 className="font-heading text-[11px] tracking-[0.32em] text-white/50">
              Choose a table
            </h2>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-white">
                <span className="font-heading tracking-[0.16em] text-gold-bright">
                  {table?.name}
                </span>
                <span className="text-white/55">
                  {" "}
                  · {table?.furniture} · seats {table?.capacity} ·{" "}
                  {table ? formatIdr(table.priceIdr) : ""}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  onSeatChange(null);
                  setStep("area");
                }}
                className="inline-flex min-h-11 items-center px-1 font-heading text-[11px] tracking-[0.22em] text-white/65 underline underline-offset-4 transition-colors hover:text-white"
              >
                Change area
              </button>
            </div>
            <AvailabilityNotice state={availability} onRetry={onRetryAvailability} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {areaSeats.map((item) => {
                const taken = takenSeatIds.includes(item.id);
                const selected = seatId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!known || taken}
                    aria-pressed={selected}
                    aria-label={taken ? `${item.label}, taken` : item.label}
                    onClick={() => {
                      onSeatChange(item.id);
                      setError(null);
                    }}
                    className={`min-h-11 min-w-12 border px-2 py-2 text-center font-heading text-[11px] tracking-[0.12em] transition-colors ${
                      taken
                        ? "cursor-not-allowed border-destructive bg-destructive/85 text-white line-through decoration-white/70"
                        : selected
                          ? "border-white bg-white text-black"
                          : "border-white/15 bg-black/30 text-white hover:border-white/50"
                    }`}
                  >
                    {item.short}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-white/55">
              Red numbers are already taken for{" "}
              {night?.short ?? "this night"}.
            </p>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-heading text-[11px] tracking-[0.28em] text-white/50">
                Name
              </span>
              <input
                required
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70 focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-heading text-[11px] tracking-[0.28em] text-white/50">
                NIK
              </span>
              <input
                required
                name="nik"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                placeholder="16 digits"
                value={nik}
                onChange={(event) =>
                  setNik(event.target.value.replace(/\D/g, "").slice(0, 16))
                }
                className="border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70 focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-heading text-[11px] tracking-[0.28em] text-white/50">
                Phone
              </span>
              <input
                required
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                placeholder="0812…"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70 focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-heading text-[11px] tracking-[0.28em] text-white/50">
                Email
              </span>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70 focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>
          </div>
        ) : null}

        {step === "pay" ? (
          <dl className="space-y-3 text-sm text-white/65">
            <div>
              <dt className="inline text-white/55">Name</dt> <dd className="inline">{name}</dd>
            </div>
            <div>
              <dt className="inline text-white/55">NIK</dt> <dd className="inline">{nik}</dd>
            </div>
            <div>
              <dt className="inline text-white/55">Phone</dt> <dd className="inline">{phone}</dd>
            </div>
            <div>
              <dt className="inline text-white/55">Email</dt> <dd className="inline">{email}</dd>
            </div>
            <div>
              <dt className="inline text-white/55">Day</dt>{" "}
              <dd className="inline">
                {night?.day} · {night?.label}
              </dd>
            </div>
            <div>
              <dt className="inline text-white/55">Table</dt>{" "}
              <dd className="inline">
                {seat?.short}
                {table ? ` · ${table.name}` : ""}
              </dd>
            </div>
            <div>
              <dt className="inline text-white/55">Booking fee</dt>{" "}
              <dd className="inline">{table ? formatIdr(table.priceIdr) : "Not set"}</dd>
            </div>
            <div>
              <dt className="inline text-white/55">Minimum spend</dt>{" "}
              <dd className="inline">
                {table ? `${formatIdr(table.minSpendIdr)} at the venue` : "Not set"}
              </dd>
            </div>
          </dl>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="inline-flex items-center gap-2 text-sm text-white/70"
          >
            <span className="pass-signal" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {step !== "night" ? (
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className="btn-press inline-flex items-center justify-center border border-white/20 bg-transparent px-5 py-3 font-heading text-[11px] tracking-[0.28em] text-white/70 transition-colors duration-200 hover:border-white/50 hover:text-white disabled:opacity-40"
            >
              Back
            </button>
          ) : null}

          <button
            type="submit"
            disabled={
              busy ||
              (step === "pay" && !enabled) ||
              (step === "area" && !packageId) ||
              (step === "table" && !seatId) ||
              ((step === "area" || step === "table") && !known)
            }
            className="btn-press inline-flex items-center justify-center border border-white/80 bg-white px-5 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black sm:text-xs"
          >
            {step === "pay"
              ? busy
                ? "Opening payment…"
                : `Pay ${table ? formatIdr(table.priceIdr) : ""}`.trim()
              : "Continue"}
          </button>
        </div>

        {step === "pay" && !enabled ? (
          <p className="inline-flex items-center gap-2 text-sm text-white/55">
            <span className="pass-signal" aria-hidden="true" />
            Online payment is not available right now. Please try again later
            or message us on WhatsApp.
          </p>
        ) : null}

        {step === "pay" ? (
          <p className="text-xs leading-relaxed text-white/55">
            You have {PAYMENT_DUE_MINUTES} minutes to pay the booking fee. If your
            payment is still processing when time runs out, we keep the table{" "}
            {HOLD_GRACE_SECONDS / 60} more minutes before releasing it.
            {table ? ` The booking fee includes ${table.tickets} event tickets; the table seats ${table.capacity}.` : ""}{" "}
            Minimum spend is paid at the venue and is not included in the
            booking fee. Extra guests buy their own tickets.{" "}
            {delivery
              ? `We send your confirmation and booking code ${delivery}.`
              : "Keep the booking code shown after payment: you need it at the door and for VIP tickets."}
          </p>
        ) : null}
      </form>
    </>
  );
}
