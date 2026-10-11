"use client";

import { useEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;
// Pointer travel before a press counts as a pan rather than a tap on a table.
const DRAG_PX = 6;

type View = { scale: number; x: number; y: number };

/** Keeps the zoomed plan from being dragged off the edge of the w × h frame. */
function clampView(v: View, w: number, h: number): View {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale));
  if (scale === 1) return { scale, x: 0, y: 0 };
  return {
    scale,
    x: Math.min(0, Math.max(w * (1 - scale), v.x)),
    y: Math.min(0, Math.max(h * (1 - scale), v.y)),
  };
}

/** Zoom to `scale`, keeping the point (cx, cy) in the frame where it is. */
function zoomView(v: View, scale: number, cx: number, cy: number, w: number, h: number) {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  const ratio = next / v.scale;
  return clampView(
    { scale: next, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio },
    w,
    h,
  );
}

export default function ZoomFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const dragged = useRef(false);
  const downAt = useRef({ x: 0, y: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });

  const frameSize = () => {
    const box = frameRef.current?.getBoundingClientRect();
    return { w: box?.width ?? 0, h: box?.height ?? 0 };
  };

  const zoomFromCentre = (factor: number) => {
    const { w, h } = frameSize();
    setView((v) => zoomView(v, v.scale * factor, w / 2, h / 2, w, h));
  };

  // The wheel zooms at the cursor. Needs a non-passive listener so the page
  // doesn't scroll (or, with Ctrl/⌘ or a trackpad pinch, zoom) as well.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = frame.getBoundingClientRect();
      // A trackpad pinch reports small deltas; a wheel notch reports ~100.
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002));
      setView((v) =>
        zoomView(
          v,
          v.scale * factor,
          event.clientX - box.left,
          event.clientY - box.top,
          box.width,
          box.height,
        ),
      );
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 1) {
      dragged.current = false;
      downAt.current = { x: event.clientX, y: event.clientY };
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
      };
      dragged.current = true;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return;
    const here = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, here);

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const target = pinch.current.scale * (dist / pinch.current.dist);
      setView((v) =>
        zoomView(
          v,
          target,
          (a.x + b.x) / 2 - box.left,
          (a.y + b.y) / 2 - box.top,
          box.width,
          box.height,
        ),
      );
      return;
    }

    if (pointers.current.size !== 1 || view.scale === 1) return;
    if (
      !dragged.current &&
      Math.hypot(here.x - downAt.current.x, here.y - downAt.current.y) < DRAG_PX
    ) {
      return;
    }
    if (!dragged.current) {
      dragged.current = true;
      // Only now: capturing on press would swallow the click on a table.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setView((v) =>
      clampView(
        { ...v, x: v.x + here.x - last.x, y: v.y + here.y - last.y },
        box.width,
        box.height,
      ),
    );
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const zoomed = view.scale > 1;
  const zoomButton =
    "grid size-10 place-items-center border border-white/25 bg-black/70 font-heading text-lg leading-none text-white transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:border-white/25";

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden ${
        zoomed ? "cursor-grab active:cursor-grabbing" : ""
      } ${className ?? ""}`}
      // Zoomed in, a finger drag pans the plan; at 1× it still scrolls the page.
      style={{ touchAction: zoomed ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(event) => {
        // A pan that ends over a table is not a tap on it.
        if (dragged.current) {
          event.stopPropagation();
          event.preventDefault();
          dragged.current = false;
        }
      }}
    >
      <div
        className="relative origin-top-left will-change-transform"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={view.scale >= MAX_ZOOM}
          onClick={() => zoomFromCentre(ZOOM_STEP)}
          className={zoomButton}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!zoomed}
          onClick={() => zoomFromCentre(1 / ZOOM_STEP)}
          className={zoomButton}
        >
          −
        </button>
        {zoomed ? (
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            className={`${zoomButton} text-[10px] tracking-[0.1em]`}
          >
            1×
          </button>
        ) : null}
      </div>
    </div>
  );
}
