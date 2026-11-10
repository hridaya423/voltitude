import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorld } from './load-world.mjs';

const out = process.argv[2] || '/tmp/runoff';
const port = process.env.PORT || 8790;
const session = process.env.SESSION || 'day';
const CORNERS = (process.env.ONLY ? [['launch', 2132, 'gravel']] : [['proving', 228, 'T1'], ['proving', 2658, 'final-hairpin'], ['launch', 2132, 'gravel']]);
mkdirSync(out, { recursive: true });

function apexOf(track, from) {
  let apex = from;
  for (let d = 0; d < 140; d++) { const i = (from + d) % track.lap; if (Math.abs(track.curv[i]) > Math.abs(track.curv[apex])) apex = i; }
  return apex;
}

function highCam(track, apex) {
  const k = apex * 3, side = track.curv[apex] > 0 ? -1 : 1, wall = (side < 0 ? track.wallL : track.wallR)[apex];
  const look = [0, 1, 2].map((a) => track.H[k + a] + track.R[k + a] * side * wall * 0.5);
  const j = ((apex - 70 + track.lap) % track.lap) * 3;
  const p = [0, 1, 2].map((a) => track.H[j + a] + track.R[j + a] * side * (wall + 30));
  p[1] += 38;
  return [...p, ...look, 42].map((v) => +v.toFixed(2)).join(',');
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function open(venue, extra = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + '\nwindow.__shot = { get race() { return race; } };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(offline(`http://localhost:${port}/index.html?venue=${venue}&event=tt&autostart&autopilot&${session}${extra}`));
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__shot?.race.phase === 'racing', null, { timeout: 120000, polling: 50 });
  return { page, errors };
}

for (const [venue, from, name] of CORNERS) {
  const { track } = loadWorld(venue);
  const apex = apexOf(track, from);
  const high = await open(venue, `&cam=${highCam(track, apex)}`);
  await high.page.waitForTimeout(1500);
  await high.page.screenshot({ path: join(out, `${name}-high.png`) });
  await high.page.close();
  const chase = await open(venue);
  await chase.page.evaluate(async ([i]) => {
    const { placeCar } = await import('/src/sim/drive.js');
    const { lineFor } = await import('/src/sim/driver.js');
    const race = window.__shot.race, L = lineFor(race.world.track);
    placeCar(race.car, race.world.track, i, L.v[i], L.off[i]);
    race.lastIdx = i; race.lastHint = i; race.prog = i;
  }, [(from - 160 + track.lap) % track.lap]);
  for (let k = 0; k < 4; k++) {
    await chase.page.waitForFunction(([target]) => {
      const N = window.__shot.race.world.track.lap, d = (window.__shot.race.car.hint - target + N) % N;
      return d < 400;
    }, [(from - 60 + 50 * k + track.lap) % track.lap], { timeout: 20000, polling: 16 });
    await chase.page.screenshot({ path: join(out, `${name}-chase-${k}.png`) });
  }
  console.log(name, 'apex', apex, 'errors', chase.errors.length + high.errors.length, [...chase.errors, ...high.errors].slice(0, 2));
  await chase.page.close();
}
await browser.close();
