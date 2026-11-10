import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor } from '../src/sim/race.js';
import { steerTo, placeCar } from '../src/sim/drive.js';
import { lineFor } from '../src/sim/driver.js';
import { racingLine } from '../src/sim/line.js';
import { limitWindows, MIN_GAIN } from '../src/sim/limits.js';

const world = loadWorld('proving'), { track } = world, N = track.lap;
const { wins, at } = limitWindows(track);
const legal = lineFor(track);
const wide = racingLine(Object.assign({}, track, { halfW: track.halfW.map((x) => x + 4) }));
const event = (id) => eventsFor(track).find((e) => e.id === id);

function follow(c, inp, line, shift = 0) {
  const h = c.hint, ahead = (h + Math.round(c.speed * 0.25)) % N;
  const slope = (line.off[(h + 3) % N] - line.off[(h + N - 3) % N]) / 6;
  inp.steer = steerTo(c, track, line.off[h] + shift, slope, line.kappa[h]);
  const vt = line.v[ahead] * 0.97;
  inp.throttle = Math.max(0, Math.min(1, (vt - c.speed) / 2.5));
  inp.brake = c.speed > vt + 0.6 ? Math.min(1, (c.speed - vt) / 4) : 0;
  if (inp.brake) inp.throttle = 0;
}

function run(id, pick, laps = 1.25) {
  const ev = typeof id === 'string' ? event(id) : id;
  const race = createRace(world, { event: ev }), inp = createInput(), seen = new Map();
  race.entries = [race]; race.order = [race];
  const start = race.prog;
  while (race.prog < start + N * laps && race.phase !== 'finished' && race.tick < 120 * 300) {
    if (race.phase === 'racing') pick(race.car, inp); else { inp.throttle = 0; inp.brake = 1; }
    stepRace(race, inp);
    const p = Math.floor(race.prog);
    if (!seen.has(p)) seen.set(p, race.raceTick);
  }
  const unwrap = (i) => (i > start + 20 ? i : i + N);
  const time = (w) => seen.get(unwrap(w.b) < unwrap(w.a) ? unwrap(w.b) + N : unwrap(w.b)) - seen.get(unwrap(w.a));
  return { race, time };
}

const cutter = (c, inp) => follow(c, inp, at[c.hint] >= 0 ? wide : legal);
const wider = (c, inp) => {
  const k = at[c.hint], w = wins[k];
  const late = k >= 0 && (c.hint - w.a + N) % N > w.len * 0.55;
  follow(c, inp, legal, late ? Math.sign(legal.off[c.hint] || 1) * 5 : 0);
};

test('track limits: cutting a corner costs the time it gained, within 0.1 s', () => {
  const ref = run('pr', (c, inp) => follow(c, inp, legal));
  assert.equal(ref.race.breaches.length, 0, 'the legal line never leaves the white lines');
  let cut = 0;
  wins.forEach((w, k) => {
    const one = run('pr', (c, inp) => follow(c, inp, at[c.hint] === k ? wide : legal));
    const hit = one.race.breaches.find((b) => b.window === k);
    if (!hit) return;
    cut++;
    const truth = (ref.time(w) - one.time(w)) / 120;
    assert.ok(truth > 0.15, `window ${k} gains ${truth.toFixed(2)} s`);
    assert.ok(Math.abs(hit.gain - truth) <= 0.1, `window ${k}: penalty ${hit.gain.toFixed(2)} s against a gain of ${truth.toFixed(2)} s`);
  });
  assert.ok(cut >= 3, `${cut} corners cut`);
});

test('track limits: a race and a time trial both add the time gained to the finish', () => {
  const sprint = { ...event('gp'), laps: 1, cps: [...track.cps, track.lap] };
  const gp = run(sprint, cutter, 2).race;
  const penalties = gp.events.filter((e) => e.type === 'track_limits');
  assert.ok(penalties.length >= 3, `${penalties.length} penalties`);
  const owed = penalties.reduce((s, e) => s + e.gain, 0);
  assert.ok(owed > 1);
  assert.equal(gp.phase, 'finished');
  assert.equal(gp.total, gp.laps[0] + Math.round(owed * 120));
  assert.deepEqual(gp.invalid, []);
  const tt = run('tt', cutter).race;
  assert.ok(tt.invalid.includes(0), 'time trial lap 1 cannot be the best lap');
  assert.ok(tt.penalty > 1, `time trial penalty ${tt.penalty.toFixed(2)} s`);
});

test('track limits: running wide and losing time costs nothing', () => {
  const { race } = run('pr', wider);
  assert.ok(race.breaches.length >= 2, `${race.breaches.length} wide exits past the white line`);
  for (const { window, gain } of race.breaches) assert.ok(gain < MIN_GAIN, `window ${window}: ${gain.toFixed(2)} s counted as a gain`);
  assert.equal(race.invalid.length, 0);
});

function flight(k, { wideFirst, landOff }) {
  const w = wins[k], race = createRace(world, { event: event('pr') }), inp = createInput();
  race.entries = [race]; race.order = [race];
  const start = race.prog, jumpAt = (w.a + Math.round(w.len * (landOff ? 0.2 : 0.4))) % N, skip = landOff ? 20 : 50, up = landOff ? 0.5 : 3;
  let lifted = false, flown = false;
  while (race.prog < start + N * 1.25 && race.tick < 120 * 300) {
    const c = race.car, into = (c.hint - w.a + N) % N;
    if (race.phase !== 'racing') { inp.throttle = 0; inp.brake = 1; }
    else if (landOff && flown && at[c.hint] === k) follow(c, inp, wide);
    else follow(c, inp, legal, wideFirst && at[c.hint] === k && into < 40 ? Math.sign(legal.off[c.hint] || 1) * 6 : 0);
    if (race.phase === 'racing' && !lifted && race.prog > start + N * 0.2 && c.hint === jumpAt) {
      lifted = true;
      c.x += c.ux * 3; c.y += c.uy * 3; c.z += c.uz * 3;
    }
    if (lifted && !flown && c.mode === 0) {
      flown = true;
      const to = (c.hint + skip) % N, q = to * 3, air = c.air;
      placeCar(c, track, to, c.speed, landOff ? Math.sign(wide.off[to] || 1) * (track.halfW[to] - 0.6) : legal.off[to]);
      c.x += track.U[q] * up; c.y += track.U[q + 1] * up; c.z += track.U[q + 2] * up;
      c.mode = 0; c.air = air;
    }
    stepRace(race, inp);
  }
  assert.ok(flown, `window ${k}: the car never reached the take-off sample`);
  return race.breaches.filter((b) => b.window === k);
}

test('track limits: time gained in the air is never charged, a ground breach before take-off still counts', () => {
  let checked = 0;
  wins.forEach((w, k) => {
    if (w.len < 160) return;
    const hits = flight(k, { wideFirst: true });
    if (!hits.length) return;
    checked++;
    for (const { gain } of hits) assert.ok(gain < MIN_GAIN, `window ${k}: ${gain.toFixed(2)} s charged for a flight that landed inside the white lines`);
  });
  assert.ok(checked >= 2, `${checked} windows with a ground breach before the flight`);
});

test('track limits: landing past the white line and cutting on the ground still counts', () => {
  let caught = 0;
  wins.forEach((w, k) => {
    if (w.len < 160) return;
    if (flight(k, { landOff: true }).some((b) => b.gain >= MIN_GAIN)) caught++;
  });
  assert.ok(caught >= 2, `${caught} windows penalised after an off-track landing`);
});

test('track limits: no window spans the finish line, so a last-corner cut lands on its own lap', () => {
  for (const id of ['proving', 'airfield', 'launch', 'pad']) {
    const t = loadWorld(id).track, f = t.finish % t.lap;
    for (const w of limitWindows(t).wins) {
      const into = (f - w.a + t.lap) % t.lap;
      assert.ok(into === 0 || into >= w.len, `${id}: window ${w.a}..${w.b} crosses the finish at ${f}`);
    }
  }
});
