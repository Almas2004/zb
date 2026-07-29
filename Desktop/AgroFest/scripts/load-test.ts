import "dotenv/config";
import { performance } from "node:perf_hooks";
const baseUrl = process.env.LOAD_TEST_URL || process.env.APP_URL || "http://localhost:3000";
const requests = Number(process.env.LOAD_TEST_REQUESTS || 60);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 6);

async function timed(fn: () => Promise<Response>) {
  const start = performance.now();
  const response = await fn();
  return { status: response.status, ms: performance.now() - start };
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] || 0;
}

async function main() {
  const tasks = Array.from({ length: requests }, () => async () => timed(() => fetch(baseUrl)));
  const results: Array<{ status: number; ms: number }> = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    results.push(...(await Promise.all(tasks.slice(i, i + concurrency).map((task) => task()))));
  }
  const ok = results.filter((r) => r.status < 500).length;
  const errors = results.length - ok;
  const times = results.map((r) => r.ms);
  console.log(JSON.stringify({
    url: baseUrl,
    requests: results.length,
    successful: ok,
    errors,
    averageMs: Math.round(times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1)),
    p95Ms: Math.round(percentile(times, 95)),
    p99Ms: Math.round(percentile(times, 99))
  }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
