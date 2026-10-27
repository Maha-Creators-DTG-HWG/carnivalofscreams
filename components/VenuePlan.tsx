"use client";

import { cn } from "cn";

import ZoomFrame from "@/components/ZoomFrame";
import { SEATS } from "@/lib/seats";
import { TABLE_POINTS, VENUE_MAP } from "@/lib/venue-areas";

// The tables sit in the middle of the venue drawing; crop to that part so the
// labels stay legible at admin widths.
const PLAN_VIEW = { x: 420, y: 1060, width: 2360, height: 1600 };
const TABLE_RADIUS = 22;

export type SeatLook = {
  color: string;
  /** Filled tables read as taken, outlined ones as free. */
  filled: boolean;
  /** Announced by screen readers: "Etius 1: Checked in, Rina". */
  label: string;
};

/** The venue floor plan with every table drawn by `look`; zoom and pan included. */
export default function VenuePlan({
  look,
  selected,
  onSelect,
}: {
  look: (seatId: string) => SeatLook;
  selected: string | null;
  onSelect: (seatId: string) => void;
}) {
  return (
    <ZoomFrame className="bg-black outline outline-1 -outline-offset-1 outline-white/10">
      <svg
        viewBox={`${PLAN_VIEW.x} ${PLAN_VIEW.y} ${PLAN_VIEW.width} ${PLAN_VIEW.height}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Floor plan. Pick a table to see its booking."
      >
        <image href={VENUE_MAP.src} width={VENUE_MAP.width} height={VENUE_MAP.height} />
        <rect
          x={PLAN_VIEW.x}
          y={PLAN_VIEW.y}
          width={PLAN_VIEW.width}
          height={PLAN_VIEW.height}
          fill="rgba(5,3,8,0.3)"
        />
        {SEATS.map((seat) => {
          const point = TABLE_POINTS[seat.id];
          if (!point) return null;
          const state = look(seat.id);
          const isSelected = selected === seat.id;
          return (
            <g
              key={seat.id}
              role="button"
              tabIndex={0}
              aria-label={state.label}
              aria-pressed={isSelected}
              className="group cursor-pointer outline-none"
              onClick={() => onSelect(seat.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(seat.id);
                }
              }}
            >
              <circle
                cx={point[0]}
                cy={point[1]}
                r={TABLE_RADIUS + 9}
                fill="none"
                stroke="white"
                strokeWidth={4}
                className={cn(
                  "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-100",
                  isSelected && "opacity-100",
                )}
              />
              <circle
                cx={point[0]}
                cy={point[1]}
                r={TABLE_RADIUS}
                fill={state.filled ? state.color : "rgba(5,3,8,0.01)"}
                fillOpacity={state.filled ? 0.65 : 1}
                stroke={state.color}
                strokeWidth={3}
              />
            </g>
          );
        })}
      </svg>
    </ZoomFrame>
  );
}
