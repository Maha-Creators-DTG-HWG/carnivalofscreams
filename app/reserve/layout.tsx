import ArrivalGround from "@/components/ArrivalGround";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function ReserveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <SiteHeader />
      <main id="main" className="relative isolate flex flex-1 flex-col bg-ink">
        <ArrivalGround />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
