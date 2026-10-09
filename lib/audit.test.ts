import assert from "node:assert/strict";
import test from "node:test";

import {
  headerRecord,
  insertAuditLog,
  insertMidtransCallback,
  redactPii,
} from "./audit";

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

test("redactPii keeps the last 4 of a nik and masks email and phone", () => {
  assert.deepEqual(
    redactPii({
      name: "Sari Dewi",
      nik: "3171234567890001",
      email: "sari.dewi@example.com",
      phone: "+6281234567890",
      seatId: "luxer-1",
    }),
    {
      name: "Sari Dewi",
      nik: "************0001",
      email: "s***@example.com",
      phone: "***********890",
      seatId: "luxer-1",
    },
  );
});

test("redactPii reaches nested objects and arrays, whatever the key case", () => {
  assert.deepEqual(
    redactPii({
      customer_details: { Email: "a@b.id", Phone: "0812345678" },
      guests: [{ NIK: "3171234567890001" }],
    }),
    {
      customer_details: { Email: "a***@b.id", Phone: "*******678" },
      guests: [{ NIK: "************0001" }],
    },
  );
});

test("redactPii leaves other values alone and does not mutate its input", () => {
  const input = { ok: true, n: 3, list: [1, "x"], nik: "1234567890123456" };
  assert.deepEqual(redactPii(input), {
    ok: true,
    n: 3,
    list: [1, "x"],
    nik: "************3456",
  });
  assert.equal(input.nik, "1234567890123456");
  assert.equal(redactPii(null), null);
  assert.equal(redactPii("plain"), "plain");
});

test("redactPii ignores keys that only look like object internals", () => {
  assert.deepEqual(redactPii({ constructor: "x", toString: "y" }), {
    constructor: "x",
    toString: "y",
  });
});

test("redactPii does not leak short or malformed values", () => {
  assert.deepEqual(redactPii({ nik: "123", email: "nope", phone: "12" }), {
    nik: "****",
    email: "***",
    phone: "***",
  });
});

// getDb() hands back whatever sits in this global, so tests can capture rows.
function captureInserts() {
  const rows: { table: string; row: Record<string, unknown> }[] = [];
  (globalThis as unknown as { carnivalDb: unknown }).carnivalDb = {
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        rows.push({ table, row });
        return { error: null };
      },
    }),
  };
  return rows;
}

test("insertAuditLog redacts the payload before it is stored", async () => {
  const rows = captureInserts();

  await insertAuditLog({
    event: "reservation.create.request",
    payload: {
      name: "Sari Dewi",
      nik: "3171234567890001",
      email: "sari@example.com",
      phone: "081234567890",
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].table, "audit_logs");
  assert.deepEqual(rows[0].row.payload, {
    name: "Sari Dewi",
    nik: "************0001",
    email: "s***@example.com",
    phone: "*********890",
  });
});

test("insertMidtransCallback redacts the payload before it is stored", async () => {
  const rows = captureInserts();

  await insertMidtransCallback({
    source: "snap_js",
    payload: { order_id: "COS-30-LUX-abc", customer_details: { email: "x@y.id" } },
  });

  assert.equal(rows[0].table, "midtrans_callbacks");
  assert.deepEqual(rows[0].row.payload, {
    order_id: "COS-30-LUX-abc",
    customer_details: { email: "x***@y.id" },
  });
});
