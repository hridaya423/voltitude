import { chromium } from 'playwright-core';

const [query = '', ...flags] = process.argv.slice(2);
const opt = (name, fallback) => { const i = flags.indexOf(`--${name}`); return i < 0 ? fallback : flags[i + 1]; };
const port = process.env.PORT || 8790, until = opt('until', 'racing'), limit = Number(opt('timeout', 420)) * 1000, expr = opt('eval', ''), keys = opt('keys', '');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], logs = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 160)); });
await page.route('**/src/main.js', async (route) => {
  const res = await route.fetch();
  const body = `${await res.text()}\nwindow.__cap = { get race() { return race; }, get mode() { return mode; }, get current() { return current; }, get dailyRun() { return dailyRun; }, camera, menu, hud, audio, input };`;
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
});
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html${query}`);
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__cap, null, { timeout: 180000, polling: 50 });
const loadedMs = Date.now() - t0;
for (const k of keys.split(',').filter(Boolean)) { if (/^\d+$/.test(k)) await page.waitForTimeout(Number(k)); else await page.keyboard.press(k); }
const done = { boot: () => true, racing: () => window.__cap.mode === 'race' && window.__cap.race.phase === 'racing', results: () => window.__cap.mode === 'results' }[until];
const reached = await page.waitForFunction(done, null, { timeout: limit, polling: 100 }).then(() => true, () => false);
if (reached && until === 'results') await page.waitForFunction(() => document.getElementById('menuLive').textContent, null, { timeout: 2000, polling: 'raf' }).catch(() => {});
const out = { query, until, reached, loadedMs, errors, consoleErrors: [...new Set(logs)], state: await page.evaluate(() => ({ mode: window.__cap.mode, event: window.__cap.current.id, phase: window.__cap.race.phase, live: document.getElementById('menuLive').textContent })) };
if (expr) out.value = await page.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(reached && !errors.length ? 0 : 1);
