import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';

const url = process.argv[2] || 'http://localhost:8790/?venue=proving&event=gp';
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: !process.env.HEADED, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.route('**/src/main.js', async (route) => {
  const res = await route.fetch();
  await route.fulfill({ response: res, body: `${await res.text()}\nwindow.__gl = { renderer, get race() { return race; }, get mode() { return mode; } };` });
});
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
const t0 = Date.now();
await page.goto(offline(url));
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__gl, null, { timeout: 180000 });
const bootMs = Date.now() - t0;
await page.waitForTimeout(4000);
const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }); };
await shot('title');

async function toGo(key) {
  const before = await page.evaluate(() => { window.__perf.frames.length = 0; return { programs: window.__gl.renderer.info.programs.length, t: performance.now() }; });
  await cdp.send('Profiler.start');
  await page.keyboard.press(key);
  await page.waitForFunction(() => window.__gl.mode === 'race' && window.__gl.race.phase !== 'racing', null, { timeout: 20000, polling: 16 });
  await page.waitForFunction(() => window.__gl.race.phase === 'racing', null, { timeout: 60000, polling: 16 });
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, k) => {
    const f = byId.get(id).callFrame, name = `${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
    self.set(name, (self.get(name) || 0) + profile.timeDeltas[k] / 1000);
  });
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, ms]) => `${Math.round(ms)} ms  ${name}`);
  const out = await page.evaluate((b) => {
    const f = window.__perf.frames;
    return { toGoMs: Math.round(performance.now() - b.t), worstFrameMs: Math.round(Math.max(...f)), framesOver100: f.filter((x) => x > 100).length, newPrograms: window.__gl.renderer.info.programs.length - b.programs, longTasks: window.__long.filter((l) => l.at >= b.t).sort((x, y) => y.ms - x.ms).slice(0, 5) };
  }, before);
  return { ...out, top };
}

const first = await toGo('Enter');
await page.waitForTimeout(2000);
await shot('race');
const again = await toGo('KeyR');
console.log(JSON.stringify({ url, bootMs, first, again, errors: [...new Set(errors)] }, null, 1));
await browser.close();
process.exit(first.newPrograms > 30 || errors.some((e) => e.includes('Shader Error')) ? 1 : 0);
