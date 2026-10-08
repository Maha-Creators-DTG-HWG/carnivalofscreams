"use client";

import { useCallback, useEffect, useState } from "react";

import { listTakenSeatIdsAction } from "@/app/actions/reserve";
import ReserveForm, {
  type ReservePreview,
} from "@/components/ReserveForm";
import SeatMap from "@/components/SeatMap";
import { getSeat } from "@/lib/seats";
import { getTablePackage } from "@/lib/tables";

type Props = {
  enabled: boolean;
  snapJsUrl: string;
  clientKey: string;
};

const TAKEN_POLL_MS = 5_000;

export default function ReserveWorkspace({ enabled, snapJsUrl, clientKey }: Props) {
  const [preview, setPreview] = useState<ReservePreview>({
    step: "night",
    packageId: null,
    nightId: "oct-30",
    seatId: null,
  });
  const [takenSeatIds, setTakenSeatIds] = useState<string[]>([]);
  const [seatId, setSeatId] = useState<string | null>(null);

  const selectedSeat = preview.seatId ? getSeat(preview.seatId) : undefined;
  const selectedArea = preview.packageId
    ? getTablePackage(preview.packageId)
    : undefined;

  const onPreviewChange = useCallback((next: ReservePreview) => {
    setPreview(next);
  }, []);

  // Tables taken (or switched off in admin) while a guest is browsing show up
  // within TAKEN_POLL_MS. Seat ids only, nothing private.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      void listTakenSeatIdsAction(preview.nightId).then((ids) => {
        if (!cancelled) setTakenSeatIds(ids);
      });
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, TAKEN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [preview.nightId, preview.step]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-heading text-[11px] tracking-[0.42em] text-white/55">
            Table reservation
          </p>
          <h1 className="pass-title mt-2 font-heading text-4xl tracking-[0.14em] text-white sm:text-5xl">
            Reserve
          </h1>
        </div>
        {selectedArea ? (
          <p className="font-heading text-sm tracking-[0.18em] text-gold-bright">
            {selectedSeat ? `${selectedSeat.short} · ` : ""}
            {selectedArea.name}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Sticky only in the two-column layout; in one column it would
            pin over the form. */}
        <section className="min-w-0 flex-1 lg:order-last lg:sticky lg:top-28 lg:self-start">
          <SeatMap
            highlightAreaId={preview.packageId}
            highlightLabel={selectedArea?.name}
            highlightSeatId={preview.seatId}
            takenSeatIds={takenSeatIds}
            onSelectSeat={preview.step === "table" ? setSeatId : undefined}
          />
          <p className="mt-3 text-sm text-white/45">
            {selectedArea
              ? selectedSeat
                ? `${selectedSeat.label} is marked on the plan.`
                : `${selectedArea.name} is lit up on the plan. Tap a table on the map or use the list.`
              : "Floor plan of the venue. Choose your area in the form and it lights up here."}
          </p>
        </section>

        <aside className="w-full shrink-0 lg:w-[28rem]">
          <div className="pass-panel p-5 sm:p-6">
            <ReserveForm
              enabled={enabled}
              snapJsUrl={snapJsUrl}
              clientKey={clientKey}
              takenSeatIds={takenSeatIds}
              seatId={seatId}
              onSeatChange={setSeatId}
              onPreviewChange={onPreviewChange}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
