import Image from "next/image";
import QRCode from "qrcode";
import { AgroLogo } from "./AgroLogo";
import { dictionaries, type Locale } from "@/lib/i18n";
import { formatDateOnly } from "@/lib/guests";

export async function TicketCard({
  guest,
  qrToken,
  locale = "RU"
}: {
  guest: {
    firstName: string;
    lastName: string;
    category: string;
    registrationNumber: string;
    publicTicketToken: string;
    eventDates: Array<{ eventDate: Date }>;
  };
  qrToken?: string;
  locale?: Locale;
}) {
  const t = dictionaries[locale];
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const qrValue = qrToken ? `${appUrl}/check-in/${qrToken}` : `${appUrl}/ticket/${guest.publicTicketToken}`;
  const qrDataUrl = await QRCode.toDataURL(qrValue, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  const days = guest.eventDates.map((d) => formatDateOnly(d.eventDate)).join(", ");

  return (
    <section id="ticket-card" className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg bg-white shadow-2xl print:shadow-none">
      <div className="brand-gradient h-4" />
      <div className="leaf-pattern p-6">
        <AgroLogo className="mx-auto h-28 w-64" priority />
        <div className="mt-4 rounded-lg border border-[#004F2F]/15 bg-white/90 p-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[#F15A22]">QR-билет</p>
          <h1 className="mt-1 text-2xl font-black text-[#004F2F]">AgroFest 2026</h1>
          <div className="mt-5 grid gap-3 text-base">
            <div>
              <p className="text-sm text-neutral-500">Гость</p>
              <p className="font-bold">
                {guest.firstName} {guest.lastName}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-neutral-500">Категория</p>
                <p className="font-bold">{guest.category === "FARMER" ? t.farmer : t.guest}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Номер</p>
                <p className="font-bold">{guest.registrationNumber}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Даты посещения</p>
              <p className="font-bold">{days}</p>
            </div>
          </div>
          <Image
            src={qrDataUrl}
            alt="QR-код билета"
            width={256}
            height={256}
            unoptimized
            className="mx-auto mt-5 h-64 w-64 rounded-lg border border-neutral-200 bg-white p-3"
          />
          <p className="mt-4 text-center text-sm leading-5 text-neutral-700">{t.ticketInstruction}</p>
        </div>
      </div>
    </section>
  );
}
