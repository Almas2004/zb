import { notFound } from "next/navigation";
import { TicketActions } from "@/components/TicketActions";
import { TicketCard } from "@/components/TicketCard";
import { getTicket } from "@/lib/guests";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getTicket(token);
  if (!guest || guest.status === "DELETED") notFound();

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const ticketUrl = `${appUrl}/ticket/${guest.publicTicketToken}`;
  const shareText = `QR-билет AgroFest 2026: ${guest.registrationNumber}`;

  return (
    <main className="min-h-dvh bg-[#fffaf4] px-4 py-8">
      <TicketCard guest={guest} locale={guest.language} />
      <TicketActions
        ticketUrl={ticketUrl}
        text={shareText}
        pngUrl={`/api/tickets/${guest.publicTicketToken}/png`}
        pdfUrl={`/api/tickets/${guest.publicTicketToken}/pdf`}
      />
    </main>
  );
}
