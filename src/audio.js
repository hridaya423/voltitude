const BASE = new URL('../assets/audio/', import.meta.url);
const SEMI = [0, 2, 4, 7, 9, 12];
let ZONES = [['motor_z1', 185], ['motor_z2', 400], ['motor_z3', 829.6]];
const MOTORS = [{ pan: 0, k: 1, rear: 0 }, { pan: -0.3, k: 1.006, rear: 1 }, { pan: 0.3, k: 0.994, rear: 1 }];
const LOOPS = ['motor_z1', 'motor_z2', 'motor_z3', 'motor_hum', 'thrust_hiss', 'boost_roar', 'boost_low', 'wind_body', 'wind_rush', 'wind_gust', 'ground', 'tire', 'scrape', 'kerb', 'scrub', 'scrub_burn', 'crowd_bed', 'crowd_bed2'];
const BURSTS = ['burst_a', 'burst_b', 'burst_c', 'burst_d'];
const COMMENT_CHANCE = { contact: 0.4, near_miss: 0.5, overtake: 0.7, kerb: 0.15 };
const MUSIC_TRIM = 0.78;
const STINGS = { go: ['start', 1], check: ['bank', 0.6], perfect: ['rampEnd', 1], clip: ['bail', 1], finish: ['rampEnd', 1.2] };
const MDUCK = { count: [0.2, 0.3], go: [0.3, 0.7], check: [0.25, 0.45], boost: [0.2, 0.4], slot: [0.3, 0.7], clip: [0.5, 0.8], impact: [0.35, 0.5], finish: [0.4, 1.2], respawn: [0.3, 0.6] };
const CHEER = { stunt: [['cheer_a', 'cheer_b'], 0.7, 0.35], pb: [['pb'], 0.8, 0.8], gasp: [['gasp_a', 'gasp_b'], 0.7, 0], applause: [['applause'], 0.65, 0.5] };
const STAND_REF = 28;
const RADIO_GAP = 0.2, RADIO_HOLD = 2.5, RADIO_BACKLOG = 6;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function softClip(ceiling) {
  const n = 2049, curve = new Float32Array(n), knee = 0.7, room = ceiling - knee;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < knee ? a : knee + room * Math.tanh((a - knee) / room));
  }
  return curve;
}

export function createAudio(settings) {
  let ctx = null, master = null, loading = null, ready = false, wantRun = false;
  let loopBus, sfxBus, radioBus, duck, rvLoop, rvSfx, rvConv, musicIn, musicDuck, musicVol;
  let music = null, musicState = null, musicPaused = false, intensitySent = 0, intensityT = 0, musicLoad = null;
  let sprite = null, cues = null, irBuf = null, muted = false;
  let radioBuf = null, radioCues = null, radioLines = null, bcast = null, bcastCues = null, realBuf = null, realCues = null, com = null;
  let crowdBus = null, standPts = [], emitters = [], listenPos = { x: 0, y: 0, z: 0 }, kerbAmt = 0, wasKerb = false, scrubAmt = 0, burnAmt = 0, attAmt = 0, nextPulse = 0, lastAng = [0, 0, 0], lastKerbAt = -9;
  let radioFree = 0, radioAt = -99, crowdTarget = 0, crowdAmt = 0, crowdKick = 0;
  const lastVariant = {};
  let now = 0, lastT = 0, canyon = 0, impactHold = 0, boostAmt = 0, wasBoost = false, boostSince = 0;
  let contactAmt = 0, scrapeAmt = 0, scrapeKick = 0, fanAmt = 0, passTimer = 0.6, passIdx = 0, streak = 0, lastCheck = -99;
  const bufs = {}, V = {}, pass = [], zw = [0, 0, 0];

  function sp(p, v, k = 0.08) {
    const d = v - p._v, e = 0.0015 + 0.004 * v;
    if (d > e || -d > e) { p._v = v; p.setTargetAtTime(v, now, k); }
  }

  function decode(ab) {
    return new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
  }

  async function fetchBuffer(file) {
    const r = await fetch(new URL(file, BASE));
    if (!r.ok) throw new Error(file);
    return decode(await r.arrayBuffer());
  }

  async function load() {
    let man = null;
    try { man = await (await fetch(new URL('manifest.json', BASE))).json(); } catch { man = null; }
    if (!man) return;
    if (man.loops) ZONES = ZONES.map(([n, f]) => [n, (man.loops[n] && man.loops[n].f0) || f]);
    const jobs = LOOPS.filter((n) => man.loops && man.loops[n]).map((n) => fetchBuffer(man.loops[n].file).then((b) => { bufs[n] = { b, ls: man.loops[n].loop[0], le: man.loops[n].loop[1] }; }).catch(() => {}));
    if (man.sprite) jobs.push(fetchBuffer(man.sprite.file).then((b) => { sprite = b; cues = man.sprite.cues; }).catch(() => {}));
    if (man.radio) jobs.push(fetchBuffer(man.radio.file).then((b) => { radioBuf = b; radioCues = man.radio.cues; radioLines = man.radio.lines; }).catch(() => {}));
    if (man.broadcast) jobs.push(fetchBuffer(man.broadcast.file).then((b) => { bcast = b; bcastCues = man.broadcast.cues; }).catch(() => {}));
    if (man.real) jobs.push(fetchBuffer(man.real.file).then((b) => { realBuf = b; realCues = man.real.cues; }).catch(() => {}));
    if (man.commentary) jobs.push(fetchBuffer(man.commentary.file).then((b) => { com = { buf: b, cues: man.commentary.cues, lines: man.commentary.lines }; }).catch(() => {}));
    if (man.ir) jobs.push(fetchBuffer(man.ir.file).then((b) => { irBuf = b; }).catch(() => {}));
    await Promise.all(jobs);
  }

  function silent() {
    return { b: ctx.createBuffer(1, 2, ctx.sampleRate), ls: 0, le: 0 };
  }

  function layer(name, o = {}) {
    const asset = bufs[name] || silent();
    const g = ctx.createGain();
    g.gain.value = 0;
    let head = g, f = null;
    if (o.filter) {
      f = ctx.createBiquadFilter();
      f.type = o.filter; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 0.7;
      f.connect(g);
      head = f;
    }
    g.connect(o.out || loopBus);
    const pans = o.pans || [0], rates = [];
    for (let i = 0; i < pans.length; i++) {
      const s = ctx.createBufferSource();
      s.buffer = asset.b; s.loop = true;
      if (asset.le > asset.ls) { s.loopStart = asset.ls; s.loopEnd = asset.le; }
      let tail = s;
      if (pans[i] !== 0 && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pans[i];
        s.connect(p); tail = p;
      }
      tail.connect(head);
      s.start(0, asset.le > asset.ls ? asset.ls + Math.random() * (asset.le - asset.ls) : 0);
      s.playbackRate._v = s.playbackRate.value;
      rates.push(s.playbackRate);
    }
    g.gain._v = 0;
    if (f) f.frequency._v = f.frequency.value;
    return { g: g.gain, f: f ? f.frequency : null, r: rates };
  }

  function build() {
    const AC = ctx;
    loopBus = AC.createGain();
    sfxBus = AC.createGain();
    radioBus = AC.createGain();
    duck = AC.createGain();
    const bus = AC.createGain();
    crowdBus = AC.createGain();
    crowdBus.connect(loopBus);
    loopBus.connect(duck).connect(bus);
    sfxBus.connect(bus);
    radioBus.connect(bus);
    musicIn = AC.createGain();
    musicDuck = AC.createGain();
    musicVol = AC.createGain();
    musicVol.gain.value = musicGain();
    musicIn.connect(musicDuck).connect(musicVol).connect(bus);
    rvConv = AC.createConvolver();
    const rvIn = AC.createGain();
    const rvTone = AC.createBiquadFilter();
    rvTone.type = 'lowpass'; rvTone.frequency.value = 3600;
    const rvOut = AC.createGain();
    rvLoop = AC.createGain(); rvLoop.gain.value = 0;
    rvSfx = AC.createGain(); rvSfx.gain.value = 0.2;
    duck.connect(rvLoop).connect(rvIn);
    sfxBus.connect(rvSfx).connect(rvIn);
    rvIn.connect(rvTone).connect(rvConv).connect(rvOut).connect(bus);
    if (irBuf) rvConv.buffer = irBuf;
    rvLoop.gain._v = 0;
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 2.4; comp.attack.value = 0.012; comp.release.value = 0.3;
    const trim = AC.createGain();
    trim.gain.value = 0.6;
    const limiter = AC.createDynamicsCompressor();
    limiter.threshold.value = -5; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.12;
    const shaper = AC.createWaveShaper();
    shaper.curve = softClip(0.8); shaper.oversample = '4x';
    bus.connect(comp).connect(trim).connect(master);
    master.connect(limiter).connect(shaper).connect(AC.destination);
  }

  function musicGain() {
    return settings.music * settings.music * MUSIC_TRIM;
  }

  function duckMusic(depth, secs, at = now) {
    const g = musicDuck.gain;
    g.cancelScheduledValues(at);
    g.setTargetAtTime(1 - depth, at, 0.03);
    g.setTargetAtTime(1, at + secs, 0.4);
  }

  async function loadMusic() {
    let M = null, K = null;
    try { [M, K] = await Promise.all([import('@rl/js/music/index.js'), import('@rl/js/music/kit.js')]); } catch { return; }
    const opts = { state: musicState || 'menu', volume: 0.8, stingerDest: musicVol };
    const steps = (function* () {
      yield* K.kitSteps(ctx);
      const m = yield* M.createMusicSteps(ctx, musicIn, opts);
      yield* m.prepare();
      return m;
    })();
    await new Promise((res) => {
      const pump = () => {
        const r = steps.next();
        if (r.done) { music = r.value; res(); } else (window.requestIdleCallback || setTimeout)(pump, { timeout: 120 });
      };
      pump();
    });
    music.start();
    if (musicPaused) music.pause();
  }

  async function init() {
    await load();
    build();
    V.m = MOTORS.map((m) => ZONES.map(([n]) => layer(n, { pans: [m.pan] })));
    V.hum = layer('motor_hum', { filter: 'lowpass', freq: 600 });
    V.hiss = layer('thrust_hiss', { filter: 'lowpass', freq: 4000 });
    V.roar = layer('boost_roar', { filter: 'lowpass', freq: 3000 });
    V.low = layer('boost_low');
    V.body = layer('wind_body', { filter: 'lowpass', freq: 1200, pans: [-0.55, 0.55] });
    V.rush = layer('wind_rush', { filter: 'highpass', freq: 200, pans: [-0.6, 0.6] });
    V.gust = layer('wind_gust', { filter: 'lowpass', freq: 5000, pans: [-0.8, 0.8] });
    V.ground = layer('ground');
    V.skim = layer('wind_rush', { filter: 'bandpass', freq: 500, q: 0.8 });
    V.tire = layer('tire', { filter: 'lowpass', freq: 2000 });
    V.scrape = layer('scrape', { filter: 'bandpass', freq: 1800, q: 0.6 });
    V.scrub = layer('scrub', { filter: 'bandpass', freq: 1400, q: 0.5 });
    V.burn = layer('scrub_burn', { filter: 'highpass', freq: 500 });
    V.kerb = layer('kerb', { filter: 'lowpass', freq: 2200 });
    for (let i = 0; i < 3; i++) {
      const g = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) g.connect(p).connect(sfxBus); else g.connect(sfxBus);
      pass.push({ g, p });
    }
    V.fan = layer('motor_hum', { filter: 'bandpass', freq: 700, q: 1.1 });
    buildStands();
    master.gain.setTargetAtTime(muted ? 0 : settings.volume, ctx.currentTime, 0.15);
    ready = true;
    musicLoad = loadMusic().catch(() => {});
  }

  function quiet(fn) {
    try { const r = fn(); if (r && r.catch) r.catch(() => {}); } catch { return; }
  }

  function resume() {
    if (ctx && wantRun && ctx.state !== 'running') quiet(() => ctx.resume());
  }

  function start() {
    wantRun = true;
    if (ctx) { resume(); return loading; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      ctx = null;
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0;
    loading = init().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) quiet(() => ctx.suspend()); else resume();
    });
    resume();
    return loading;
  }

  function playFrom(buf, q, gain, rate, at, out) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = rate;
    g.gain.value = gain;
    s.connect(g).connect(out);
    s.start(at, q[0], q[1]);
  }

  function play(name, gain = 1, rate = 1, delay = 0, out = sfxBus, pan = 0) {
    const from = realCues && realCues[name] ? [realBuf, realCues[name]] : sprite && cues[name] ? [sprite, cues[name]] : null;
    if (!from) return;
    let dest = out;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      p.connect(out);
      dest = p;
    }
    playFrom(from[0], from[1], gain, rate, now + delay, dest);
  }

  function buildStands() {
    for (const e of emitters) { e.src.forEach((s) => s.stop()); e.out.disconnect(); }
    emitters = standPts.map((pt, i) => {
      const name = i % 2 ? 'crowd_bed2' : 'crowd_bed';
      const asset = bufs[name] || silent();
      const g = ctx.createGain();
      g.gain.value = 0;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1200;
      g.gain._v = 0; f.frequency._v = 1200;
      const pn = positional(pt);
      f.connect(g).connect(pn);
      pn.connect(crowdBus);
      const s = ctx.createBufferSource();
      s.buffer = asset.b; s.loop = true;
      if (asset.le > asset.ls) { s.loopStart = asset.ls; s.loopEnd = asset.le; }
      s.playbackRate.value = 0.94 + 0.12 * ((i * 0.37) % 1);
      s.connect(f);
      s.start(0, asset.le > asset.ls ? asset.ls + Math.random() * (asset.le - asset.ls) : 0);
      return { pt, g: g.gain, f: f.frequency, src: [s], out: pn };
    });
  }

  function positional(pt) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = STAND_REF; p.rolloffFactor = 1; p.maxDistance = 4000;
    if (p.positionX) { p.positionX.value = pt.x; p.positionY.value = pt.y; p.positionZ.value = pt.z; } else p.setPosition(pt.x, pt.y, pt.z);
    return p;
  }

  function nearestStand(from) {
    let best = null, bd = Infinity;
    for (const pt of standPts) {
      const d = (pt.x - from.x) ** 2 + (pt.z - from.z) ** 2;
      if (d < bd) { bd = d; best = pt; }
    }
    return best;
  }

  function updateStands(cl) {
    for (const e of emitters) {
      const d = Math.hypot(e.pt.x - listenPos.x, e.pt.y - listenPos.y, e.pt.z - listenPos.z);
      sp(e.g, 0.4 * Math.pow(cl, 1.3), 0.15);
      sp(e.f, Math.min(900 + 5200 * cl, 24000 / (1 + d / 60)), 0.2);
    }
  }

  function listen(cam) {
    if (!ctx) return;
    const e = cam.matrixWorld.elements;
    const pos = { x: e[12], y: e[13], z: e[14] };
    listenPos = pos;
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = -e[8]; l.forwardY.value = -e[9]; l.forwardZ.value = -e[10];
      l.upX.value = e[4]; l.upY.value = e[5]; l.upZ.value = e[6];
    }
  }

  function duckFor(amount, secs, at = now) {
    duck.gain.cancelScheduledValues(at);
    duck.gain.setTargetAtTime(amount, at, 0.04);
    duck.gain.setTargetAtTime(1, at + secs, 0.35);
  }

  function pick(id, names) {
    let n = names[(Math.random() * names.length) | 0];
    if (names.length > 1 && n === lastVariant[id]) n = names[(names.indexOf(n) + 1) % names.length];
    lastVariant[id] = n;
    return n;
  }

  function speak(set, id, gain, delay = 0) {
    if (!ready || !set || !set.buf || !set.lines[id]) return;
    now = ctx.currentTime;
    const keep = id.startsWith('finish');
    if (!keep && now - radioAt < RADIO_HOLD) return;
    const at = Math.max(now + delay, radioFree);
    if (!keep && at - now > RADIO_BACKLOG) return;
    const q = set.cues[pick(id, set.lines[id])], len = q[1] + RADIO_GAP;
    playFrom(set.buf, q, gain, 1, at, radioBus);
    radioAt = at;
    radioFree = at + len;
    duckFor(0.78, q[1] + 0.1, at);
    duckMusic(0.3, q[1] + 0.1, at);
  }

  function radio(id) {
    speak({ buf: radioBuf, cues: radioCues, lines: radioLines || {} }, id, 0.85);
  }

  function commentary(id, delay = 0) {
    if (COMMENT_CHANCE[id] && Math.random() > COMMENT_CHANCE[id]) return;
    speak(com, id, 0.8, delay);
  }

  function cheer(kind, at) {
    const c = CHEER[kind];
    if (!ready || !bcast || !c) return;
    now = ctx.currentTime;
    const stand = at || nearestStand(listenPos);
    let dest = sfxBus;
    if (stand) {
      dest = positional(stand);
      dest.connect(sfxBus);
    }
    playFrom(bcast, bcastCues[pick(kind, c[0])], c[1], 1, now, dest);
    crowdKick = Math.max(crowdKick, c[2]);
    if (kind === 'pb') duckMusic(0.25, 1.6);
  }

  function light(n) {
    if (!ready || !bcast) return;
    const q = bcastCues['light' + n];
    if (!q) return;
    now = ctx.currentTime;
    playFrom(bcast, q, 1, 1, now, sfxBus);
  }

  function lightsOut() {
    if (!ready || !bcast) return;
    now = ctx.currentTime;
    playFrom(bcast, bcastCues.lights_out, 1, 1, now, sfxBus);
    commentary('lights_out', 0.7);
  }

  function passBy(sn) {
    const v = pass[passIdx++ % pass.length];
    const name = 'whoosh' + (1 + ((Math.random() * 4) | 0));
    const side = Math.random() < 0.5 ? -1 : 1;
    if (v.p) v.p.pan.value = side * (0.55 + Math.random() * 0.4);
    v.g.gain.value = 0.18 + 0.42 * sn;
    if (!sprite || !cues[name]) return;
    const s = ctx.createBufferSource(), q = cues[name];
    s.buffer = sprite; s.playbackRate.value = 0.85 + 0.5 * sn + Math.random() * 0.2;
    s.connect(v.g);
    s.start(now, q[0], q[1]);
  }

  function update(c, active) {
    if (!ready) return;
    now = ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0, now - lastT));
    lastT = now;
    const on = active ? 1 : 0, s = c.speed, sn = clamp01(s / 130), thr = c.throttle, clr = c.clearance;
    impactHold = Math.max(c.impact, impactHold * Math.exp(-dt * 3));

    const cTarget = smooth(12, 6, clr) * smooth(40, 60, s);
    canyon += (cTarget - canyon) * (1 - Math.exp(-dt * 4));
    const near = smooth(5, 0.5, clr) * smooth(15, 50, s) * on;

    const F = 220 * Math.pow(2, 2 * Math.min(1, s / 85));
    let wsum = 0;
    for (let i = 0; i < 3; i++) {
      const u = Math.log(F / ZONES[i][1]) / 0.42;
      const w = Math.exp(-0.5 * u * u);
      zw[i] = w; wsum += w * w;
    }
    const norm = 1 / Math.sqrt(wsum + 1e-6);
    const load = on * smooth(1.5, 22, s) * (0.35 + 0.65 * Math.pow(thr, 0.7)) * (thr > 0.05 ? 1 : 0.708) * (1 - 0.35 * c.brake) * (0.75 + 0.25 * sn) * (1 + 0.2 * canyon);
    const rearGain = 0.5 + 0.2 * thr - 0.1 * c.brake, frontGain = 0.35 + 0.35 * c.brake + 0.15 * Math.min(1, Math.abs(c.steer || 0));
    for (let m = 0; m < MOTORS.length; m++) {
      for (let i = 0; i < 3; i++) {
        const z = V.m[m][i];
        sp(z.g, 0.9 * load * zw[i] * norm * (MOTORS[m].rear ? rearGain : frontGain), 0.07);
        sp(z.r[0], Math.min(1.9, Math.max(0.5, F * MOTORS[m].k / ZONES[i][1])), 0.06);
      }
    }
    sp(V.hum.g, on * 0.5 * smooth(0, 14, s) * (0.4 + 0.6 * thr), 0.1);
    sp(V.hum.r[0], 0.7 + 1.5 * sn, 0.1);
    sp(V.hum.f, 500 + 1800 * thr, 0.1);

    const boosting = c.boosting && active;
    if (boosting && !wasBoost) { play('ignite_gas', 1); play('burst_long', 0.5, 1, 0.05); boostSince = now; duckFor(0.8, 0.5); duckMusic(0.25, 0.8); }
    else if (!boosting && wasBoost && now - boostSince > 0.5) play('vent', 0.6);
    wasBoost = boosting;
    const bt = boosting ? 1 : 0;
    boostAmt += (bt - boostAmt) * (1 - Math.exp(-dt * (bt ? 9 : 2.6)));
    const ba = boostAmt;

    const ang = [c.wp || 0, c.yawRate || 0, c.wr || 0];
    const dAng = ang.map((v, i) => v - lastAng[i]);
    const accel = (Math.abs(dAng[0]) + Math.abs(dAng[1]) + Math.abs(dAng[2])) / Math.max(dt, 1e-3);
    lastAng = ang;
    const airborne = c.mode === 0 && active;
    attAmt += ((airborne ? smooth(0.4, 2.5, accel) : 0) - attAmt) * (1 - Math.exp(-dt * (airborne ? 18 : 6)));
    if (airborne && accel > 1.5 && now > nextPulse) {
      nextPulse = now + 0.1 + Math.random() * 0.09;
      play(pick('burst', BURSTS), 0.25 + 0.4 * smooth(1.5, 12, accel), 0.95 + Math.random() * 0.2, 0, sfxBus, Math.max(-0.8, Math.min(0.8, (dAng[2] + dAng[1]) * 8)));
    }
    sp(V.hiss.g, on * (0.3 * ba + 0.22 * attAmt) * (0.65 + 0.35 * sn), 0.06);
    sp(V.hiss.f, 2600 + 4000 * ba + 5000 * attAmt, 0.08);
    sp(V.hiss.r[0], 0.9 + 0.1 * ba + 0.12 * attAmt, 0.1);
    sp(V.roar.g, on * 0.75 * ba * (1 + 0.15 * canyon), 0.07);
    sp(V.roar.f, 1800 + 8000 * ba, 0.1);
    sp(V.roar.r[0], 0.88 + 0.22 * ba, 0.12);
    sp(V.low.g, on * (0.55 * ba + 0.14 * thr * (1 - ba)) * (1 + 0.15 * canyon), 0.09);

    const gustiness = Math.min(0.3, Math.abs(c.wy) * 0.14), wn = clamp01((s - 30) / 95);
    sp(V.body.g, on * 0.62 * wn, 0.1);
    sp(V.body.f, 700 + 3600 * sn, 0.1);
    for (let i = 0; i < 2; i++) sp(V.body.r[i], 0.82 + 0.4 * sn, 0.12);
    sp(V.rush.g, on * 0.62 * wn * wn, 0.1);
    sp(V.rush.f, 180 + 500 * sn, 0.1);
    for (let i = 0; i < 2; i++) sp(V.rush.r[i], 0.85 + 0.4 * sn, 0.12);
    sp(V.gust.g, on * (0.55 * smooth(0.4, 0.95, sn) + gustiness) * wn, 0.12);
    for (let i = 0; i < 2; i++) sp(V.gust.r[i], 0.9 + 0.3 * sn, 0.15);

    sp(V.ground.g, on * 0.7 * near, 0.1);
    sp(V.ground.r[0], 0.8 + 0.5 * sn, 0.12);
    sp(V.skim.g, on * 0.35 * near * near, 0.08);
    sp(V.skim.f, 300 + 900 * near, 0.08);
    sp(V.skim.r[0], 0.7 + 0.5 * sn, 0.12);

    const ground = c.contact ? 1 : 0;
    contactAmt += (ground - contactAmt) * (1 - Math.exp(-dt * (ground ? 14 : 5)));
    const spd = smooth(2, 40, s);
    const slip = Math.abs(c.slip || 0);
    const squeal = Math.max(smooth(2.5, 9, slip) * smooth(8, 35, s), 0.45 * smooth(0.85, 1, c.brake) * smooth(15, 40, s)) * ground;
    scrubAmt += (squeal - scrubAmt) * (1 - Math.exp(-dt * (squeal > scrubAmt ? 12 : 5)));
    const burn = ground * smooth(0.5, 1, thr) * smooth(30, 6, s);
    burnAmt += (burn - burnAmt) * (1 - Math.exp(-dt * (burn > burnAmt ? 10 : 4)));
    sp(V.tire.g, on * (0.5 + 0.3 * scrubAmt) * contactAmt * spd, 0.06);
    sp(V.tire.f, 900 + 2600 * sn + 1500 * scrubAmt, 0.1);
    sp(V.tire.r[0], 0.7 + 0.8 * sn, 0.1);
    sp(V.scrub.g, on * 0.5 * scrubAmt, 0.05);
    sp(V.scrub.r[0], 0.8 + 0.4 * scrubAmt + 0.2 * sn, 0.08);
    sp(V.scrub.f, 1000 + 1500 * scrubAmt, 0.1);
    sp(V.burn.g, on * 0.4 * burnAmt, 0.06);
    sp(V.burn.r[0], 0.9 + 0.2 * sn, 0.1);
    const onKerb = c.kerb && ground ? 1 : 0;
    kerbAmt += (onKerb - kerbAmt) * (1 - Math.exp(-dt * (onKerb ? 25 : 10)));
    sp(V.kerb.g, on * 0.55 * kerbAmt * smooth(4, 35, s), 0.04);
    sp(V.kerb.r[0], 0.55 + 1.1 * sn, 0.1);
    if (onKerb && !wasKerb && s > 12 && now - lastKerbAt > 0.25) {
      lastKerbAt = now;
      play('kerb_' + 'abcd'[(Math.random() * 4) | 0], 0.5 + 0.4 * sn, 0.9 + Math.random() * 0.2);
    }
    wasKerb = !!onKerb;
    scrapeKick *= Math.exp(-dt * 8);
    const sc = scrapeKick * smooth(5, 25, s);
    scrapeAmt += (sc - scrapeAmt) * (1 - Math.exp(-dt * (sc > scrapeAmt ? 18 : 6)));
    sp(V.scrape.g, on * 0.45 * scrapeAmt, 0.05);
    sp(V.scrape.r[0], 0.8 + 0.5 * sn, 0.1);

    const stuck = c.mode === 1 && c.uy < 0.5 ? 1 : 0;
    fanAmt = stuck ? Math.min(1, fanAmt + dt / 0.15) : Math.max(0, fanAmt - dt / 0.5);
    sp(V.fan.g, on * 0.4 * fanAmt, 0.02);
    sp(V.fan.r[0], 1 + 0.8 * fanAmt, 0.04);
    sp(V.fan.f, 500 + 900 * fanAmt, 0.04);

    crowdKick *= Math.exp(-dt * 0.7);
    crowdAmt += (crowdTarget - crowdAmt) * (1 - Math.exp(-dt * 1.2));
    const base = 0.45 * crowdAmt, cl = clamp01(base + crowdKick * (1 - base));
    updateStands(cl);

    const mWant = active ? 'roam' : muted ? musicState || 'menu' : 'menu';
    if (music && mWant !== musicState) { musicState = mWant; music.setState(mWant); } else if (!music) musicState = mWant;
    intensityT -= dt;
    if (music && intensityT <= 0) {
      intensityT = 0.25;
      music.setIntensity(clamp01(0.08 + 0.45 * clamp01(s / 85) + (c.mode === 0 ? 0.2 : 0) + (boosting ? 0.15 : 0)));
    }

    sp(rvLoop.gain, 0.05 + 0.5 * canyon + 0.12 * near, 0.3);
    if (canyon > 0.35 && clr > 4.5 && on && s > 45) {
      passTimer -= dt;
      if (passTimer <= 0) {
        passBy(sn);
        passTimer = (0.9 - 0.55 * sn) * (0.6 + 0.9 * Math.random());
      }
    } else if (passTimer < 0.4) passTimer = 0.4;
  }

  function event(type, v = 0) {
    if (!ready) return;
    now = ctx.currentTime;
    if (music && STINGS[type]) music.stinger(STINGS[type][0], STINGS[type][1], STINGS[type][2]);
    if (MDUCK[type]) duckMusic(MDUCK[type][0], MDUCK[type][1]);
    if (type === 'scrape') scrapeKick = Math.max(scrapeKick, clamp01(v / 12));
    if (!sprite) return;
    switch (type) {
      case 'count': play('count', 0.8); break;
      case 'go': play('go', 0.95); play('whoosh4', 0.5, 1, 0.02); streak = 0; break;
      case 'check': {
        if (now - lastCheck > 7) streak = 0;
        lastCheck = now;
        const r = 0.78 * Math.pow(2, SEMI[Math.min(streak, SEMI.length - 1)] / 12);
        streak++;
        play('check_a', 1.1, r);
        play('check_b', 0.4, r * 1.0714, 0.012);
        break;
      }
      case 'lap': play('lap', 0.9); play('check_a', 0.5, 0.78 * 1.5, 0.12); play('check_a', 0.45, 0.78 * 2, 0.3); duckFor(0.55, 1.6); streak = 0; if (v === 2) commentary('lap2'); break;
      case 'miss': play('miss', 0.95); duckFor(0.7, 0.5); streak = 0; break;
      case 'boost': play('whoosh1', 0.6, 1.25); play('shimmer', 0.45, 1, 0.05); play('check_b', 0.3, 1.15, 0.18); break;
      case 'slot': play('slot', 0.85); play('shimmer', 0.4, 1.1, 0.08); play('check_a', 0.4, 0.78 * 2, 0.22); duckFor(0.65, 1.1); break;
      case 'clip': play('clip', 0.9); play('impact_a', 0.6, 0.92); duckFor(0.6, 0.35); streak = 0; break;
      case 'impact': {
        const k = Math.min(1, Math.max(0.15, (impactHold || 8) / 18));
        play(k < 0.55 ? 'impact_a' : 'impact_b', 0.55 + 0.45 * k, 0.95 + Math.random() * 0.1);
        if (k > 0.5) play('scrape_hit', 0.5 * k, 1, 0.04);
        duckFor(1 - 0.35 * k, 0.3);
        break;
      }
      case 'finish': play('finish', 0.95); play('check_a', 0.45, 0.78 * 2, 0.4); duckFor(0.4, 3.5); if (v) commentary(v === 1 ? 'finish_win' : v <= 3 ? 'finish_podium' : 'finish'); break;
      case 'overtake': play('whoosh2', 0.5, 1.15); commentary(v ? 'overtake_lead' : 'overtake'); break;
      case 'overtaken': commentary('overtaken'); break;
      case 'contact': {
        const k = clamp01(v / 20);
        play('contact_' + 'abc'[(Math.random() * 3) | 0], 0.45 + 0.5 * k, 0.95 + Math.random() * 0.1);
        duckFor(1 - 0.3 * k, 0.3);
        commentary('contact');
        break;
      }
      case 'near_miss': cheer('gasp'); commentary('near_miss'); break;
      case 'final_lap': commentary('final_lap'); break;
      case 'fastest': commentary('fastest_lap'); break;
      case 'ui': play('ui', 0.7); break;
      case 'respawn': play('respawn', 0.8); streak = 0; break;
      default: break;
    }
  }

  return {
    start,
    get running() { return !!ctx && ctx.state === 'running'; },
    setVolume(v) { if (master && !muted) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    setMusicVolume() { if (musicVol) musicVol.gain.setTargetAtTime(musicGain(), ctx.currentTime, 0.05); },
    mute(on) {
      muted = on;
      musicPaused = on;
      if (music) { if (on) music.pause(); else music.resume(); }
      if (master && ready) master.gain.setTargetAtTime(on ? 0 : settings.volume, ctx.currentTime, 0.05);
    },
    update,
    event,
    radio,
    commentary,
    stands(points) { standPts = points; if (ready) buildStands(); },
    listen,
    crowd(level) { crowdTarget = clamp01(level); },
    cheer,
    light,
    lightsOut,
  };
}
