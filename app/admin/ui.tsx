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
};

export function paymentTypeLabel(paymentType: string | null | undefined) {
  if (!paymentType) return null;
  return PAYMENT_TYPES[paymentType] ?? paymentType;
}

export const DOT = {
  paid: "bg-emerald-400",
  pending: "bg-amber-300",
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
