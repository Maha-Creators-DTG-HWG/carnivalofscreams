import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  isFailedStatus,
  isPaidStatus,
  isPendingStatus,
  verifyNotificationSignature,
} from "./status";

const SERVER_KEY = "SB-Mid-server-test";

function signed(fields: Record<string, string>) {
  const signature_key = createHash("sha512")
    .update(
      fields.order_id + fields.status_code + fields.gross_amount + SERVER_KEY,
    )
    .digest("hex");
  return { ...fields, signature_key };
}

test("accepts a notification signed with the server key", () => {
  const payload = signed({
    order_id: "COS-30-LUX-abcdefghij",
    status_code: "200",
    gross_amount: "1500000.00",
    transaction_status: "settlement",
  });
  assert.equal(verifyNotificationSignature(payload, SERVER_KEY), true);
});

test("rejects a tampered amount or missing signature", () => {
  const payload = signed({
    order_id: "COS-30-LUX-abcdefghij",
    status_code: "200",
    gross_amount: "1500000.00",
  });
  assert.equal(
    verifyNotificationSignature({ ...payload, gross_amount: "1.00" }, SERVER_KEY),
    false,
  );
  assert.equal(
    verifyNotificationSignature({ ...payload, signature_key: undefined }, SERVER_KEY),
    false,
  );
  assert.equal(verifyNotificationSignature("nope", SERVER_KEY), false);
});

test("maps Midtrans transaction statuses", () => {
  assert.equal(isPaidStatus("settlement"), true);
  assert.equal(isPaidStatus("capture", "accept"), true);
  assert.equal(isPaidStatus("capture", "challenge"), false);
  assert.equal(isPaidStatus("capture", "deny"), false);
  assert.equal(isPendingStatus("pending"), true);
  assert.equal(isFailedStatus("expire"), true);
  assert.equal(isFailedStatus("cancel"), true);
  assert.equal(isFailedStatus("settlement"), false);
});
