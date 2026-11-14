const CONC = 50;
const TOTAL = 2000;
const url = 'http://localhost:8787/v1/brief';
let done = 0;
let ok = 0;
let fail = 0;
const latencies = [];
const start = Date.now();
async function worker() {
  while (done < TOTAL) {
    const i = done++;
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'تصميم بوست انستجرام', platform: 'ig' }),
      });
      if (res.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
    latencies.push(performance.now() - t0);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
const elapsed = Date.now() - start;
latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(latencies.length * 0.5)];
const p95 = latencies[Math.floor(latencies.length * 0.95)];
const p99 = latencies[Math.floor(latencies.length * 0.99)];
console.log(
  JSON.stringify({
    total: TOTAL,
    concurrency: CONC,
    elapsed_ms: elapsed,
    rps: Math.round(TOTAL / (elapsed / 1000)),
    ok,
    fail,
    p50_ms: p50.toFixed(1),
    p95_ms: p95.toFixed(1),
    p99_ms: p99.toFixed(1),
  }),
);
