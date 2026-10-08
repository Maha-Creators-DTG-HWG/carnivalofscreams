import assert from "node:assert/strict";
import test from "node:test";

import { BOOKING_CODE_RE, holdsTickets, newVipOrderId, normalizeBookingCode, parsePrice, VIP_ORDER_ID_RE, vipRemaining } from "./vip";

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

test("price input accepts Indonesian formats and rejects typos", () => {
  assert.equal(parsePrice("450000"), 450_000);
  assert.equal(parsePrice("450.000"), 450_000);
  assert.equal(parsePrice("Rp 450,000"), 450_000);
  assert.equal(parsePrice("450"), null, "450 is almost certainly 450k typed short");
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("abc"), null);
  assert.equal(parsePrice(undefined), null);
  assert.equal(parsePrice("999999999999"), null);
});

test("booking codes survive what keyboards and copy-paste do to them", () => {
  const code = "COS-30-LUX-ddafd19c9e";
  assert.equal(normalizeBookingCode(code), code);
  assert.equal(normalizeBookingCode(`  ${code}\n`), code, "spaces and newlines");
  assert.equal(normalizeBookingCode(`${code}\u200B`), code, "zero-width space from a copy");
  assert.equal(normalizeBookingCode("cos-30-lux-DDAFD19C9E"), code, "wrong case either way");
  assert.equal(normalizeBookingCode("COS-30-LUX- ddafd19c9e"), code, "a space inside");
  assert.equal(normalizeBookingCode("not a code"), "notacode", "junk stays junk and is rejected later");
});
