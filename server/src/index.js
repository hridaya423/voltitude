import { buildWorld } from '../../src/sim/world.js';
import { VENUES } from '../../src/sim/venues.js';
import { SIM_VERSION, eventsFor } from '../../src/sim/race.js';
import { createGhost, decodeInputs, STRIDE } from '../../src/sim/ghost.js';
import { dailyFor } from '../../src/sim/daily.js';

const MAX_TICKS = 120 * 600, OG_BYTES = 400000, BOARD = 100;
const worlds = new Map();

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };

async function worldFor(env, venue) {
  if (!worlds.has(venue)) {
    const res = await env.ASSETS.fetch(new Request(`https://assets.local/${venue}.bin`));
    const world = buildWorld(res.ok ? new Uint8Array(await res.arrayBuffer()) : null, VENUES[venue]);
    if (!world.baked) throw new Error(`terrain bake for ${venue} does not match the course`);
    worlds.set(venue, world);
  }
  return worlds.get(venue);
}

async function sha256(text) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function resimulate(world, run) {
  const ghost = createGhost(world, run);
  if (!ghost) return null;
  const frames = decodeInputs(run).length / STRIDE;
  while (ghost.race.phase !== 'finished' && ghost.race.tick < Math.min(MAX_TICKS, frames + 120 * 30)) ghost.step();
  const r = ghost.race;
  return r.phase === 'finished' ? { total: r.total, score: r.dare ? r.dare.score : null, dare: !!r.dare } : null;
}

async function submit(req, env) {
  const body = await req.json().catch(() => null);
  const run = body?.run;
  if (!run || typeof run.inputs !== 'string' || !VENUES[body.venue]) return json({ error: 'bad request' }, 400);
  if (run.v !== SIM_VERSION) return json({ error: `sim version ${run.v} is not ${SIM_VERSION}` }, 422);
  if (decodeInputs(run).length % STRIDE || decodeInputs(run).length / STRIDE > MAX_TICKS) return json({ error: 'bad inputs' }, 400);
  const day = body.day || null;
  if (day) {
    const daily = dailyFor(day);
    if (!daily || daily.venue !== body.venue || daily.event !== run.event) return json({ error: 'not the daily for that day' }, 422);
  }
  const world = await worldFor(env, body.venue);
  if (!eventsFor(world.track, world.venue).some((e) => e.id === run.event)) return json({ error: 'no such event' }, 400);
  const hash = await sha256(`${body.venue}|${run.event}|${run.assist ? 1 : 0}|${run.seed}|${run.tier}|${run.inputs}`);
  if (await env.DB.prepare('SELECT id FROM runs WHERE hash = ?').bind(hash).first()) return json({ error: 'this run was already submitted' }, 409);
  const sim = resimulate(world, run);
  if (!sim) return json({ error: 'the run does not finish' }, 422);
  if (Math.abs(sim.total - run.total) > 1) return json({ error: 'time does not match the replay', replay: sim.total }, 422);
  if (sim.dare && sim.score !== body.score) return json({ error: 'score does not match the replay', replay: sim.score }, 422);
  let og = null;
  if (typeof body.og === 'string') {
    const bytes = Uint8Array.from(atob(body.og), (c) => c.charCodeAt(0));
    if (bytes.length > OG_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return json({ error: 'og must be a JPEG under 400 KB' }, 400);
    og = bytes;
  }
  const id = hash.slice(0, 12);
  const name = String(body.name || 'anon').replace(/[^\w .-]/g, '').slice(0, 16) || 'anon';
  await env.DB.prepare('INSERT INTO runs (id, hash, venue, event, day, name, total, score, run, og, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, hash, body.venue, run.event, day, name, sim.total, sim.score, JSON.stringify(run), og, Date.now()).run();
  const rank = await env.DB.prepare(sim.dare
    ? 'SELECT COUNT(*) AS n FROM runs WHERE venue = ? AND event = ? AND day IS ? AND score > ?'
    : 'SELECT COUNT(*) AS n FROM runs WHERE venue = ? AND event = ? AND day IS ? AND total < ?').bind(body.venue, run.event, day, sim.dare ? sim.score : sim.total).first();
  return json({ id, rank: rank.n + 1, total: sim.total, score: sim.score }, 201);
}

async function board(env, key, day) {
  const [venue, event] = key.split('.');
  if (!VENUES[venue] || !event) return json({ error: 'board key is venue.event' }, 400);
  const world = await worldFor(env, venue);
  const dare = eventsFor(world.track, world.venue).find((e) => e.id === event)?.kind === 'dare';
  const where = day === 'all' ? 'venue = ? AND event = ?' : 'venue = ? AND event = ? AND day = ?';
  const args = day === 'all' ? [venue, event] : [venue, event, day];
  const { results } = await env.DB.prepare(`SELECT id, name, total, score FROM runs WHERE ${where} ORDER BY ${dare ? 'score DESC' : 'total ASC'}, created ASC LIMIT ${BOARD}`).bind(...args).all();
  return json({ venue, event, day, rows: results.map((r, k) => ({ rank: k + 1, ...r })) });
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function card(env, url, id) {
  const row = /^[0-9a-f]{12}$/.test(id) && await env.DB.prepare('SELECT venue, event, name, total, score, og IS NOT NULL AS og FROM runs WHERE id = ?').bind(id).first();
  if (!row) return new Response('not found', { status: 404 });
  const game = env.GAME || 'https://voltitude.hridya.tech/', to = `${game}#g=${id}`;
  const result = row.score !== null ? `${row.score} points` : `${Math.floor(row.total / 7200)}:${((row.total % 7200) / 120).toFixed(3).padStart(6, '0')}`;
  const title = `${row.name} · ${result} on ${VENUES[row.venue].name}. Beat it.`;
  const image = row.og ? `${url.origin}/og/${id}.jpg` : `${game}assets/og.jpg`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="Race this run's ghost in Voltitude, a browser stunt racer.">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(url.href)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(to)}"></head><body><a href="${esc(to)}">Race the ghost</a><script>location.replace(${JSON.stringify(to)})</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname.split('/').filter(Boolean);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (req.method === 'POST' && p[0] === 'runs' && p.length === 1) return await submit(req, env);
      if (req.method === 'GET' && p[0] === 'board' && p.length === 3) return await board(env, p[1], p[2]);
      if (req.method === 'GET' && p[0] === 'daily' && p.length === 2) return json(dailyFor(p[1]) || { error: 'bad day' }, dailyFor(p[1]) ? 200 : 400);
      if (req.method === 'GET' && p[0] === 'runs' && p.length === 2) {
        const row = await env.DB.prepare('SELECT venue, name, run FROM runs WHERE id = ?').bind(p[1]).first();
        return row ? json({ venue: row.venue, name: row.name, run: JSON.parse(row.run) }) : json({ error: 'not found' }, 404);
      }
      if (req.method === 'GET' && p[0] === 'r' && p.length === 2) return await card(env, url, p[1]);
      if (req.method === 'GET' && p[0] === 'og' && p.length === 2 && p[1].endsWith('.jpg')) {
        const row = await env.DB.prepare('SELECT og FROM runs WHERE id = ?').bind(p[1].slice(0, -4)).first();
        if (!row?.og) return new Response('not found', { status: 404, headers: CORS });
        return new Response(new Uint8Array(row.og), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', ...CORS } });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
