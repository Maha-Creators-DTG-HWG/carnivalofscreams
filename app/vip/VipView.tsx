import { formatIdr } from "@/lib/tables";

import { VIP_BUTTON as button, VIP_ERRORS as ERRORS, VIP_FIELD as field } from "./copy";
import VipBuyForm from "./VipBuyForm";

export type VipAllowanceView = {
  code: string;
  night: string;
  table: string | null;
  limit: number;
  sold: number;
  held: number;
  remaining: number;
};

export default function VipView({
  code,
  error,
  priceIdr,
  allowance,
  snapJsUrl = "",
  clientKey = "",
}: {
  code: string;
  error?: string;
  priceIdr: number | null;
  allowance: VipAllowanceView | null;
  snapJsUrl?: string;
  clientKey?: string;
}) {
  const message = error ? (ERRORS[error] ?? ERRORS.payment) : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
        For table guests
      </p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-balance text-white sm:text-5xl">
        VIP tickets
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
        Add VIP tickets to your table booking. Enter the booking code from your
        table invoice.
      </p>

      {message ? (
        <p id="vip-error" role="alert" className="mt-8 border border-gold-bright/40 bg-white/5 p-3 text-sm text-white">
          {message}
        </p>
      ) : null}

      {allowance ? (
        <div className="pass-panel mt-10 text-left">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-5 text-sm sm:px-6">
            <dt className="text-white/50">Booking code</dt>
            <dd className="text-gold-bright select-all tabular-nums">{allowance.code}</dd>
            <dt className="text-white/50">Day</dt>
            <dd className="text-white">{allowance.night}</dd>
            {allowance.table ? (
              <>
                <dt className="text-white/50">Table</dt>
                <dd className="text-white">{allowance.table}</dd>
              </>
            ) : null}
            <dt className="text-white/50">Your limit</dt>
            <dd className="text-white">
              <span className="tabular-nums">{allowance.limit}</span> · bought{" "}
              <span className="tabular-nums">{allowance.sold}</span>
              {allowance.held ? ` · ${allowance.held} awaiting payment` : ""}
            </dd>
            {priceIdr !== null ? (
              <>
                <dt className="text-white/50">Price</dt>
                <dd className="text-white">{formatIdr(priceIdr)} each</dd>
              </>
            ) : null}
          </dl>

          <div className="border-t border-white/10 px-5 py-5 sm:px-6">
            {priceIdr === null ? (
              <p className="text-sm text-white/65">VIP tickets are not on sale yet. Please check back soon.</p>
            ) : allowance.remaining === 0 ? (
              <p className="text-sm text-white/65">
                {allowance.held
                  ? "You have a payment in progress. If it does not complete, the tickets are released after an hour."
                  : "You have reached the VIP ticket limit for this booking."}
              </p>
            ) : (
              <VipBuyForm
                code={allowance.code}
                remaining={allowance.remaining}
                priceIdr={priceIdr}
                snapJsUrl={snapJsUrl}
                clientKey={clientKey}
                fieldClass={field}
                buttonClass={button}
              />
            )}
          </div>
        </div>
      ) : (
        <form action="/vip" method="get" className="mt-10 flex flex-col gap-4 text-left">
          <label className="flex flex-col gap-2">
            <span className="font-heading text-[11px] tracking-[0.32em] text-white/50">Booking code</span>
            <input
              name="code"
              defaultValue={code}
              placeholder="COS-30-LUX-…"
              autoComplete="off"
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? "vip-error" : undefined}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className={field}
            />
          </label>
          <button type="submit" className={`${button} self-center`}>
            Find booking
          </button>
        </form>
      )}
    </div>
  );
}
