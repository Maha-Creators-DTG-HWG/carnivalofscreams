import type { TablePackageId } from "./tables";

// Plan coordinates below are in this width × height, 2× the 1500×2000 plan.
// The image file can be any resolution at the same 3:4 ratio.
export const VENUE_MAP = {
  src: "/images/venue-layout-v2.webp",
  alt: "Carnaval of Screams 2026 floor plan",
  width: 3000,
  height: 4000,
} as const;

/** Tinted floor of each area, in floor-plan pixels. */
export const AREA_OUTLINES: Partial<Record<TablePackageId, string>> = {
  luxer:
    "M690,1932 L776,1804 L1020,1994 L1120,2060 L1246,2134 L1250,2150 L1194,2240 L1160,2300 L980,2170 L600,2040 L524,1980Z",
  etius:
    "M594,1862 L810,1652 L1564,2104 L1400,2180 L1246,2134 L1120,2060 L1020,1994 L776,1804 L690,1932Z",
  skyview:
    "M246,2314 L304,2210 L414,2266 L534,2144 L1110,2540 L956,2696 L766,2656 L614,2576 L500,2484 L346,2380Z",
  tivex: "M2194,1134 L2600,1134 L2600,1550 L2194,1550Z",
  perio: "M2156,1596 L2360,1596 L2360,1984 L2156,1984Z",
  onomy: "M2386,1596 L2680,1596 L2680,1996 L2386,1996Z",
  vvip:
    "M1262,2140 L1404,2180 L1314,2314 L1194,2236Z M1684,2030 L2164,2026 L2164,2332 L1684,2320Z",
};

/** Centre of each printed table, keyed by seat id (etius-1, skyview-3, …). */
export const TABLE_POINTS: Record<string, [number, number]> = {
  "etius-1": [820, 1790], "etius-2": [863, 1820], "etius-3": [910, 1853],
  "etius-4": [1246, 2071], "etius-5": [1296, 2096], "etius-6": [1356, 2121],
  "etius-7": [930, 1786], "etius-8": [973, 1826], "etius-9": [1236, 1986],
  "etius-10": [1290, 2026],
  "luxer-1": [780, 1866], "luxer-2": [821, 1902], "luxer-3": [863, 1930],
  "luxer-4": [1123, 2106], "luxer-5": [1165, 2138], "luxer-6": [1213, 2164],
  "luxer-7": [756, 1946], "luxer-8": [798, 1976], "luxer-9": [1100, 2176],
  "luxer-10": [1143, 2210],
  "skyview-1": [515, 2212], "skyview-2": [555, 2240], "skyview-3": [653, 2366],
  "skyview-4": [718, 2412], "skyview-5": [786, 2466], "skyview-6": [980, 2543],
  "skyview-7": [1026, 2570], "skyview-8": [523, 2330], "skyview-9": [565, 2358],
  "skyview-10": [853, 2546], "skyview-11": [898, 2581],
  "tivex-1": [2329, 1188], "tivex-2": [2330, 1238], "tivex-3": [2330, 1288],
  "tivex-4": [2332, 1340], "tivex-5": [2334, 1394], "tivex-6": [2338, 1444],
  "tivex-7": [2339, 1499], "tivex-8": [2422, 1238], "tivex-9": [2422, 1340],
  "tivex-10": [2424, 1440], "tivex-11": [2502, 1192], "tivex-12": [2502, 1242],
  "tivex-13": [2504, 1292], "tivex-14": [2508, 1342], "tivex-15": [2506, 1394],
  "tivex-16": [2506, 1445], "tivex-17": [2506, 1502],
  "perio-1": [2262, 1694], "perio-2": [2269, 1788], "perio-3": [2272, 1891],
  "onomy-1": [2485, 1658], "onomy-2": [2490, 1724], "onomy-3": [2492, 1796],
  "onomy-4": [2496, 1868], "onomy-5": [2498, 1938], "onomy-6": [2562, 1658],
  "onomy-7": [2565, 1726], "onomy-8": [2570, 1796], "onomy-9": [2572, 1869],
  "onomy-10": [2572, 1938],
  "vvip-1": [1273, 2230], "vvip-2": [1771, 2186], "vvip-3": [1928, 2196],
  "vvip-4": [2082, 2208],
};

export function getAreaOutline(packageId: string | null | undefined) {
  if (!packageId) return undefined;
  return AREA_OUTLINES[packageId as TablePackageId];
}
