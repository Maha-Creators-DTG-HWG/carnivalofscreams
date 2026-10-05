"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { selectReservationSeat } from "@/app/actions/reserve";
import SeatMap from "@/components/SeatMap";
import { seatsForPackage } from "@/lib/seats";
import { getTablePackage, type TablePackageId } from "@/lib/tables";

type Props = {
  orderId: string;
  packageId: TablePackageId;
  takenSeatIds: string[];
};

export default function SeatPicker({
  orderId,
  packageId,
  takenSeatIds,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seats = seatsForPackage(packageId);
  const area = getTablePackage(packageId);

  function onConfirm() {
    if (!selectedSeatId) {
      setError("Pick a table in the area you paid for.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await selectReservationSeat({
        orderId,
        seatId: selectedSeatId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      <SeatMap
        highlightAreaId={packageId}
        highlightLabel={area?.name}
        highlightSeatId={selectedSeatId}
        takenSeatIds={takenSeatIds}
        onSelectSeat={(id) => {
          setSelectedSeatId(id);
          setError(null);
        }}
      />
      <p className="mt-3 mb-8 text-sm text-white/45">
        {area?.name} is lit up on the plan. Confirm your table below.
      </p>

      <div className="flex w-full flex-wrap justify-center gap-1.5">
        {seats.map((item) => {
          const taken = takenSeatIds.includes(item.id);
          const selected = selectedSeatId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={taken}
              aria-pressed={selected}
              aria-label={taken ? `${item.label}, taken` : item.label}
              onClick={() => {
                setSelectedSeatId(item.id);
                setError(null);
              }}
              className={`min-w-12 border px-2 py-2 font-heading text-[11px] tracking-[0.12em] transition-colors ${
                taken
                  ? "cursor-not-allowed border-destructive bg-destructive/85 text-white line-through decoration-white/70"
                  : selected
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-black/30 text-white hover:border-white/50"
              }`}
            >
              {item.short}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/70"
        >
          <span className="pass-signal" aria-hidden="true" />
          {error}
        </p>
      ) : (
        <p className="mt-6 text-sm text-white/45">
          Only tables in your paid area can be chosen. Red numbers are already
          taken.
        </p>
      )}

      <button
        type="button"
        disabled={pending || !selectedSeatId}
        onClick={onConfirm}
        className="btn-press mt-8 inline-flex items-center justify-center border border-white/80 bg-white px-8 py-3 font-heading text-[11px] tracking-[0.28em] text-black transition-colors duration-200 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black"
      >
        {pending ? "Holding table…" : "Confirm table"}
      </button>
    </div>
  );
}
