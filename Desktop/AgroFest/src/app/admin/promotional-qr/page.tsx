import fs from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import QRCode from "qrcode";
import sharp from "sharp";
import { AgroLogo } from "@/components/AgroLogo";

async function qrWithLogoPng(qrPng: Buffer) {
  const logo = await sharp(path.join(process.cwd(), "public", "branding", "agrofest-logo.png"))
    .resize({ width: 150, height: 100, fit: "contain" })
    .png()
    .toBuffer();
  return sharp(qrPng)
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

export default async function PromotionalQrPage() {
  const url = process.env.APP_URL || "https://DOMAIN/";
  const qrPngBuffer = await QRCode.toBuffer(url, { width: 720, margin: 2, errorCorrectionLevel: "H" });
  const qrLogoPngBuffer = await qrWithLogoPng(qrPngBuffer);
  const plainPng = `data:image/png;base64,${qrPngBuffer.toString("base64")}`;
  const logoPng = `data:image/png;base64,${qrLogoPngBuffer.toString("base64")}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "H" });
  const logoBase64 = (await fs.readFile(path.join(process.cwd(), "public", "branding", "agrofest-logo.png"))).toString("base64");
  const svgWithLogo = svg.replace("</svg>", `<image href="data:image/png;base64,${logoBase64}" x="38%" y="41%" width="24%" height="18%" preserveAspectRatio="xMidYMid meet"/></svg>`);
  const svgData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const svgLogoData = `data:image/svg+xml;base64,${Buffer.from(svgWithLogo).toString("base64")}`;

  return (
    <section className="max-w-xl rounded-lg bg-white p-6 shadow">
      <AgroLogo className="h-24 w-60" priority />
      <h1 className="mt-4 text-3xl font-black text-[#004F2F]">Рекламный QR-код</h1>
      <p className="mt-2 text-neutral-700">Ссылка на регистрационную форму:</p>
      <p className="mt-1 break-all rounded-lg bg-[#fff4eb] p-3 font-bold text-[#004F2F]">{url}</p>
      <div className="relative mx-auto mt-5 h-80 w-80">
        <Image src={logoPng} alt="QR на регистрацию с логотипом" width={320} height={320} unoptimized className="h-80 w-80" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={logoPng} download="agrofest-registration-qr-logo.png" className="rounded-lg bg-[#F15A22] px-5 py-3 text-center font-bold text-white">PNG с логотипом</a>
        <a href={plainPng} download="agrofest-registration-qr.png" className="rounded-lg bg-white px-5 py-3 text-center font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">PNG без логотипа</a>
        <a href={svgLogoData} download="agrofest-registration-qr-logo.svg" className="rounded-lg bg-[#004F2F] px-5 py-3 text-center font-bold text-white">SVG с логотипом</a>
        <a href={svgData} download="agrofest-registration-qr.svg" className="rounded-lg bg-white px-5 py-3 text-center font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">SVG без логотипа</a>
      </div>
    </section>
  );
}
