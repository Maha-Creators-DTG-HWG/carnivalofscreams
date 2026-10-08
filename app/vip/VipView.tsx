import { buyVip } from "./actions";
import { formatIdr } from "@/lib/tables";

export type VipAllowanceView = {
  code: string;
  night: string;
  table: string | null;
  limit: number;
  sold: number;
  held: number;
  remaining: number;
};

const ERRORS: Record<string, string> = {
  code: "We could not find that booking code. Use the booking code from your table invoice.",
  closed: "VIP tickets are not on sale yet. Please check back soon.",
  quantity: "Choose how many VIP tickets you want.",
  limit: "That is more VIP tickets than your booking allows.",
  payment: "We could not start the payment. Please try again.",
};

const field =
  "border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70";
const button =
  "btn-press inline-flex items-center justify-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white";

export default function VipView({
  code,
  error,
  priceIdr,
  allowance,
}: {
  code: string;
  error?: string;
  priceIdr: number | null;
  allowance: VipAllowanceView | null;
}) {
  const message = error ? (ERRORS[error] ?? ERRORS.payment) : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
        For table guests
      </p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-white sm:text-5xl">
        VIP tickets
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
        Add VIP tickets to your table booking. Enter the booking code from your
        table invoice.
      </p>

      {message ? (
        <p role="alert" className="mt-8 border border-gold-bright/40 bg-white/5 p-3 text-sm text-white">
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
              {allowance.limit} · bought {allowance.sold}
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
              <form action={buyVip} className="flex flex-col gap-4">
                <input type="hidden" name="code" value={allowance.code} />
                <label className="flex flex-col gap-2 text-left">
                  <span className="font-heading text-[11px] tracking-[0.32em] text-white/50">
                    How many VIP tickets?
                  </span>
                  <select name="quantity" defaultValue="1" className={field}>
                    {Array.from({ length: allowance.remaining }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1} · {formatIdr(priceIdr * (index + 1))}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`${button} self-center`}>
                  Pay with Midtrans
                </button>
              </form>
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
              spellCheck={false}
              required
              className={field}
            />
          </label>
          <button type="submit" className={`${button} self-center`}>
            Continue
          </button>
        </form>
      )}
    </div>
  );
}
