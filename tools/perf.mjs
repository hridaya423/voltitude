import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';

const url = process.argv[2] || 'http://localhost:8765/index.html?autostart&autopilot';
const seconds = Number(process.argv[3] || 30);
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const budget = { p50: Number(process.env.P50 || 8.3), p99: Number(process.env.P99 || 16.7), over33: 0 };

const browser = await chromium.launch({ executablePath: chrome, headless: process.env.HEADED ? false : true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', ...(process.env.VSYNC ? [] : ['--disable-frame-rate-limit', '--disable-gpu-vsync'])] });
const [vw, vh] = (process.env.VIEWPORT || '1728x1117').split('x').map(Number);
const dsf = Number(process.env.DSF || 2);
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await page.goto(offline(url));
await page.waitForFunction(() => window.__perf && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
const bootMs = Date.now() - t0;
if (/[?&]autostart/.test(url)) await page.waitForFunction(() => window.__perf.racing, null, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(() => { window.__perf.frames.length = 0; window.__perf.scale.length = 0; window.__long.length = 0; window.__t0 = performance.now(); });
await page.waitForTimeout(seconds * 1000);
const r = await page.evaluate(() => ({ frames: window.__perf.frames, scale: window.__perf.scale, calls: window.__perf.calls, tris: window.__perf.tris, long: window.__long.filter((x) => x.t > window.__t0), mem: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
await browser.close();

const f = r.frames.slice().sort((a, b) => a - b);
const q = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))];
const over = (ms) => r.frames.filter((x) => x > ms).length;
const steps = r.scale.reduce((n, x, i, a) => n + (i && x !== a[i - 1] ? 1 : 0), 0);
const report = {
  seconds, bootMs, frames: f.length, fps: +(f.length / seconds).toFixed(1),
  p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +f[f.length - 1].toFixed(1),
  framesOver20ms: over(20), framesOver33ms: over(33.4),
  longTasksOver50ms: r.long.filter((x) => x.d > 50).length, longestTask: r.long.reduce((m, x) => Math.max(m, x.d), 0),
  drawCalls: r.calls, triangles: r.tris, viewport: `${vw}x${vh}`, dsf, minScale: Math.min(...r.scale), avgScale: +(r.scale.reduce((a, b) => a + b, 0) / r.scale.length).toFixed(3), finalScale: +r.scale[r.scale.length - 1].toFixed(3), scaleSteps: steps,
  heapMB: +(r.mem / 1048576).toFixed(1), errors: errors.slice(0, 5),
  spikesAtSec: r.frames.reduce((a, x, i, arr) => { if (x > 33.4) a.push(+(arr.slice(0, i).reduce((s, y) => s + y, 0) / 1000).toFixed(1)); return a; }, []),
};
console.log(JSON.stringify(report, null, 2));
const pass = report.p50 <= budget.p50 && report.p99 < budget.p99 && report.framesOver33ms <= budget.over33 && errors.length === 0;
console.log(`${pass ? 'PASS' : 'FAIL'} budget p50<=${budget.p50} p99<${budget.p99} over33=${budget.over33}`);
process.exit(pass ? 0 : 1);
