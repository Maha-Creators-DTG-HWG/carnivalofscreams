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
    seats: 6,
    tickets: 3,
    priceIdr: 450_000,
    minSpendIdr: 6_000_000,
    range: "L1–L10",
    blurb: "Six seats on a reserved sofa. Booking fee includes three event tickets.",
    reservation: "1 sofa reservation",
  },
  {
    id: "skyview",
    name: "Sky View Area",
    furniture: "Sofa",
    tagline: "Above the crowd, with the best view of the night.",
    seats: 6,
    tickets: 3,
    priceIdr: 450_000,
    minSpendIdr: 6_000_000,
    range: "SV1–SV11",
    blurb: "Six seats on a reserved sofa on the second floor. Booking fee includes three event tickets.",
    reservation: "1 sofa reservation",
  },
  {
    id: "etius",
    name: "Etius Area",
    furniture: "Daybed",
    tagline: "Your own space, made for the night.",
    seats: 6,
    tickets: 3,
    priceIdr: 450_000,
    minSpendIdr: 6_000_000,
    range: "E1–E10",
    blurb: "Six seats on a reserved daybed. Booking fee includes three event tickets.",
    reservation: "1 daybed reservation",
  },
  {
    id: "tivex",
    name: "Tivex Area",
    furniture: "Long table",
    tagline: "Bring your circle, share the night.",
    seats: 6,
    tickets: 3,
    priceIdr: 400_000,
    minSpendIdr: 3_500_000,
    range: "T1–T17",
    blurb: "Six seats at a long table. Booking fee includes three event tickets.",
    reservation: "1 long table reservation",
  },
  {
    id: "perio",
    name: "Perio Area",
    furniture: "Long table",
    tagline: "Prime position, premium experience.",
    seats: 4,
    tickets: 2,
    priceIdr: 350_000,
    minSpendIdr: 3_000_000,
    range: "P1–P3",
    blurb: "Four seats at a long table. Booking fee includes two event tickets.",
    reservation: "1 long table reservation",
  },
  {
    id: "onomy",
    name: "Onomy Area",
    furniture: "Regular table",
    tagline: "Your spot, your night, sorted.",
    seats: 4,
    tickets: 2,
    priceIdr: 300_000,
    minSpendIdr: 2_500_000,
    range: "O1–O10",
    blurb: "Four seats at a regular table. Booking fee includes two event tickets.",
    reservation: "1 regular table reservation",
  },
  {
    id: "vvip",
    name: "VVIP Area",
    furniture: "Sofa",
    tagline: "The highest tier. The ultimate experience.",
    seats: 6,
    tickets: 3,
    priceIdr: 450_000,
    minSpendIdr: 15_000_000,
    range: "V1–V4",
    blurb: "Six seats on a reserved VVIP sofa. Booking fee includes three event tickets.",
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
