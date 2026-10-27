import assert from "node:assert/strict";
import test from "node:test";

import { invoiceWhatsAppUrl, toWaMeNumber, waMeUrl } from "./wa-me";

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

test("the invoice chat link carries the PDF address and the booking code", () => {
  const url = invoiceWhatsAppUrl("0812 3456 7890", "Rina", "COS-30-ETI-faa1493296", "https://www.example.test");
  assert.ok(url.startsWith("https://wa.me/6281234567890?text="));
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.ok(text.startsWith("Hi Rina,"));
  assert.ok(text.includes("https://www.example.test/invoice/COS-30-ETI-faa1493296.pdf"));
});
