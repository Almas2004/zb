"use client";

import { Download, FileDown, Printer, Share2, Send } from "lucide-react";
import { Button, LinkButton } from "./Button";

export function TicketActions({
  ticketUrl,
  text,
  pngUrl,
  pdfUrl
}: {
  ticketUrl: string;
  text: string;
  pngUrl: string;
  pdfUrl: string;
}) {
  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "AgroFest 2026", text, url: ticketUrl });
      return;
    }
    await navigator.clipboard.writeText(ticketUrl);
    alert("Ссылка на билет скопирована");
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${ticketUrl}`)}`;

  return (
    <div className="no-print mx-auto mt-5 grid w-full max-w-[420px] gap-3">
      <LinkButton href={pngUrl} download variant="green">
        <Download size={18} /> Скачать билет в PNG
      </LinkButton>
      <LinkButton href={pdfUrl} download variant="ghost">
        <FileDown size={18} /> Скачать билет в PDF
      </LinkButton>
      <Button onClick={share} variant="ghost">
        <Share2 size={18} /> Поделиться билетом
      </Button>
      <LinkButton href={wa} target="_blank" rel="noreferrer" variant="primary">
        <Send size={18} /> Отправить через WhatsApp
      </LinkButton>
      <Button onClick={() => window.print()} variant="ghost">
        <Printer size={18} /> Распечатать билет
      </Button>
    </div>
  );
}
