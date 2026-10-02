import assert from "node:assert/strict";
import test from "node:test";

import { toWaMeNumber, waMeUrl } from "./wa-me";

test("wa.me numbers are international digits without +", () => {
  assert.equal(toWaMeNumber("081234567890"), "6281234567890");
  assert.equal(toWaMeNumber("+6281234567890"), "6281234567890");
  assert.equal(toWaMeNumber("6281234567890"), "6281234567890");
  assert.equal(toWaMeNumber("81234567890"), "6281234567890");
  assert.equal(toWaMeNumber("+447700900123"), "447700900123");
});

test("wa.me links encode the prefilled message", () => {
  assert.equal(waMeUrl("0812345678"), "https://wa.me/62812345678");
  assert.equal(
    waMeUrl("0812345678", "Hi Ana & co"),
    "https://wa.me/62812345678?text=Hi%20Ana%20%26%20co",
  );
});
