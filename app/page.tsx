import GuestStars from "@/components/GuestStars";
import Hero from "@/components/Hero";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Tickets from "@/components/Tickets";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Hero />
        <GuestStars />
        <Tickets />
      </main>
      <SiteFooter />
    </div>
  );
}
