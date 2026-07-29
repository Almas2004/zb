import "dotenv/config";
import { execFileSync } from "node:child_process";
import { rmSync, statfsSync } from "node:fs";
import QRCode from "qrcode";
import writeXlsxFile from "write-excel-file/node";
import { ALMATY_TIME_ZONE, EVENT_DATE_KEYS } from "../src/lib/dates";

type Status = "PASS" | "WARNING" | "FAIL";
const rows: Array<{ status: Status; check: string; detail: string }> = [];

function record(status: Status, check: string, detail = "") {
  rows.push({ status, check, detail });
  console.log(`${status.padEnd(7)} ${check}${detail ? ` - ${detail}` : ""}`);
}

async function main() {
  for (const key of ["DATABASE_URL", "SESSION_SECRET", "APP_URL"]) {
    record(process.env[key] ? "PASS" : "FAIL", `env ${key}`, process.env[key] ? "set" : "missing");
  }

  record(process.env.TZ === ALMATY_TIME_ZONE ? "PASS" : "WARNING", "timezone", process.env.TZ || "not set");
  record(EVENT_DATE_KEYS.includes("2026-07-31") && EVENT_DATE_KEYS.includes("2026-08-01") ? "PASS" : "FAIL", "event dates", EVENT_DATE_KEYS.join(", "));

  try {
    const stat = statfsSync(process.cwd());
    const freeGb = Math.round((stat.bavail * stat.bsize) / 1024 / 1024 / 1024);
    record(freeGb >= 2 ? "PASS" : "WARNING", "disk free", `${freeGb} GB`);
  } catch {
    record("WARNING", "disk free", "not available on this platform");
  }

  try {
    rmSync(".next", { recursive: true, force: true });
    if (process.platform === "win32") {
      execFileSync("cmd.exe", ["/c", "npm run build"], { stdio: "pipe" });
    } else {
      execFileSync("npm", ["run", "build"], { stdio: "pipe" });
    }
    record("PASS", "production build");
  } catch (error) {
    const detail = error && typeof error === "object" && "stderr" in error
      ? `${String((error as { stderr?: Buffer }).stderr || "")}${String((error as { stdout?: Buffer }).stdout || "")}`.slice(0, 800)
      : error instanceof Error ? error.message : String(error);
    record("FAIL", "production build", detail);
  }

  const { prisma } = await import("../src/lib/prisma");
  const { createGuest } = await import("../src/lib/guests");

  try {
    await prisma.$queryRaw`SELECT 1`;
    record("PASS", "PostgreSQL connection");
  } catch (error) {
    record("FAIL", "PostgreSQL connection", error instanceof Error ? error.message : String(error));
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  record(admin ? "PASS" : "FAIL", "active admin", admin?.login || "none");

  const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  record(migrations.length ? "PASS" : "FAIL", "migrations applied", `${migrations.length}`);

  try {
    const suffix = String(Date.now()).slice(-6);
    const result = await createGuest({
      firstName: "Preflight",
      lastName: suffix,
      phone: `+7 701 ${suffix.slice(0, 3)} ${suffix.slice(3, 5)} ${suffix.slice(5, 6)}0`,
      category: "GUEST",
      language: "RU",
      dates: ["2026-07-31"],
      consentAccepted: true,
      source: "preflight",
      website: ""
    });
    await prisma.guest.update({ where: { id: result.guest.id }, data: { status: "DELETED", registrationDedupKey: null, adminComment: "preflight test record" } });
    record("PASS", "test registration write", result.guest.registrationNumber);
    await QRCode.toDataURL(`${process.env.APP_URL}/`);
    record("PASS", "registration QR generation");
  } catch (error) {
    record("FAIL", "test registration write / QR", error instanceof Error ? error.message : String(error));
  }

  try {
    await writeXlsxFile([[{ value: "Проверка" }, { value: "AgroFest" }]]).toBuffer();
    record("PASS", "Excel generation");
  } catch (error) {
    record("FAIL", "Excel generation", error instanceof Error ? error.message : String(error));
  }

  await prisma.$disconnect();

  if (rows.some((row) => row.status === "FAIL")) process.exit(1);
}

main().catch(async (error) => {
  record("FAIL", "preflight crashed", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
