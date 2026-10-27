import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { invoiceCardRows, type InvoiceFields } from "./invoice";
import { getSiteUrl, WHATSAPP_URL } from "./site";

/**
 * The invoice email as a PDF: same artwork, same rows. The artwork is fetched
 * from the site (public/email/), like the email does, so there is one copy of it.
 * Standard PDF fonts only (Helvetica), so text outside Latin-1 is dropped;
 * ponytail: embed a TTF with fontkit if guest names ever need more.
 */
const W = 600;
const H = 960;
const BLACK = rgb(0, 0, 0);
const LABEL = rgb(0x8d / 255, 0x9b / 255, 0xc0 / 255);
const TEXT = rgb(0xe9 / 255, 0xee / 255, 0xfb / 255);
const CODE = rgb(0xcf / 255, 0xe0 / 255, 0xff / 255);
const RULE = rgb(0x1b / 255, 0x23 / 255, 0x40 / 255);

async function asset(name: string) {
  const response = await fetch(`${getSiteUrl()}/email/${name}`);
  if (!response.ok) throw new Error(`Could not load ${name}`);
  return new Uint8Array(await response.arrayBuffer());
}

// Helvetica covers Latin-1 plus the bullet used to mask the NIK.
const safe = (text: string) => Array.from(text).filter((c) => c.charCodeAt(0) < 256 || c === "•").join("");

function centred(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = TEXT) {
  const value = safe(text);
  page.drawText(value, { x: (W - font.widthOfTextAtSize(value, size)) / 2, y, size, font, color });
}

function link(doc: PDFDocument, page: PDFPage, url: string, x: number, y: number, width: number, height: number) {
  const annot = doc.context.register(
    doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    }),
  );
  const existing = page.node.lookup(PDFName.of("Annots"));
  if (existing && "push" in existing) (existing as unknown as { push(ref: unknown): void }).push(annot);
  else page.node.set(PDFName.of("Annots"), doc.context.obj([annot]));
}

export async function invoicePdf(fields: InvoiceFields) {
  const [top, bottom, logo, title, button] = await Promise.all(
    ["bg-top.jpg", "bg-bottom.jpg", "logo.png", "title.png", "vip-button.png"].map(asset),
  );
  const doc = await PDFDocument.create();
  doc.setTitle(`Carnaval of Screams invoice ${fields.bookingCode}`);
  doc.setAuthor("Carnaval of Screams");
  const page = doc.addPage([W, H]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const mono = await doc.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLACK });
  const topImg = await doc.embedJpg(top);
  const bottomImg = await doc.embedJpg(bottom);
  page.drawImage(topImg, { x: 0, y: H - 400, width: W, height: 400 });
  page.drawImage(bottomImg, { x: 0, y: 0, width: W, height: 380 });

  // Header artwork, sized in the same proportions as the email.
  const logoImg = await doc.embedPng(logo);
  const logoW = W * 0.77;
  const logoH = (logoImg.height / logoImg.width) * logoW;
  const logoTop = H - W * 0.08;
  page.drawImage(logoImg, { x: (W - logoW) / 2, y: logoTop - logoH, width: logoW, height: logoH });
  const titleImg = await doc.embedPng(title);
  const titleW = W * 0.74;
  const titleH = (titleImg.height / titleImg.width) * titleW;
  const titleTop = logoTop - logoH - W * 0.09;
  page.drawImage(titleImg, { x: (W - titleW) / 2, y: titleTop - titleH, width: titleW, height: titleH });

  // Booking code.
  let y = titleTop - titleH - 30;
  centred(page, "BOOKING CODE", y, 8, regular, LABEL);
  const codeW = W * 0.76;
  const codeX = (W - codeW) / 2;
  page.drawRectangle({
    x: codeX, y: y - 42, width: codeW, height: 34,
    color: rgb(0x0a / 255, 0x10 / 255, 0x20 / 255), borderColor: rgb(0x2a / 255, 0x3a / 255, 0x6e / 255), borderWidth: 1,
  });
  centred(page, fields.bookingCode, y - 31, 16, mono, CODE);
  centred(page, "Show this code at the door. It is also your code for VIP tickets.", y - 58, 9, regular, rgb(0xae / 255, 0xb8 / 255, 0xd6 / 255));

  // Details.
  y -= 84;
  const left = W * 0.12;
  const right = W - W * 0.12;
  page.drawLine({ start: { x: left, y: y + 14 }, end: { x: right, y: y + 14 }, thickness: 1, color: RULE });
  for (const [label, value] of invoiceCardRows(fields)) {
    page.drawText(safe(label).toUpperCase(), { x: left, y, size: 8, font: regular, color: LABEL });
    page.drawText(safe(value), { x: left + (right - left) * 0.44, y, size: 11, font: regular, color: TEXT });
    page.drawLine({ start: { x: left, y: y - 9 }, end: { x: right, y: y - 9 }, thickness: 1, color: RULE });
    y -= 26;
  }

  // VIP button (a picture, as in the email) and the WhatsApp line, both clickable.
  const buttonImg = await doc.embedPng(button);
  const buttonW = 240;
  const buttonH = (buttonImg.height / buttonImg.width) * buttonW;
  const buttonX = (W - buttonW) / 2;
  const buttonY = y - buttonH + 4;
  page.drawImage(buttonImg, { x: buttonX, y: buttonY, width: buttonW, height: buttonH });
  link(doc, page, fields.vipUrl, buttonX, buttonY, buttonW, buttonH);
  const note = "Questions? Message us on WhatsApp";
  const noteY = buttonY - 24;
  centred(page, note, noteY, 9, regular, LABEL);
  link(doc, page, WHATSAPP_URL, (W - regular.widthOfTextAtSize(note, 9)) / 2, noteY - 3, regular.widthOfTextAtSize(note, 9), 14);

  return doc.save();
}
