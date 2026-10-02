import type { TablePackageId } from "./tables";

export const VENUE_MAP = {
  src: "/images/venue-layout.webp",
  alt: "Carnaval of Screams 2026 floor plan",
  width: 1600,
  height: 1200,
} as const;

/** Tinted floor of each area, in floor-plan pixels. */
export const AREA_OUTLINES: Partial<Record<TablePackageId, string>> = {
  luxer:
    "M472,328 L544,320 L1280,520 L1032,756 L756,696 L620,780 L472,632Z",
  etius: "M544,308 L576,196 L680,212 L1376,376 L1472,412 L1360,528Z",
  tivex:
    "M388,328 L472,328 L472,632 L620,780 L756,696 L984,752 L984,960 L600,960 L600,816 L512,824 L376,680 L384,624Z",
  perio: "M602,962 L985,962 L985,1045 L602,1045Z",
  onomy: "M970,870 L1142,722 L1340,915 L1135,1100 L990,1050 L985,880Z",
};

/** Centre of each printed table, keyed by seat short code (E1, L12, …). */
export const TABLE_POINTS: Record<string, [number, number]> = {
  E1: [726, 272], E2: [890, 314], E3: [1058, 356], E4: [1220, 396],
  L1: [592, 376], L2: [592, 432], L3: [592, 486], L4: [592, 542],
  L5: [566, 678], L6: [602, 718], L7: [774, 572], L8: [828, 586],
  L9: [882, 600], L10: [938, 612], L11: [1056, 656], L12: [1094, 618],
  L13: [1138, 586], L14: [1180, 552], L15: [970, 478], L16: [918, 466],
  L17: [866, 454], L18: [810, 438], L19: [758, 426], L20: [704, 412],
  L21: [938, 690], L22: [882, 678], L23: [830, 664], L24: [776, 652],
  L25: [506, 500], L26: [506, 442], L27: [506, 386],
  T1: [426, 392], T2: [426, 450], T3: [426, 508], T4: [426, 566],
  T5: [448, 702], T6: [490, 748], T7: [532, 792], T8: [640, 846],
  T9: [707, 846], T10: [774, 846], T11: [844, 846], T12: [914, 846],
  T13: [640, 926], T14: [710, 926], T15: [784, 926], T16: [858, 926],
  T17: [932, 926],
  P1: [650, 996], P2: [716, 996], P3: [912, 996],
  O1: [1128, 1018], O2: [1086, 976], O3: [1040, 932], O4: [1190, 950],
  O5: [1148, 912], O6: [1104, 872], O7: [1254, 876], O8: [1218, 840],
  O9: [1178, 808], O10: [1140, 770],
};

export function getAreaOutline(packageId: string | null | undefined) {
  if (!packageId) return undefined;
  return AREA_OUTLINES[packageId as TablePackageId];
}
