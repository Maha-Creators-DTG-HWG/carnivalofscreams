import type { Metadata } from "next";

import About from "@/components/About";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Carnaval of Screams is Yogyakarta's premier Halloween event promoter, delivering immersive horror experiences since 2023.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <About />
      </main>
      <SiteFooter />
    </div>
  );
}
