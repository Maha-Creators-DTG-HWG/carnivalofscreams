"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";

import { ACTIVE_PASS } from "@/lib/tickets";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Lineup", href: "/#guest-stars" },
  { label: "Ticket", href: `/#${ACTIVE_PASS.id}` },
  { label: "About", href: "/about" },
  // { label: "Gallery", href: "/gallery" },
  // { label: "Reservation", href: "/reserve" },
] as const;

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/" || pathname.startsWith("/dev");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const moveTo = useCallback((tab: HTMLElement, animate: boolean) => {
    const pill = pillRef.current;
    if (!pill) return;

    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
      return;
    }

    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
  }, []);

  const scrollTabIntoView = useCallback((tab: HTMLElement, smooth: boolean) => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    tab.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: smooth && !reduceMotion ? "smooth" : "auto",
    });
  }, []);

  const moveToActive = useCallback(
    (animate: boolean) => {
      const tab = barRef.current?.querySelector<HTMLElement>(
        '.t-tab[aria-current="page"]',
      );
      if (!tab) return;
      moveTo(tab, animate);
      scrollTabIntoView(tab, false);
    },
    [moveTo, scrollTabIntoView],
  );

  useLayoutEffect(() => {
    moveToActive(false);

    const bar = barRef.current;
    if (!bar) return;

    const observer = new ResizeObserver(() => moveToActive(false));
    observer.observe(bar);

    const onResize = () => moveToActive(false);
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [moveToActive, pathname]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-100 flex justify-center pt-8">
      <div
        ref={barRef}
        className="t-tabs pointer-events-auto border border-white/30 shadow-[0px_2px_48px_0px_rgba(217,169,79,0.25)]"
        role="navigation"
        aria-label="Site"
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {NAV_LINKS.map((link) => {
          const current = isActive(pathname, link.href);
          return (
            <Link
              key={link.label}
              href={link.href}
              className="t-tab font-heading flex items-center text-center text-[11px] md:text-sm"
              aria-current={current ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
