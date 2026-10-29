import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { flatWorld, zeroToSixty, topSpeed, braking, skidpad, wallScrape } from '../tools/physics-lab.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { placeCar, createCar, stepCar, steerTo, TUNING, DT } from '../src/sim/drive.js';
import { lineFor } from '../src/sim/driver.js';

const lab = flatWorld();
const near = (value, target, label) => assert.ok(Math.abs(value / target - 1) <= 0.05, `${label}: ${value.toFixed(3)} vs ${target}`);

test('0 to 60 mph without thrusters takes about 2.0 s', () => near(zeroToSixty(lab, false).time, 2.0, '0-60'));
test('0 to 60 mph with thrusters takes about 1.1 s', () => near(zeroToSixty(lab, true).time, 1.1, '0-60 boost'));
test('top speed is about 250 mph', () => near(topSpeed(lab).mph, 250, 'top speed'));
test('60 to 0 mph braking takes about 30 m', () => near(braking(lab).dist, 30, 'braking'));
test('the skidpad holds about 1.3 g', () => near(skidpad(lab).g, 1.3, 'skidpad'));

test('thrusters never push harder than the car weighs', () => {
  const run = (boost) => {
    const c = createCar();
    placeCar(c, lab.track, 600, 30, 0);
    const inp = createInput();
    inp.boost = boost;
    for (let t = 0; t < 60; t++) stepCar(c, inp, lab, t, false);
    return c.vf;
  };
  const g = (run(1) - run(0)) / (0.5 * 9.81);
  assert.ok(TUNING.thrustG <= 1);
  assert.ok(g > 0.4 && g <= 1.001, `${g.toFixed(2)} g`);
});

test('thrusters burn about 4 s of gas per tank', () => {
  const c = createCar();
  placeCar(c, lab.track, 600, 0, 0);
  const inp = createInput();
  inp.boost = 1; inp.throttle = 1;
  let t = 0;
  while (c.gas > 1e-6 && t < 120 * 6) stepCar(c, inp, lab, t++, false);
  assert.ok(t / 120 > 3.6 && t / 120 < 4.4, `${t / 120} s`);
});

test('boost without throttle stops when the tank is empty', () => {
  const run = (throttle) => {
    const c = createCar();
    placeCar(c, lab.track, 600, 40, 0);
    const inp = createInput();
    inp.boost = 1; inp.throttle = throttle;
    let empty = -1;
    for (let t = 0; t < 120 * 18; t++) {
      const before = c.gas;
      stepCar(c, inp, lab, t, false);
      assert.ok(c.gas <= before, `gas rose at ${t / 120} s`);
      if (empty < 0 && c.gas <= 1e-4) empty = t;
      if (empty >= 0 && t >= empty + 120) assert.ok(c.thr < 0.05, `thr ${c.thr.toFixed(2)} at ${t / 120} s`);
    }
    assert.ok(empty >= 0, 'tank never emptied');
    return c.speed;
  };
  const coast = run(0), drive = run(1);
  assert.ok(coast < drive, `boost only ${coast.toFixed(1)} m/s vs boost and throttle ${drive.toFixed(1)} m/s`);
});

test('one crash gives one wreck', () => {
  const c = createCar();
  placeCar(c, lab.track, 600, 0, 0);
  c.y += 3;
  const cr = Math.cos(2.2), sr = Math.sin(2.2);
  const u = [c.ux * cr + c.rx * sr, c.uy * cr + c.ry * sr, c.uz * cr + c.rz * sr];
  const r = [c.rx * cr - c.ux * sr, c.ry * cr - c.uy * sr, c.rz * cr - c.uz * sr];
  [c.ux, c.uy, c.uz] = u; [c.rx, c.ry, c.rz] = r;
  const inp = createInput();
  let wrecks = 0;
  for (let t = 0; t < 240; t++) {
    stepCar(c, inp, lab, t, false);
    wrecks += c.ev.filter((e) => e.type === 'wreck').length;
    c.ev.length = 0;
  }
  assert.equal(wrecks, 1);
});

test('the loop is drivable from a crawl to full speed', () => {
  const world = loadWorld('proving');
  const ev = eventsFor(world.track).find((e) => e.id === 'pr');
  for (const entry of [20, 35, 60]) {
    const race = createRace(world, { event: ev, seed: 1 });
    const inp = createInput();
    race.phase = 'racing'; race.raceTick = 400;
    placeCar(race.car, world.track, 2440, entry, -3.5);
    let cleared = false;
    for (let t = 0; t < 120 * 12 && !cleared; t++) {
      botInput(race, inp, 1);
      stepRace(race, inp);
      race.events.length = 0;
      cleared = race.car.hint > 2660 && race.car.hint < 2700;
    }
    assert.ok(cleared, `entry ${entry} m/s did not clear the loop`);
  }
});

test('a scrape along the wall costs little and a hard hit stops the car', () => {
  const free = wallScrape(0), kept = (deg) => wallScrape(deg) / free;
  assert.ok(kept(1) > 0.94, `1 deg keeps ${(100 * kept(1)).toFixed(0)}%`);
  assert.ok(kept(2) > 0.85, `2 deg keeps ${(100 * kept(2)).toFixed(0)}%`);
  assert.ok(kept(10) < 0.3, `10 deg keeps ${(100 * kept(10)).toFixed(0)}%`);
});

test('a car facing the wrong way beside the wall steers away from it and turns around', () => {
  const world = flatWorld(3000, 10), { T, R } = world.track, k = 600 * 3;
  const c = createCar(), inp = createInput();
  placeCar(c, world.track, 600, 0, -6.5);
  c.fx = -T[k]; c.fz = -T[k + 2]; c.rx = -R[k]; c.rz = -R[k + 2];
  for (let t = 0; t < 120 * 6; t++) {
    inp.steer = steerTo(c, world.track, 0, 0, 0); inp.throttle = 0.6;
    stepCar(c, inp, world, t, false);
  }
  const h = c.hint * 3;
  assert.ok(c.fx * T[h] + c.fz * T[h + 2] > 0.7, `facing ${(c.fx * T[h] + c.fz * T[h + 2]).toFixed(2)} along the track`);
});

const proving = loadWorld('proving');

function intoCorner(world, from, v0, braked) {
  const { track } = world, L = lineFor(track), N = track.lap, i0 = (from - 60 + N) % N;
  const c = createCar(), inp = createInput();
  placeCar(c, track, i0, v0, L.off[i0]);
  const out = { wreck: false, tyres: 0, t: Infinity, kinds: new Set() };
  for (let t = 0; t < 120 * 30; t++) {
    const h = c.hint, ahead = (h + Math.round(c.speed * 0.25)) % N;
    inp.steer = steerTo(c, track, L.off[h], 0, track.curv[h]);
    inp.throttle = braked ? Math.max(0, Math.min(1, (L.v[ahead] - c.speed) / 2.5)) : 0;
    inp.brake = braked && c.speed > L.v[ahead] + 0.6 ? 1 : 0;
    stepCar(c, inp, world, t, true);
    for (const w of c.wl) if (w.hit) out.kinds.add(w.kind);
    for (const e of c.ev) { if (e.type === 'wreck') out.wreck = true; if (e.type === 'scrape') out.tyres = Math.max(out.tyres, e.v); }
    c.ev.length = 0;
    const d = (c.hint - i0 + N) % N;
    if (d > 60 + 250 && d < N / 2) { out.t = t / 120; break; }
  }
  return out;
}

test('a car that runs wide at 60 m/s into a corner with 13 m or more of run-off does not wreck, and loses time to braking', () => {
  const { track } = proving, { lap: N, curv, runoff } = track;
  const corners = [];
  for (let i = 0; i < N; i++) {
    const on = (j) => Math.abs(curv[j]) > 0.006 && !track.loopMask[j] && !track.air[j];
    if (on(i) && !on((i + N - 1) % N) && (curv[i] > 0 ? runoff.L : runoff.R)[(i + 20) % N] >= 12.5) corners.push(i);
  }
  assert.ok(corners.length >= 3, `${corners.length} corners`);
  for (const from of corners) {
    const wide = intoCorner(proving, from, 60, false), braked = intoCorner(proving, from, 60, true);
    assert.ok(wide.kinds.has('grass'), `corner ${from}: never reached the grass`);
    assert.equal(wide.wreck, false, `corner ${from}: wrecked, tyre hit ${wide.tyres.toFixed(1)} m/s`);
    assert.ok(wide.t > braked.t, `corner ${from}: wide ${wide.t.toFixed(2)} s, braked ${braked.t.toFixed(2)} s`);
  }
});

function runoffStrip(gravel) {
  const world = flatWorld(3000, 10), { track } = world;
  track.wallL = track.halfW.map((w) => w + 300);
  track.runoff = { ...track.runoff, gravelL: new Uint8Array(track.n).fill(gravel ? 1 : 0) };
  return world;
}

function coast(world, lat, v0) {
  const c = createCar(), inp = createInput();
  placeCar(c, world.track, 300, v0, lat);
  const x0 = c.x, z0 = c.z;
  for (let t = 0; t < 120 * 60 && c.speed > 0.5; t++) stepCar(c, inp, world, t, false);
  return { dist: Math.hypot(c.x - x0, c.z - z0), kind: c.wl[0].kind, speed: c.speed };
}

test('gravel stops a coasting 40 m/s car within 140 m, grass and paved run-off do not', () => {
  const gravel = coast(runoffStrip(true), -14, 40), grass = coast(runoffStrip(false), -14, 40), paved = coast(runoffStrip(false), -9.8, 40);
  assert.equal(gravel.kind, 'gravel');
  assert.equal(grass.kind, 'grass');
  assert.equal(paved.kind, 'paved');
  assert.ok(gravel.dist < 140, `gravel ${gravel.dist.toFixed(0)} m`);
  assert.ok(grass.dist > 300, `grass ${grass.dist.toFixed(0)} m`);
  assert.ok(paved.dist > grass.dist, `paved ${paved.dist.toFixed(0)} m`);
});

function lift(c, ticks, press, assist = false) {
  const inp = createInput(), ys = [];
  for (let t = 0; t < ticks; t++) {
    inp.lift = press(t) ? 1 : 0;
    stepCar(c, inp, lab, t, assist);
    ys.push(c.y);
  }
  return ys;
}

const rested = (gas = 1) => {
  const c = createCar();
  placeCar(c, lab.track, 600, 0, 0);
  lift(c, 120, () => false);
  c.gas = gas;
  return c;
};

test('a hop from rest peaks 4 to 5 m up and costs 0.11 gas', () => {
  const c = rested(), y0 = c.y;
  const peak = Math.max(...lift(c, 240, (t) => t < 3)) - y0;
  assert.ok(peak > 4 && peak < 5, `peak ${peak.toFixed(2)} m`);
  assert.ok(Math.abs(1 - c.gas - 0.11) < 0.005, `gas used ${(1 - c.gas).toFixed(3)}`);
});

test('hover after a hop holds altitude within 0.5 m for 2 s', () => {
  const c = rested(), y0 = c.y, ys = lift(c, 120 * 4, () => true, true);
  const apex = ys.findIndex((y, t) => t > 10 && (y - ys[t - 1]) / DT < 0.5);
  const hold = ys.slice(apex, apex + 240);
  assert.ok(ys[apex] - y0 > 4 && hold.length === 240, `apex ${(ys[apex] - y0).toFixed(2)} m at ${apex}`);
  const lo = Math.min(...hold) - ys[apex], hi = Math.max(...hold) - ys[apex];
  assert.ok(lo > -0.5 && hi < 0.5, `altitude ${lo.toFixed(2)} to ${hi.toFixed(2)} m`);
});

test('a full tank gives 2.3 to 2.7 s of hover', () => {
  const c = createCar();
  placeCar(c, lab.track, 600, 0, 0);
  c.y += 40;
  let ticks = 0;
  const inp = createInput();
  inp.lift = 1;
  for (let t = 0; t < 120 * 5; t++) { stepCar(c, inp, lab, t, true); if (c.lifting) ticks++; }
  assert.ok(ticks / 120 > 2.3 && ticks / 120 < 2.7, `${(ticks / 120).toFixed(2)} s`);
});

test('an empty tank gives no lift', () => {
  const c = rested(0), y0 = c.y;
  const peak = Math.max(...lift(c, 240, () => true)) - y0;
  assert.ok(peak < 0.05, `rose ${peak.toFixed(2)} m`);
  const f = createCar();
  placeCar(f, lab.track, 600, 0, 0);
  f.y += 40; f.gas = 0;
  const ys = lift(f, 120, () => true);
  assert.ok(f.y < ys[0] - 4.5, `fell ${(ys[0] - f.y).toFixed(2)} m in 1 s`);
});

test('a hop lands without a landing event, so hops earn no landing gas', () => {
  const c = rested();
  lift(c, 240, (t) => t < 3);
  assert.ok(c.mode !== 0, 'still airborne');
  assert.deepEqual(c.ev.filter((e) => e.type === 'land'), []);
});

function flight(steer, liftS) {
  const c = createCar(), inp = createInput();
  placeCar(c, lab.track, 300, 40, 0);
  c.y += 6;
  const k = 300 * 3, x0 = c.x, z0 = c.z;
  for (let t = 0; t < 120 * 8; t++) {
    inp.steer = steer; inp.lift = t < liftS * 120 ? 1 : 0;
    stepCar(c, inp, lab, t, true);
    if (t > 12 && c.air === 0) break;
  }
  return (c.x - x0) * lab.track.R[k] + (c.z - z0) * lab.track.R[k + 2];
}

test('full steer while lifting moves the landing point 6 m or more sideways', () => {
  const straight = flight(0, 1.5), right = flight(1, 1.5), left = flight(-1, 1.5);
  assert.ok(right - straight > 6, `right ${(right - straight).toFixed(2)} m`);
  assert.ok(straight - left > 6, `left ${(straight - left).toFixed(2)} m`);
});

test('a flight with no input lands where it took off sideways', () => {
  for (const liftS of [0, 1.5]) assert.ok(Math.abs(flight(0, liftS)) < 0.05, `lift ${liftS} s: ${flight(0, liftS).toFixed(3)} m`);
});
