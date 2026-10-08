"use server";

import { insertAuditLogSafe, requestMeta, requestOrigin } from "@/lib/audit";
import { isMidtransConfigured, itemName, postSnapTransaction, splitName } from "@/lib/midtrans";
import { PAYMENT_DUE_MINUTES } from "@/lib/midtrans/types";
import { getNight } from "@/lib/tables";
import {
  createVipOrder,
  expireVipOrder,
  getVipAllowance,
  newVipOrderId,
  normalizeBookingCode,
  getVipPrice,
  updateVipCheckout,
} from "@/lib/vip";

export type VipPayment =
  | { token: string; url: string; orderId: string }
  | { error: string };

async function startPayment(code: string, quantity: number): Promise<VipPayment> {
  const price = await getVipPrice();
  if (price === null) return { error: "closed" };
  if (!isMidtransConfigured()) return { error: "payment" };

  const allowance = await getVipAllowance(code);
  if (!allowance) return { error: "code" };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "quantity" };
  if (quantity > allowance.remaining) return { error: "limit" };

  const { reservation } = allowance;
  const orderId = newVipOrderId(reservation.nightId);
  const expiresAt = new Date(Date.now() + PAYMENT_DUE_MINUTES * 60 * 1000);

  // The limit is checked again inside the database, so two buyers racing for
  // the last tickets cannot both get them.
  const created = await createVipOrder({
    orderId,
    code,
    quantity,
    unitPriceIdr: price,
    expiresAt,
  });
  if (created !== "ok") return { error: created === "over_limit" ? "limit" : "code" };

  const meta = await requestMeta();
  await insertAuditLogSafe({
    event: "vip.order.create",
    orderId,
    method: "POST",
    path: "/vip",
    ip: meta.ip,
    userAgent: meta.userAgent,
    payload: { code, quantity },
  });

  const origin = await requestOrigin();
  const night = getNight(reservation.nightId);
  const { firstName, lastName } = splitName(reservation.name);
  try {
    const snap = await postSnapTransaction(
      {
        transaction_details: { order_id: orderId, gross_amount: price * quantity },
        credit_card: { secure: true },
        item_details: [
          {
            id: "vip",
            price,
            quantity,
            name: itemName(`VIP ticket · ${night?.short ?? reservation.nightId}`),
          },
        ],
        customer_details: {
          first_name: firstName,
          last_name: lastName,
          email: reservation.email,
          phone: reservation.phone,
        },
        expiry: { unit: "minutes", duration: PAYMENT_DUE_MINUTES },
        custom_field1: "vip",
        custom_field2: reservation.nightId,
        custom_field3: code,
        callbacks: { finish: `${origin}/vip/confirmed` },
      },
      `${origin}/api/midtrans/notification`,
    );
    await updateVipCheckout(orderId, { paymentUrl: snap.redirectUrl, paymentToken: snap.token });
    return { token: snap.token, url: snap.redirectUrl, orderId };
  } catch (error) {
    console.error("[vip] failed to start payment", error);
    // Give the tickets back right away rather than holding them until the window closes.
    await expireVipOrder(orderId).catch(() => {});
    return { error: "payment" };
  }
}

/** Creates the order and returns the Snap token; the page opens the popup. */
export async function startVipPayment(rawCode: unknown, rawQuantity: unknown): Promise<VipPayment> {
  const code = normalizeBookingCode(String(rawCode ?? ""));
  const quantity = Number(rawQuantity);
  try {
    return await startPayment(code, quantity);
  } catch (error) {
    console.error("[vip] purchase failed", error);
    return { error: "payment" };
  }
}
