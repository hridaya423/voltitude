import { chromium } from 'playwright-core';
import { writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.argv[2] || '/tmp/clip-test.mp4';
const port = process.env.PORT || 8790;
const frames = Number(process.env.FRAMES || 90);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.route('**/src/main.js', async (route) => {
  const res = await route.fetch();
  const hook = `
window.__clip = {
  probe: () => import('./clip/encode.js').then((m) => m.probe(1920, 1080, 60)),
  async encodeTest(n) {
    const { createClipEncoder } = await import('./clip/encode.js');
    const enc = await createClipEncoder({ width: 1920, height: 1080, fps: 60 });
    const flat = document.createElement('canvas'); flat.width = 1920; flat.height = 1080;
    const g = flat.getContext('2d');
    for (let i = 0; i < n; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      g.drawImage(renderer.domElement, 0, 0, 1920, 1080);
      await enc.addFrame(flat, Math.round(i * 1e6 / 60));
    }
    const blob = await enc.finish();
    return { codec: enc.codec, bytes: [...new Uint8Array(await blob.arrayBuffer())] };
  },
};`;
  const body = (await res.text()) + hook;
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
});
await page.goto(`http://localhost:${port}/index.html?day`);
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__clip, null, { timeout: 180000, polling: 100 });
console.log('probe', JSON.stringify(await page.evaluate(() => window.__clip.probe().then((p) => p && { codec: p.codec, mux: p.mux }))));
const t0 = Date.now();
const { codec, bytes } = await page.evaluate((n) => window.__clip.encodeTest(n), frames);
const ms = Date.now() - t0;
writeFileSync(out, Buffer.from(bytes));
const duration = await page.evaluate(async (b) => {
  const v = document.createElement('video');
  v.src = URL.createObjectURL(new Blob([new Uint8Array(b)], { type: 'video/mp4' }));
  await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = () => j(new Error('video failed to load')); });
  return v.duration;
}, bytes);
let stream = 'ffprobe not found';
try { stream = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,nb_frames', '-of', 'csv=p=0', out]).toString().trim(); } catch {}
await browser.close();
const mb = statSync(out).size / 1048576;
const want = frames / 60;
console.log(JSON.stringify({ codec, frames, encodeMs: ms, duration, mb: +mb.toFixed(2), ffprobe: stream, out }));
const ok = Math.abs(duration - want) <= 0.05 && mb < 3;
console.log(ok ? 'PASS' : `FAIL: duration ${duration} against ${want}, ${mb.toFixed(2)} MB`);
process.exitCode = ok ? 0 : 1;
