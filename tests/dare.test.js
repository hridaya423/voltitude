import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, eventsFor } from '../src/sim/race.js';

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
