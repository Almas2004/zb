import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const file = process.env.BACKUP_FILE || process.argv[2];
if (!file || !existsSync(file)) {
  console.error("Set BACKUP_FILE or pass backup path as argument.");
  process.exit(1);
}

const child = spawnSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "agrofest", "agrofest"], {
  input: readFileSync(file)
});
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
if (child.error) throw child.error;
process.exit(child.status || 0);
