import type { TablePackageId } from "./tables";

export type VenueSeat = {
  id: string;
  packageId: TablePackageId;
  label: string;
  short: string;
};

function seats(
  packageId: TablePackageId,
  idPrefix: string,
  prefix: string,
  name: string,
  count: number,
): VenueSeat[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `${idPrefix}-${n}`,
      packageId,
      label: `${name} ${n}`,
      short: `${prefix}${n}`,
    };
  });
}

export const SEATS: VenueSeat[] = [
  ...seats("etius", "etius", "E", "Etius", 10),
  ...seats("luxer", "luxer", "L", "Luxer", 10),
  ...seats("skyview", "skyview", "SV", "Sky View", 11),
  ...seats("tivex", "tivex", "T", "Tivex", 17),
  ...seats("perio", "perio", "P", "Perio", 3),
  ...seats("onomy", "onomy", "O", "Onomy", 10),
  ...seats("vvip", "vvip", "V", "VVIP", 4),
];

export function getSeat(id: string) {
  return SEATS.find((seat) => seat.id === id);
}

export function seatsForPackage(packageId: TablePackageId) {
  return SEATS.filter((seat) => seat.packageId === packageId);
}
