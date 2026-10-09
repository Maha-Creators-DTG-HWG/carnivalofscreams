import assert from "node:assert/strict";
import test from "node:test";

import { HOLD_GRACE_SECONDS, holdWindow, PAYMENT_DUE_MINUTES } from "./types";

test("the seat is held past the Snap expiry by the grace period", () => {
  const now = Date.UTC(2026, 9, 9, 12, 0, 0);
  const { dueAt, releasesAt } = holdWindow(now);

  assert.equal(dueAt.getTime() - now, PAYMENT_DUE_MINUTES * 60_000);
  assert.equal(releasesAt.getTime() - dueAt.getTime(), HOLD_GRACE_SECONDS * 1000);
  assert.ok(HOLD_GRACE_SECONDS > 0);
});
