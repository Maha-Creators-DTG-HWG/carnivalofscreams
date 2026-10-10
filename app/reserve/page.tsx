import type { Metadata } from "next";

import ReserveWorkspace from "@/components/ReserveWorkspace";
import {
  PAYMENT_DUE_MINUTES,
  getMidtransClientKey,
  getSnapJsUrl,
  isMidtransConfigured,
} from "@/lib/midtrans";
import { deliveryChannels } from "@/lib/invoice";

export const metadata: Metadata = {
  title: "Reserve a table",
  description:
    `Hold a table at Carnaval of Screams. Pick a table number, pay the booking fee through Midtrans within ${PAYMENT_DUE_MINUTES} minutes, then receive the invoice by email and WhatsApp.`,
};

export const dynamic = "force-dynamic";

export default function ReservePage() {
  return (
    <ReserveWorkspace
      enabled={isMidtransConfigured()}
      snapJsUrl={getSnapJsUrl()}
      clientKey={getMidtransClientKey()}
      delivery={deliveryChannels()}
    />
  );
}
