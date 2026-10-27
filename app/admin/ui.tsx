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

/** The green-hover "Message" button of the Reservations list, for other admin pages. */
export function WhatsAppButton({ href, label = "Message", className }: { href: string; label?: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "btn-press inline-flex h-9 shrink-0 items-center gap-2 border border-white/20 px-3 text-[13px] text-white transition-[transform,border-color,background-color] hover:border-[#25D366]/60 hover:bg-[#25D366]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        className,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 text-[#25D366]" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {label}
    </a>
  );
}
