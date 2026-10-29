import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorld } from './load-world.mjs';

const out = process.argv[2] || '/tmp/gates';
const port = process.env.PORT || 8790;
const sessions = (process.env.SESSIONS || 'day,night').split(',');
const venue = process.env.VENUE || 'proving';
const { track } = loadWorld(venue);
mkdirSync(out, { recursive: true });

function cam(gate, dist, up, side = 0) {
  const k = gate.i * 3, centre = (j) => Math.hypot(track.H[j] - track.H[k], track.H[j + 2] - track.H[k + 2]);
  let back = 1;
  while (centre(((gate.i - back + track.lap) % track.lap) * 3) < dist) back++;
  const j = ((gate.i - back + track.lap) % track.lap) * 3;
  const c = [0, 1, 2].map((a) => track.H[k + a] + track.U[k + a] * gate.h);
  const p = [0, 1, 2].map((a) => track.H[j + a] + track.U[j + a] * up + track.R[j + a] * side);
  return [...p, ...c, dist > 200 ? 30 : 55].map((v) => +v.toFixed(2)).join(',');
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function open(session, extra = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + '\nwindow.__shot = { get race() { return race; }, camera, gates };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(`http://localhost:${port}/index.html?venue=${venue}&event=gp&autostart&autopilot&${session}${extra}`);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__shot?.race.phase === 'racing', null, { timeout: 120000, polling: 50 });
  return page;
}

for (const session of sessions) {
  if (process.env.STILL !== '0') for (const [g, gate] of track.gates.entries()) {
    for (const [name, back, up, side] of [['300m', 300, 3, 0], ['120m', 120, 2.5, 0], ['30m', 30, 2.2, 3]]) {
      const page = await open(session, `&cam=${cam(gate, back, up, side)}`);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, `${session}-gate${g}-${name}.png`) });
      await page.close();
    }
  }
  const still = await open(session, `&cam=${cam(track.gates[0], 30, 2.2, 3)}`);
  await still.waitForTimeout(1200);
  await still.evaluate(() => window.__shot.gates.pass(0));
  for (const ms of [100, 450]) { await still.waitForTimeout(ms === 100 ? 100 : 350); await still.screenshot({ path: join(out, `${session}-pulse-${ms}ms.png`) }); }
  await still.close();
  if (process.env.FLY === '0') continue;
  const page = await open(session);
  let shots = 0;
  const N = track.lap;
  while (shots < 6) {
    const s = await page.evaluate(() => ({ hint: window.__shot.race.car.hint, mode: window.__shot.race.car.mode, t: window.__shot.race.raceTick, gate: window.__shot.race.earned.gate ?? 0 }));
    if (s.t > 120 * 300) break;
    const near = track.gates.findIndex((gt) => { const d = (gt.i - s.hint + N) % N; return d < 70 && d > 2; });
    if (near >= 0 && s.mode === 0) {
      await page.screenshot({ path: join(out, `${session}-fly${near}-${shots}.png`) });
      shots++;
      await page.waitForTimeout(120);
    } else await page.waitForTimeout(30);
  }
  console.log(session, 'fly shots', shots, 'gate gas', await page.evaluate(() => window.__shot.race.earned.gate ?? 0));
  await page.close();
}
await browser.close();
