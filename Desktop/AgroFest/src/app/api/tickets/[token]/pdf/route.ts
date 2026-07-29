import { NextResponse } from "next/server";
import { getTicket } from "@/lib/guests";
import { renderTicketPdf, ticketDownloadName } from "@/lib/ticket-render";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getTicket(token);
  if (!guest || guest.status === "DELETED") {
    return NextResponse.json({ message: "Билет не найден" }, { status: 404 });
  }

  const body = await renderTicketPdf(guest);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ticketDownloadName(guest, "pdf")}"`,
      "Cache-Control": "no-store"
    }
  });
}
