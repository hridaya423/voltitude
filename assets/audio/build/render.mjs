import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const pw = await import(pathToFileURL(path.resolve(import.meta.dirname, '../../../tools/node_modules/playwright-core/index.mjs')).href);
const PORT = process.env.PORT || 8765;
const scenario = process.argv[2] || 'mix';
const out = process.argv[3] || `work/render_${scenario}.wav`;
const volume = Number(process.env.VOL || 1);
const browser = await pw.chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const logs = [];
page.on('requestfailed', (r) => console.log('REQFAIL', r.url())); page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); }); page.on('pageerror', (e) => logs.push('PAGEERR ' + e.message));
page.on('console', (m) => { console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.route(`http://localhost:${PORT}/__t.html`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>t</title>' }));
await page.goto(`http://localhost:${PORT}/__t.html`);
const res = await page.evaluate(async ({ scenario, volume }) => {
  const SR = 48000, FPS = 20;
  const mk = (o) => Object.assign({ speed: 0, throttle: 0, brake: 0, boosting: false, energy: 0.5, clearance: 20, contact: false, impact: 0, wy: 0, bank: 0, rollOff: 0, roll: 0, mode: 1, slip: 0, kerb: false, wp: 0, wr: 0, yawRate: 0, steer: 0, gas: 0.5, uy: 1 }, o);
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  const timeline = [];
  const events = [];
  let dur = 10;
  if (scenario === 'mix') {
    dur = 64;
    [0.5, 1.5, 2.5].forEach((t) => events.push([t, 'count']));
    events.push([3.5, 'go']);
    for (const t of [11, 14, 17.5, 21, 24.5, 28]) events.push([t, 'check']);
    events.push([12.2, 'boost'], [30, 'check'], [33, 'check'], [36, 'miss'], [38.5, 'check'], [41, 'slot'], [43.2, 'clip'], [43.3, 'impact'], [46, 'check'], [49, 'check'], [52, 'check'], [55.5, 'lap'], [60.5, 'finish']);
    timeline.push((t) => {
      const wob = Math.sin(t * 1.3);
      if (t < 3.5) return mk({ speed: 0, throttle: 0, clearance: 0.1, contact: true });
      if (t < 9) { const s = lerp(0, 48, (t - 3.5) / 5.5); return mk({ speed: s, throttle: 1, clearance: 0.1, contact: true }); }
      if (t < 22) { const s = lerp(48, 88, (t - 9) / 13) + (t > 12 && t < 16 ? 12 : 0); return mk({ speed: s, throttle: 0.85, boosting: t > 12 && t < 16, clearance: lerp(2, 140, (t - 9) / 6), wy: wob * 0.3 }); }
      if (t < 32) return mk({ speed: lerp(88, 102, (t - 22) / 10), throttle: 0.7, clearance: 4 + wob * 0.8, wy: wob * 0.7, bank: wob * 0.3 });
      if (t < 46) return mk({ speed: lerp(95, 108, (t - 32) / 14), throttle: 0.75, clearance: 8 + Math.sin(t * 2) * 1.5, wy: Math.sin(t * 1.9) * 0.9, bank: Math.sin(t * 1.9) * 0.4, impact: Math.abs(t - 43.3) < 0.05 ? 14 : 0 });
      if (t < 56) return mk({ speed: lerp(108, 124, (t - 46) / 10), throttle: 0.9, boosting: t > 48 && t < 52, clearance: 2.5 + Math.sin(t) * 1.2, wy: wob * 0.2 });
      return mk({ speed: lerp(120, 40, (t - 56) / 8), throttle: 0, brake: 0.4, clearance: 15 });
    });
  } else if (scenario === 'sweep') {
    const speeds = [0, 10, 20, 30, 45, 60, 75, 90, 105, 120, 130];
    dur = speeds.length * 4;
    timeline.push((t) => mk({ speed: speeds[Math.min(speeds.length - 1, Math.floor(t / 4))], throttle: 0.7, clearance: 60 }));
  } else if (scenario === 'ramp') {
    dur = 30;
    timeline.push((t) => mk({ speed: lerp(0, 130, t / 28), throttle: 0.8, clearance: 80 }));
  } else if (scenario === 'events') {
    const names = ['count', 'go', 'check', 'check', 'check', 'check', 'lap', 'miss', 'boost', 'slot', 'clip', 'impact', 'finish', 'ui', 'respawn'];
    names.forEach((n, i) => events.push([1 + i * 4, n]));
    dur = 1 + names.length * 4 + 3;
    timeline.push((t) => mk({ speed: 0, clearance: 50, impact: 0 }));
  } else if (scenario === 'stress') {
    dur = 20;
    for (let i = 0; i < 6; i++) events.push([4 + i * 2.5, ['impact', 'clip', 'finish', 'lap', 'slot', 'impact'][i]], [4.05 + i * 2.5, 'check'], [4.1 + i * 2.5, 'boost'], [4.15 + i * 2.5, 'miss']);
    timeline.push((t) => mk({ speed: 130, throttle: 1, boosting: true, clearance: 2 + (t % 6), contact: t > 8 && t < 14, impact: 20, wy: 1.5, bank: 0.8 }));
  } else if (scenario === 'real') {
    dur = 66;
    const segs = [
      [0, 6, { speed: 25, throttle: 1, contact: true, clearance: 0 }],
      [6, 14, { speed: 65, throttle: 0.8, contact: true, clearance: 0 }],
      [14, 20, { speed: 60, throttle: 0.5, contact: true, clearance: 0, slip: 7 }],
      [20, 26, { speed: 55, throttle: 0.6, contact: true, clearance: 0, kerb: true }],
      [26, 32, { speed: 70, throttle: 0, mode: 0, clearance: 10 }],
      [32, 38, { speed: 90, throttle: 1, boosting: true, contact: true, clearance: 0 }],
      [38, 66, { speed: 80, throttle: 0.7, contact: true, clearance: 0 }],
    ];
    timeline.push((t) => {
      const s = segs.find((x) => t >= x[0] && t < x[1]) || segs[segs.length - 1];
      const o = { ...s[2] };
      if (t > 6 && t < 14) o.speed = lerp(65, 65, 1);
      if (t < 6) o.speed = lerp(0, 55, t / 6);
      if (o.mode === 0) { o.wp = Math.sin(t * 7) * 1.4; o.wr = Math.sin(t * 4.3) * 1.1; }
      return mk(o);
    });
    events.push([44, 'overtake', 0], [47, 'contact', 14], [50, 'lap', 2], [52, 'near_miss'], [55, 'overtaken'], [57, 'final_lap'], [59, 'overtake', 1], [61, 'fn:cheer', 'stunt'], [63, 'finish', 1]);
  } else if (scenario === 'layers') {
    dur = 48;
    const segs = [
      [0, 6, { speed: 70, throttle: 0.0, clearance: 60 }],
      [6, 12, { speed: 70, throttle: 1, clearance: 60 }],
      [12, 18, { speed: 70, throttle: 1, boosting: true, clearance: 60 }],
      [18, 24, { speed: 100, throttle: 0.7, clearance: 3 }],
      [24, 30, { speed: 100, throttle: 0.7, clearance: 8 }],
      [30, 36, { speed: 30, throttle: 0.5, clearance: 0.1, contact: true }],
      [36, 42, { speed: 60, throttle: 0.5, clearance: 0.1, contact: true, bank: 0.7 }],
      [42, 48, { speed: 125, throttle: 1, clearance: 80 }],
    ];
    timeline.push((t) => { const s = segs.find((x) => t >= x[0] && t < x[1]) || segs[segs.length - 1]; return mk(s[2]); });
  }
  window.AudioContext = function () { window.__ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR); return window.__ctx; };
  const bsT = []; const cbs = OfflineAudioContext.prototype.createBufferSource; OfflineAudioContext.prototype.createBufferSource = function () { bsT.push(this.currentTime); return cbs.call(this); }; window.__bsT = bsT;
  const { createAudio } = await import('/src/audio.js');
  const audio = createAudio({ volume, music: 0 });
    await audio.start();
    audio.stands([{ x: -30, y: 0, z: 100 }, { x: 40, y: 0, z: 400 }, { x: -20, y: 0, z: 900 }]);
    const ctx = window.__ctx;
  events.sort((a, b) => a[0] - b[0]);
  let ei = 0;
  const total = Math.floor(dur * FPS);
  const f = timeline[0];
  const t0 = performance.now();
  let maxUpd = 0, sumUpd = 0;
  await new Promise((resolve) => {
    const step = (i) => {
      if (i >= total - 2) { resolve(); return; }
      const t = (i + 1) / FPS;
      ctx.suspend(t).then(() => {
        try {
        audio.listen({ matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, scenario === 'real' ? t * 14 : 0, 1] } });
        while (ei < events.length && events[ei][0] <= t) { const ev = events[ei]; if (ev[1].startsWith('fn:')) audio[ev[1].slice(3)](ev[2]); else audio.event(ev[1], ev[2]); ei++; }
        const c = f(t);
        const a = performance.now();
        audio.update(c, true);
        const d = performance.now() - a; sumUpd += d; if (d > maxUpd) maxUpd = d;
        step(i + 1);
        ctx.resume();
        } catch (e) { console.log('STEPERR', t, e.stack); step(i + 1); ctx.resume(); }
      });
    };
    step(0);
    ctx.startRendering().then((buf) => { window.__buf = buf; });
  });
  while (!window.__buf) await new Promise((r) => setTimeout(r, 50));
  const buf = window.__buf;
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const pcm = new Int16Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))); pcm[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))); }
  let bin = ''; const u8 = new Uint8Array(pcm.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  const late = bsT.filter((x) => x > 0.5); return { late: late.length, lateByTen: [0,10,20,30,40,50,60].map((a) => late.filter((x) => x >= a && x < a + 10).length), b64: btoa(bin), sr: buf.sampleRate, n: L.length, avgUpd: sumUpd / total, maxUpd, wall: performance.now() - t0 };
}, { scenario, volume });
const pcm = Buffer.from(res.b64, 'base64');
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(res.sr, 24); h.writeUInt32LE(res.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(out, Buffer.concat([h, pcm]));
console.log('bufferSources after t=0.5 (all sources incl. events), per 10s window:', JSON.stringify(res.lateByTen)); console.log(JSON.stringify({ out, sr: res.sr, secs: res.n / res.sr, avgUpdateMs: +res.avgUpd.toFixed(3), maxUpdateMs: +res.maxUpd.toFixed(2), wallMs: Math.round(res.wall) }));
console.log(logs.filter((l) => !l.startsWith('log')).slice(0, 10).join('\n'));
await browser.close();
