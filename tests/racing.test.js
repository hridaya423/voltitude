import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, nearMisses } from '../src/sim/race.js';
import { createCar, placeCar } from '../src/sim/drive.js';

const world = loadWorld('proving');
const GP = eventsFor(world.track).find((e) => e.id === 'gp');

function field(seed) {
  const race = createRace(world, { event: GP, seed });
  const inp = createInput();
  const rivals = race.entries.slice(1);
  const stats = rivals.map(() => ({ ticks: 0, bursts: 0, straight: 0, was: false }));
  let launch = 0;
  while (!race.entries.every((e) => e.done) && race.tick < 120 * 400) {
    botInput(race, inp, 0.97);
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing') continue;
    if (race.raceTick === 140) launch = rivals.filter((e) => e.car.boosting).length;
    rivals.forEach((e, k) => {
      const on = e.car.boosting && e.car.thr > 0.5, s = stats[k];
      if (!on) { s.was = false; return; }
      s.ticks++;
      if (!s.was) s.bursts++;
      s.was = true;
      if (Math.abs(world.track.curv[e.car.hint]) < 0.006) s.straight++;
    });
  }
  return { race, stats, launch };
}

test('rivals launch on the thrusters and spend them in planned bursts on the straights', () => {
  const { race, stats, launch } = field(4);
  assert.ok(launch >= 6, `${launch} of 7 rivals boosting at the launch`);
  for (const [k, s] of stats.entries()) {
    const perLap = s.ticks / 120 / 3, bursts = s.bursts / 3;
    assert.ok(perLap > 1 && perLap < 5, `${race.entries[k + 1].identity.code} boosts ${perLap.toFixed(1)} s per lap`);
    assert.ok(bursts >= 2 && bursts <= 12, `${race.entries[k + 1].identity.code} fires ${bursts.toFixed(1)} bursts per lap`);
    assert.ok(s.straight / s.ticks > 0.8, `${race.entries[k + 1].identity.code} boosts ${((100 * s.straight) / s.ticks).toFixed(0)}% on straights`);
  }
});

test('the field is close and the order changes from race to race', () => {
  const orders = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const { race } = field(seed);
    orders.add(race.order.map((e) => e.identity.code).join(' '));
    const gap = (race.order[race.order.length - 1].total - race.order[0].total) / 120;
    assert.ok(gap < 30, `seed ${seed}: last car ${gap.toFixed(1)} s behind`);
    assert.ok(race.swaps >= 8, `seed ${seed}: ${race.swaps} passes`);
  }
  assert.ok(orders.size >= 3, `${orders.size} distinct finishing orders in 4 races`);
});

function put(c, s, speed, lat) {
  const i = Math.floor(s), k = i * 3;
  placeCar(c, world.track, i, speed, lat);
  c.x += world.track.T[k] * (s - i); c.y += world.track.T[k + 1] * (s - i); c.z += world.track.T[k + 2] * (s - i);
}

function pass(lat, speed = 42) {
  const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
  const rival = { car: createCar() };
  race.entries = [race, rival];
  const near = [];
  for (let t = 0; t < 480; t++) {
    race.tick++;
    put(race.car, 200 + (30 * t) / 120, 30, 0);
    put(rival.car, 180 + (speed * t) / 120, speed, lat);
    nearMisses(race);
    near.push(...race.events.filter((e) => e.type === 'near_miss'));
    race.events.length = 0;
  }
  return near;
}

test('a rival passing within a metre at speed is one near miss, a touch is none', () => {
  const close = pass(2.8);
  assert.equal(close.length, 1);
  assert.equal(close[0].other, 1);
  assert.ok(close[0].v > 8);
  assert.equal(pass(1.6).length, 0);
  assert.equal(pass(4).length, 0);
  assert.equal(pass(2.8, 34).length, 0);
});
