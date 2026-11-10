import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/trailer-clips';
const port = process.env.PORT || 8790;
const ONLY = process.env.ONLY?.split(',');
const STRAIGHT = 'Math.abs(race.world.track.curv[c.hint]) < 0.004';
const SHOTS = [
  { name: 'lineup', query: 'venue=pad&event=lineup&golden', over: 'if (c.mode === 0 && c.air > 8 && Math.abs(c.barrel) < 5.9 && race.dare?.count === 2) i.roll = 1;', until: 'race.dare?.count >= 4 && c.mode === 1', after: 60, seconds: 13 },
  { name: 'ramp', query: 'venue=pad&event=ramp&golden', until: 'race.dare?.tries.length >= 1', after: 30, seconds: 10 },
  { name: 'trench', query: 'venue=launch&event=trench&golden', until: 'race.raceTick > 120 * 13', after: 0, seconds: 12 },
  { name: 'loop', query: 'venue=proving&event=tt&golden', over: `if (c.hint > 1380 && c.hint < 2080 && c.gas > 0.05) i.boost = 1;`, until: 'race.raceTick > 1200 && c.hint >= 2075', after: 0, seconds: 12 },
  { name: 'gp-night', query: 'venue=launch&event=gp&night', over: `if (race.raceTick > 0 && ${STRAIGHT} && c.gas > 0.2) i.boost = 1;`, until: 'race.raceTick > 120 * 13', after: 0, seconds: 11 },
  { name: 'hairpin', query: 'venue=airfield&event=tt&golden', until: 'race.raceTick > 1200 && c.hint >= 1190', after: 90, seconds: 9 },
  { name: 'slide', query: 'venue=proving&event=tt&day', over: 'const k = race.world.track.curv[c.hint]; if (c.mode !== 0 && Math.abs(k) > 0.02 && c.speed > 18) { i.slide = 1; i.steer = 0.7 * Math.sign(k); i.throttle = 1; i.brake = 0; }', until: 'seen("gas_gain:slide") > 0 && Math.abs(race.world.track.curv[c.hint]) < 0.004', after: 60, seconds: 8 },
  { name: 'landing', query: 'venue=pad&event=hl&day', chase: true, until: 'seen("land:perfect") > 0', after: 200, seconds: 7 },
  { name: 'near-miss', query: 'venue=pad&event=lineup&day', chase: true, until: 'seen("near_miss") > 0 && c.mode === 1', after: 200, seconds: 7 },
  { name: 'wreck', query: 'venue=pad&event=hl&day', chase: true, over: 'if (c.mode === 0 && c.air > 20) { i.roll = 1; i.pitch = 0; }', until: 'seen("wreck") > 0', after: 200, seconds: 7 },
].filter((s) => !ONLY || ONLY.includes(s.name));

const hook = (over) => `
const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
const clipLog = new Map();
window.__clip = {
  get race() { return race; },
  get mode() { return mode; },
  seen: (k) => clipLog.get(k) ?? -1,
  log(e) { const k = e.type === 'land' ? 'land:' + e.quality : e.type === 'gas_gain' ? 'gas_gain:' + e.source : e.type; clipLog.set(e.type, race.raceTick); clipLog.set(k, race.raceTick); },
  over(race, i) { const c = race.car; ${over || ''} },
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
    const body = (await res.text())
      .replace("  if (race.phase !== 'finished') {\n    packInput", "  if (mode === 'race') window.__clip?.over(race, simIn);\n  if (race.phase !== 'finished') {\n    packInput")
      .replace('function handleEvents() {\n  for (const e of race.events) {\n', 'function handleEvents() {\n  for (const e of race.events) {\n    window.__clip?.log(e);\n')
      .replace('!(clipping && !broadcast.onLine(c.hint))', s.chase ? 'false' : '!(clipping && !broadcast.onLine(c.hint))') + hook(s.over);
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(offline(`http://localhost:${port}/index.html?${s.query}&autostart&autopilot`));
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__clip?.race.phase === 'racing', null, { timeout: 180000, polling: 100 });
  const reached = await page.waitForFunction(`(() => { const { race, seen } = window.__clip, c = race.car; return ${s.until}; })()`, null, { timeout: 240000, polling: 'raf' }).then(() => true, () => false);
  if (!reached) { console.log(s.name, 'never reached', s.until); await page.close(); continue; }
  const t = await page.evaluate(() => window.__clip.race.raceTick);
  if (s.after) await page.waitForFunction((t) => window.__clip.race.raceTick >= t || window.__clip.mode !== 'race', t + s.after, { timeout: 60000, polling: 'raf' });
  const data = await page.evaluate((n) => window.__clip.exportNow(n), s.seconds);
  writeFileSync(join(out, `${s.name}.mp4`), Buffer.from(data, 'base64'));
  console.log(s.name, 'tick', t, 'end', await page.evaluate(() => window.__clip.race.raceTick));
  await page.close();
}
await browser.close();
