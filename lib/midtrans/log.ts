import { getDb } from "../db";
import { isFailedStatus, isPaidStatus, isPendingStatus } from "./status";

// Read side of midtrans_callbacks, for the admin panel. Rows are written by
// /api/midtrans/notification (webhook), /api/midtrans/snap-callback (Snap
// popup) and /reserve/confirmed (redirect).

export type MidtransSource = "http_notification" | "snap_js" | "window_redirect";

export type MidtransCallback = {
  id: number;
  createdAt: Date;
  source: string;
  event: string | null;
  orderId: string | null;
  transactionId: string | null;
  transactionStatus: string | null;
  fraudStatus: string | null;
  statusCode: string | null;
  paymentType: string | null;
  grossAmount: string | null;
  signatureValid: boolean | null;
  ip: string | null;
  userAgent: string | null;
  payload: unknown;
};

type CallbackRow = {
  id: number;
  created_at: string;
  source: string;
  event: string | null;
  order_id: string | null;
  transaction_id: string | null;
  transaction_status: string | null;
  status_code: string | null;
  payment_type: string | null;
  signature_valid: boolean | null;
  ip: string | null;
  user_agent: string | null;
  payload: unknown;
};

// headers are left out on purpose: they hold platform tokens.
const CALLBACK_COLUMNS =
  "id, created_at, source, event, order_id, transaction_id, transaction_status, status_code, payment_type, signature_valid, ip, user_agent, payload";

function payloadField(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function mapCallback(row: CallbackRow): MidtransCallback {
  // Snap popup rows wrap the Midtrans result in { event, payload }.
  const inner =
    row.source === "snap_js" && row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>).payload
      : row.payload;
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    source: row.source,
    event: row.event,
    orderId: row.order_id,
    transactionId: row.transaction_id,
    transactionStatus: row.transaction_status,
    fraudStatus: payloadField(inner, "fraud_status"),
    statusCode: row.status_code,
    paymentType: row.payment_type,
    grossAmount: payloadField(inner, "gross_amount"),
    signatureValid: row.signature_valid,
    ip: row.ip,
    userAgent: row.user_agent,
    payload: row.payload,
  };
}

export async function listMidtransCallbacks(options: {
  orderId?: string;
  limit?: number;
} = {}) {
  let query = getDb()
    .from("midtrans_callbacks")
    .select(CALLBACK_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit ?? 500);
  if (options.orderId) query = query.eq("order_id", options.orderId);
  const { data, error } = await query.returns<CallbackRow[]>();
  if (error) throw error;
  return data.map(mapCallback);
}

// What digestCallbacks reads, without the payload JSON: the reservations
// page digests thousands of rows and only needs fraud_status out of it.
const DIGEST_COLUMNS =
  "id, created_at, source, event, order_id, transaction_status, payment_type, signature_valid, fraud_status:payload->>fraud_status";

type DigestRow = Pick<
  CallbackRow,
  | "id"
  | "created_at"
  | "source"
  | "event"
  | "order_id"
  | "transaction_status"
  | "payment_type"
  | "signature_valid"
> & { fraud_status: string | null };

export async function listMidtransDigests(limit = 5000) {
  const { data, error } = await getDb()
    .from("midtrans_callbacks")
    .select(DIGEST_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)
    .returns<DigestRow[]>();
  if (error) throw error;
  return digestByOrder(
    data.map(
      (row): MidtransCallback => ({
        id: row.id,
        createdAt: new Date(row.created_at),
        source: row.source,
        event: row.event,
        orderId: row.order_id,
        transactionId: null,
        transactionStatus: row.transaction_status,
        fraudStatus: row.fraud_status,
        statusCode: null,
        paymentType: row.payment_type,
        grossAmount: null,
        signatureValid: row.signature_valid,
        ip: null,
        userAgent: null,
        payload: null,
      }),
    ),
  );
}

export type MidtransDigest = {
  /** Signed webhook calls from Midtrans for this order. */
  verified: number;
  /** Webhook calls whose signature did not check out. */
  rejected: number;
  /** Latest status from a signed webhook call. */
  lastStatus: string | null;
  lastAt: Date | null;
  paymentType: string | null;
  /** A signed webhook said the money arrived. */
  midtransPaid: boolean;
  /** The guest finished the Snap popup, but no signed webhook followed. */
  awaitingWebhook: boolean;
};

export function digestCallbacks(callbacks: MidtransCallback[]): MidtransDigest {
  const webhooks = callbacks
    .filter((row) => row.source === "http_notification")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  const verified = webhooks.filter((row) => row.signatureValid === true);
  const latest = verified[0];
  const popupDone = callbacks.some(
    (row) =>
      row.source === "snap_js" &&
      (row.event === "onSuccess" || row.event === "onPending"),
  );

  return {
    verified: verified.length,
    rejected: webhooks.filter((row) => row.signatureValid === false).length,
    lastStatus: latest?.transactionStatus ?? null,
    lastAt: latest?.createdAt ?? null,
    paymentType: latest?.paymentType ?? null,
    midtransPaid: verified.some((row) =>
      isPaidStatus(row.transactionStatus ?? undefined, row.fraudStatus ?? undefined),
    ),
    awaitingWebhook: popupDone && verified.length === 0,
  };
}

export function digestByOrder(callbacks: MidtransCallback[]) {
  const grouped = new Map<string, MidtransCallback[]>();
  for (const row of callbacks) {
    if (!row.orderId) continue;
    const list = grouped.get(row.orderId) ?? [];
    list.push(row);
    grouped.set(row.orderId, list);
  }
  return new Map(
    [...grouped].map(([orderId, rows]) => [orderId, digestCallbacks(rows)]),
  );
}

export function statusTone(status: string | null) {
  if (!status) return "none" as const;
  if (isPaidStatus(status)) return "paid" as const;
  if (isPendingStatus(status)) return "pending" as const;
  if (isFailedStatus(status)) return "failed" as const;
  return "none" as const;
}
