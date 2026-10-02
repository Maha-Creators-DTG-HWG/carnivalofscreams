import { DokuAuthError } from "./errors";

export type DokuConfig = {
  clientId: string;
  secretKey: string;
};

export function isDokuConfigured() {
  return Boolean(process.env.DOKU_CLIENT_ID && process.env.DOKU_SECRET_KEY);
}

export function isDokuProduction() {
  return process.env.DOKU_IS_PRODUCTION === "true";
}

export function getDokuConfig(): DokuConfig {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!clientId) {
    throw new DokuAuthError({ message: "DOKU_CLIENT_ID is not configured" });
  }
  if (!secretKey) {
    throw new DokuAuthError({ message: "DOKU_SECRET_KEY is not configured" });
  }
  return { clientId, secretKey };
}
