import { NextResponse } from "next/server";
import { getTicket } from "@/lib/guests";
import { renderTicketPng, ticketDownloadName } from "@/lib/ticket-render";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getTicket(token);
  if (!guest || guest.status === "DELETED") {
    return NextResponse.json({ message: "Билет не найден" }, { status: 404 });
  }

  const body = await renderTicketPng(guest);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${ticketDownloadName(guest, "png")}"`,
      "Cache-Control": "no-store"
    }
  });
}
