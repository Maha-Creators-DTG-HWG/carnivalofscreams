import Image from "next/image";

import { LINEUP } from "@/lib/lineup";

export default function GuestStars() {
  return (
    <section
      className="relative isolate overflow-hidden bg-ink px-6 pb-24 pt-24 sm:pb-28 sm:pt-32"
    >
      <div
        id="guest-stars"
        className="relative mx-auto w-full max-w-6xl text-center"
      >
        <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
          Guest Stars
        </p>
        <h2 className="pass-title mt-5 font-heading text-5xl tracking-[0.14em] text-white sm:text-7xl">
          Arriving
        </h2>
        <p className="mt-6 font-heading text-sm tracking-[0.28em] text-white sm:text-xl">
          Two nights full of surprises.
        </p>

        <ul className="mt-12 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {LINEUP.map((guest) => (
            <li key={guest.id} className="group min-w-0 text-left">
              <figure className="relative aspect-[3/4] overflow-hidden border border-white/12 bg-[radial-gradient(ellipse_at_50%_65%,#252044_0%,#0d0714_65%)] transition-[border-color,transform] duration-300 motion-safe:group-hover:-translate-y-1 group-hover:border-white/35">
                <Image
                  src={guest.image}
                  alt={guest.alt}
                  fill
                  sizes="(min-width: 1200px) 218px, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 44vw"
                  className="object-contain object-bottom px-2 pt-3"
                />
              </figure>
              <div className="mt-4 px-1">
                <p className="font-heading text-[9px] leading-relaxed tracking-[0.12em] text-white/50">
                  {guest.day}
                  <span className="mx-1 text-white/25" aria-hidden="true">
                    ·
                  </span>
                  {guest.date}
                </p>
                <h3 className="mt-2 font-heading text-base leading-snug tracking-[0.06em] text-white">
                  {guest.name}
                </h3>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
