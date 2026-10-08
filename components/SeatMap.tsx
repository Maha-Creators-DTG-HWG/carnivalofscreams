"use client";

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

const RING = 24;

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
        const point = TABLE_POINTS[seat.short];
        return point ? [{ seat, point }] : [];
      })
    : [];
  const selected = highlightSeatId ? getSeat(highlightSeatId) : undefined;
  const selectedPoint = selected ? TABLE_POINTS[selected.short] : undefined;

  return (
    <div
      className={`pass-panel relative overflow-hidden bg-black ${className ?? ""}`}
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
                <circle cx={point[0]} cy={point[1]} r={RING + 14} fill="rgba(0,0,0,0.01)" />
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
  );
}
