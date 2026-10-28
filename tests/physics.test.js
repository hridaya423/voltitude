import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { flatWorld, zeroToSixty, topSpeed, braking, skidpad, wallScrape } from '../tools/physics-lab.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { placeCar, createCar, stepCar, steerTo, TUNING } from '../src/sim/drive.js';

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
