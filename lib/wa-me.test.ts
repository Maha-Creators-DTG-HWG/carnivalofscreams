import assert from "node:assert/strict";
import test from "node:test";

import { invoicePdfUrl, reservationWhatsAppUrl, toWaMeNumber, waMeUrl } from "./wa-me";

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

test("the Message button carries the guest's own booking code and invoice link", () => {
  const url = reservationWhatsAppUrl({
    phone: "0812 3456 7890",
    name: "Rina",
    orderId: "COS-30-ETI-faa1493296",
    table: "Etius 1",
    nightLabel: "Friday 30 October",
    invoiceUrl: invoicePdfUrl("https://www.example.test", "COS-30-ETI-faa1493296"),
  });
  assert.ok(url.startsWith("https://wa.me/6281234567890?text="));
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.ok(text.startsWith("Hi Rina, this is Carnaval of Screams about your table reservation (Etius 1, Friday 30 October)."));
  assert.ok(text.includes("Booking code: COS-30-ETI-faa1493296."));
  assert.ok(text.endsWith("https://www.example.test/invoice/COS-30-ETI-faa1493296.pdf"));
});

test("without an invoice link the message is just the reservation note", () => {
  const url = reservationWhatsAppUrl({
    phone: "0812",
    name: "",
    orderId: "COS-30-ETI-faa1493296",
    table: "Etius 1",
    nightLabel: "Friday 30 October",
  });
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.ok(text.startsWith("Hi, this is Carnaval"));
  assert.ok(!text.includes("Invoice"));
});
