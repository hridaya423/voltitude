import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { testEnv } from './env.js';
import { botRun, padded } from './runs.js';
import { DAILIES, LAUNCH_DAY, dailyFor } from '../../src/sim/daily.js';
import { SIM_VERSION } from '../../src/sim/race.js';

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

const V = SIM_VERSION;
function boardEnv(rows) {
  const e = testEnv(), ins = 'INSERT INTO runs (id, hash, venue, event, day, name, total, score, run, created, v, player) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  rows.forEach((r, k) => e.DB.prepare(ins).bind(r.id || `r${k}`, `h${k}`, r.venue || 'launch', r.event || 'trench', r.day ?? null, r.name || `n${k}`, r.total ?? 1000, r.score ?? null, '{}', r.created ?? k, r.v === undefined ? V : r.v, r.player ?? null).run());
  return async (path) => (await worker.fetch(new Request(`https://w.test${path}`), e)).json();
}

test('a board ranks only runs of the current sim version; old rows with no version are hidden', async () => {
  const get = boardEnv([{ total: 900, v: null }, { total: 950, v: V - 1 }, { total: 1000 }]);
  const b = await get('/board/launch.trench/all');
  assert.deepEqual(b.rows.map((r) => [r.rank, r.total]), [[1, 1000]]);
  assert.equal(b.total, 1);
});

test('a board keeps one row per player, their best, and runs with no player stand alone', async () => {
  const get = boardEnv([{ player: 'aaaaaaaa', total: 1200 }, { player: 'aaaaaaaa', total: 1100, id: 'abest' }, { player: 'bbbbbbbb', total: 1150 }, { total: 1300 }, { total: 1300 }, { player: 'aaaaaaaa', total: 1100 }]);
  const b = await get('/board/launch.trench/all');
  assert.deepEqual(b.rows.map((r) => [r.rank, r.id, r.total]), [[1, 'abest', 1100], [2, 'r2', 1150], [3, 'r3', 1300], [4, 'r4', 1300]]);
  assert.equal(b.total, 4);
  assert.deepEqual(Object.keys(b.rows[0]).sort(), ['created', 'id', 'name', 'rank', 'score', 'total']);
});

test('a board pages with limit and offset and reports the number of ranked players', async () => {
  const get = boardEnv(Array.from({ length: 130 }, (_, k) => ({ player: `player${String(k).padStart(3, '0')}`, total: 2000 + k })));
  const first = await get('/board/launch.trench/all');
  assert.equal(first.rows.length, 20);
  assert.equal(first.total, 130);
  const page = await get('/board/launch.trench/all?limit=5&offset=10');
  assert.deepEqual(page.rows.map((r) => r.rank), [11, 12, 13, 14, 15]);
  assert.equal((await get('/board/launch.trench/all?limit=500')).rows.length, 100);
  const past = await get('/board/launch.trench/all?offset=200');
  assert.deepEqual([past.rows.length, past.total], [0, 130]);
});

test('a board with a player returns their row, and the rows around it when it is off the page', async () => {
  const get = boardEnv(Array.from({ length: 40 }, (_, k) => ({ player: `player${String(k).padStart(3, '0')}`, total: 2000 + k, id: `id${k}` })));
  const far = await get('/board/launch.trench/all?limit=10&player=player029');
  assert.deepEqual(far.me, { rank: 30, id: 'id29', name: 'n29', total: 2029, score: null });
  assert.deepEqual(far.around.map((r) => r.rank), [28, 29, 30, 31, 32]);
  const near = await get('/board/launch.trench/all?limit=10&player=player003');
  assert.equal(near.me.rank, 4);
  assert.equal(near.around, undefined);
  const none = await get('/board/launch.trench/all?player=nobody99');
  assert.equal(none.me, null);
  assert.equal((await get('/board/launch.trench/all')).me, undefined);
});

test('a dare board ranks the highest score first, and the earliest run wins a tie', async () => {
  const get = boardEnv([{ venue: 'pad', event: 'ramp', score: 300, total: 9000 }, { venue: 'pad', event: 'ramp', score: 700, total: 9500, id: 'late', created: 50 }, { venue: 'pad', event: 'ramp', score: 700, total: 9900, id: 'early', created: 10 }]);
  const b = await get('/board/pad.ramp/all');
  assert.deepEqual(b.rows.map((r) => r.id), ['early', 'late', 'r0']);
});

test('the all board holds every day and undated runs; a day board holds that day only', async () => {
  const get = boardEnv([{ day: '2026-11-11', total: 1000 }, { day: '2026-11-12', total: 1100 }, { total: 1200 }]);
  assert.equal((await get('/board/launch.trench/all')).total, 3);
  assert.deepEqual((await get('/board/launch.trench/2026-11-12')).rows.map((r) => r.total), [1100]);
});

test('a submitted run is ranked one row per player at this version, and says if it is the player best', async () => {
  const e = testEnv(), post = async (body) => (await worker.fetch(new Request('https://w.test/runs', { method: 'POST', body: JSON.stringify(body) }), e)).json();
  const ins = 'INSERT INTO runs (id, hash, venue, event, day, name, total, score, run, created, v, player) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  [[trench.run.total - 50, V, 'fastone1'], [trench.run.total - 40, V, 'fastone1'], [trench.run.total - 500, null, null], [trench.run.total + 50, V, 'slowone1']]
    .forEach(([t, v, p], k) => e.DB.prepare(ins).bind(`s${k}`, `sh${k}`, 'launch', 'trench', null, 'x', t, null, '{}', k, v, p).run());
  const first = await post({ venue: 'launch', run: trench.run, player: 'me-player-1', name: 'me' });
  assert.deepEqual([first.rank, first.best, first.players], [2, true, 3]);
  const again = await post({ venue: 'launch', run: padded(trench.run, 3), player: 'me-player-1' });
  assert.deepEqual([again.rank, again.best, again.players], [2, false, 3]);
  const stored = await e.DB.prepare('SELECT v, player FROM runs WHERE id = ?').bind(first.id).first();
  assert.deepEqual({ ...stored }, { v: V, player: 'me-player-1' });
  const bad = await post({ venue: 'launch', run: padded(trench.run, 4), player: 'no way!' });
  assert.equal((await e.DB.prepare('SELECT player FROM runs WHERE id = ?').bind(bad.id).first()).player, null);
  assert.deepEqual([bad.rank, bad.best, bad.players], [3, true, 4]);
});
