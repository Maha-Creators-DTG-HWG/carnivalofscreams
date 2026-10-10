"use client";

import Image from "next/image";
import { motion } from "motion/react";

import VideoBackground from "./VideoBackground";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const item = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  }),
};

export default function Hero() {
  return (
    <section className="relative flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
      <VideoBackground className="absolute inset-0 z-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-linear-to-t from-ink via-ink/70 to-transparent sm:h-52"
      />

      <motion.p
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.1}
        className="relative z-10 font-heading text-base tracking-widest text-white/80 sm:text-xl"
      >
        THE GREATEST HALLOWEEN FESTIVAL
      </motion.p>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.25}
        className="relative z-10 mt-4 w-full sm:mt-6"
        style={{ maxWidth: "min(86vw, 620px, calc(32svh * 1.81))" }}
      >
        <Image
          src="/images/LOGO-COS-2026-trimmed.webp"
          alt="Carnaval of Screams"
          width={2281}
          height={1258}
          priority
          className="h-auto w-full [mask-image:radial-gradient(ellipse_78%_70%_at_50%_50%,black_55%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_78%_70%_at_50%_50%,black_55%,transparent_100%)]"
        />
      </motion.div>

      <motion.p
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.4}
        className="relative z-10 mt-2 font-heading text-base tracking-widest text-white sm:mt-4 sm:text-2xl"
      >
        30<sup className="text-[0.6em]">TH</sup> – 31<sup className="text-[0.6em]">ST</sup> OCTOBER 2026
      </motion.p>

      <motion.p
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.55}
        className="relative z-10 mt-3 font-heading text-sm tracking-widest text-white/70 sm:mt-4 sm:text-base"
      >
        YOGYAKARTA, INDONESIA
      </motion.p>

    <div className="mt-12 flex flex-col items-center gap-4">
      <motion.a
        href="https://artatix.co.id/event/carnval_of_scream_2026"
        target="_blank"
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.7}
        className="btn-press relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/15 bg-black px-10 py-4 font-heading text-sm font-semibold text-white shadow-[0_0_50px_-10px_rgba(255,255,255,0.9)] transition-shadow duration-200 hover:shadow-[0_0_64px_-8px_rgba(255,255,255,1)] sm:px-16 sm:py-5 sm:text-lg tracking-widest"
      >
        GET YOUR TICKETS
      </motion.a>
      <motion.a
        href="/reserve"
        variants={item}
        initial="hidden"
        animate="show"
        custom={0.85}
        className="btn-press relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/15 bg-white px-10 py-4 font-heading text-sm font-semibold tracking-widest text-black shadow-[0_0_50px_-10px_rgba(255,255,255,0.9)] transition-shadow duration-200 hover:shadow-[0_0_64px_-8px_rgba(255,255,255,1)] sm:px-16 sm:py-5 sm:text-lg"
      >
        RESERVATION PHASE 2
      </motion.a>
      </div>
    </section>
  );
}
