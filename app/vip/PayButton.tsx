"use client";

import { useFormStatus } from "react-dom";

/** Locks while the order is created, so a double click cannot start two payments. */
export default function PayButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? "Opening payment…" : "Pay"}
    </button>
  );
}
