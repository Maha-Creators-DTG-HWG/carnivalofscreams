import assert from "node:assert/strict";
import test from "node:test";

import { BOOKING_CODE_RE, normalizeBookingCode } from "./vip";

test("booking codes survive what keyboards and copy-paste do to them", () => {
  const code = "COS-30-LUX-ddafd19c9e";
  assert.equal(normalizeBookingCode(code), code);
  assert.equal(normalizeBookingCode(`  ${code}\n`), code, "spaces and newlines");
  assert.equal(normalizeBookingCode(`${code}​`), code, "zero-width space from a copy");
  assert.equal(normalizeBookingCode("cos-30-lux-DDAFD19C9E"), code, "wrong case either way");
  assert.equal(normalizeBookingCode("COS-30-LUX- ddafd19c9e"), code, "a space inside");
  assert.equal(normalizeBookingCode("not a code"), "notacode", "junk stays junk and is rejected later");
  assert.ok(BOOKING_CODE_RE.test(code));
  assert.ok(!BOOKING_CODE_RE.test("notacode"));
});
