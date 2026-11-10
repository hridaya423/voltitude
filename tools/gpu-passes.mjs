import { chromium } from 'playwright-core';
import { offline } from './offline.mjs';

const url = process.argv[2] || 'http://localhost:8790/?event=gp&autostart&autopilot&day';
const seconds = Number(process.argv[3] || 12);
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [vw, vh] = (process.env.VIEWPORT || '1440x900').split('x').map(Number);

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(process.env.DSF || 1) });
await page.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const gl = get.call(this, type, opts);
    if (gl && type === 'webgl2' && !gl.__gpu) {
      gl.__gpu = true;
      const bind = gl.bindFramebuffer.bind(gl), viewport = gl.viewport.bind(gl), finish = gl.finish.bind(gl);
      const px = new Float32Array(4), px8 = new Uint8Array(4);
      let vp = '', screen = false, open = false, t0 = 0, counts = {}, frameTotal = 0;
      window.__gpuPasses = {};
      window.__gpuCalls = {};
      let calls = 0, seq = [];
      window.__gpuSeq = [];
      let tris = 0;
      for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = gl[fn].bind(gl); gl[fn] = (...a) => { calls++; tris += (a[1] / 3) * (fn.endsWith('Instanced') ? a[a.length - 1] : 1); return o(...a); }; }
      window.__gpuFrames = [];
      const end = () => {
        if (!open) return;
        gl.getError();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, screen ? gl.UNSIGNED_BYTE : gl.FLOAT, screen ? px8 : px);
        if (gl.getError()) finish();
        const ms = performance.now() - t0;
        const label = `${vp}${screen ? '(screen)' : ''}`;
        const n = (counts[label] = (counts[label] || 0) + 1);
        (window.__gpuPasses[`${label}#${n}`] ||= []).push(ms);
        window.__gpuCalls[`${label}#${n}`] = calls;
        seq.push(`${label}#${n} ${ms.toFixed(2)}ms ${calls}draws ${Math.round(tris / 1000)}ktris`);
        calls = 0; tris = 0;
        frameTotal += ms;
        open = false;
      };
      gl.viewport = (x, y, w, h) => { vp = `${w}x${h}`; viewport(x, y, w, h); };
      gl.bindFramebuffer = (t, f) => {
        if (t !== gl.FRAMEBUFFER && t !== gl.DRAW_FRAMEBUFFER) return bind(t, f);
        end();
        bind(t, f);
        t0 = performance.now();
        screen = !f;
        open = true;
      };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((t) => {
        end();
        if (frameTotal) window.__gpuFrames.push(frameTotal);
        if (seq.length) { window.__gpuSeq.push(seq); if (window.__gpuSeq.length > 40) window.__gpuSeq.shift(); }
        seq = [];
        frameTotal = 0;
        counts = {};
        cb(t);
      });
    }
    return gl;
  };
});
await page.goto(offline(url));
await page.waitForFunction(() => window.__perf && document.getElementById('loading').classList.contains('done'), null, { timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate(() => { for (const k in window.__gpuPasses) window.__gpuPasses[k].length = 0; window.__gpuFrames.length = 0; });
await page.waitForTimeout(seconds * 1000);
const r = await page.evaluate(() => ({ passes: window.__gpuPasses, frames: window.__gpuFrames, calls: window.__gpuCalls, seq: window.__gpuSeq, canvas: [document.getElementById('view').width, document.getElementById('view').height], scale: window.__perf.scale.slice(-1)[0] }));
await browser.close();

const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const rows = Object.entries(r.passes).filter(([, v]) => v.length > 5).map(([k, v]) => ({ pass: k, n: v.length, mean: +mean(v).toFixed(2), p50: +med(v).toFixed(2), calls: r.calls[k] })).sort((a, b) => b.mean - a.mean);
console.log(JSON.stringify({ canvas: r.canvas, scale: r.scale, frameGpuMean: +mean(r.frames).toFixed(2), frameGpuP50: +med(r.frames).toFixed(2), frames: r.frames.length }));
for (const x of rows.slice(0, 24)) console.log(`${x.pass.padEnd(26)} mean ${String(x.mean).padStart(6)}  p50 ${String(x.p50).padStart(6)}  draws ${x.calls}`);

console.log('--- one frame, in order');
const calm = r.seq.filter((q) => !q.some((l) => l.startsWith('48x32')));
console.log(calm[calm.length - 2].join('\n'));
