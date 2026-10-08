import { getSeat } from "../seats";
import { getNight, getTablePackage } from "../tables";
import { basicAuthHeader, snapApiBase } from "./config";
import {
  PAYMENT_DUE_MINUTES,
  type ReservationPayload,
  type SnapTransaction,
} from "./types";

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

/** Midtrans caps item names at 50 characters. */
export function itemName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 50);
}

export function buildSnapRequest(
  orderId: string,
  reservation: ReservationPayload,
  finishUrl: string,
) {
  const table = getTablePackage(reservation.packageId);
  const night = getNight(reservation.nightId);
  if (!table || !night) throw new Error("Unknown table or night");

  const { firstName, lastName } = splitName(reservation.name);
  const seat = getSeat(reservation.seatId);

  return {
    transaction_details: {
      order_id: orderId,
      gross_amount: table.priceIdr,
    },
    credit_card: { secure: true },
    item_details: [
      {
        id: table.id,
        price: table.priceIdr,
        quantity: 1,
        name: itemName(
          seat
            ? `${table.name} · ${night.short} · ${seat.label}`
            : `${table.name} · ${night.short}`,
        ),
      },
    ],
    customer_details: {
      first_name: firstName,
      last_name: lastName,
      email: reservation.email,
      phone: reservation.phone,
    },
    expiry: {
      unit: "minutes",
      duration: PAYMENT_DUE_MINUTES,
    },
    custom_field1: reservation.packageId,
    custom_field2: reservation.nightId,
    custom_field3: reservation.seatId,
    callbacks: { finish: finishUrl },
  };
}

export function createSnapTransaction(
  orderId: string,
  reservation: ReservationPayload,
  urls: { finishUrl: string; notificationUrl: string },
): Promise<SnapTransaction> {
  return postSnapTransaction(
    buildSnapRequest(orderId, reservation, urls.finishUrl),
    urls.notificationUrl,
  );
}

export async function postSnapTransaction(
  body: object,
  notificationUrl: string,
): Promise<SnapTransaction> {
  const response = await fetch(`${snapApiBase()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(),
      // Points notifications at this deployment, so previews work without
      // changing the dashboard's Payment Notification URL.
      "X-Override-Notification": notificationUrl,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: { token?: string; redirect_url?: string; error_messages?: string[] };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    data = {};
  }

  if (!response.ok || !data.token || !data.redirect_url) {
    throw new Error(
      data.error_messages?.join(", ") ||
        `Midtrans Snap returned ${response.status}`,
    );
  }

  return { token: data.token, redirectUrl: data.redirect_url };
}
