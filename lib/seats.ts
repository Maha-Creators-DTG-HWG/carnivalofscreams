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
  first = 1,
): VenueSeat[] {
  return Array.from({ length: count }, (_, index) => {
    const n = first + index;
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
  ...seats("skyview", "skyview", "LS", "Luxer Skyview", 11),
  ...seats("tivex", "tivex", "T", "Tivex", 17),
  ...seats("perio", "perio", "P", "Perio", 3),
  // Only O4-O6 are for sale; the ids keep their numbers so the map still lines up.
  ...seats("onomy", "onomy", "O", "Onomy", 3, 4),
  ...seats("vvip", "vvip", "V", "VVIP", 4),
];

export function getSeat(id: string) {
  return SEATS.find((seat) => seat.id === id);
}

export function seatsForPackage(packageId: TablePackageId) {
  return SEATS.filter((seat) => seat.packageId === packageId);
}
