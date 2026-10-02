export {};

export type SnapPayResult = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  status_code?: string;
  status_message?: string | string[];
  fraud_status?: string;
  payment_type?: string;
  gross_amount?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: SnapPayResult) => void;
          onPending?: (result: SnapPayResult) => void;
          onError?: (result: SnapPayResult) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}
