import { dokuRequestHeaders, isDokuProduction } from "./doku";
import type { ReservationRecord } from "./reservations";
import { getSeat } from "./seats";
import { getNight } from "./tables";

type WhatsAppResponse = {
  status?: string;
  messageId?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

export function toWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return `0${digits}`;
}

export function getWhatsAppTemplateId() {
  return process.env.DOKU_WHATSAPP_TEMPLATE_ID ?? "";
}

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.DOKU_CLIENT_ID &&
      process.env.DOKU_SECRET_KEY &&
      getWhatsAppTemplateId(),
  );
}

function whatsappApiBase() {
  return isDokuProduction()
    ? "https://app.doku.com"
    : "https://app-uat.doku.com";
}

export function whatsappParams(reservation: ReservationRecord) {
  const night = getNight(reservation.nightId);
  const seat = reservation.seatId ? getSeat(reservation.seatId) : undefined;
  return [
    night ? `${night.day} · ${night.label}` : reservation.nightId,
    reservation.name,
    reservation.nik ?? "",
    reservation.phone,
    reservation.email,
    seat?.label ?? "",
    reservation.orderId,
  ];
}

export async function sendWhatsAppMessage(options: {
  phone: string;
  params: string[];
  templateId?: string;
}) {
  const templateId = options.templateId ?? getWhatsAppTemplateId();
  if (!templateId) {
    throw new Error("DOKU_WHATSAPP_TEMPLATE_ID is not configured");
  }

  const requestTarget = "/message-as-a-service/v1/whatsapp/messages";
  const body = JSON.stringify({
    templateId,
    params: options.params,
    destinationPhone: toWhatsAppPhone(options.phone),
  });

  const response = await fetch(`${whatsappApiBase()}${requestTarget}`, {
    method: "POST",
    headers: dokuRequestHeaders({
      method: "POST",
      requestTarget,
      body,
      timestamp: String(Date.now()),
    }),
    body,
  });

  const data = (await response.json()) as WhatsAppResponse;
  if (!response.ok || data.error || !data.messageId) {
    const message =
      data.error?.message ?? "Could not send WhatsApp confirmation.";
    throw new Error(message);
  }

  return data;
}

export async function sendReservationWhatsApp(reservation: ReservationRecord) {
  return sendWhatsAppMessage({
    phone: reservation.phone,
    params: whatsappParams(reservation),
  });
}
