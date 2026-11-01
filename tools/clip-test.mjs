import { chromium } from 'playwright-core';
import { writeFileSync, statSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/clip-test';
const port = process.env.PORT || 8790;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

const HOOK = `
const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
window.__clip = {
  get race() { return race; },
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
    return { codec: enc.codec, data: await b64(blob) };
  },
  async exportNow(seconds) {
    lastRun = encodeRun(race, recorder.bytes());
    lastRun.total = race.raceTick;
    const t0 = performance.now();
    const { blob, codec, renderMs, encodeMs } = await exportClip({ seconds, portrait: true });
    return { codec, ms: Math.round(performance.now() - t0), renderMs, encodeMs, data: await b64(blob) };
  },
};`;

async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.route('**/src/main.js', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + HOOK;
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await page.goto(`http://localhost:${port}/index.html?${query}`);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__clip, null, { timeout: 180000, polling: 100 });
  return page;
}

function inspect(file, want) {
  const info = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,nb_frames:format=duration', '-of', 'json', file]).toString();
  const j = JSON.parse(info), s = j.streams[0], duration = Number(j.format.duration), mb = statSync(file).size / 1048576;
  return { codec: s.codec_name, size: `${s.width}x${s.height}`, frames: Number(s.nb_frames), duration, mb: +mb.toFixed(2), ok: Math.abs(duration - want) <= 0.05 };
}

const results = [];
{
  const page = await open('day');
  console.log('probe', JSON.stringify(await page.evaluate(() => window.__clip.probe().then((p) => p && { codec: p.codec, mux: p.mux }))));
  const { data } = await page.evaluate(() => window.__clip.encodeTest(90));
  const file = join(out, 'title.mp4');
  writeFileSync(file, Buffer.from(data, 'base64'));
  const r = inspect(file, 1.5);
  results.push({ name: 'title 90 frames', ...r, ok: r.ok && r.mb < 3 });
  await page.close();
}
{
  const page = await open('venue=pad&event=lineup&autostart&autopilot&day');
  await page.waitForFunction(() => window.__clip.race.dare?.cleared >= 3 && window.__clip.race.car.mode === 1, null, { timeout: 180000, polling: 50 });
  const { data, ms, renderMs, encodeMs } = await page.evaluate(() => window.__clip.exportNow(6));
  console.log('lineup export', JSON.stringify({ ms, renderMs, encodeMs }));
  const file = join(out, 'lineup.mp4');
  writeFileSync(file, Buffer.from(data, 'base64'));
  const r = inspect(file, 6);
  for (const t of [1, 2.5, 3.6, 3.9, 4.2, 4.5, 4.8, 5.9]) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-1', join(out, `lineup-${t}s.jpg`)]);
  results.push({ name: 'lineup 6 s portrait', exportMs: ms, ...r });
  await page.close();
}
await browser.close();
console.table(results);
const ok = results.every((r) => r.ok);
console.log(ok ? 'PASS' : 'FAIL');
process.exitCode = ok ? 0 : 1;
