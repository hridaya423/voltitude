import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slide } from '../tools/slide-lab.mjs';
import { createInput, packInput, unpackInput, createRace, stepRace } from '../src/sim/race.js';
import { placeCar, TUNING } from '../src/sim/drive.js';
import { GAIN } from '../src/sim/gas.js';
import { stylePoints } from '../src/style.js';
import { flatWorld } from '../tools/physics-lab.mjs';

test('holding slide sets the car at an angle, turns it tighter and costs speed', () => {
  for (const v of [30, 45, 60]) {
    const grip = slide(v, false), s = slide(v, true);
    assert.ok(s.maxBetaDeg > 10 && s.maxBetaDeg < 25, `${v} m/s slides at ${s.maxBetaDeg} deg`);
    assert.ok(s.pathTurnDeg > 1.1 * grip.pathTurnDeg, `${v} m/s turns ${s.pathTurnDeg} against ${grip.pathTurnDeg} deg`);
    assert.ok(s.speedKept > 0.8 && s.speedKept < 0.97, `${v} m/s keeps ${s.speedKept}`);
    assert.ok(!s.spun && s.recoveredInS !== null && s.recoveredInS < 1.5, JSON.stringify(s));
  }
});

test('a left-right flick with slide held is caught without a spin', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, true, 1.2, 0.6);
    assert.ok(!s.spun && s.maxBetaDeg < 50 && s.recoveredInS !== null, JSON.stringify(s));
  }
});

test('without slide the car still holds the grip limit', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, false);
    assert.ok(s.maxBetaDeg < 9 && s.speedKept > 0.98, JSON.stringify(s));
  }
});

test('the slide input survives packing', () => {
  const a = createInput(), b = createInput(), buf = new Int8Array(6);
  Object.assign(a, { slide: 1, boost: 1, lift: 1, flip: 1 });
  packInput(a, buf, 0);
  unpackInput(buf, 0, b);
  assert.deepEqual([b.slide, b.boost, b.lift, b.flip, b.reset], [1, 1, 1, 1, 0]);
  a.slide = 0;
  packInput(a, buf, 0);
  assert.equal(unpackInput(buf, 0, b).slide, 0);
  assert.equal(b.flip, 1);
});

const flat = flatWorld();
function onFlat(v) {
  const race = createRace(flat, { event: { id: 'pr', kind: 'pr', laps: 1, from: 0, to: flat.track.n - 1, gas: 1, cps: [flat.track.n - 1] } }), inp = createInput();
  while (race.phase === 'countdown') stepRace(race, inp);
  placeCar(race.car, flat.track, 600, v, 0);
  return { race, inp };
}

function held(steer, slide, v = 45, secs = 3) {
  const { race, inp } = onFlat(v);
  Object.assign(inp, { throttle: 0.6, steer, slide });
  for (let t = 0; t < 120 * secs; t++) stepRace(race, inp);
  return race.earned.slide || 0;
}

test('a held slide in a corner pays gas, at most the wall rate', () => {
  assert.equal(GAIN.slide, GAIN.wall);
  const g = held(1, 1);
  assert.ok(g > GAIN.slide / 2 && g <= GAIN.slide * 3, `slide gas ${g}`);
});

test('slide pays nothing on a straight, at grip, or below 20 m/s', () => {
  assert.equal(held(0, 1), 0);
  assert.equal(held(1, 0), 0);
  assert.equal(held(1, 1, 15), 0);
});

test('slide time scores 25 a second', () => {
  assert.equal(stylePoints({ type: 'gas_gain', source: 'slide', amount: GAIN.slide * 2 }), 50);
});

test('weaving down a straight with slide held earns less boost time than it loses', () => {
  const run = (P, A) => {
    const { race, inp } = onFlat(45), z0 = race.car.z;
    let t = 0;
    inp.throttle = 1;
    for (; race.car.z - z0 < 1000; t++) {
      if (P) Object.assign(inp, { steer: (((t / 120 + P / 4) % P) / P < 0.5 ? 1 : -1) * A, slide: 1 });
      stepRace(race, inp);
    }
    return { s: t / 120, boost: (race.earned.slide || 0) * TUNING.burn };
  };
  const straight = run(0).s;
  for (const P of [1, 1.2, 1.4]) for (const A of [0.75, 1]) {
    const w = run(P, A);
    assert.ok(w.boost < w.s - straight, `period ${P} s at ${A} lock: ${w.boost.toFixed(2)} s of boost for ${(w.s - straight).toFixed(2)} s lost`);
  }
});
