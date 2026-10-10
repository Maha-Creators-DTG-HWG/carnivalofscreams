import NoticePopup from "./NoticePopup";

const NOTICES: Record<string, { title: string; message: string }> = {
  code: {
    title: "Booking code not found",
    message: "We could not find that booking code. Use the booking code from your table invoice.",
  },
  closed: {
    title: "Coming soon",
    message: "VIP tickets are not on sale yet. Please check back soon.",
  },
  lookup: {
    title: "Please try again",
    message: "We could not check that code. Please try again in a moment.",
  },
};

const field =
  "border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition-colors focus:border-white/70 focus-visible:ring-2 focus-visible:ring-white/50";
const button =
  "btn-press inline-flex items-center justify-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white";

export default function VipView({ code, error }: { code: string; error?: string }) {
  const notice = error ? (NOTICES[error] ?? NOTICES.lookup) : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-6 pb-28 pt-24 text-center sm:pt-32">
      <p className="font-heading text-[11px] tracking-[0.42em] text-white/55 sm:text-xs">
        For table guests
      </p>
      <h1 className="pass-title mt-5 font-heading text-4xl tracking-[0.14em] text-balance text-white sm:text-5xl">
        VIP tickets
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
        Enter the booking code from your table invoice to get your VIP tickets.
      </p>

      {notice ? <NoticePopup key={error} title={notice.title} message={notice.message} /> : null}

      <form action="/vip" method="get" className="mt-10 flex flex-col gap-4 text-left">
        <label className="flex flex-col gap-2">
          <span className="font-heading text-[11px] tracking-[0.32em] text-white/50">Booking code</span>
          <input
            name="code"
            defaultValue={code}
            placeholder="COS-30-LUX-…"
            autoComplete="off"
            aria-invalid={notice && error !== "closed" ? true : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className={field}
          />
        </label>
        <button type="submit" className={`${button} self-center`}>
          Get VIP tickets
        </button>
      </form>
    </div>
  );
}
