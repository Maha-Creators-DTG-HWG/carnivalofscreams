import { headers } from "next/headers";

import { getDb } from "./db";
import { readMidtransStatus } from "./midtrans";

export type AuditEvent = {
  event: string;
  orderId?: string | null;
  method?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: unknown;
};

export type MidtransCallbackEvent = {
  source: "http_notification" | "snap_js" | "window_redirect";
  event?: string | null;
  orderId?: string | null;
  transactionId?: string | null;
  transactionStatus?: string | null;
  statusCode?: string | null;
  paymentType?: string | null;
  signatureValid?: boolean | null;
  ip?: string | null;
  userAgent?: string | null;
  headers?: unknown;
  payload: unknown;
};

export function clientIpFromHeaders(headerList: Headers) {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headerList.get("x-real-ip");
}

// Only these request headers are stored with a callback. A denylist missed
// platform credentials (x-vercel-oidc-token, x-vercel-sc-headers), so keep
// what helps trace a delivery and drop everything else.
const STORED_HEADERS = new Set([
  "content-type",
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-id",
  "x-vercel-ip-country",
  "x-vercel-ip-city",
]);

export function headerRecord(headerList: Headers) {
  const record: Record<string, string> = {};
  headerList.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STORED_HEADERS.has(lower)) record[lower] = value;
  });
  return record;
}

export async function requestMeta() {
  const headerList = await headers();
  return {
    ip: clientIpFromHeaders(headerList),
    userAgent: headerList.get("user-agent"),
  };
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as unknown;
}

export async function insertAuditLog(entry: AuditEvent) {
  const { error } = await getDb().from("audit_logs").insert({
    event: entry.event,
    order_id: entry.orderId ?? null,
    method: entry.method ?? null,
    path: entry.path ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
    payload: toJson(entry.payload),
  });
  if (error) throw error;
}

export async function insertAuditLogSafe(entry: AuditEvent) {
  try {
    await insertAuditLog(entry);
  } catch (error) {
    console.error("[audit] failed to insert audit log", error);
  }
}

export async function insertMidtransCallback(entry: MidtransCallbackEvent) {
  const { error } = await getDb().from("midtrans_callbacks").insert({
    source: entry.source,
    event: entry.event ?? null,
    order_id: entry.orderId ?? null,
    transaction_id: entry.transactionId ?? null,
    transaction_status: entry.transactionStatus ?? null,
    status_code: entry.statusCode ?? null,
    payment_type: entry.paymentType ?? null,
    signature_valid: entry.signatureValid ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
    headers: entry.headers == null ? null : toJson(entry.headers),
    payload: toJson(entry.payload),
  });
  if (error) throw error;
}

export async function insertMidtransCallbackSafe(entry: MidtransCallbackEvent) {
  try {
    await insertMidtransCallback(entry);
  } catch (error) {
    console.error("[audit] failed to insert midtrans callback", error);
  }
}

export function callbackFields(payload: unknown) {
  const status = readMidtransStatus(payload);
  return {
    orderId: status.orderId ?? null,
    transactionId: status.transactionId ?? null,
    transactionStatus: status.transactionStatus ?? null,
    statusCode: status.statusCode ?? null,
    paymentType: status.paymentType ?? null,
  };
}
