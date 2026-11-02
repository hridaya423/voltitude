import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/trailer-clips';
const port = process.env.PORT || 8790;
const ONLY = process.env.ONLY?.split(',');
const SHOTS = [
  { name: 'lineup', query: 'venue=pad&event=lineup&golden', until: 'race.dare?.cleared >= 4 && race.car.mode === 1', after: 150, seconds: 8 },
  { name: 'ramp', query: 'venue=pad&event=ramp&golden', until: 'race.dare?.tries.length >= 1', after: 30, seconds: 10 },
  { name: 'trench', query: 'venue=launch&event=trench&golden', until: "race.phase === 'finished'", after: 0, seconds: 20 },
  { name: 'loop', query: 'venue=proving&event=tt&golden', until: 'race.raceTick > 120 * 24', after: 0, seconds: 20 },
  { name: 'gp', query: 'venue=launch&event=gp&night', until: 'race.raceTick > 120 * 30', after: 0, seconds: 10 },
].filter((s) => !ONLY || ONLY.includes(s.name));

const HOOK = `
const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
window.__clip = {
  get race() { return race; },
  async exportNow(seconds) {
    lastRun = encodeRun(race, recorder.bytes());
    lastRun.total = race.raceTick;
    const { blob } = await exportClip({ seconds, portrait: false });
    return b64(blob);
  },
};`;

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const s of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log(s.name, 'pageerror', e.message));
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + HOOK;
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(`http://localhost:${port}/index.html?${s.query}&autostart&autopilot`);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__clip?.race.phase === 'racing', null, { timeout: 180000, polling: 100 });
  await page.waitForFunction(`(() => { const race = window.__clip.race; return ${s.until}; })()`, null, { timeout: 300000, polling: 50 });
  const t = await page.evaluate(() => window.__clip.race.raceTick);
  if (s.after) await page.waitForFunction((t) => window.__clip.race.raceTick >= t, t + s.after, { timeout: 60000, polling: 50 });
  const data = await page.evaluate((n) => window.__clip.exportNow(n), s.seconds);
  writeFileSync(join(out, `${s.name}.mp4`), Buffer.from(data, 'base64'));
  console.log(s.name, 'tick', t);
  await page.close();
}
await browser.close();
