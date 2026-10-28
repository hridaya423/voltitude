import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { flatWorld, zeroToSixty, topSpeed, braking, skidpad } from '../tools/physics-lab.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { placeCar, createCar, stepCar, TUNING } from '../src/sim/drive.js';

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
