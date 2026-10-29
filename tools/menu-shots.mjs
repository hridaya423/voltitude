import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/menu-shots';
const port = process.env.PORT || 8790;
const PAGES = (process.env.PAGES || 'board,venue,settings,keys').split(',');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const session of (process.env.SESSIONS || 'day,night').split(',')) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + '\nwindow.__g = { menu, sun, carView };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(`http://localhost:${port}/index.html?${session}`);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__g, null, { timeout: 120000, polling: 100 });
  await page.waitForTimeout(3000);
  for (const p of PAGES) {
    await page.evaluate((p) => window.__g.menu.open(p), p);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: join(out, `${session}-${p}.png`) });
  }
  await page.close();
}
await browser.close();
