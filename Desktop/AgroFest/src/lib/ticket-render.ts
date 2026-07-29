import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import { formatDateOnly } from "./guests";

export type RenderTicketGuest = {
  firstName: string;
  lastName: string;
  category: string;
  registrationNumber: string;
  publicTicketToken: string;
  eventDates: Array<{ eventDate: Date }>;
};

const logoPath = path.join(process.cwd(), "public", "branding", "agrofest-logo.png");

function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function fileName(guest: RenderTicketGuest, ext: "png" | "pdf") {
  return `AgroFest-2026-${guest.registrationNumber}.${ext}`;
}

export function ticketDownloadName(guest: RenderTicketGuest, ext: "png" | "pdf") {
  return fileName(guest, ext).replace(/[^\w.-]/g, "-");
}

function ticketQrValue(guest: RenderTicketGuest) {
  return `${appUrl()}/ticket/${guest.publicTicketToken}`;
}

function categoryLabel(category: string) {
  return category === "FARMER" ? "Фермер" : "Гость";
}

function visitDays(guest: RenderTicketGuest) {
  return guest.eventDates.map((d) => formatDateOnly(d.eventDate)).join(", ");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function renderTicketPng(guest: RenderTicketGuest) {
  const [logo, qr] = await Promise.all([
    fs.readFile(logoPath),
    QRCode.toDataURL(ticketQrValue(guest), { width: 520, margin: 1, errorCorrectionLevel: "M" })
  ]);
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;
  const name = escapeXml(`${guest.firstName} ${guest.lastName}`);
  const days = escapeXml(visitDays(guest));
  const registrationNumber = escapeXml(guest.registrationNumber);
  const category = escapeXml(categoryLabel(guest.category));

  const svg = `
    <svg width="1080" height="1500" viewBox="0 0 1080 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          text { font-family: "Noto Sans", Arial, sans-serif; }
        </style>
        <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#004F2F"/>
          <stop offset="0.62" stop-color="#F2D022"/>
          <stop offset="1" stop-color="#F15A22"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1500" fill="#fffaf4"/>
      <rect x="56" y="48" width="968" height="1404" rx="28" fill="#ffffff"/>
      <rect x="56" y="48" width="968" height="34" rx="17" fill="url(#brand)"/>
      <image href="${logoData}" x="245" y="132" width="590" height="250" preserveAspectRatio="xMidYMid meet"/>
      <text x="110" y="450" font-size="34" font-weight="400" fill="#F15A22">QR-билет</text>
      <text x="110" y="518" font-size="62" font-weight="400" fill="#004F2F">AgroFest 2026</text>
      <text x="110" y="610" font-size="28" fill="#6B7280">Гость</text>
      <text x="110" y="664" font-size="44" font-weight="400" fill="#242124">${name}</text>
      <text x="110" y="760" font-size="28" fill="#6B7280">Категория</text>
      <text x="110" y="812" font-size="38" font-weight="400" fill="#242124">${category}</text>
      <text x="600" y="760" font-size="28" fill="#6B7280">Номер</text>
      <text x="600" y="812" font-size="38" font-weight="400" fill="#242124">${registrationNumber}</text>
      <text x="110" y="908" font-size="28" fill="#6B7280">Даты посещения</text>
      <text x="110" y="960" font-size="38" font-weight="400" fill="#242124">${days}</text>
      <rect x="300" y="1010" width="480" height="480" rx="22" fill="#ffffff" stroke="#E5E7EB" stroke-width="4"/>
      <image href="${qr}" x="330" y="1040" width="420" height="420" preserveAspectRatio="xMidYMid meet"/>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderTicketPdf(guest: RenderTicketGuest) {
  const ticketPng = await renderTicketPng(guest);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const image = await pdf.embedPng(ticketPng);
  page.drawImage(image, { x: 36, y: 28, width: 523, height: 786 });
  return Buffer.from(await pdf.save());
}
