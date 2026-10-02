import { createHash, timingSafeEqual } from "node:crypto";

import { formatIdr, getNight, getTablePackage } from "../tables";
import { basicAuthHeader, coreApiBase, getServerKey } from "./config";
import { parseOrderId } from "./orders";
import type { MidtransStatus } from "./types";

export function isPaidStatus(status?: string, fraud?: string) {
  if (fraud === "deny" || fraud === "challenge") return false;
  return status === "capture" || status === "settlement";
}

export function isPendingStatus(status?: string) {
  return status === "pending" || status === "authorize";
}

export function isExpiredStatus(status?: string) {
  return status === "expire";
}

export function isFailedStatus(status?: string) {
  return (
    status === "deny" ||
    status === "cancel" ||
    status === "expire" ||
    status === "failure" ||
    status === "refund" ||
    status === "partial_refund"
  );
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

export function readMidtransStatus(payload: unknown): MidtransStatus {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const record = payload as Record<string, unknown>;
  return {
    orderId: stringField(record, "order_id"),
    transactionId: stringField(record, "transaction_id"),
    transactionStatus: stringField(record, "transaction_status"),
    fraudStatus: stringField(record, "fraud_status"),
    statusCode: stringField(record, "status_code"),
    paymentType: stringField(record, "payment_type"),
    grossAmount: stringField(record, "gross_amount"),
  };
}

/** SHA512(order_id + status_code + gross_amount + server_key). */
export function notificationSignature(
  fields: { orderId: string; statusCode: string; grossAmount: string },
  serverKey = getServerKey(),
) {
  return createHash("sha512")
    .update(fields.orderId + fields.statusCode + fields.grossAmount + serverKey)
    .digest("hex");
}

export function verifyNotificationSignature(
  payload: unknown,
  serverKey = getServerKey(),
) {
  const status = readMidtransStatus(payload);
  const received =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).signature_key
      : undefined;
  if (
    !status.orderId ||
    !status.statusCode ||
    !status.grossAmount ||
    typeof received !== "string"
  ) {
    return false;
  }
  const expected = Buffer.from(
    notificationSignature(
      {
        orderId: status.orderId,
        statusCode: status.statusCode,
        grossAmount: status.grossAmount,
      },
      serverKey,
    ),
    "utf8",
  );
  const actual = Buffer.from(received, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Returns undefined when Midtrans has no transaction for this order yet. */
export async function getTransactionStatus(
  orderId: string,
): Promise<MidtransStatus | undefined> {
  const response = await fetch(
    `${coreApiBase()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const status = readMidtransStatus((await response.json()) as unknown);
  // Midtrans answers HTTP 200 with status_code "404" for unknown orders.
  if (response.status === 404 || status.statusCode === "404") return undefined;
  if (!response.ok) {
    throw new Error(`Midtrans status returned ${response.status}`);
  }
  return status;
}

export function summarizeReservation(options: {
  orderId: string;
  amount?: number;
  nightId?: string;
  packageId?: string;
}) {
  const parsed = parseOrderId(options.orderId);
  const table = getTablePackage(options.packageId ?? parsed?.packageId ?? "");
  const night = getNight(options.nightId ?? parsed?.nightId ?? "");

  return {
    table,
    night,
    amountLabel:
      options.amount != null
        ? formatIdr(options.amount)
        : table
          ? formatIdr(table.priceIdr)
          : undefined,
  };
}
