import assert from "node:assert/strict";
import test from "node:test";

import { BOOKING_CODE_RE, holdsTickets, newVipOrderId, VIP_ORDER_ID_RE, vipRemaining } from "./vip";

test("remaining never goes negative, even when the limit is lowered below what is sold", () => {
  assert.equal(vipRemaining(3, 1), 2);
  assert.equal(vipRemaining(1, 3), 0);
  assert.equal(vipRemaining(0, 0), 0);
});

test("only paid and unexpired pending orders hold tickets", () => {
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);
  assert.equal(holdsTickets({ status: "paid", expiresAt: past }), true);
  assert.equal(holdsTickets({ status: "pending", expiresAt: future }), true);
  assert.equal(holdsTickets({ status: "pending", expiresAt: past }), false);
  assert.equal(holdsTickets({ status: "expired", expiresAt: future }), false);
});

test("VIP order ids are told apart from booking codes", () => {
  const id = newVipOrderId("oct-31");
  assert.match(id, VIP_ORDER_ID_RE);
  assert.ok(id.startsWith("VIP-31-"));
  assert.ok(!BOOKING_CODE_RE.test(id));
  assert.ok(BOOKING_CODE_RE.test("COS-30-LUX-ab12cd34ef"));
});
