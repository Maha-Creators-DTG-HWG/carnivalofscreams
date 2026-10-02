import type { NightId, TablePackageId } from "../tables";
import { asPackageId } from "../tables";

export function newOrderId(packageId: string, nightId: string) {
  const night = nightId === "oct-31" ? "31" : "30";
  const pack = packageId.slice(0, 3).toUpperCase();
  const rand = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  return `COS-${night}-${pack}-${rand}`;
}

const ORDER_PACKAGE_CODES: Record<string, TablePackageId> = {
  LUX: "luxer",
  ETI: "etius",
  TIV: "tivex",
  PER: "perio",
  ONO: "onomy",
  SOF: "luxer",
  VIP: "luxer",
  COM: "tivex",
  PRE: "perio",
  REG: "onomy",
  STA: "onomy",
};

export function parseOrderId(orderId: string) {
  const match = /^COS-(30|31)-([A-Z]{3})-/.exec(orderId);
  if (!match) return undefined;

  const nightId: NightId = match[1] === "31" ? "oct-31" : "oct-30";
  const packageId =
    ORDER_PACKAGE_CODES[match[2]] ?? asPackageId(match[2].toLowerCase());

  return { nightId, packageId };
}
