"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import "@/types/midtrans-snap";
import { waitForSnap } from "@/lib/snap-client";
import { createReservation } from "@/app/actions/reserve";
import { getSeat, seatsForPackage } from "@/lib/seats";
import {
  formatIdr,
  NIGHTS,
  RESID_AREA,
  TABLE_PACKAGES,
  type NightId,
  type TablePackageId,
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
  /** Seat selection is lifted so the floor plan can drive it too. */
  seatId: string | null;
  onSeatChange: (seatId: string | null) => void;
  onPreviewChange?: (preview: ReservePreview) => void;
};

const STEPS: ReserveStep[] = ["night", "area", "table", "details", "pay"];
const STEP_LABELS = ["Day", "Area", "Table", "Details", "Pay"] as const;

const NIK_RE = /^\d{16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{9,16}$/;

export default function ReserveForm({
  enabled,
  snapJsUrl,
  clientKey,
  takenSeatIds,
  seatId,
  onSeatChange,
  onPreviewChange,
}: Props) {
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

    setError(null);
    startTransition(async () => {
      const result = await createReservation({
        name,
        nik,
        email,
        phone,
        nightId,
        packageId,
        seatId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      orderIdRef.current = result.orderId;
      const confirmedUrl = `/reserve/confirmed?order_id=${encodeURIComponent(result.orderId)}`;
      setPaying(true);
      try {
        const snap = await waitForSnap();
        snap.pay(result.snapToken, {
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
              "Payment window closed. Your table stays held for 60 minutes while you finish paying.",
            );
          },
        });
      } catch (err) {
        logSnapCallback("load_error", {
          message: err instanceof Error ? err.message : "unknown",
        });
        window.location.assign(result.redirectUrl);
        return;
      } finally {
        setPaying(false);
      }
    });
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
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Tap an area to see it lit up on the floor plan. Table numbers come
              next.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {TABLE_PACKAGES.map((pack) => {
                const free = freeSeatCount(pack.id);
                const selected = packageId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={free === 0}
                    aria-pressed={selected}
                    onClick={() => {
                      setPackageId(pack.id);
                      onSeatChange(null);
                      setError(null);
                    }}
                    className={`border p-4 text-left transition-colors ${
                      free === 0
                        ? "cursor-not-allowed border-white/10 bg-black/20 text-white/30"
                        : selected
                          ? "border-gold-bright bg-white/10 text-white"
                          : "border-white/15 bg-black/30 text-white hover:border-white/50"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-heading text-sm tracking-[0.16em] text-white">
                        {pack.name.replace(" Area", "")}
                      </span>
                      <span className="font-heading text-sm tracking-[0.12em] text-white">
                        {formatIdr(pack.priceIdr)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-white/55">
                      {pack.furniture} · {pack.seats}&nbsp;pax · {pack.tickets}&nbsp;tickets
                      · min.&nbsp;{formatIdr(pack.minSpendIdr)}
                    </span>
                    <span className="mt-1 block text-xs text-white/55">
                      {free === 0
                        ? "Fully booked for this night"
                        : `${free} tables open · ${pack.range}`}
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
                {table.name} · {table.furniture} · {table.seats} pax. Lit up
                on the floor plan.
              </p>
            ) : null}
            <p className="mt-4 text-xs text-white/55">
              {RESID_AREA.name} is invite-only and is not in this booking.
            </p>
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
                  · {table?.furniture} · {table?.seats} pax ·{" "}
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
            <div className="mt-4 flex flex-wrap gap-1.5">
              {areaSeats.map((item) => {
                const taken = takenSeatIds.includes(item.id);
                const selected = seatId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={taken}
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
              (step === "table" && !seatId)
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
            Pay the booking fee within 60 minutes to keep this table. The hold
            and the payment expire together. Minimum spend is paid at the venue
            and is not included in the booking fee. Extra guests buy their own
            tickets. We send the invoice by email and WhatsApp.
          </p>
        ) : null}
      </form>
    </>
  );
}
