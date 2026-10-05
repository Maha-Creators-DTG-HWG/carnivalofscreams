import { cn } from "cn";

export const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

// Midtrans Snap payment_type, stored as channel_id on reservations.
const PAYMENT_TYPES: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Bank transfer",
  echannel: "Mandiri bill",
  permata: "Permata VA",
  credit_card: "Card",
  cstore: "Convenience store",
  akulaku: "Akulaku",
  kredivo: "Kredivo",
  manual: "Booked by hand",
};

export function paymentTypeLabel(paymentType: string | null | undefined) {
  if (!paymentType) return null;
  return PAYMENT_TYPES[paymentType] ?? paymentType;
}

// Status hues as CSS values, for SVG fills and inline styles. DOT below uses
// the same theme tokens as classes.
export const STATUS_COLOR = {
  paid: "var(--color-emerald-400)",
  pending: "var(--color-amber-300)",
  manual: "var(--color-destructive)",
} as const;

export const DOT = {
  paid: "bg-emerald-400",
  pending: "bg-amber-300",
  manual: "bg-destructive",
  failed: "bg-white/25",
  none: "bg-white/25",
  alert: "bg-[#c4453a] shadow-[0_0_8px_rgba(220,72,58,0.9)]",
} as const;

export function Dot({ tone }: { tone: keyof typeof DOT }) {
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />;
}

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 border-b border-white/12 pt-10 pb-8 sm:pt-12">
      <h1 className="font-heading text-3xl tracking-[0.14em] text-white sm:text-4xl">{title}</h1>
      {children}
    </header>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-white/40 uppercase">{label}</dt>
      <dd className="mt-1.5 text-xl text-white tabular-nums">{value}</dd>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("py-4 pr-5 font-normal whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

// Shown by loading.tsx while a page's data is on its way, in the same frame
// as the real header and filter bar so nothing jumps when it lands.
export function PageSkeleton({
  title,
  stats,
  filters,
  rows = 8,
}: {
  title: string;
  stats: number;
  filters: number;
  rows?: number;
}) {
  return (
    <div aria-busy="true" aria-label={`Loading ${title}`}>
      <PageHeader title={title}>
        <div className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-12">
          {Array.from({ length: stats }, (_, i) => (
            <div key={i}>
              <div className="h-[11px] w-14 animate-pulse bg-white/10" />
              <div className="mt-2.5 h-6 w-20 animate-pulse bg-white/10" />
            </div>
          ))}
        </div>
      </PageHeader>
      <div className="flex flex-col gap-4 border-b border-white/12 py-5 sm:flex-row sm:items-center sm:justify-between">
        {Array.from({ length: filters }, (_, i) => (
          <div key={i} className="h-9 w-full animate-pulse border border-white/15 bg-white/[0.03] sm:w-64" />
        ))}
      </div>
      <ul className="divide-y divide-white/8">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-6 py-5">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse bg-white/10" />
              <div className="h-3 w-64 max-w-full animate-pulse bg-white/[0.06]" />
            </div>
            <div className="hidden h-4 w-24 animate-pulse bg-white/10 sm:block" />
            <div className="h-9 w-24 animate-pulse bg-white/[0.06]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; active: boolean; onSelect: () => void; count?: number }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex border border-white/15 p-0.5 text-[13px]">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={option.active}
          onClick={option.onSelect}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 px-3 whitespace-nowrap transition-colors sm:flex-none",
            option.active ? "bg-white text-ink" : "text-white/60 hover:text-white",
          )}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className={cn("tabular-nums", option.active ? "text-ink/50" : "text-white/35")}>
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
