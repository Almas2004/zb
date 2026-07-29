import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import type { SheetData } from "write-excel-file/node";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { formatAlmatyDateTime, eventDateToDbDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function sourceLabel(source?: string | null) {
  if (source === "self-registration") return "Самостоятельная регистрация";
  if (source === "admin") return "Админ";
  return source || "";
}

function splitDateTime(value?: Date) {
  if (!value) return ["", ""];
  const text = formatAlmatyDateTime(value);
  const [date, time] = text.split(", ");
  return [date || text, time || ""];
}

export async function GET(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const eventDate = searchParams.get("eventDate");
    const attendance = searchParams.get("attendance");

    const guests = await prisma.guest.findMany({
      where: {
        category: category === "GUEST" || category === "FARMER" ? category : undefined,
        eventDates: eventDate === "2026-07-31" || eventDate === "2026-08-01" ? { some: { eventDate: eventDateToDbDate(eventDate) } } : undefined,
        checkIns: attendance === "checked-in" ? { some: {} } : attendance === "no-show" ? { none: {} } : undefined
      },
      include: { eventDates: true, checkIns: { orderBy: { checkedInAt: "asc" } } },
      orderBy: { createdAt: "desc" }
    });

    const header = ["Код", "Имя", "Фамилия", "Телефон", "Категория", "Дни", "Дата регистрации", "Время регистрации", "Дата посещения", "Время посещения", "Статус", "Источник регистрации", "Комментарий"];
    const rows: SheetData = [
      header.map((value) => ({ value, fontWeight: "bold" as const })),
      ...guests.map((guest) => {
        const [registrationDate, registrationTime] = splitDateTime(guest.createdAt);
        const firstCheckIn = guest.checkIns[0];
        const [checkInDate, checkInTime] = splitDateTime(firstCheckIn?.checkedInAt);
        return [
          { value: guest.registrationNumber },
          { value: guest.firstName },
          { value: guest.lastName },
          { value: guest.phone, type: String },
          { value: guest.category === "FARMER" ? "Фермер" : "Гость" },
          { value: guest.eventDates.map((d) => d.eventDate.toISOString().slice(0, 10)).join(", ") },
          { value: registrationDate },
          { value: registrationTime },
          { value: checkInDate },
          { value: checkInTime },
          { value: firstCheckIn ? "Пришёл" : "Не пришёл" },
          { value: sourceLabel(guest.source) },
          { value: guest.adminComment || "" }
        ];
      })
    ];
    const xlsx = writeXlsxFile(rows, {
      columns: header.map(() => ({ width: 24 }))
    });
    const buffer = await xlsx.toBuffer();
    const fileName = `agrofest-2026-guests-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
