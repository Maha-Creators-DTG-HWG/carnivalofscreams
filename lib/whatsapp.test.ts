import assert from "node:assert/strict";
import test from "node:test";

import type { ReservationRecord } from "./reservations";
import { fonnteMessage } from "./whatsapp";

const reservation = {
  orderId: "COS-30-ETI-faa1493296",
  name: "Rina Wulandari",
  phone: "0812 3456 7890",
} as ReservationRecord;

test("the WhatsApp invoice goes to a 62… number with the PDF address and code", () => {
  const sent = fonnteMessage(reservation, "https://www.example.test");
  assert.equal(sent.target, "6281234567890");
  assert.equal(sent.url, "https://www.example.test/invoice/COS-30-ETI-faa1493296.pdf");
  assert.equal(sent.filename, "Carnaval-of-Screams-COS-30-ETI-faa1493296.pdf");
  assert.ok(sent.message.startsWith("Hi Rina Wulandari,"));
  assert.ok(sent.message.includes("Booking code: COS-30-ETI-faa1493296"));
});

test("a guest without a name still gets a greeting", () => {
  const sent = fonnteMessage({ ...reservation, name: "  " }, "https://www.example.test");
  assert.ok(sent.message.startsWith("Hi, your table"));
});
