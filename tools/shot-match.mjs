import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/shot-match';
const port = process.env.PORT || 8790;
const sessions = (process.env.SESSIONS || 'day,night').split(',');
const MOMENTS = [['start', 0.35, 0.065], ['pack', 11, 0.065], ['straight', 24, 0.05]];
const GATE = {
  day: { hue: 1.5, L50: 38, L98: 92, carMin: 0.24, carMax: 0.32 },
  night: { hue: 1.5, L50: 22, L98: 90, carMin: 0.24, carMax: 0.32 },
};
mkdirSync(out, { recursive: true });

async function metrics(file) {
  const { data, info } = await sharp(file).resize(1280, 720).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, L = new Float32Array(n), hues = new Array(12).fill(0);
  let coloured = 0, blue = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    L[i] = Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
    if (s > 40 / 255 && mx > 40 / 255) {
      let h = mx === mn ? 0 : mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
      h = ((h * 60) + 360) % 360;
      hues[Math.min(11, Math.floor(h / 30))]++;
      coloured++;
      if (h >= 197 && h < 268) blue++;
    }
  }
  const sorted = Float32Array.from(L).sort();
  const pct = (p) => sorted[Math.floor(p * (n - 1))];
  let edges = 0;
  for (let y = 0; y < info.height - 1; y++) for (let x = 0; x < info.width - 1; x++) {
    const i = y * info.width + x;
    if (Math.hypot(L[i + 1] - L[i], L[i + info.width] - L[i]) > 8) edges++;
  }
  const hue = hues.reduce((e, c) => (c ? e - (c / coloured) * Math.log2(c / coloured) : e), 0);
  return { hue: +hue.toFixed(2), blue: +(blue / Math.max(1, coloured)).toFixed(2), edge: +(edges / n).toFixed(3), L50: +pct(0.5).toFixed(1), L98: +pct(0.98).toFixed(1) };
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const rows = [];
for (const session of sessions) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { let s = 1; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const src = await res.text(), seeded = src.replace("lastSeed = ev.kind === 'gp' ? 1 + Math.floor(Math.random() * 1e6) : 1", 'lastSeed = 1');
    if (seeded === src) throw new Error('shot-match: grid seed hook not found in main.js');
    const body = seeded + '\nwindow.__shot = { get race() { return race; }, carView, camera, THREE };';
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(`http://localhost:${port}/index.html?venue=proving&event=gp&autostart&autopilot&${session}`);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__shot?.race.phase === 'racing', null, { timeout: 120000, polling: 50 });
  if (process.env.NOHUD) await page.addStyleTag({ content: '#hud { display: none !important; }' });
  for (const [name, at, edge] of MOMENTS) {
    await page.waitForFunction((t) => window.__shot.race.raceTick >= t * 120, at, { timeout: 120000, polling: 16 });
    const file = join(out, `${session}-${name}.png`);
    await page.screenshot({ path: file });
    const car = await page.evaluate(() => {
      const { carView, camera, THREE, race } = window.__shot;
      const box = new THREE.Box3(), v = new THREE.Vector3(), inv = new THREE.Matrix4();
      carView.root.updateMatrixWorld(true);
      inv.copy(carView.root.matrixWorld).invert();
      let top = -1, bottom = 1;
      carView.root.traverseVisible((o) => {
        if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
        o.geometry.computeBoundingBox();
        box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).project(camera); top = Math.max(top, v.y); bottom = Math.min(bottom, v.y); }
      });
      let lo = 1, hi = -1;
      for (let k = 0; k < 8; k++) { v.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).applyMatrix4(carView.root.matrixWorld).project(camera); lo = Math.min(lo, v.x); hi = Math.max(hi, v.x); }
      return { width: +((Math.min(1, hi) - Math.max(-1, lo)) / 2).toFixed(3), inFrame: bottom > -1 && top < 1, mph: Math.round(race.car.speed * 2.237) };
    });
    const m = await metrics(file);
    const g = GATE[session];
    const fails = [m.hue < g.hue && 'hue', m.edge < edge && 'edge', m.L50 < g.L50 && 'L50', m.L98 < g.L98 && 'L98', (car.width < g.carMin || car.width > g.carMax) && 'car', !car.inFrame && 'cropped'].filter(Boolean);
    rows.push({ session, moment: name, mph: car.mph, car: car.width, ...m, pass: fails.length === 0, fails: fails.join(' ') });
  }
  await page.close();
}
await browser.close();
console.table(rows);
const pass = rows.every((r) => r.pass);
console.log(`${pass ? 'PASS' : 'FAIL'} ${out}`);
process.exit(pass ? 0 : 1);
