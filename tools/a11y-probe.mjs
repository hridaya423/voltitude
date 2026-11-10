import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/a11y-probe';
const port = process.env.PORT || 8790;
const MIN_PX = 14, MIN_RATIO = 4.5;
const RUNS = process.env.RUNS ? process.env.RUNS.split(',').map((r) => r.split(':')) : [['proving', 'gp', 'day'], ['proving', 'tt', 'day'], ['launch', 'gp', 'night'], ['pad', 'lineup', 'day']];
mkdirSync(out, { recursive: true });

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const over = (top, a, under) => top.map((c, k) => c * a + under[k] * (1 - a));

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rows = [];
let fading = 0;
for (const [venue, event, session] of RUNS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + '\nwindow.__g = { get race() { return race; }, hud };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(offline(`http://localhost:${port}/index.html?venue=${venue}&event=${event}&autostart&autopilot&${session}`));
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__g?.race.phase === 'racing', null, { timeout: 120000, polling: 100 });
  await page.waitForFunction(() => (document.querySelector('#sectors .now') || window.__g.race.dare) && window.__g.race.raceTick > 120 * 14, null, { timeout: 200000, polling: 250 });
  await page.evaluate(() => {
    const { hud } = window.__g;
    if (window.__g.race.dare) { hud.toast('+6 CLEARED ×2', 'good', 'LINE 4 NEXT'); hud.toast('CLIPPED', 'red', 'SCORE 6'); }
    else { hud.toast('TRACK LIMITS', 'orange', '+0.6 S PENALTY'); hud.toast('PERFECT LANDING', 'good'); }
    hud.gasGain('near_miss', 0.12);
    hud.hint('Hold <kbd>Space</kbd> to hover');
  });
  await page.waitForTimeout(400);
  const tag = `${venue}-${event}-${session}`;
  const shot = join(out, `${tag}.png`), bare = join(out, `${tag}-bare.png`);
  await page.screenshot({ path: shot });
  const { list: els, fading: f } = await page.evaluate(() => {
    const parse = (c) => { const v = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return { rgb: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 }; };
    const list = [];
    let fading = 0;
    for (const el of document.querySelectorAll('#hud *, #replayBug, #loading *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || r.bottom < 0 || r.top > innerHeight) continue;
      let alpha = 1, layers = [];
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const s = getComputedStyle(e);
        alpha *= Number(s.opacity);
        const bg = parse(s.backgroundColor);
        if (bg.a > 0) layers.push(bg);
      }
      if (alpha < 0.95) { fading++; continue; }
      const fg = parse(cs.color);
      list.push({ sel: (el.id ? '#' + el.id : `${el.parentElement?.className || ''} ${el.className || el.tagName}`).trim().slice(0, 34), text: el.textContent.trim().slice(0, 22), px: parseFloat(cs.fontSize), fg: fg.rgb, fa: fg.a * alpha, layers, box: [r.left, r.top, r.width, r.height].map(Math.round) });
    }
    document.getElementById('hud').style.visibility = 'hidden';
    return { list, fading };
  });
  fading += f;
  await page.screenshot({ path: bare });
  const { data, info } = await sharp(bare).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const e of els) {
    const [x0, y0, w, h] = e.box, ratios = [];
    for (let y = Math.max(0, y0); y < Math.min(info.height, y0 + h); y += 2) for (let x = Math.max(0, x0); x < Math.min(info.width, x0 + w); x += 2) {
      const i = (y * info.width + x) * 3;
      let bg = [data[i], data[i + 1], data[i + 2]];
      for (const l of e.layers.slice().reverse()) bg = over(l.rgb, l.a, bg);
      const fg = over(e.fg, e.fa, bg);
      const a = lum(fg), b = lum(bg);
      ratios.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
    }
    ratios.sort((a, b) => a - b);
    const ratio = ratios.length ? ratios[Math.floor(ratios.length * 0.1)] : 21;
    const fails = [e.px < MIN_PX && 'size', ratio < MIN_RATIO && 'contrast'].filter(Boolean);
    rows.push({ run: tag, sel: e.sel, text: e.text, px: e.px, ratio: +ratio.toFixed(2), pass: !fails.length, fails: fails.join(' ') });
  }
  await page.close();
}
await browser.close();
const bad = rows.filter((r) => !r.pass);
console.table(bad.length ? bad : rows);
console.log(`${bad.length ? 'FAIL' : 'PASS'} ${rows.length} text elements, ${bad.length} failing, ${fading} skipped mid-fade (size < ${MIN_PX} px or contrast < ${MIN_RATIO}:1 at the 10th percentile of the pixels behind)`);
process.exit(bad.length ? 1 : 0);
