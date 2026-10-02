const SANDBOX_SNAP = "https://app.sandbox.midtrans.com";
const PRODUCTION_SNAP = "https://app.midtrans.com";
const SANDBOX_CORE = "https://api.sandbox.midtrans.com";
const PRODUCTION_CORE = "https://api.midtrans.com";

export function isMidtransConfigured() {
  return Boolean(process.env.MIDTRANS_SERVER_KEY && getMidtransClientKey());
}

export function isMidtransProduction() {
  const flag = process.env.MIDTRANS_IS_PRODUCTION;
  if (flag === "true") return true;
  if (flag === "false") return false;
  // Sandbox keys are prefixed "SB-Mid-server-", production keys "Mid-server-".
  return (process.env.MIDTRANS_SERVER_KEY ?? "").startsWith("Mid-server-");
}

export function getServerKey() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY is not configured");
  return key;
}

export function getMidtransClientKey() {
  return (
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ??
    process.env.MIDTRANS_CLIENT_KEY ??
    ""
  );
}

export function getSnapJsUrl() {
  return `${isMidtransProduction() ? PRODUCTION_SNAP : SANDBOX_SNAP}/snap/snap.js`;
}

export function snapApiBase() {
  return isMidtransProduction() ? PRODUCTION_SNAP : SANDBOX_SNAP;
}

export function coreApiBase() {
  return isMidtransProduction() ? PRODUCTION_CORE : SANDBOX_CORE;
}

export function basicAuthHeader() {
  return `Basic ${Buffer.from(`${getServerKey()}:`).toString("base64")}`;
}
