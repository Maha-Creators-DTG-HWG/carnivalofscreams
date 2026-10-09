import assert from "node:assert/strict";
import test from "node:test";

import {
  asPackageId,
  formatIdr,
  getTablePackage,
  TABLE_PACKAGES,
} from "./tables";

test("COS26 areas match the plotting guide", () => {
  assert.deepEqual(
    TABLE_PACKAGES.map((pack) => pack.id),
    ["luxer", "skyview", "etius", "tivex", "perio", "onomy", "vvip"],
  );

  assert.equal(getTablePackage("luxer")?.priceIdr, 450_000);
  assert.equal(getTablePackage("luxer")?.minSpendIdr, 6_000_000);
  assert.equal(getTablePackage("luxer")?.seats, 6);
  assert.equal(getTablePackage("luxer")?.tickets, 3);
  assert.equal(getTablePackage("luxer")?.range, "L1–L10");

  assert.equal(getTablePackage("skyview")?.priceIdr, 450_000);
  assert.equal(getTablePackage("skyview")?.range, "SV1–SV11");

  assert.equal(getTablePackage("etius")?.priceIdr, 450_000);
  assert.equal(getTablePackage("etius")?.range, "E1–E10");

  assert.equal(getTablePackage("tivex")?.priceIdr, 400_000);
  assert.equal(getTablePackage("tivex")?.minSpendIdr, 3_500_000);
  assert.equal(getTablePackage("tivex")?.range, "T1–T17");

  assert.equal(getTablePackage("perio")?.priceIdr, 350_000);
  assert.equal(getTablePackage("perio")?.seats, 4);
  assert.equal(getTablePackage("perio")?.tickets, 2);
  assert.equal(getTablePackage("perio")?.range, "P1–P3");

  assert.equal(getTablePackage("onomy")?.priceIdr, 300_000);
  assert.equal(getTablePackage("onomy")?.minSpendIdr, 2_500_000);
  assert.equal(getTablePackage("onomy")?.range, "O1–O10");

  assert.equal(getTablePackage("vvip")?.minSpendIdr, 15_000_000);
  assert.equal(getTablePackage("vvip")?.range, "V1–V4");
  assert.match(formatIdr(450_000), /Rp\s*450\.000/);
});

test("legacy package ids still resolve to COS26 areas", () => {
  assert.equal(asPackageId("sofa"), "luxer");
  assert.equal(asPackageId("vip"), "luxer");
  assert.equal(asPackageId("communal"), "tivex");
  assert.equal(asPackageId("premium"), "perio");
  assert.equal(asPackageId("premiere"), "perio");
  assert.equal(asPackageId("regular"), "onomy");
  assert.equal(asPackageId("standard"), "onomy");
  assert.equal(asPackageId("unknown"), undefined);
});
