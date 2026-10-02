import assert from "node:assert/strict";
import test from "node:test";

import { headerRecord } from "./audit";

test("callbacks store only the headers that trace a delivery", () => {
  const record = headerRecord(
    new Headers({
      "Content-Type": "application/json",
      "User-Agent": "Veritrans",
      "X-Forwarded-For": "103.208.23.6",
      "X-Vercel-Id": "sin1::abc",
      "X-Vercel-Oidc-Token": "eyJ.secret",
      "X-Vercel-Sc-Headers": '{"Authorization":"Bearer secret"}',
      "X-Vercel-Proxy-Signature": "Bearer secret",
      Authorization: "Basic secret",
      Cookie: "session=secret",
    }),
  );

  assert.deepEqual(record, {
    "content-type": "application/json",
    "user-agent": "Veritrans",
    "x-forwarded-for": "103.208.23.6",
    "x-vercel-id": "sin1::abc",
  });
});
