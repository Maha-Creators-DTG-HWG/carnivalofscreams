import Image from "next/image";

export default function ArrivalGround() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 bottom-0 h-[min(72vh,44rem)]">
        <Image
          src="/video/stargate-poster.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_58%] opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/30 to-ink" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(70,100,150,0.18),transparent_55%)]" />
      </div>
    </div>
  );
}
