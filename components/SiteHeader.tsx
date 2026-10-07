"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Lineup", href: "/#guest-stars" },
  { label: "Ticket", href: "/#tickets" },
  { label: "About", href: "/about" },
  // { label: "Gallery", href: "/gallery" },
  // { label: "Reservation", href: "/reserve" },
] as const;

const SECTION_IDS = NAV_LINKS.flatMap((link) => {
  const id = link.href.split("#")[1];
  return id ? [id] : [];
});

function isActive(pathname: string, href: string, section: string | null) {
  const hash = href.split("#")[1];
  if (hash) return pathname === "/" && section === hash;
  if (href === "/") {
    return (pathname === "/" && section === null) || pathname.startsWith("/dev");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  const lockUntil = useRef(0);
  const [section, setSection] = useState<string | null>(null);

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

  useEffect(() => {
    if (pathname !== "/") return;

    const update = () => {
      if (Date.now() < lockUntil.current) return;
      let current: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)?.closest("section");
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) {
          current = id;
        }
      }
      setSection(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  useLayoutEffect(() => {
    moveToActive(mounted.current);
    mounted.current = true;

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
  }, [moveToActive, pathname, section]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-100 flex justify-center pt-8">
      <div
        ref={barRef}
        className="t-tabs pointer-events-auto border border-white/30 shadow-[0px_2px_48px_0px_rgba(110,190,255,0.22)]"
        role="navigation"
        aria-label="Site"
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {NAV_LINKS.map((link) => {
          const current = isActive(pathname, link.href, section);
          return (
            <Link
              key={link.label}
              href={link.href}
              className="t-tab font-heading flex items-center text-center text-[11px] md:text-sm"
              aria-current={current ? "page" : undefined}
              onClick={(event) => {
                const hash = link.href.split("#")[1] ?? null;
                lockUntil.current = Date.now() + 900;
                setSection(hash);

                // Next skips the scroll when the hash is already in the URL,
                // so handle same-page links ourselves.
                if (pathname !== "/" || (!hash && link.href !== "/")) return;
                event.preventDefault();
                if (hash) {
                  document.getElementById(hash)?.scrollIntoView({ block: "start" });
                } else {
                  window.scrollTo({ top: 0 });
                }
                window.history.replaceState(null, "", link.href);
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
