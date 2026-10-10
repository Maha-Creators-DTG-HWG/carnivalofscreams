import { NextResponse } from "next/server";

import {
  callbackFields,
  clientIpFromHeaders,
  headerRecord,
  insertMidtransCallback,
} from "@/lib/audit";
import { sendReservationInvoice } from "@/lib/invoice";
import {
  getTransactionStatus,
  isFailedStatus,
  isPaidStatus,
  verifyNotificationSignature,
} from "@/lib/midtrans";
import {
  expireReservationHoldSafe,
  markReservationPaidSafe,
  PAID_CONFLICT,
} from "@/lib/reservations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawText = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawText) as unknown;
  } catch {
    payload = { raw: rawText, parse_error: true };
  }

  const fields = callbackFields(payload);
  let signatureValid: boolean | null = null;
  if (fields.orderId) {
    try {
      signatureValid = verifyNotificationSignature(payload);
    } catch {
      signatureValid = false;
    }
  }

  try {
    await insertMidtransCallback({
      source: "http_notification",
      event: "notification",
      orderId: fields.orderId,
      transactionId: fields.transactionId,
      transactionStatus: fields.transactionStatus,
      statusCode: fields.statusCode,
      paymentType: fields.paymentType,
      signatureValid,
      ip: clientIpFromHeaders(request.headers),
      userAgent: request.headers.get("user-agent"),
      headers: headerRecord(request.headers),
      payload,
    });
  } catch (error) {
    console.error("[midtrans] failed to persist notification", error);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  if (!fields.orderId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // The notification body only says something changed; the status API is
  // the source of truth for what the transaction is now.
  const status = await getTransactionStatus(fields.orderId);
  if (!status) {
    return NextResponse.json({ ok: true });
  }

  if (isPaidStatus(status.transactionStatus, status.fraudStatus)) {
    const reservation = await markReservationPaidSafe({
      orderId: fields.orderId,
      transactionStatus: status.transactionStatus ?? "settlement",
      channelId: status.paymentType,
    });
    if (!reservation) {
      console.error(
        `[midtrans] ${fields.orderId} is paid at Midtrans but no reservation was updated`,
      );
    } else if (reservation.status !== PAID_CONFLICT) {
      // A conflict (paid after the hold lapsed, seat gone) was already logged
      // and audited by markReservationPaid, and there is no table to invoice.
      await sendReservationInvoice(reservation, "/api/midtrans/notification");
    }
  } else if (isFailedStatus(status.transactionStatus)) {
    await expireReservationHoldSafe(fields.orderId, status.transactionStatus);
  }

  return NextResponse.json({ ok: true });
}
