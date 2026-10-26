import type { Metadata } from "next";
import BottleMenu from "./BottleMenu";

export const metadata: Metadata = {
  title: "Bottle Menu",
  description: "Browse the Carnaval of Screams bottle menu for 30–31 October 2026 at Hosel Driving Range.",
};

export default function PricelistPage() {
  return <BottleMenu />;
}
