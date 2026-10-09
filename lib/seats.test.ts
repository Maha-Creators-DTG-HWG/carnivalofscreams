import assert from "node:assert/strict";
import test from "node:test";

import { getSeat, SEATS, seatsForPackage } from "./seats";
import { AREA_OUTLINES, TABLE_POINTS } from "./venue-areas";

test("every table and area is placed on the floor plan", () => {
  for (const seat of SEATS) {
    assert.ok(TABLE_POINTS[seat.id], `${seat.id} has no spot on the plan`);
    assert.ok(AREA_OUTLINES[seat.packageId], `${seat.packageId} has no outline`);
  }
});

test("catalog has every COS26 table", () => {
  assert.equal(seatsForPackage("luxer").length, 10);
  assert.equal(seatsForPackage("skyview").length, 11);
  assert.equal(seatsForPackage("etius").length, 10);
  assert.equal(seatsForPackage("tivex").length, 17);
  assert.equal(seatsForPackage("perio").length, 3);
  assert.equal(seatsForPackage("onomy").length, 10);
  assert.equal(seatsForPackage("vvip").length, 4);
  assert.equal(SEATS.length, 65);

  const ids = SEATS.map((seat) => seat.id);
  assert.equal(new Set(ids).size, ids.length);
  const shorts = SEATS.map((seat) => seat.short);
  assert.equal(new Set(shorts).size, shorts.length, "short codes are unique");

  assert.equal(getSeat("luxer-10")?.short, "L10");
  assert.equal(getSeat("skyview-11")?.short, "LS11");
  assert.equal(getSeat("vvip-4")?.short, "V4");
  assert.equal(getSeat("etius-10")?.short, "E10");
  assert.equal(getSeat("tivex-12")?.short, "T12");
  assert.equal(getSeat("tivex-17")?.short, "T17");
  assert.equal(getSeat("perio-2")?.short, "P2");
  assert.equal(getSeat("onomy-10")?.short, "O10");
});
