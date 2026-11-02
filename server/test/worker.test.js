import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testEnv } from './env.js';
import { botRun, padded } from './runs.js';
import { DAILIES, LAUNCH_DAY, dailyFor } from '../../src/sim/daily.js';

const env = testEnv();
const call = async (method, path, body) => {
  const res = await worker.fetch(new Request(`https://w.test${path}`, { method, body: body && JSON.stringify(body), headers: { 'content-type': 'application/json' } }), env);
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : new Uint8Array(await res.arrayBuffer()) };
};
const ramp = botRun('pad', 'ramp');
const trench = botRun('launch', 'trench');
const JPEG = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9));

test('a real dare run is accepted, ranked and served back with its image', async () => {
  const res = await call('POST', '/runs', { venue: 'pad', run: ramp.run, score: ramp.score, name: 'bot', og: JPEG });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.rank, 1);
  assert.equal(res.body.score, ramp.score);
  const back = await call('GET', `/runs/${res.body.id}`);
  assert.equal(back.body.run.inputs, ramp.run.inputs);
  const og = await call('GET', `/og/${res.body.id}.jpg`);
  assert.equal(og.status, 200);
  assert.deepEqual([og.body[0], og.body[1]], [0xff, 0xd8]);
});

test('the same run sent twice is rejected as a replay', async () => {
  const res = await call('POST', '/runs', { venue: 'pad', run: ramp.run, score: ramp.score });
  assert.equal(res.status, 409);
});

test('forged runs are rejected: a faster time, a higher score, edited inputs', async () => {
  const fast = await call('POST', '/runs', { venue: 'launch', run: { ...trench.run, total: trench.run.total - 120 } });
  assert.equal(fast.status, 422);
  assert.equal(fast.body.replay, trench.run.total);
  const off = await call('POST', '/runs', { venue: 'launch', run: { ...trench.run, total: trench.run.total - 2 } });
  assert.equal(off.status, 422);
  const score = await call('POST', '/runs', { venue: 'pad', run: padded(ramp.run, 1), score: ramp.score + 100 });
  assert.equal(score.status, 422);
  const raw = atob(trench.run.inputs), k = 6 * 600;
  const edited = raw.slice(0, k) + String.fromCharCode(0x81) + raw.slice(k + 1);
  const forged = await call('POST', '/runs', { venue: 'launch', run: { ...trench.run, inputs: btoa(edited) } });
  assert.equal(forged.status, 422, JSON.stringify(forged.body));
});

test('a time within one tick is accepted, and the board orders times and scores', async () => {
  const res = await call('POST', '/runs', { venue: 'launch', run: { ...trench.run, total: trench.run.total + 1 }, name: 'one' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.total, trench.run.total);
  const b = await call('GET', '/board/launch.trench/all');
  assert.deepEqual(b.body.rows.map((r) => r.name), ['one']);
  const d = await call('GET', '/board/pad.ramp/all');
  assert.equal(d.body.rows[0].score, ramp.score);
});

test('a daily run must be the event of that day', async () => {
  assert.deepEqual(DAILIES.map((d, k) => dailyFor(new Date(Date.parse(`${LAUNCH_DAY}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10)).event), DAILIES.map((d) => d.event));
  const day = '2026-11-11';
  assert.equal(dailyFor(day).event, 'ramp');
  const wrong = await call('POST', '/runs', { venue: 'launch', run: padded(trench.run, 2), day });
  assert.equal(wrong.status, 422);
  const right = await call('POST', '/runs', { venue: 'pad', run: padded(ramp.run, 2), score: ramp.score, day });
  assert.equal(right.status, 201);
  const board = await call('GET', `/board/pad.ramp/${day}`);
  assert.equal(board.body.rows.length, 1);
});

test('a run link unfurls with its own image and forwards to the game', async () => {
  const id = (await call('POST', '/runs', { venue: 'pad', run: padded(ramp.run, 7), score: ramp.score, name: 'card', og: JPEG })).body.id;
  const res = await worker.fetch(new Request(`https://w.test/r/${id}`), { ...env, GAME: 'https://game.test/' });
  const html = await res.text();
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(html, new RegExp(`<meta property="og:image" content="https://w.test/og/${id}.jpg">`));
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, new RegExp(`location.replace\\("https://game.test/#g=${id}"\\)`));
  assert.match(html, /card · 585 points on The Pad/);
  assert.equal((await worker.fetch(new Request('https://w.test/r/zzz'), env)).status, 404);
});
