import assert from "node:assert/strict";
import test from "node:test";

import { todayInJakarta, verifyBooking } from "./checkin";

test("the gate's day follows Jakarta time, not UTC", () => {
  assert.equal(todayInJakarta(new Date("2026-10-30T10:00:00Z")), "2026-10-30");
  // 18:30 UTC on the 30th is already half past one on the 31st in Jakarta.
  assert.equal(todayInJakarta(new Date("2026-10-30T18:30:00Z")), "2026-10-31");
});

test("something that is not a booking code is refused before the database is asked", async () => {
  const view = await verifyBooking("hello there");
  assert.equal(view.verdict, "invalid");
  assert.equal(view.booking, undefined);
});
