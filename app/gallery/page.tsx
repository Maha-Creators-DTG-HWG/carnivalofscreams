import type { Metadata } from "next";

import PastEventsGallery from "@/components/gallery/PastEventsGallery";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Past events",
  description:
    "Nights already burned: C.L.O.W.N 2023, CLEOPATRA 2024, and CHARIOT 2025 at Carnaval of Screams in Yogyakarta.",
};

export default function GalleryPage() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col overflow-hidden bg-ink">
      <SiteHeader />
      <main id="main" className="relative flex min-h-svh flex-1 flex-col">
        <PastEventsGallery />
      </main>
    </div>
  );
}
