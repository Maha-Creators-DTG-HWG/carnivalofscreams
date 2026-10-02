import assert from "node:assert/strict";
import test from "node:test";

import { newOrderId, parseOrderId } from "./orders";

test("new COS26 order ids round-trip through parseOrderId", () => {
  for (const [packageId, nightId] of [
    ["luxer", "oct-30"],
    ["etius", "oct-31"],
    ["tivex", "oct-30"],
    ["perio", "oct-31"],
    ["onomy", "oct-30"],
  ] as const) {
    const parsed = parseOrderId(newOrderId(packageId, nightId));
    assert.deepEqual(parsed, { nightId, packageId });
  }
});

test("legacy order codes still parse to COS26 areas", () => {
  assert.deepEqual(parseOrderId("COS-30-SOF-abcdefghij"), {
    nightId: "oct-30",
    packageId: "luxer",
  });
  assert.deepEqual(parseOrderId("COS-31-COM-abcdefghij"), {
    nightId: "oct-31",
    packageId: "tivex",
  });
  assert.deepEqual(parseOrderId("COS-30-PRE-abcdefghij"), {
    nightId: "oct-30",
    packageId: "perio",
  });
  assert.deepEqual(parseOrderId("COS-30-REG-abcdefghij"), {
    nightId: "oct-30",
    packageId: "onomy",
  });
});
