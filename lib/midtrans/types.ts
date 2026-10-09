import type { NightId, TablePackageId } from "../tables";

/** How long the guest has to pay; this is also the Snap transaction expiry. */
export const PAYMENT_DUE_MINUTES = 10;

/**
 * The local hold outlasts the Snap expiry by this long, so a payment that
 * settles just after the window (bank transfers, slow notifications) still
 * finds its seat held instead of released to someone else.
 */
export const HOLD_GRACE_SECONDS = 5 * 60;

/** dueAt: when the guest's payment window closes. releasesAt: when the seat is freed. */
export function holdWindow(now = Date.now()) {
  const dueAt = new Date(now + PAYMENT_DUE_MINUTES * 60 * 1000);
  const releasesAt = new Date(dueAt.getTime() + HOLD_GRACE_SECONDS * 1000);
  return { dueAt, releasesAt };
}

export type ReservationPayload = {
  name: string;
  nik: string;
  email: string;
  phone: string;
  nightId: NightId;
  packageId: TablePackageId;
  seatId: string;
};

export type SnapTransaction = {
  token: string;
  redirectUrl: string;
};

export type MidtransStatus = {
  orderId?: string;
  transactionId?: string;
  transactionStatus?: string;
  fraudStatus?: string;
  statusCode?: string;
  paymentType?: string;
  grossAmount?: string;
};
