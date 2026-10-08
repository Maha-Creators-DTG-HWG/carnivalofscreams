"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useRef, useState, type FormEvent } from "react";

import { waitForSnap } from "@/lib/snap-client";
import { PAYMENT_DUE_MINUTES } from "@/lib/midtrans/types";
import { formatIdr } from "@/lib/tables";

import { startVipPayment } from "./actions";
import { VIP_ERRORS } from "./copy";

type Checkout = { token: string; url: string; orderId: string };

/** Opens Midtrans Snap as a popup over the page; the hosted page is the fallback. */
export default function VipBuyForm({
  code,
  remaining,
  priceIdr,
  snapJsUrl,
  clientKey,
  fieldClass,
  buttonClass,
}: {
  code: string;
  remaining: number;
  priceIdr: number;
  snapJsUrl: string;
  clientKey: string;
  fieldClass: string;
  buttonClass: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A closed popup leaves the order held until the payment window closes; let the guest pick it up again.
  const [unfinished, setUnfinished] = useState<Checkout | null>(null);
  // State lands a render late; the ref stops a fast double click starting two orders.
  const inFlight = useRef(false);

  function lock() {
    inFlight.current = true;
    setBusy(true);
    setError(null);
  }

  function release() {
    inFlight.current = false;
    setBusy(false);
  }

  async function open(checkout: Checkout) {
    const confirmed = `/vip/confirmed?order_id=${encodeURIComponent(checkout.orderId)}`;
    try {
      const snap = await waitForSnap();
      snap.pay(checkout.token, {
        onSuccess: () => router.push(confirmed),
        onPending: () => router.push(confirmed),
        onError: () => {
          release();
          setError("Payment failed. Please try again.");
        },
        onClose: () => {
          release();
          setUnfinished(checkout);
          setError(`Payment window closed. Your tickets stay held for ${PAYMENT_DUE_MINUTES} minutes while you finish paying.`);
          router.refresh();
        },
      });
    } catch {
      window.location.assign(checkout.url);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    lock();
    const result = await startVipPayment(code, quantity);
    if ("error" in result) {
      release();
      setError(VIP_ERRORS[result.error] ?? VIP_ERRORS.payment);
      router.refresh();
      return;
    }
    await open(result);
  }

  return (
    <>
      {snapJsUrl ? (
        <Script id="midtrans-snap" src={snapJsUrl} data-client-key={clientKey} strategy="afterInteractive" />
      ) : null}

      {error ? (
        <p role="alert" className="mb-4 border border-gold-bright/40 bg-white/5 p-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      {unfinished ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (inFlight.current) return;
            lock();
            void open(unfinished);
          }}
          className={`${buttonClass} w-full disabled:cursor-wait disabled:opacity-60`}
        >
          {busy ? "Opening payment…" : "Resume payment"}
        </button>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-left">
            <span className="font-heading text-[11px] tracking-[0.32em] text-white/50">
              How many VIP tickets?
            </span>
            <select
              name="quantity"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={fieldClass}
            >
              {Array.from({ length: remaining }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} · {formatIdr(priceIdr * (index + 1))}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className={`${buttonClass} self-center disabled:cursor-wait disabled:opacity-60`}
          >
            {busy ? "Opening payment…" : "Pay"}
          </button>
        </form>
      )}
    </>
  );
}
