import { NextResponse } from "next/server";

import {
  callbackFields,
  clientIpFromHeaders,
  headerRecord,
  insertMidtransCallback,
} from "@/lib/audit";

export const runtime = "nodejs";

const SNAP_EVENTS = new Set([
  "onSuccess",
  "onPending",
  "onError",
  "onClose",
  "load_error",
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const event = typeof record.event === "string" ? record.event : "";
  if (!SNAP_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const fields = callbackFields(record.payload ?? {});
  const orderId =
    (typeof record.orderId === "string" && record.orderId) || fields.orderId;

  try {
    await insertMidtransCallback({
      source: "snap_js",
      event,
      orderId,
      transactionId: fields.transactionId,
      transactionStatus: fields.transactionStatus,
      statusCode: fields.statusCode,
      paymentType: fields.paymentType,
      ip: clientIpFromHeaders(request.headers),
      userAgent: request.headers.get("user-agent"),
      headers: headerRecord(request.headers),
      payload: body,
    });
  } catch (error) {
    console.error("[midtrans] failed to persist snap callback", error);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
