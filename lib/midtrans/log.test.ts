import assert from "node:assert/strict";
import test from "node:test";

import { digestByOrder, digestCallbacks, type MidtransCallback } from "./log";

let nextId = 1;

function callback(fields: Partial<MidtransCallback>): MidtransCallback {
  const id = nextId++;
  return {
    id,
    createdAt: new Date(Date.UTC(2026, 9, 2, 12, 0, id)),
    source: "http_notification",
    event: "notification",
    orderId: "COS-30-ONO-a",
    transactionId: null,
    transactionStatus: null,
    fraudStatus: null,
    statusCode: null,
    paymentType: null,
    grossAmount: null,
    signatureValid: null,
    ip: null,
    userAgent: null,
    payload: {},
    ...fields,
  };
}

test("only signed webhooks count as Midtrans saying paid", () => {
  const digest = digestCallbacks([
    callback({ transactionStatus: "settlement", signatureValid: false }),
    callback({ source: "snap_js", event: "onSuccess", transactionStatus: "settlement" }),
  ]);
  assert.equal(digest.midtransPaid, false);
  assert.equal(digest.verified, 0);
  assert.equal(digest.rejected, 1);
  assert.equal(digest.awaitingWebhook, true);
});

test("latest signed webhook wins", () => {
  const digest = digestCallbacks([
    callback({ transactionStatus: "pending", signatureValid: true, paymentType: "qris" }),
    callback({ transactionStatus: "settlement", signatureValid: true, paymentType: "qris" }),
  ]);
  assert.equal(digest.lastStatus, "settlement");
  assert.equal(digest.paymentType, "qris");
  assert.equal(digest.midtransPaid, true);
  assert.equal(digest.awaitingWebhook, false);
});

test("a fraud challenge is not paid", () => {
  const digest = digestCallbacks([
    callback({ transactionStatus: "capture", fraudStatus: "challenge", signatureValid: true }),
  ]);
  assert.equal(digest.midtransPaid, false);
});

test("calls without an order id are left out of the per-order digest", () => {
  const byOrder = digestByOrder([
    callback({ orderId: null }),
    callback({ orderId: "COS-31-LUX-b", transactionStatus: "expire", signatureValid: true }),
  ]);
  assert.deepEqual([...byOrder.keys()], ["COS-31-LUX-b"]);
  assert.equal(byOrder.get("COS-31-LUX-b")?.lastStatus, "expire");
});
