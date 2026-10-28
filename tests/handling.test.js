import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyStep, tap, steady, throttleSteer, slideCatch } from '../tools/handling-lab.mjs';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

test('a held key turns in within 0.2 s at every speed', () => {
  for (const v of [15, 30, 50, 70]) assert.ok(keyStep(v).t50 < 0.2, `${v} m/s`);
});

test('a held key settles at the grip limit instead of sliding the car', () => {
  for (const v of [30, 50, 70]) {
    const r = keyStep(v);
    assert.ok(r.heldBetaDeg < 7, `${v} m/s slides at ${r.heldBetaDeg} deg`);
    assert.ok(r.frontSlipDeg < 10, `${v} m/s front slip ${r.frontSlipDeg} deg`);
    assert.ok(r.speedKept > 0.95, `${v} m/s kept ${r.speedKept}`);
  }
});

test('full lock is the angle of peak grip at each speed', () => {
  for (const v of [15, 30, 50]) {
    const r = steady(v);
    assert.ok(r.atLockDeg >= 0.9 * r.lockDeg, `${v} m/s peaks at ${r.atLockDeg} of ${r.lockDeg} deg`);
    assert.ok(r.maxG > 1.2, `${v} m/s holds ${r.maxG} g`);
    assert.ok(r.ugDegPerG.g11 > 0 && r.ugDegPerG.g11 < 2.5, `${v} m/s understeer gradient ${r.ugDegPerG.g11} deg/g`);
  }
});

test('a short key tap makes a small, controlled heading change at speed', () => {
  for (const v of [30, 50, 70]) {
    const r = tap(v, 120);
    assert.ok(r.headingDeg > 1.5 && r.headingDeg < 4.5, `${v} m/s ${r.headingDeg} deg`);
  }
});

test('braking and lifting rotate the car, and a slide is caught with counter-steer', () => {
  const t = throttleSteer();
  assert.ok(t.brake.yawRatio > 1.2, `trail braking ${t.brake.yawRatio}`);
  assert.ok(t.lift.yawRatio > 1.05, `lift ${t.lift.yawRatio}`);
  const s = slideCatch(40);
  assert.ok(!s.countersteer.spun && s.countersteer.recoveredInS !== null && s.countersteer.recoveredInS < 1, JSON.stringify(s));
});

test('the proving circuit never flips its banking faster than a car can follow', () => {
  const t = loadWorld('proving').track;
  const bank = (i) => Math.asin(Math.max(-1, Math.min(1, t.R[i * 3 + 1]))) * 57.3;
  for (let i = 0; i < t.n - 10; i++) {
    if (t.loopMask[i] || t.loopMask[i + 10]) continue;
    assert.ok(Math.abs(bank(i + 10) - bank(i)) / 10 < 0.5, `bank changes ${Math.abs(bank(i + 10) - bank(i)) / 10} deg/m at ${i}`);
  }
});

test('keyboard presses alone drive a full lap without a respawn or wreck', () => {
  const world = loadWorld('proving');
  const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
  const bot = createInput(), game = createInput();
  const dt = 1 / 60;
  let k = 0, wrecks = 0;
  for (let t = 0; t < 120 * 120 && race.laps.length < 1; t++) {
    if (t % 2 === 0) {
      botInput(race, bot, 0.93);
      const target = (bot.steer > 0.2 ? 1 : 0) - (bot.steer < -0.2 ? 1 : 0);
      if (target === 0) k = Math.abs(k) < dt * 12 ? 0 : k - Math.sign(k) * dt * 12;
      else if (Math.sign(k) !== Math.sign(target) && k !== 0) k = 0;
      else k = Math.max(-1, Math.min(1, k + target * dt * 6));
      game.throttle = bot.throttle > 0.5 ? 1 : 0;
      game.brake = bot.brake > 0.5 ? 1 : 0;
      game.boost = bot.boost > 0.5 ? 1 : 0;
      game.steer = k;
      game.pitch = game.brake - game.throttle;
    }
    stepRace(race, game);
    for (const e of race.events) if (e.type === 'wreck') wrecks++;
    race.events.length = 0;
  }
  assert.equal(race.laps.length, 1);
  assert.equal(race.respawns, 0);
  assert.equal(wrecks, 0);
});
