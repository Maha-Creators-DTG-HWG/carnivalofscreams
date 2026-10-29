"use client";

export default function ReserveError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55">
        Reservation
      </p>
      <h1 className="pass-title mt-5 font-heading text-3xl tracking-[0.14em] text-white">
        The page could not load
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-white/55">
        Try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-press mt-10 inline-flex items-center justify-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white"
      >
        Try again
      </button>
    </div>
  );
}
