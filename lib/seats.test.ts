import assert from "node:assert/strict";
import test from "node:test";

import { getSeat, SEATS, seatsForPackage } from "./seats";

test("catalog has every COS26 table", () => {
  assert.equal(seatsForPackage("luxer").length, 27);
  assert.equal(seatsForPackage("etius").length, 4);
  assert.equal(seatsForPackage("tivex").length, 17);
  assert.equal(seatsForPackage("perio").length, 3);
  assert.equal(seatsForPackage("onomy").length, 10);
  assert.equal(SEATS.length, 61);

  const ids = SEATS.map((seat) => seat.id);
  assert.equal(new Set(ids).size, ids.length);

  assert.equal(getSeat("luxer-13")?.short, "L13");
  assert.equal(getSeat("etius-4")?.short, "E4");
  assert.equal(getSeat("tivex-12")?.short, "T12");
  assert.equal(getSeat("tivex-17")?.short, "T17");
  assert.equal(getSeat("perio-2")?.short, "P2");
  assert.equal(getSeat("onomy-10")?.short, "O10");
});
