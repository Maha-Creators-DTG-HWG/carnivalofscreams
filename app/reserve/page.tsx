import type { Metadata } from "next";

import ReserveWorkspace from "@/components/ReserveWorkspace";
import {
  getMidtransClientKey,
  getSnapJsUrl,
  isMidtransConfigured,
} from "@/lib/midtrans";

export const metadata: Metadata = {
  title: "Reserve a table",
  description:
    "Hold a table at Carnaval of Screams. Pick a table number, pay the booking fee through Midtrans within 60 minutes, then receive the invoice by email and WhatsApp.",
};

export const dynamic = "force-dynamic";

export default function ReservePage() {
  return (
    <ReserveWorkspace
      enabled={isMidtransConfigured()}
      snapJsUrl={getSnapJsUrl()}
      clientKey={getMidtransClientKey()}
    />
  );
}
