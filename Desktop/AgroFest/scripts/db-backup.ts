import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";

const file = `backups/agrofest-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
mkdirSync("backups", { recursive: true });
const output = createWriteStream(file);
const dump = spawn("docker", ["compose", "exec", "-T", "db", "pg_dump", "-U", "agrofest", "agrofest"], { stdio: ["ignore", "pipe", "inherit"] });
dump.stdout.pipe(output);
dump.on("error", (error) => {
  throw error;
});
dump.on("close", (code) => {
  output.end();
  if (code !== 0) process.exit(code || 1);
  console.log(`Backup saved: ${file}`);
});
