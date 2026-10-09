import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { markReservationPaid, PAID_CONFLICT } from "./reservations";

type Row = Record<string, unknown>;

// A small in-memory stand-in for the supabase client: just the calls
// reservations.ts makes, plus the reservations_night_seat_active_uidx unique
// index (one pending or paid row per night+seat), which is what decides the
// outcome of a late payment.
function installFakeDb(reservations: Row[]) {
  const audit: Row[] = [];

  const holdsSeat = (row: Row) =>
    row.seat_id != null && (row.status === "pending" || row.status === "paid");

  function query(op: "select" | "update", patch: Row = {}) {
    const filters: ((row: Row) => boolean)[] = [];
    const builder = {
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      select: () => builder,
      maybeSingle: async () => {
        const row = reservations.find((item) => filters.every((f) => f(item)));
        if (!row || op === "select") return { data: row ? { ...row } : null, error: null };

        const next = { ...row, ...patch };
        const clash = reservations.some(
          (other) =>
            other !== row &&
            holdsSeat(next) &&
            holdsSeat(other) &&
            other.night_id === next.night_id &&
            other.seat_id === next.seat_id,
        );
        if (clash) {
          return {
            data: null,
            error: { code: "23505", message: "reservations_night_seat_active_uidx" },
          };
        }
        Object.assign(row, patch);
        return { data: { ...row }, error: null };
      },
    };
    return builder;
  }

  (globalThis as unknown as { carnivalDb: unknown }).carnivalDb = {
    from: (table: string) => ({
      select: () => query("select"),
      update: (patch: Row) => query("update", patch),
      insert: async (row: Row) => {
        if (table === "audit_logs") audit.push(row);
        return { error: null };
      },
    }),
  };

  return { audit };
}

function row(overrides: Row): Row {
  return {
    order_id: "COS-30-LUX-aaaaaaaaaa",
    name: "Sari Dewi",
    nik: "3171234567890001",
    email: "sari@example.com",
    phone: "081234567890",
    night_id: "oct-30",
    package_id: "luxer",
    party_size: 6,
    notes: null,
    amount_idr: 1_000_000,
    status: "pending",
    payment_url: null,
    payment_token: null,
    channel_id: null,
    transaction_status: null,
    paid_at: null,
    seat_id: "luxer-1",
    expires_at: null,
    whatsapp_message_id: null,
    whatsapp_sent_at: null,
    invoice_email_sent_at: null,
    created_at: null,
    ...overrides,
  };
}

const PAID = {
  orderId: "COS-30-LUX-aaaaaaaaaa",
  transactionStatus: "settlement",
  channelId: "bank_transfer",
};

function silenceErrors(t: TestContext) {
  return t.mock.method(console, "error", () => {});
}

test("a pending hold that settles becomes paid", async () => {
  installFakeDb([row({ status: "pending" })]);

  const result = await markReservationPaid(PAID);

  assert.equal(result?.status, "paid");
  assert.equal(result?.seatId, "luxer-1");
  assert.ok(result?.paidAt);
});

test("a repeat notification keeps the first paid_at", async () => {
  const first = "2026-10-09T10:00:00.000Z";
  installFakeDb([row({ status: "paid", paid_at: first })]);

  const result = await markReservationPaid(PAID);

  assert.equal(result?.status, "paid");
  assert.equal(result?.paidAt?.toISOString(), first);
});

test("paid after expiry with the seat still free re-claims the seat", async () => {
  const { audit } = installFakeDb([row({ status: "expired" })]);

  const result = await markReservationPaid(PAID);

  assert.equal(result?.status, "paid");
  assert.equal(result?.seatId, "luxer-1");
  assert.equal(result?.channelId, "bank_transfer");
  assert.ok(result?.paidAt);
  assert.deepEqual(
    audit.map((entry) => entry.event),
    ["reservation.paid_after_expiry.reclaimed"],
  );
});

test("paid after expiry with the seat taken is recorded as a conflict", async (t) => {
  const errors = silenceErrors(t);
  const rows = [
    row({ status: "expired" }),
    row({
      order_id: "COS-30-LUX-bbbbbbbbbb",
      status: "pending",
      email: "other@example.com",
    }),
  ];
  const { audit } = installFakeDb(rows);

  const result = await markReservationPaid(PAID);

  assert.equal(result?.status, PAID_CONFLICT);
  assert.ok(result?.paidAt);
  // The other guest keeps the seat and the late payer is out of the index.
  assert.equal(rows[0].status, PAID_CONFLICT);
  assert.equal(rows[1].status, "pending");

  assert.deepEqual(
    audit.map((entry) => entry.event),
    ["reservation.paid_after_expiry.conflict"],
  );
  assert.equal(audit[0].order_id, PAID.orderId);
  assert.equal(errors.mock.callCount(), 1);
  assert.match(String(errors.mock.calls[0].arguments[0]), /COS-30-LUX-aaaaaaaaaa/);
});

test("a repeat notification for a conflict does not log or audit it again", async (t) => {
  const errors = silenceErrors(t);
  const { audit } = installFakeDb([
    row({ status: "expired" }),
    row({ order_id: "COS-30-LUX-bbbbbbbbbb", status: "paid" }),
  ]);

  await markReservationPaid(PAID);
  const again = await markReservationPaid(PAID);

  assert.equal(again?.status, PAID_CONFLICT);
  assert.equal(audit.length, 1);
  assert.equal(errors.mock.callCount(), 1);
});

test("an unknown order returns null", async () => {
  installFakeDb([row({ status: "expired" })]);

  const result = await markReservationPaid({ ...PAID, orderId: "COS-30-LUX-zzzzzzzzzz" });

  assert.equal(result, null);
});
