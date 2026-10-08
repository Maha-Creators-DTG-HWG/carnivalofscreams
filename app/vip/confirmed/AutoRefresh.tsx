"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks a pending payment every few seconds, for about two minutes. */
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let runs = 0;
    const id = setInterval(() => {
      runs += 1;
      if (runs > 24) clearInterval(id);
      else router.refresh();
    }, 5_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
