"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const pages = ["Cover", "Whisky, Vodka, Tequila", "Gin, Rum, Cognac, Liqueur, Beer, Non-alcohol"];

export default function BottleMenu() {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const start = useRef<{ x: number; y: number; width: number; progress: number } | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const revision = useRef(0);
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const rotation = useTransform(progress, [-1, 0, 1], [90, 0, -90]);
  const opacity = useTransform(progress, [-1, 0, 1], [0, 1, 0]);
  const shade = useTransform(progress, [-1, 0, 1], [0.5, 0, 0.5]);

  function settle(commit: boolean, turn = direction) {
    animation.current?.stop();
    const id = ++revision.current;
    const allowed = page + turn >= 0 && page + turn < pages.length;
    const target = commit && allowed ? turn : 0;
    animation.current = animate(progress, target, {
      duration: reduceMotion ? 0.12 : 0.35,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        if (revision.current !== id) return;
        if (target) setPage((current) => current + turn);
        progress.set(0);
      },
    });
  }

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center overflow-hidden bg-[#050609]">
      <div
        role="slider"
        aria-label="Bottle menu. Swipe left or right, or use arrow keys to turn pages."
        aria-valuemin={1}
        aria-valuemax={pages.length}
        aria-valuenow={page + 1}
        aria-valuetext={`Page ${page + 1}: ${pages[page]}`}
        tabIndex={0}
        className="relative aspect-[3/4] w-full max-w-[min(900px,75dvh)] cursor-grab select-none focus-visible:outline-2 focus-visible:outline-white active:cursor-grabbing"
        style={{ perspective: 1600, touchAction: "pan-y pinch-zoom" }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const turn = event.key === "ArrowRight" ? 1 : -1;
          setDirection(turn);
          settle(true, turn);
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          animation.current?.stop();
          revision.current++;
          start.current = { x: event.clientX, y: event.clientY, width: event.currentTarget.clientWidth, progress: progress.get() };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const origin = start.current;
          if (!origin || !event.isPrimary) return;
          const dx = origin.x - event.clientX;
          if (Math.abs(dx) < Math.abs(origin.y - event.clientY) && progress.get() === 0) return;
          const value = Math.max(-1, Math.min(1, origin.progress + dx / origin.width));
          const turn = value >= 0 ? 1 : -1;
          setDirection(turn);
          progress.set(page + turn < 0 || page + turn >= pages.length ? 0 : value);
        }}
        onPointerUp={() => {
          if (!start.current) return;
          start.current = null;
          settle(Math.abs(progress.get()) > 0.18);
        }}
        onPointerCancel={() => { start.current = null; settle(false); }}
        onLostPointerCapture={() => {
          if (start.current) { start.current = null; settle(false); }
        }}
      >
        {pages.map((label, index) => (
          <Image key={label} src={`/menu/bottle-menu-${index + 1}.jpg`} alt="" aria-hidden width={1350} height={1800} priority unoptimized draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={{ visibility: index === page + direction ? "visible" : "hidden" }} />
        ))}
        <motion.div className="pointer-events-none absolute inset-0 bg-black shadow-2xl" style={{ rotateY: reduceMotion ? 0 : rotation, opacity: reduceMotion ? opacity : 1, transformOrigin: direction > 0 ? "left center" : "right center", backfaceVisibility: "hidden" }}>
          <Image src={`/menu/bottle-menu-${page + 1}.jpg`} alt={`Bottle menu: ${pages[page]}`} width={1350} height={1800} priority unoptimized draggable={false} className="h-full w-full object-contain" />
          <motion.div className="absolute inset-0 bg-black" style={{ opacity: reduceMotion ? 0 : shade }} />
        </motion.div>
      </div>
    </main>
  );
}
