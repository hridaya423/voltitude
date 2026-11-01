import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, eventsFor, stepRace, createInput } from '../src/sim/race.js';
import { placeCar } from '../src/sim/drive.js';
import { lineupBoxes, lineupHit, LINEUP as KINDS } from '../src/sim/lineup.js';
import { HEART } from '../src/sim/course.js';

const pad = loadWorld('pad');
const EVENTS = eventsFor(pad.track, pad.venue);
const LINEUP = EVENTS.find((e) => e.id === 'lineup');

test('the pad lists its dare first and keeps the circuit events', () => {
  assert.deepEqual(EVENTS.map((e) => [e.id, e.card]), [['lineup', 1], ['gp', 2], ['tt', 3], ['pr', 4]]);
  assert.equal(LINEUP.kind, 'dare');
  assert.deepEqual(eventsFor(loadWorld('proving').track, loadWorld('proving').venue).map((e) => e.id), ['gp', 'tt', 'pr']);
});

test('a dare race has one entry and a dare state', () => {
  const race = createRace(pad, { event: LINEUP });
  assert.equal(race.entries.length, 1);
  assert.deepEqual(race.dare, { count: 1, score: 0, mult: 1, cleared: 0, armed: false, over: false, endAt: 0, near: [] });
  assert.equal(race.car.gas, 1);
});


const TAU = Math.PI * 2;
const lip = pad.track.lineup.lip;

function dareAt(i, speed, count, assist = true) {
  const race = createRace(pad, { event: LINEUP, assist });
  race.phase = 'racing'; race.raceTick = 0;
  race.dare.count = count;
  placeCar(race.car, pad.track, i, speed);
  return race;
}

function run(race, script, ticks = 900) {
  const inp = createInput(), events = [];
  for (let t = 0; t < ticks && race.phase !== 'finished'; t++) {
    script(inp, race.car, t);
    stepRace(race, inp);
    events.push(...race.events);
    race.events.length = 0;
    if (events.some((e) => e.type === 'clear')) break;
  }
  return events;
}

test('a car at 62 m/s off the kicker clears a line of three and the line grows', () => {
  const race = dareAt(lip - 2, 62, 3);
  const events = run(race, (inp) => { inp.throttle = 1; });
  const clears = events.filter((e) => e.type === 'clear');
  assert.equal(events.filter((e) => e.type === 'clip').length, 0);
  assert.equal(clears.length, 1);
  assert.equal(clears[0].count, 3);
  assert.equal(race.dare.count, 4);
  assert.equal(race.dare.cleared, 3);
  assert.equal(race.dare.score, 3 * clears[0].mult);
});

test('a slow car hits the first vehicle, and the dare ends', () => {
  const race = dareAt(lip - 40, 20, 1);
  const events = [];
  const inp = createInput();
  let clipAt = -1;
  for (let t = 0; t < 900 && race.phase !== 'finished'; t++) {
    stepRace(race, inp);
    for (const e of race.events) { events.push(e); if (e.type === 'clip') clipAt = t; }
    race.events.length = 0;
  }
  const clip = events.find((e) => e.type === 'clip');
  assert.ok(clip, 'clipped');
  assert.equal(clip.k, 0);
  assert.equal(race.phase, 'finished');
  assert.ok(race.raceTick - clipAt <= 242, `finished ${race.raceTick - clipAt} ticks after the clip`);
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
});

test('a car 0.4 m over the semi roof earns near-miss gas once', () => {
  const semi = lineupBoxes(pad.track, 5)[4];
  assert.equal(semi.kind, 'semi');
  const race = dareAt(semi.s0 - 3, 62, 5);
  const c = race.car, k = c.hint * 3, lift = semi.h + 0.4 + 0.55 - HEART;
  c.x += pad.track.U[k] * lift; c.y += pad.track.U[k + 1] * lift; c.z += pad.track.U[k + 2] * lift;
  c.gas = 0.5;
  const inp = createInput(), events = [];
  for (let t = 0; t < 30; t++) { stepRace(race, inp); events.push(...race.events); race.events.length = 0; }
  assert.equal(events.filter((e) => e.type === 'clip').length, 0);
  assert.equal(events.filter((e) => e.type === 'near_miss').length, 1);
  assert.ok(c.gas > 0.5 + 0.12 - 1e-3, `gas ${c.gas}`);
});

test('a lineup point inside a box is a clip; one just above it is a near miss', () => {
  const boxes = lineupBoxes(pad.track, 1);
  const race = dareAt(boxes[0].s0 + 2, 0, 1);
  assert.deepEqual(lineupHit(race.car, pad.track, boxes), { clip: 0 });
  const c = race.car, k = c.hint * 3, lift = boxes[0].h + 0.3 + 0.55 - HEART;
  c.x += pad.track.U[k] * lift; c.y += pad.track.U[k + 1] * lift; c.z += pad.track.U[k + 2] * lift;
  const hit = lineupHit(c, pad.track, boxes);
  assert.equal(hit.near, 0);
  assert.ok(Math.abs(hit.gap - 0.3) < 0.05, `gap ${hit.gap}`);
  assert.equal(KINDS.length, 5);
});

test('a barrel roll over the line doubles the clear', () => {
  const race = dareAt(lip - 2, 62, 2);
  const events = run(race, (inp, c) => { inp.throttle = 1; inp.roll = c.mode === 0 && Math.abs(c.barrel) < TAU - 0.3 ? 1 : 0; });
  const clear = events.find((e) => e.type === 'clear');
  assert.ok(clear, `no clear: ${events.map((e) => e.type).join(',')}`);
  assert.equal(clear.mult, 2);
  assert.equal(race.dare.score, 4);
});

test('a hard landing after the line keeps the count and resets the multiplier', () => {
  const race = dareAt(lip - 2, 62, 1, false);
  race.dare.mult = 3;
  const events = run(race, (inp, c) => { inp.throttle = 1; inp.pitch = c.mode === 0 && c.air < 38 ? 1 : 0; });
  const clear = events.find((e) => e.type === 'clear');
  assert.ok(clear, `no clear: ${events.map((e) => e.type + (e.quality ? ':' + e.quality : '')).join(',')}`);
  assert.equal(clear.hard, true);
  assert.equal(clear.mult, 1);
  assert.equal(race.dare.count, 2);
  assert.equal(race.dare.score, 1);
});
