import type { NightId, TablePackageId } from "../tables";

/** The hold and the Snap transaction expire together. */
export const PAYMENT_DUE_MINUTES = 10;

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
