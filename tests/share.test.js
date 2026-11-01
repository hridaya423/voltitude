import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, packInput, unpackInput } from '../src/sim/race.js';
import { createRecorder, encodeRun, createGhost } from '../src/sim/ghost.js';
import { encodeLink, decodeLink } from '../src/share.js';

const pad = loadWorld('pad');
const LINEUP = eventsFor(pad.track, pad.venue).find((e) => e.id === 'lineup');

function botRun(seconds) {
  const race = createRace(pad, { event: LINEUP }), rec = createRecorder(), inp = createInput(), q = new Int8Array(6);
  for (let t = 0; t < 120 * seconds; t++) {
    if (race.phase === 'racing') botInput(race, inp, 0.97);
    packInput(inp, q, 0); unpackInput(q, 0, inp);
    rec.push(inp);
    stepRace(race, inp);
    race.events.length = 0;
  }
  const run = encodeRun(race, rec.bytes());
  run.total = race.raceTick;
  return { race, run };
}

test('a ghost link round-trips a 60 s run on The Pad in under 8,000 characters', async () => {
  const { race, run } = botRun(60);
  const link = await encodeLink(run, 'pad');
  assert.match(link, /^[A-Za-z0-9_-]+$/);
  assert.ok(link.length < 8000, `${link.length} characters`);
  const back = await decodeLink(link);
  assert.equal(back.venue, 'pad');
  assert.equal(back.run.inputs, run.inputs);
  for (const k of ['v', 'event', 'assist', 'seed', 'tier', 'total']) assert.equal(back.run[k], run[k], k);
  const ghost = createGhost(pad, back.run);
  for (let t = 0; t < 120 * 60; t++) ghost.step();
  assert.deepEqual(ghost.race.dare, race.dare);
});

test('a corrupt or foreign fragment decodes to null', async () => {
  const { run } = botRun(5);
  const link = await encodeLink(run, 'pad');
  assert.equal(await decodeLink(link.slice(0, -12) + 'AAAAAAAAAAAA'), null);
  assert.equal(await decodeLink('not a link'), null);
  assert.equal(await decodeLink(''), null);
});
