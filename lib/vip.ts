import { insertAuditLogSafe } from "./audit";
import { getDb } from "./db";
import { sendEmail } from "./invoice";
import { getTransactionStatus, isFailedStatus, isPaidStatus } from "./midtrans";
import { getReservation, isManualBooking, type ReservationRecord } from "./reservations";
import { getSeat } from "./seats";
import { formatIdr, getNight, type NightId } from "./tables";
import { sendWhatsAppMessage } from "./whatsapp";

const MIN_PRICE_IDR = 1_000;
const MAX_PRICE_IDR = 100_000_000;

/** Price of one VIP ticket, set on /admin/vip. null means sales are closed. */
export async function getVipPrice() {
  const { data, error } = await getDb()
    .from("vip_settings")
    .select("price_idr")
    .maybeSingle<{ price_idr: number | null }>();
  if (error) throw error;
  return data?.price_idr ?? null;
}

export async function setVipPrice(price: number | null) {
  const { error } = await getDb()
    .from("vip_settings")
    .upsert({ id: true, price_idr: price, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** "450000", "450.000" and "Rp 450,000" all mean 450000; anything implausible is null. */
export function parsePrice(raw: unknown) {
  const price = Number(String(raw ?? "").replace(/\D/g, ""));
  return price >= MIN_PRICE_IDR && price <= MAX_PRICE_IDR ? price : null;
}

/** Tickets a booking may buy until an admin sets its own limit. 0 = closed until opened. */
export const DEFAULT_VIP_LIMIT = 0;

/** The booking code is the reservation's order id (COS-30-LUX-…). */
export const BOOKING_CODE_RE = /^COS-[A-Za-z0-9._~-]{1,46}$/;
export const VIP_ORDER_ID_RE = /^VIP-(30|31)-[0-9a-f]{10}$/;

/**
 * Guests type or paste the code from an email, so forgive what a keyboard does
 * to it: spaces and invisible characters go, and the case is put back
 * (COS-30-LUX-ab12cd34ef: letters up in the middle, hex down at the end).
 */
export function normalizeBookingCode(raw: string) {
  const clean = raw.replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, "");
  const match = /^cos-(30|31)-([a-z]{3})-([0-9a-f]{10})$/i.exec(clean);
  return match ? `COS-${match[1]}-${match[2].toUpperCase()}-${match[3].toLowerCase()}` : clean;
}

export function newVipOrderId(nightId: NightId) {
  const night = nightId === "oct-31" ? "31" : "30";
  return `VIP-${night}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

export function vipRemaining(limit: number, used: number) {
  return Math.max(0, limit - used);
}

export type VipOrder = {
  orderId: string;
  reservationOrderId: string;
  quantity: number;
  unitPriceIdr: number;
  amountIdr: number;
  /** pending until paid; a pending order past expiresAt no longer holds tickets. */
  status: string;
  channelId: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  emailSentAt: Date | null;
  whatsappSentAt: Date | null;
  createdAt: Date | null;
};

type VipRow = {
  order_id: string;
  reservation_order_id: string;
  quantity: number;
  unit_price_idr: number;
  amount_idr: number;
  status: string;
  channel_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  created_at: string | null;
};

const VIP_COLUMNS =
  "order_id, reservation_order_id, quantity, unit_price_idr, amount_idr, status, channel_id, paid_at, expires_at, email_sent_at, whatsapp_sent_at, created_at";

const date = (value: string | null) => (value ? new Date(value) : null);

function mapOrder(row: VipRow): VipOrder {
  return {
    orderId: row.order_id,
    reservationOrderId: row.reservation_order_id,
    quantity: row.quantity,
    unitPriceIdr: row.unit_price_idr,
    amountIdr: row.amount_idr,
    status: row.status,
    channelId: row.channel_id,
    paidAt: date(row.paid_at),
    expiresAt: date(row.expires_at),
    emailSentAt: date(row.email_sent_at),
    whatsappSentAt: date(row.whatsapp_sent_at),
    createdAt: date(row.created_at),
  };
}

/** Does this order still hold tickets against its booking's limit? */
export function holdsTickets(order: Pick<VipOrder, "status" | "expiresAt">, now = Date.now()) {
  if (order.status === "paid") return true;
  return order.status === "pending" && (order.expiresAt?.getTime() ?? 0) > now;
}

export async function getVipLimit(code: string) {
  const { data, error } = await getDb()
    .from("vip_limits")
    .select("max_tickets")
    .eq("reservation_order_id", code)
    .maybeSingle<{ max_tickets: number }>();
  if (error) throw error;
  return data?.max_tickets ?? DEFAULT_VIP_LIMIT;
}

export async function listVipLimits() {
  const { data, error } = await getDb()
    .from("vip_limits")
    .select("reservation_order_id, max_tickets")
    .returns<{ reservation_order_id: string; max_tickets: number }[]>();
  if (error) throw error;
  return new Map(data.map((row) => [row.reservation_order_id, row.max_tickets]));
}

export async function setVipLimit(code: string, maxTickets: number) {
  const { error } = await getDb()
    .from("vip_limits")
    .upsert({
      reservation_order_id: code,
      max_tickets: maxTickets,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function listVipOrders() {
  const { data, error } = await getDb()
    .from("vip_orders")
    .select(VIP_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<VipRow[]>();
  if (error) throw error;
  return data.map(mapOrder);
}

export async function getVipOrder(orderId: string) {
  const { data, error } = await getDb()
    .from("vip_orders")
    .select(VIP_COLUMNS)
    .eq("order_id", orderId)
    .maybeSingle<VipRow>();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export type VipAllowance = {
  reservation: ReservationRecord;
  limit: number;
  sold: number;
  held: number;
  remaining: number;
};

/** What a booking code may still buy; null when the code is not a paid online booking. */
export async function getVipAllowance(code: string): Promise<VipAllowance | null> {
  if (!BOOKING_CODE_RE.test(code)) return null;
  const reservation = await getReservation(code);
  if (!reservation || reservation.status !== "paid" || isManualBooking(reservation)) {
    return null;
  }

  const { data, error } = await getDb()
    .from("vip_orders")
    .select(VIP_COLUMNS)
    .eq("reservation_order_id", code)
    .returns<VipRow[]>();
  if (error) throw error;

  const orders = data.map(mapOrder);
  const sold = sum(orders.filter((order) => order.status === "paid"));
  const held = sum(orders.filter((order) => order.status === "pending" && holdsTickets(order)));
  const limit = await getVipLimit(code);
  return { reservation, limit, sold, held, remaining: vipRemaining(limit, sold + held) };
}

function sum(orders: VipOrder[]) {
  return orders.reduce((total, order) => total + order.quantity, 0);
}

/** Checks the limit and inserts the order in one database step (see the migration). */
export async function createVipOrder(entry: {
  orderId: string;
  code: string;
  quantity: number;
  unitPriceIdr: number;
  expiresAt: Date;
}) {
  const { data, error } = await getDb().rpc("create_vip_order", {
    p_order_id: entry.orderId,
    p_reservation: entry.code,
    p_quantity: entry.quantity,
    p_unit_price: entry.unitPriceIdr,
    p_expires: entry.expiresAt.toISOString(),
    p_default_limit: DEFAULT_VIP_LIMIT,
  });
  if (error) throw error;
  return data as "ok" | "no_booking" | "over_limit";
}

export async function updateVipCheckout(
  orderId: string,
  entry: { paymentUrl: string; paymentToken: string },
) {
  const { error } = await getDb()
    .from("vip_orders")
    .update({ payment_url: entry.paymentUrl, payment_token: entry.paymentToken })
    .eq("order_id", orderId);
  if (error) throw error;
}

export async function expireVipOrder(orderId: string, transactionStatus?: string) {
  const { error } = await getDb()
    .from("vip_orders")
    .update({ status: "expired", transaction_status: transactionStatus ?? null })
    .eq("order_id", orderId)
    .eq("status", "pending");
  if (error) throw error;
}

async function markVipPaid(entry: {
  orderId: string;
  transactionStatus: string;
  channelId: string | null;
}) {
  const db = getDb();
  const { data, error } = await db
    .from("vip_orders")
    .update({
      status: "paid",
      transaction_status: entry.transactionStatus,
      channel_id: entry.channelId,
    })
    .eq("order_id", entry.orderId)
    .in("status", ["pending", "paid"])
    .select(VIP_COLUMNS)
    .maybeSingle<VipRow>();
  if (error) throw error;
  if (!data) return null;

  // Keep the first paid_at when the notification is delivered twice.
  if (!data.paid_at) {
    const stamped = await db
      .from("vip_orders")
      .update({ paid_at: new Date().toISOString() })
      .eq("order_id", entry.orderId)
      .is("paid_at", null)
      .select(VIP_COLUMNS)
      .maybeSingle<VipRow>();
    if (stamped.error) throw stamped.error;
    if (stamped.data) return mapOrder(stamped.data);
  }
  return mapOrder(data);
}

/**
 * Asks Midtrans what the order is now and brings our row in line: paid orders
 * are marked and confirmed, failed ones released. Database errors are thrown
 * on purpose so the webhook answers 500 and Midtrans retries.
 */
export async function syncVipOrder(orderId: string, sourcePath: string) {
  const status = await getTransactionStatus(orderId);
  if (status) {
    if (isPaidStatus(status.transactionStatus, status.fraudStatus)) {
      const order = await markVipPaid({
        orderId,
        transactionStatus: status.transactionStatus ?? "settlement",
        channelId: status.paymentType ?? null,
      });
      if (order) await sendVipConfirmation(order, sourcePath);
    } else if (isFailedStatus(status.transactionStatus)) {
      await expireVipOrder(orderId, status.transactionStatus);
    }
  }
  return getVipOrder(orderId);
}

function confirmationText(order: VipOrder, reservation: ReservationRecord) {
  const night = getNight(reservation.nightId);
  const seat = reservation.seatId ? getSeat(reservation.seatId) : undefined;
  return [
    "Carnaval of Screams",
    "VIP ticket add-on",
    "",
    `Day: ${night ? `${night.day} · ${night.label}` : reservation.nightId}`,
    `Name: ${reservation.name}`,
    ...(seat ? [`Table: ${seat.label}`] : []),
    `Booking code: ${reservation.orderId}`,
    `VIP order: ${order.orderId}`,
    `VIP tickets: ${order.quantity}`,
    `Amount: ${formatIdr(order.amountIdr)}`,
  ].join("\n");
}

/** DOKU WhatsApp templates need approval first; set this once the VIP one is approved. */
function vipWhatsAppTemplateId() {
  return process.env.DOKU_VIP_WHATSAPP_TEMPLATE_ID ?? "";
}

async function sendVipConfirmation(order: VipOrder, sourcePath: string) {
  const reservation = await getReservation(order.reservationOrderId);
  if (!reservation) return;

  const log = (event: string, payload: Record<string, unknown>) =>
    insertAuditLogSafe({ event, orderId: order.orderId, method: "POST", path: sourcePath, payload });

  if (process.env.RESEND_API_KEY && !order.emailSentAt) {
    try {
      await sendEmail(
        reservation.email,
        `Your VIP tickets · ${order.orderId}`,
        confirmationText(order, reservation),
      );
      await getDb().from("vip_orders").update({ email_sent_at: new Date().toISOString() }).eq("order_id", order.orderId);
      await log("vip.email.sent", { to: reservation.email });
    } catch (error) {
      console.error("[vip] failed to send email", error);
      await log("vip.email.error", { error: error instanceof Error ? error.message : "unknown" });
    }
  }

  const templateId = vipWhatsAppTemplateId();
  if (templateId && process.env.DOKU_CLIENT_ID && process.env.DOKU_SECRET_KEY && !order.whatsappSentAt) {
    try {
      const night = getNight(reservation.nightId);
      const result = await sendWhatsAppMessage({
        phone: reservation.phone,
        templateId,
        params: [
          night ? `${night.day} · ${night.label}` : reservation.nightId,
          reservation.name,
          String(order.quantity),
          order.orderId,
          formatIdr(order.amountIdr),
        ],
      });
      await getDb().from("vip_orders").update({ whatsapp_sent_at: new Date().toISOString() }).eq("order_id", order.orderId);
      await log("vip.whatsapp.sent", { messageId: result.messageId });
    } catch (error) {
      console.error("[vip] failed to send WhatsApp", error);
      await log("vip.whatsapp.error", { error: error instanceof Error ? error.message : "unknown" });
    }
  }
}
