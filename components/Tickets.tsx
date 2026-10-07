import { TICKETS_URL } from "@/lib/site";
import { PASSES } from "@/lib/tickets";

export default function Tickets() {
  return (
    <section className="relative isolate overflow-hidden bg-ink px-6 pb-28 pt-24 sm:pb-36 sm:pt-0">
      <div
        id="tickets"
        className="relative mx-auto w-full max-w-6xl text-center"
      >
        <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
          Carnaval of Screams
        </p>
        <h2 className="pass-title mt-5 font-heading text-5xl tracking-[0.14em] text-white sm:text-7xl">
          Tickets
        </h2>
        <p className="mt-6 font-heading text-sm tracking-[0.28em] text-white sm:text-xl">
          Be there before the story unfolds
        </p>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
          Choose the pass that fits how you want to experience the arrival. One
          ticket admits one person. 1 Day Passes are valid on either night; 2
          Day Passes cover both.
        </p>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {PASSES.map((pass) => (
            <article
              id={pass.id}
              key={pass.id}
              className={`pass-panel flex flex-col px-6 py-7 sm:px-7 ${
                pass.status === "sold-out" ? "pass-panel-dim" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading text-[11px] tracking-[0.32em] text-white/50">
                  {pass.kicker}
                </span>
                {pass.status === "sold-out" ? (
                  <span className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.28em] text-white/45">
                    <span className="pass-signal" aria-hidden="true" />
                    Sold Out
                  </span>
                ) : pass.status === "upcoming" ? (
                  <span className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.28em] text-white/45">
                    <span className="pass-signal" aria-hidden="true" />
                    Coming Soon
                  </span>
                ) : null}
              </div>

              <h3 className="mt-5 font-heading text-2xl tracking-[0.08em] text-white sm:text-[1.7rem]">
                {pass.name}
              </h3>
              <span aria-hidden="true" className="pass-rule" />
              <p className="font-heading text-lg tracking-[0.12em] text-white">
                {pass.price}
              </p>
              <p className="mt-5 flex-1 text-sm leading-relaxed text-white/65">
                {pass.description}
              </p>

              {pass.status === "sold-out" ? (
                <span className="mt-8 inline-flex items-center justify-center border border-white/12 px-5 py-3 font-heading text-[11px] tracking-[0.28em] text-white/30">
                  Sold Out
                </span>
              ) : pass.status === "upcoming" ? (
                <span className="mt-8 inline-flex items-center justify-center border border-white/12 px-5 py-3 font-heading text-[11px] tracking-[0.28em] text-white/30">
                  Coming Soon
                </span>
              ) : (
                <a
                  href={TICKETS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press mt-8 inline-flex items-center justify-center border border-white/80 bg-white px-5 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white"
                >
                  Get Tickets
                </a>
              )}
            </article>
          ))}
        </div>

        <p className="mt-16 text-sm leading-relaxed text-white/40">
          Prices and full payment details are available at{" "}
          <a
            href={TICKETS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
          >
            checkout
          </a>
          . All passes are non-refundable once purchased.
        </p>
        <p className="mt-6 font-heading text-[10px] tracking-[0.38em] text-white/35">
          Official Ticketing Partner
        </p>
        <a
          href={TICKETS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs tracking-[0.22em] text-white/70 transition-colors hover:text-white"
        >
          ARTATIX
        </a>
      </div>
    </section>
  );
}
