const BASE = new URL('../../assets/audio/', import.meta.url);
const RATE = 48000, SLICE = 0.1, MUSIC = 1.3, SFX = 1.4, WIND = 0.7, PEAK = 0.79;
const STING = { go: ['start', 1], clear: ['lineup', 1], clip: ['bail', 1], wreck: ['bail', 1], perfect: ['rampEnd', 1], finish: ['rampEnd', 1.2] };

async function decode(ctx, file) {
  return ctx.decodeAudioData(await (await fetch(new URL(file, BASE))).arrayBuffer());
}

function drain(steps) {
  for (;;) { const r = steps.next(); if (r.done) return r.value; }
}

export async function mixClip({ seconds, cues, speeds, fps }) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const man = await (await fetch(new URL('manifest.json', BASE))).json();
  const [sprite, real, wind, M, K] = await Promise.all([decode(ctx, man.sprite.file), decode(ctx, man.real.file), decode(ctx, man.loops.wind_rush.file), import('@rl/js/music/index.js'), import('@rl/js/music/kit.js')]);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  limiter.connect(ctx.destination);
  const bus = (gain) => { const g = ctx.createGain(); g.gain.value = gain; g.connect(limiter); return g; };
  const sfx = bus(SFX), musicOut = bus(MUSIC), windOut = bus(0);

  const play = (name, at, gain = 1, rate = 1) => {
    const [buf, q] = man.real.cues[name] ? [real, man.real.cues[name]] : [sprite, man.sprite.cues[name]];
    if (!q) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = rate; g.gain.value = gain;
    s.connect(g).connect(sfx);
    s.start(Math.max(0, at), q[0], q[1]);
  };
  for (const c of cues) {
    if (c.type === 'clear') { const r = 0.78 * Math.pow(2, [0, 4, 7][Math.min(3, c.mult) - 1] / 12); play('check_a', c.t, 1.1, r); play('check_b', c.t + 0.03, 0.5, r * 1.26); play('slot', c.t + 0.06, 0.6, 1 + 0.1 * c.mult); }
    else if (c.type === 'clip' || c.type === 'wreck') { play('clip', c.t, 0.9); play('impact_a', c.t, 0.6, 0.92); }
    else if (c.type === 'lip') { play('burst_long', c.t, 0.5, 0.9); play('whoosh4', c.t, 0.4, 1.1); }
    else if (c.type === 'land') play(c.quality === 'hard' ? 'impact_b' : 'impact_a', c.t, c.quality === 'hard' ? 0.8 : 0.35);
    else if (c.type === 'check') play('check_a', c.t, 1.1, 0.78);
    else if (c.type === 'go') play('go', c.t, 0.95);
    else if (c.type === 'finish') play('finish', c.t, 0.95);
  }

  const w = ctx.createBufferSource();
  w.buffer = wind; w.loop = true; [w.loopStart, w.loopEnd] = man.loops.wind_rush.loop;
  w.connect(windOut); w.start(0);
  speeds.forEach((v, i) => windOut.gain.linearRampToValueAtTime(WIND * Math.min(1, Math.max(0, (v - 12) / 60)), i / fps));

  const music = drain((function* () {
    yield* K.kitSteps(ctx);
    const m = yield* M.createMusicSteps(ctx, musicOut, { state: 'roam', volume: 0.8, manual: true, seed: 7, stingerDest: musicOut });
    yield* m.prepare();
    return m;
  })());
  music.start();
  const slots = new Map();
  for (let t = SLICE; t < seconds; t += SLICE) slots.set(Math.round(t * RATE / 128), []);
  for (const c of cues) {
    const kind = STING[c.type === 'land' && c.quality === 'perfect' ? 'perfect' : c.type];
    if (kind) { const k = Math.round(c.t * RATE / 128); if (!slots.has(k)) slots.set(k, []); slots.get(k).push(kind); }
  }
  let speedAt = 0;
  for (const [k, stings] of slots) {
    const t = k * 128 / RATE;
    if (t <= 0 || t >= seconds) continue;
    ctx.suspend(t).then(() => {
      while (speedAt + 1 < speeds.length && (speedAt + 1) / fps <= t) speedAt++;
      music.setIntensity(Math.min(1, 0.3 + 0.55 * Math.min(1, speeds[speedAt] / 85)));
      for (const [kind, s] of stings) music.stinger(kind, s);
      music.tick();
      ctx.resume();
    });
  }
  const out = await ctx.startRendering();
  music.dispose();
  let peak = 0;
  for (let ch = 0; ch < out.numberOfChannels; ch++) for (const x of out.getChannelData(ch)) peak = Math.max(peak, Math.abs(x));
  if (peak > PEAK) for (let ch = 0; ch < out.numberOfChannels; ch++) { const d = out.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= PEAK / peak; }
  return out;
}
