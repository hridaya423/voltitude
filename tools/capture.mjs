import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/capture';
const port = process.env.PORT || 8790;
const venues = (process.env.VENUES || 'proving,airfield,launch').split(',');
const sessions = (process.env.SESSIONS || 'day,night').split(',');
const moments = (process.env.MOMENTS || '1,9,18,30,45').split(',').map(Number);
const event = process.env.EVENT || 'gp';
const extra = process.env.QUERY || '';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const venue of venues) for (const session of sessions) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('pageerror', venue, session, e.message));
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + '\nwindow.__cap = { get race() { return race; } };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(offline(`http://localhost:${port}/index.html?venue=${venue}&event=${event}&autostart&autopilot&${session}${extra}`));
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__cap?.race.phase === 'racing', null, { timeout: 120000, polling: 50 });
  for (const at of moments) {
    const ok = await page.waitForFunction((at) => window.__cap.race.raceTick / 120 >= at || window.__cap.race.phase === 'finished', at, { timeout: 120000, polling: 50 }).then(() => true, () => false);
    if (!ok) break;
    await page.screenshot({ path: join(out, `${venue}-${session}-${String(at).padStart(2, '0')}s.png`) });
  }
  await page.close();
}
await browser.close();
