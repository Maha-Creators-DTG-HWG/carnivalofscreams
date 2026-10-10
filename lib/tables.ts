export const NIGHTS = [
  {
    id: "oct-30",
    day: "Day 1",
    label: "Friday 30 October",
    short: "30 Oct",
    date: "2026-10-30",
  },
  {
    id: "oct-31",
    day: "Day 2",
    label: "Saturday 31 October",
    short: "31 Oct",
    date: "2026-10-31",
  },
] as const;

export type NightId = (typeof NIGHTS)[number]["id"];

export const TABLE_PACKAGES = [
  {
    id: "luxer",
    name: "Luxer Area",
    furniture: "Sofa",
    tagline: "Elevated comfort, reserved for you.",
    capacity: "6",
    seats: 6,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 6_000_000,
    range: "L1–L10",
    blurb: "Six seats on a reserved sofa. Booking fee includes six event tickets.",
    reservation: "1 sofa reservation",
  },
  {
    id: "etius",
    name: "Etius Area",
    furniture: "Sofa",
    tagline: "Your own space, made for the night.",
    capacity: "6",
    seats: 6,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 6_000_000,
    range: "E1–E10",
    blurb: "Six seats on a reserved sofa. Booking fee includes six event tickets.",
    reservation: "1 sofa reservation",
  },
  {
    id: "tivex",
    name: "Tivex Area",
    furniture: "Long table",
    tagline: "Bring your circle, share the night.",
    capacity: "6",
    seats: 6,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 3_500_000,
    range: "T1–T17",
    blurb: "Six seats at a long table. Booking fee includes six event tickets.",
    reservation: "1 long table reservation",
  },
  {
    id: "perio",
    name: "Perio Area",
    furniture: "Exclusive table",
    tagline: "Prime position, premium experience.",
    capacity: "4",
    seats: 4,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 3_000_000,
    range: "P1–P3",
    blurb: "Four seats at an exclusive table. Booking fee includes six event tickets.",
    reservation: "1 exclusive table reservation",
  },
  {
    id: "onomy",
    name: "Onomy Area",
    furniture: "Exclusive table",
    tagline: "Your spot, your night, sorted.",
    capacity: "4",
    seats: 4,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 2_500_000,
    range: "O4–O6",
    blurb: "Four seats at an exclusive table. Booking fee includes six event tickets.",
    reservation: "1 exclusive table reservation",
  },
  {
    id: "skyview",
    name: "Luxer Skyview Area",
    furniture: "Sofa",
    tagline: "Above the crowd, with the best view of the night.",
    capacity: "6",
    seats: 6,
    tickets: 6,
    priceIdr: 650_000,
    minSpendIdr: 6_500_000,
    range: "LS1–LS11",
    blurb: "Six seats on a reserved sofa on the second floor. Booking fee includes six event tickets.",
    reservation: "1 sofa reservation",
  },
  {
    id: "vvip",
    name: "VVIP Area",
    furniture: "Sofa",
    tagline: "The highest tier. The ultimate experience.",
    capacity: "10–12",
    seats: 12,
    tickets: 6,
    priceIdr: 0,
    minSpendIdr: 15_000_000,
    range: "V1–V4",
    blurb: "A reserved VVIP sofa for 10 to 12. Free booking fee, includes six event tickets.",
    reservation: "1 VVIP sofa reservation",
  },
] as const;

export type TablePackageId = (typeof TABLE_PACKAGES)[number]["id"];
export type TablePackage = (typeof TABLE_PACKAGES)[number];

const PACKAGE_ALIASES: Record<string, TablePackageId> = {
  luxer: "luxer",
  skyview: "skyview",
  etius: "etius",
  tivex: "tivex",
  perio: "perio",
  onomy: "onomy",
  vvip: "vvip",
  sofa: "luxer",
  vip: "luxer",
  communal: "tivex",
  premium: "perio",
  premiere: "perio",
  regular: "onomy",
  standard: "onomy",
};

/** Areas that are reserved through customer service on WhatsApp, never online. */
const WHATSAPP_ONLY: readonly TablePackageId[] = ["vvip"];

export function isWhatsAppOnly(id: string | null | undefined) {
  return WHATSAPP_ONLY.includes(id as TablePackageId);
}

export function asPackageId(value: unknown): TablePackageId | undefined {
  if (typeof value !== "string") return undefined;
  return PACKAGE_ALIASES[value];
}

export function getNight(id: string) {
  return NIGHTS.find((night) => night.id === id);
}

export function getTablePackage(id: string) {
  const resolved = asPackageId(id) ?? id;
  return TABLE_PACKAGES.find((pack) => pack.id === resolved);
}

export function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
