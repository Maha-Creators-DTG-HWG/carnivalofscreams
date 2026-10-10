import type { Metadata } from "next";
import Link from "next/link";

import { WHATSAPP_NUMBER } from "@/lib/site";
import { formatIdr, getTablePackage, NIGHTS } from "@/lib/tables";
import { waMeUrl } from "@/lib/wa-me";

export const metadata: Metadata = {
  title: "Reserve a VVIP table",
  description: "VVIP tables at Carnaval of Screams are reserved through our team on WhatsApp.",
};

const button =
  "btn-press inline-flex items-center justify-center border px-8 py-3 font-heading text-[11px] tracking-[0.28em] transition-colors duration-200";

export default async function VvipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const asked = Array.isArray(params.night) ? params.night[0] : params.night;
  const pack = getTablePackage("vvip")!;
  const facts: [string, string][] = [
    ["Seats", `${pack.capacity} people`],
    ["Type", pack.furniture],
    ["Booking fee", "Free"],
    ["Min. consumption", formatIdr(pack.minSpendIdr)],
    ["Event tickets included", `${pack.tickets} tickets`],
    ["Tables", pack.range],
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
        Table reservation
      </p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-balance text-white sm:text-5xl">
        VVIP tables
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
        {pack.tagline} VVIP tables are not booked online. Message our team on
        WhatsApp and we will arrange your table with you.
      </p>

      <dl className="pass-panel mt-10 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-5 text-left text-sm sm:px-6">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-white/60">{label}</dt>
            <dd className="text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 font-heading text-[11px] tracking-[0.32em] text-white/55">
        Which night?
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {NIGHTS.map((night) => {
          const text = `Hi Carnaval of Screams, I would like to reserve a VVIP table for ${night.day} (${night.label}).`;
          const preferred = asked === night.id;
          return (
            <a
              key={night.id}
              href={waMeUrl(WHATSAPP_NUMBER, text)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${button} ${
                preferred
                  ? "border-white/80 bg-white text-black hover:bg-transparent hover:text-white"
                  : "border-white/30 bg-transparent text-white hover:border-white/70"
              }`}
            >
              WhatsApp us for {night.day} · {night.short}
            </a>
          );
        })}
      </div>

      <Link
        href="/reserve"
        className="mt-10 self-center text-sm text-white/65 underline underline-offset-4 transition-colors hover:text-white"
      >
        Back to table reservation
      </Link>
    </div>
  );
}
