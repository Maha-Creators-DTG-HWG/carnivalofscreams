"use client";

import { useEffect, useRef, useState } from "react";

import { getSeat, seatsForPackage } from "@/lib/seats";
import type { TablePackageId } from "@/lib/tables";
import { getAreaOutline, TABLE_POINTS, VENUE_MAP } from "@/lib/venue-areas";

type Props = {
  className?: string;
  /** Area to spotlight on the plan; everything else dims behind it. */
  highlightAreaId?: string | null;
  highlightLabel?: string;
  /** Table to single out inside the highlighted area. */
  highlightSeatId?: string | null;
  takenSeatIds?: string[];
  /** When given, tables on the plan become tap targets. */
  onSelectSeat?: (seatId: string) => void;
};

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

// Tables sit as little as 50 plan pixels apart, so rings and tap targets stay small.
const RING = 22;

export default function SeatMap({
  className,
  highlightAreaId,
  highlightLabel,
  highlightSeatId,
  takenSeatIds = [],
  onSelectSeat,
}: Props) {
  const outline = getAreaOutline(highlightAreaId);
  const tables = highlightAreaId
    ? seatsForPackage(highlightAreaId as TablePackageId).flatMap((seat) => {
        const point = TABLE_POINTS[seat.id];
        return point ? [{ seat, point }] : [];
      })
    : [];
  const selected = highlightSeatId ? getSeat(highlightSeatId) : undefined;
  const selectedPoint = selected ? TABLE_POINTS[selected.id] : undefined;

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
      className={`pass-panel relative overflow-hidden bg-black ${
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={VENUE_MAP.src}
          alt={VENUE_MAP.alt}
          width={VENUE_MAP.width}
          height={VENUE_MAP.height}
          fetchPriority="high"
          decoding="async"
          className="h-auto w-full"
        />
        {tables.length > 0 ? (
          <svg
            viewBox={`0 0 ${VENUE_MAP.width} ${VENUE_MAP.height}`}
            className={`absolute inset-0 h-full w-full ${
              onSelectSeat ? "" : "pointer-events-none"
            }`}
            role={onSelectSeat ? "group" : "img"}
            aria-label={
              selected
                ? `${selected.label} highlighted on the floor plan`
                : highlightLabel
                  ? `${highlightLabel} highlighted on the floor plan`
                  : "Selected area highlighted on the floor plan"
            }
          >
            <defs>
              <mask id="area-cutout">
                <rect width="100%" height="100%" fill="white" />
                {outline ? <path d={outline} fill="black" /> : null}
                {tables.map(({ seat, point }) => (
                  <circle
                    key={seat.id}
                    cx={point[0]}
                    cy={point[1]}
                    r={RING + 8}
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(5, 3, 8, 0.72)"
              mask="url(#area-cutout)"
            />
            {outline ? (
              <path
                d={outline}
                fill="none"
                stroke="var(--gold-bright)"
                strokeOpacity={selected ? 0.35 : 0.9}
                strokeWidth={4}
                strokeLinejoin="round"
              />
            ) : null}
            {tables.map(({ seat, point }) => {
              const taken = takenSeatIds.includes(seat.id);
              // Taken tables get a solid red cover with a cross, so they read
              // as closed at a glance and not just as a fainter ring.
              const ring = taken ? (
                <>
                  <circle
                    cx={point[0]}
                    cy={point[1]}
                    r={RING + 2}
                    fill="var(--destructive)"
                    fillOpacity={0.85}
                    stroke="var(--destructive)"
                    strokeWidth={2.5}
                  />
                  <path
                    d={`M${point[0] - 9},${point[1] - 9} L${point[0] + 9},${point[1] + 9} M${point[0] + 9},${point[1] - 9} L${point[0] - 9},${point[1] + 9}`}
                    stroke="white"
                    strokeOpacity={0.9}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={RING}
                  fill="rgba(0,0,0,0.01)"
                  stroke="var(--gold-bright)"
                  strokeOpacity={selected ? 0.35 : 0.7}
                  strokeWidth={2.5}
                />
              );
              if (onSelectSeat && taken) {
                return (
                  <g key={seat.id} className="cursor-not-allowed">
                    <title>{`${seat.label} is taken`}</title>
                    {ring}
                  </g>
                );
              }
              if (!onSelectSeat) {
                return (
                  <g key={seat.id} className="pointer-events-none">
                    {ring}
                  </g>
                );
              }
              return (
                <g
                  key={seat.id}
                  role="button"
                  tabIndex={0}
                  aria-label={seat.label}
                  aria-pressed={highlightSeatId === seat.id}
                  className="group cursor-pointer outline-none max-md:pointer-events-none [&>circle]:hover:stroke-white"
                  onClick={() => onSelectSeat(seat.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSeat(seat.id);
                    }
                  }}
                >
                  <circle cx={point[0]} cy={point[1]} r={RING + 3} fill="rgba(0,0,0,0.01)" />
                  {ring}
                  <circle
                    cx={point[0]}
                    cy={point[1]}
                    r={RING + 10}
                    fill="none"
                    stroke="white"
                    strokeWidth={4}
                    className="hidden group-focus-visible:block"
                  />
                </g>
              );
            })}
            {selectedPoint ? (
              <g className="pointer-events-none">
                <circle
                  cx={selectedPoint[0]}
                  cy={selectedPoint[1]}
                  r={RING + 6}
                  fill="rgba(243, 207, 138, 0.22)"
                  stroke="var(--gold-bright)"
                  strokeWidth={5}
                />
                <circle
                  cx={selectedPoint[0]}
                  cy={selectedPoint[1]}
                  r={RING + 6}
                  fill="none"
                  stroke="var(--gold-bright)"
                  strokeWidth={3}
                  className="seat-pulse"
                />
              </g>
            ) : null}
          </svg>
        ) : null}
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
