"use client";

import { useEffect, useRef } from "react";

/** A modal notice: dimmed page behind it, focus moves in, Esc or OK closes it. */
export default function NoticePopup({ title, message }: { title: string; message: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="notice-title"
      aria-describedby="notice-message"
      className="m-auto w-[min(92vw,26rem)] border border-white/20 bg-ink-soft p-7 text-center text-white shadow-[0_0_60px_rgba(110,190,255,0.18)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <h2 id="notice-title" className="font-heading text-xl tracking-[0.14em] text-white">
        {title}
      </h2>
      <p id="notice-message" className="mt-4 text-sm leading-relaxed text-white/80">
        {message}
      </p>
      <form method="dialog" className="mt-6">
        <button
          autoFocus
          className="btn-press inline-flex items-center justify-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          OK
        </button>
      </form>
    </dialog>
  );
}
