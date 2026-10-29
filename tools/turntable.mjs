import { chromium } from 'playwright-core';
const out = process.argv[2];
const src = process.argv[3] || '../assets/models/car/roadster.glb';
const port = process.env.PORT || 8811;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => console.log('console', m.text()));
await p.goto(`http://localhost:${port}/tools/car-view.html?src=${src}`);
await p.waitForFunction(() => window.CAR && window.SHOT, null, { timeout: 60000 });
for (const v of ['front', 'front34', 'side', 'rear34', 'rear', 'top', 'low', 'lowrear']) { await p.evaluate((v) => SHOT(v), v); await p.screenshot({ path: `${out}/tt-${v}.png` }); }
await b.close();
