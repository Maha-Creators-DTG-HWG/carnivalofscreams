import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import WhatsAppButton from "@/components/WhatsAppButton";

import { angie } from "./fonts";
import "./globals.css";

// og:image has to be an absolute URL. Without this Next falls back to the
// per-deployment vercel.app host, so social caches pin to a stale deploy.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050308",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Carnaval of Screams",
    template: "%s · Carnaval of Screams",
  },
  description:
    "Indonesia's greatest Halloween festival. Two nights of masks, music and mayhem in Yogyakarta, 30 to 31 October 2026.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${angie.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black"
        >
          Skip to content
        </a>
        {children}
        <WhatsAppButton />
      </body>
      <GoogleAnalytics gaId="G-F8T6K8MGLZ" />
    </html>
  );
}
