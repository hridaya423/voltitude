import * as THREE from 'three';
import { buildWorld } from './sim/world.js';
import { VENUES, venueOf } from './sim/venues.js';
import { createRace, stepRace, createInput as createSimInput, packInput, unpackInput, eventsFor, botInput, DT, SIM_VERSION } from './sim/race.js';
import { ROSTER } from './sim/drivers.js';
import { autopilot } from './sim/bot.js';
import { createRecorder, encodeRun, createGhost } from './sim/ghost.js';
import { createSky, loadSky, bakeEnvironment, SUN_DIR } from './render/sky.js';
import { createTerrain, shadowFocus, loadTerrainTextures } from './render/terrain.js';
import { createPost } from './render/post.js';
import { createCascades } from './render/shadows.js';
import { createBoulders } from './render/props.js';
import { createScrub } from './render/scrub.js';
import { chunkMesh } from './render/chunks.js';
import { skyFog } from './render/sky.js';
import { createRoad } from './render/road.js';
import { createTrackside } from './render/trackside.js';
import { createFacility } from './render/facility.js';
import { createGrandstands } from './render/crowd.js';
import { createDust, createFireworks } from './render/fx.js';
import { createChaseCamera, createBroadcastCamera } from './render/camera.js';
import { createInput, DEFAULT_KEYS, keyLabel } from './input.js';
import { createAudio } from './audio.js';
import { createHud, fmt, fmtDelta, medalFor, medalTimes, MEDALS } from './hud.js';
import { createMenu, describe } from './menu.js';
import { createGarage } from './render/garage.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const STORE = 'voltitude.settings.v2', SAVE = `voltitude.save.v${SIM_VERSION}`;

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function store(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { }
}

const defaults = { assist: true, invertPitch: false, ghost: true, units: 'mph', quality: 'medium', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, rumble: true, session: 'night', volume: 0.7, music: 0.7, keys: structuredClone(DEFAULT_KEYS) };
const settings = Object.assign(structuredClone(defaults), load(STORE, {}));
settings.keys = Object.assign(structuredClone(DEFAULT_KEYS), settings.keys);
if (params.has('quality')) settings.quality = params.get('quality');
const venue = venueOf(params.get('venue') || settings.venue);
const NIGHT = params.has('day') ? false : params.has('night') || settings.session !== 'day';
const saveSettings = () => store(STORE, settings);

const progress = (k, text) => { $('loadFill').style.transform = `scaleX(${k})`; $('loadText').textContent = text; };
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

const canvas = $('view');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false }); } catch (e) {
  (await import('./menu-fallback.js')).showFallback({ settings, save: load(SAVE, {}), reason: e.message });
  await new Promise(() => { });
}
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); import('./menu-fallback.js').then((m) => m.showFallback({ settings, save: load(SAVE, {}), reason: 'the graphics context was lost' })); });
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = !params.has('noshadow');
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.info.autoReset = false;
const post = createPost(renderer, { msaa: params.has('msaa') ? Number(params.get('msaa')) : 0, night: NIGHT });
const maxScale = Math.min(devicePixelRatio || 1, 2);
let scale = Math.min(maxScale, Number(params.get('scale')) || maxScale);
const minScale = Math.max(0.75, maxScale * 0.6);
renderer.setPixelRatio(scale);
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 9000);
camera.layers.enable(1);
camera.layers.enable(4);
scene.add(camera);
const sunUniform = { value: SUN_DIR };
const fogDensity = { value: 0.00034 };
const { sky: skyTex } = await loadSky(NIGHT, renderer);
const skyMesh = createSky(skyTex, NIGHT ? 1 : 2.3);
scene.add(skyMesh);
const sun = createCascades(scene, NIGHT ? '#9fb3e8' : '#ffe0bc', NIGHT ? 1.5 : 6.2, SUN_DIR, NIGHT);

progress(0.15, 'Building the course…');
await frame();
const heightBin = await fetch(`assets/terrain/height/${venue.id}.bin`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
const world = buildWorld(heightBin ? new Uint8Array(heightBin) : null, venue);
const { track, terrain } = world;
const terrainTex = await loadTerrainTextures(renderer, venue).catch((e) => { console.warn('terrain textures', e); return null; });
const terrainGroup = createTerrain(terrain, sunUniform, fogDensity, terrainTex, venue, track);
scene.add(terrainGroup);
await document.fonts.load('600 64px Michroma').catch(() => null);
await document.fonts.load('600 30px Saira').catch(() => null);
const course = createRoad(world, sunUniform, fogDensity, renderer);
const author = await fetch(`assets/ghosts/${venue.id}.json`).then((r) => r.json()).catch(() => ({}));
scene.add(await createBoulders(world, (m) => skyFog(m, sunUniform, fogDensity)).catch((e) => { console.warn('boulders', e); return new THREE.Group(); }));
for (const m of [...course.group.children]) if (m.isMesh && !m.isInstancedMesh && m.geometry.attributes.position.count > 20000) { course.group.remove(m); course.group.add(chunkMesh(m)); }
scene.add(createScrub(world, (m) => skyFog(m, sunUniform, fogDensity)), course.group, createTrackside(world, sunUniform, fogDensity, NIGHT).group);
const facility = createFacility(world, sunUniform, fogDensity, NIGHT);
if (track.closed) scene.add((await import('./render/circuit.js')).createCircuitProps(world).group);
const venueArt = venue.id === 'airfield' ? (await import('./render/airfield.js')).createAirfield(world, sunUniform, fogDensity, renderer)
  : venue.id === 'launch' ? (await import('./render/launch.js')).createLaunchComplex(world, sunUniform, fogDensity, renderer, NIGHT) : null;
if (venueArt) scene.add(venueArt.group);
const stands = await createGrandstands(world, sunUniform, fogDensity, renderer);
scene.add(facility.group, stands.group);
const dust = createDust(terrain.height);
scene.add(dust.points);
const fireworks = createFireworks();
scene.add(fireworks.points);
const finishAtPos = new THREE.Vector3();
const standGap = (h) => stands.sites.reduce((m, i) => Math.min(m, Math.abs(i - h)), Infinity);
const cheerNear = (v, kind = 'stunt') => { if (standGap(race.car.hint) < 260) { if (kind === 'gasp') stands.gasp(0.8); else stands.cheer(v); if (v >= 0.5) audio.cheer(kind); } };
let said = new Set(), raceCount = 0, gasLowAt = -1e9;
const sayOnce = (id) => { if (!said.has(id)) { said.add(id); audio.radio(id); } };

progress(0.35, 'Lighting the sky…');
await frame();
const envMap = bakeEnvironment(renderer, skyTex, NIGHT, Number(params.get('envw')) || 4096);
scene.environment = envMap;
scene.environmentIntensity = NIGHT ? 0.55 : 1.0;

progress(0.5, 'Rolling out the Roadster…');
await frame();
const { createCarView, loadCar, PROBE_LAYER } = await import('./render/car.js');
await loadCar();
for (const o of [skyMesh, terrainGroup, course.group, venueArt?.group].filter(Boolean)) o.traverse((m) => { if (!m.isInstancedMesh) m.layers.enable(PROBE_LAYER); });
const carView = createCarView({ quality: settings.quality, envMap, headlights: NIGHT });
scene.add(carView.root);
post.track(carView.root);
const garage = createGarage({ renderer, night: NIGHT, settings });
scene.add(garage.group);
const garageKeep = [camera, skyMesh, carView.root, sun.lights[0].parent];
const rivalViews = venue.circuit ? ROSTER.map((r) => { const v = createCarView({ quality: 'low', envMap, color: r.color, lite: true }); v.root.visible = false; v.root.traverse((o) => { o.layers.set(1); o.castShadow = false; }); scene.add(v.root); return v; }) : [];
for (const v of rivalViews) post.track(v.root);
const rprev = rivalViews.map(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }));
let ghostView = null;
function ensureGhostView() {
  if (!ghostView) { ghostView = createCarView({ quality: 'low', envMap, ghost: true }); scene.add(ghostView.root); post.track(ghostView.root); }
  return ghostView;
}

const input = createInput(settings);
const audio = createAudio(settings);
audio.stands(stands.centres);
const hud = createHud(world, settings);
const chase = createChaseCamera(camera, terrain.height);
const broadcast = createBroadcastCamera(camera, track, terrain.height);

const EVENTS = eventsFor(track);
const BRIEFS = {
  proving: {
    gp: 'Three laps against seven Roadsters. Brake late into the hairpins, take the loop flat out, keep it straight over the jump.',
    tt: 'Three laps alone against your best run. Every sector counts.',
    pr: 'Free laps with no field. Learn the braking points, the loop and the jump.',
  },
  airfield: {
    gp: 'Three laps against seven Roadsters. Draft down the runway, brake late into the first turn, thread the three hangars.',
    tt: 'Three laps alone against your best run. The lap is won on the runway exit.',
    pr: 'Free laps with no field. Find the braking points for the hangars and the tower esses.',
  },
  launch: {
    gp: 'Three laps against seven Roadsters. Ride the banked wall round the tank farm, then climb past the launch tower.',
    tt: 'Three laps alone against your best run. Carry speed up the tower climb.',
    pr: 'Free laps with no field. Learn the wall and the blind crest at the tower.',
  },
};
const BRIEF = BRIEFS[venue.id] || {};
const save = Object.assign({ events: {}, hints: {}, venues: {} }, load(SAVE, {}));
const book = venue.id === 'proving' ? save.events : (save.venues[venue.id] ||= {});
const persist = () => store(SAVE, save);
const authorTime = (id) => author[id]?.total || 0;
const PODIUM = [{ id: 'gold', name: 'Gold' }, { id: 'silver', name: 'Silver' }, { id: 'bronze', name: 'Bronze' }];
const medalOf = (ev) => { const b = book[ev.id]?.best; if (!b || ev.kind === 'pr') return null; return ev.kind === 'gp' ? PODIUM[b - 1] || null : medalFor(b, authorTime(ev.id)); };

let mode = 'title', launching = false;
let race = createRace(world, { event: EVENTS[0] }), ghost = null, replay = null, replayEnd = 0, recorder = null, finishAt = 0, current = EVENTS[0];
const idleCar = race.car;
const simIn = createSimInput(), packed = new Int8Array(6);
const prev = { p: new THREE.Vector3(), q: new THREE.Quaternion() }, gprev = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const interp = new THREE.Vector3(), gInterp = new THREE.Vector3(), rInterp = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const autoplay = params.has('autopilot');
let usage = { boost: 0, air: 0, roll: 0 };

function carQuat(c, out) {
  _x.set(-c.rx, -c.ry, -c.rz); _y.set(c.ux, c.uy, c.uz); _z.set(c.fx, c.fy, c.fz);
  return out.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
}
function snapshot(c, o) { o.p.set(c.x, c.y, c.z); carQuat(c, o.q); }
function pose(obj, p, c, a, out) {
  out.set(c.x, c.y, c.z).sub(p.p).multiplyScalar(a).add(p.p);
  obj.position.copy(out);
  obj.quaternion.copy(p.q).slerp(carQuat(c, _q), a);
}

const key = (a) => `<kbd>${keyLabel((settings.keys[a] || [])[0])}</kbd>`;
function medalDot(m) { return `<i class="medal ${m ? m.id : ''}"></i>`; }

function eventRows() {
  return EVENTS.map((ev, k) => {
    const b = book[ev.id]?.best, gp = ev.kind === 'gp';
    const ladder = gp ? PODIUM.map((m, j) => ({ ...m, time: `P${j + 1}`, t: j + 1 })) : ev.kind === 'pr' ? [] : medalTimes(authorTime(ev.id)).map((m) => ({ ...m, time: fmt(m.t) }));
    return {
      id: ev.id, name: ev.name, circuit: !!ev.circuit,
      tag: ev.circuit ? ['GP', 'TT', 'PR'][k] : k === 0 ? 'RUN' : `S${k}`,
      best: gp ? (b ? `P${b}` : '') : b ? fmt(b) : '',
      medal: medalOf(ev),
      kicker: ev.circuit ? `${venue.name} · ${ev.kind === 'pr' ? 'Free laps' : `${ev.laps} laps`}` : k === 0 ? `${venue.name} · Full run` : `Practice · Sector ${k}`,
      brief: BRIEF[ev.id] || '',
      ladder: ladder.map((m) => ({ id: m.id, name: m.name, time: m.time, got: !!b && b <= m.t })),
      bestLabel: ev.kind === 'pr' ? '' : gp ? 'BEST FINISH' : 'PERSONAL BEST',
    };
  });
}

function venueRows() {
  return Object.values(VENUES).map((v) => {
    const set = Object.values(v.id === 'proving' ? save.events : save.venues[v.id] || {}).filter((e) => e?.best).length;
    const total = v.circuit ? 3 : v.course.pieces.filter((p) => p.sector).length + 1;
    return { id: v.id, name: v.name, place: v.place, note: `${set} of ${total} set` };
  });
}

function pauseRows() {
  const ev = current, lap = Math.min(race.laps.length + 1, ev.laps);
  const lines = [{ label: 'Time', value: fmt(race.raceTick) }];
  if (ev.circuit) lines.push({ label: 'Lap', value: ev.kind === 'pr' ? `${lap}` : `${lap} of ${ev.laps}` });
  else lines.push({ label: 'Checkpoint', value: `${Math.min(race.next, ev.cps.length - 1)} of ${ev.cps.length - 1}` });
  if (ev.kind === 'gp') lines.push({ label: 'Position', value: `P${race.pos} of ${race.entries.length}` });
  return { title: 'PAUSED', sub: `${venue.name} · ${ev.name}`, lines };
}

const RESUME = 'voltitude.resume';
const menu = createMenu({
  settings,
  data: { events: eventRows, venues: venueRows, pause: pauseRows },
  on: {
    sound(kind) { audio.start(); audio.event(kind === 'drive' ? 'slot' : kind === 'deny' ? 'miss' : 'ui'); },
    drive(i) { launch(() => startRace(EVENTS[i])); },
    venue: (id) => switchVenue(id),
    resume: () => resume(),
    restart: () => startRace(current),
    quit: () => toTitle(),
    next() { const n = EVENTS[current.card]; if (n) { menu.open('board', { index: current.card }); startRace(n); } },
    replay: () => watchReplay(),
    change(k) {
      saveSettings();
      if (k === 'volume') audio.setVolume(settings.volume);
      if (k === 'music') audio.setMusicVolume();
      if (k === 'quality' || k === 'session') { try { sessionStorage.setItem(RESUME, 'settings'); } catch { } location.reload(); }
    },
    keys: () => saveSettings(),
  },
});
menu.setVenue(venue.id);

function launch(go) {
  if (launching) return;
  garage.flash();
  if (settings.reduced) { go(); return; }
  launching = true;
  setTimeout(() => { launching = false; go(); }, 420);
}

function toTitle() {
  mode = 'title';
  hud.show(false);
  $('replayBug').hidden = true;
  menu.open('board');
  current = EVENTS[menu.selected];
  garage.cut();
  audio.mute(false);
}

function targetFor(ev) {
  if (ev.circuit) return '';
  const b = book[ev.id]?.best, a = authorTime(ev.id);
  const next = medalTimes(a).slice().reverse().find((m) => !b || b > m.t) ;
  if (!next) return `${medalDot({ id: 'author' })} AUTHOR BEATEN`;
  return `${medalDot(next)} ${next.name.toUpperCase()} ${fmt(next.t)}`;
}

function ghostRun(ev) {
  if (ev.circuit && ev.kind !== 'tt') return null;
  const mine = book[ev.id]?.run;
  return mine && mine.v === SIM_VERSION ? mine : author[ev.id];
}

function rivals(ev) {
  const a = author[ev.id];
  const CODES = { author: 'AUT', gold: 'GLD', silver: 'SLV', bronze: 'BRZ' };
  const list = MEDALS.map(([id, , k]) => ({ id, code: CODES[id], splits: a.splits.map((t) => Math.round(t * k)) }));
  const pb = book[ev.id]?.run;
  if (pb && pb.v === SIM_VERSION) list.push({ id: 'pb', code: 'PB', splits: pb.splits });
  return list;
}

const gapText = (ticks) => (Math.abs(ticks) < 1200 ? `${ticks < 0 ? '−' : '+'}${(Math.abs(ticks) / 120).toFixed(1)}` : '');
function updateField() {
  if (race.entries.length < 2) { hud.tower([]); return; }
  const me = race.entries[0], rows = race.order.map((e) => {
    const gap = e === me ? '' : gapText(((e.prog - me.prog) / Math.max(me.car.speed, 25)) * -120);
    return { id: e.identity.id, code: e.identity.code, color: e.identity.color, gap: e.done && e !== me ? 'FIN' : gap };
  });
  hud.tower(rows);
}

function updateTower(i, t) {
  if (current.circuit) { updateField(); return; }
  const rows = rivals(current).map((r) => ({ id: r.id, code: r.code, t: i < 0 ? r.splits[r.splits.length - 1] : r.splits[i] }));
  const me = { id: 'me', code: 'YOU', t: i < 0 ? Infinity : t };
  rows.push(me);
  rows.sort((x, y) => x.t - y.t || (x.id === 'me' ? -1 : y.id === 'me' ? 1 : 0));
  for (const r of rows) r.gap = r.id === 'me' ? (i < 0 ? '' : fmt(t).replace(/^0:/, '')) : i < 0 ? '' : fmtDelta(r.t - t);
  hud.tower(rows);
}

let bestLap = 0, lapRef = null, lapBase = 0, lastSeed = 1;
function lapSplits(run) {
  if (!run?.laps?.length) return null;
  const per = current.perLap;
  let best = 0;
  run.laps.forEach((t, k) => { if (t < run.laps[best]) best = k; });
  const base = best ? run.splits[best * per - 1] : 0;
  return { t: run.laps[best], cum: run.splits.slice(best * per, best * per + per).map((x) => x - base) };
}
function circuitSector(index) {
  const per = current.perLap, k = index % per;
  const time = (e, j) => e.splits[j] - (j ? e.splits[j - 1] : 0);
  const own = time(race, index);
  let overall = Infinity, mine = Infinity;
  for (const e of race.entries) {
    for (let j = k; j < e.splits.length; j += per) {
      if (e === race && j === index) continue;
      overall = Math.min(overall, time(e, j));
      if (e === race) mine = Math.min(mine, time(e, j));
    }
  }
  return own <= overall ? 'purple' : own <= mine ? 'green' : 'yellow';
}

function sectorColor(i, t) {
  const seg = (s) => s[i] - (i > 0 ? s[i - 1] : 0);
  const mine = t - (i > 0 ? race.splits[i - 1] : 0);
  const a = author[current.id]?.splits;
  if (a && mine <= seg(a)) return 'purple';
  const pb = book[current.id]?.run;
  const ref = pb && pb.v === SIM_VERSION ? pb.splits : a && a.map((x) => x * 1.05);
  return ref && mine < seg(ref) ? 'green' : 'yellow';
}

let lastRun = null, sectorColors = [];
function startReplay() {
  replay = createGhost(world, lastRun);
  if (!replay) return;
  while (replay.race.phase === 'countdown') replay.step();
  race = replay.race;
  replayEnd = 0;
  snapshot(race.car, prev);
  race.entries.forEach((e, k) => { if (k) snapshot(e.car, rprev[k - 1]); });
  broadcast.reset();
  if (ghostView) ghostView.root.visible = false;
  ghost = null;
}

function startRace(ev = current) {
  const line = raceCount > 0 ? (Math.random() < 0.3 ? 'again' : '') : 'radio_check';
  raceCount++;
  said = new Set();
  replay = null;
  sectorColors = [];
  current = ev;
  lastSeed = ev.kind === 'gp' ? 1 + Math.floor(Math.random() * 1e6) : 1;
  race = createRace(world, { event: ev, assist: settings.assist, seed: lastSeed });
  recorder = createRecorder();
  ghost = settings.ghost ? createGhost(world, ghostRun(ev)) : null;
  const ref = ev.kind === 'tt' ? lapSplits(ghostRun(ev)) : null;
  bestLap = 0; lapRef = ref ? ref.cum : null; contactCount = 0;
  race.entries.forEach((e, k) => { if (k) snapshot(e.car, rprev[k - 1]); });
  rivalViews.forEach((v, k) => { v.root.visible = k + 1 < race.entries.length; });
  if (ghost) { ensureGhostView().root.visible = true; snapshot(ghost.race.car, gprev); } else if (ghostView) ghostView.root.visible = false;
  snapshot(race.car, prev);
  const c0 = race.car;
  if (garage.active && !settings.reduced) chase.from({ position: _x.set(c0.x - c0.fx * 3.4 - c0.rx * 2.2, c0.y + 0.9, c0.z - c0.fz * 3.4 - c0.rz * 2.2), fov: 38, filmOffset: 0 }, prev.p);
  else chase.snap();
  finishAt = 0;
  mode = 'race';
  menu.close();
  hud.show(true);
  hud.begin(ev, targetFor(ev));
  if (ev.circuit) hud.els.target.textContent = ref ? `BEST ${fmt(ref.t)}` : '';
  hud.sectorsBegin(ev.circuit ? ev.perLap : ev.cps.length);
  hud.tower([]);
  updateTower(-1, 0);
  audio.start();
  if (line) setTimeout(() => audio.radio(line), 150);
  audio.mute(false);
  hintAt = 0;
}

function pause() {
  if (mode !== 'race' || race.phase === 'finished') return;
  mode = 'paused';
  audio.mute(true);
  hud.show(false);
  menu.open('pause');
}
function resume() { mode = 'race'; audio.mute(false); hud.show(true); menu.close(); }

function watchReplay() {
  startReplay();
  if (!replay) return;
  mode = 'replay';
  $('replayBug').hidden = false;
}
function endReplay() { replay = null; $('replayBug').hidden = true; mode = 'results'; }

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4];
let contactCount = 0, lastContact = -999;
const speedUnit = () => (settings.units === 'kmh' ? 3.6 : 2.237);
const medalLine = (m, before) => (m ? { id: m.id, name: m.name, fresh: !(before && before.id === m.id) } : null);
function showResults(result, m, before) {
  hud.show(false);
  mode = 'results';
  menu.open('results', { results: result });
  garage.cut();
  garage.boot();
  if (m && (!before || m.id !== before.id)) audio.event('lap');
}

function finishCircuit(ev) {
  const gp = ev.kind === 'gp';
  lastRun = encodeRun(race, recorder.bytes());
  const idle = createSimInput();
  for (let n = 0; n < 120 * 240 && !race.entries.every((e) => e.done); n++) stepRace(race, idle);
  race.events.length = 0;
  const me = race.entries[0], prevBest = book[ev.id]?.best, before = medalOf(ev);
  const score = gp ? me.pos : race.total;
  const record = !prevBest || score < prevBest;
  if (record) { book[ev.id] = gp ? { best: score } : { best: score, run: lastRun }; persist(); }
  const m = gp ? PODIUM[me.pos - 1] || null : medalFor(race.total, authorTime(ev.id));
  let delta;
  if (gp) {
    const win = race.order[0];
    delta = { text: me.pos === 1 ? `Winner · ${POINTS[0]} points` : `${fmtDelta(race.total - win.total)} to ${win.identity.name} · ${POINTS[me.pos - 1]} points`, tone: me.pos <= 3 ? 'good' : 'bad' };
  } else if (prevBest) {
    const d = race.total - prevBest;
    delta = { text: d < 0 ? `New best · ${fmtDelta(d)}` : `${fmtDelta(d)} off your best`, tone: d <= 0 ? 'good' : 'bad' };
  } else delta = { text: 'First time on the board', tone: '' };
  const bestLapT = Math.min(...race.laps);
  showResults({
    card: `${venue.name} · ${ev.name}`, pos: gp ? me.pos : 0, field: race.entries.length, medal: medalLine(m, before),
    time: fmt(race.total), delta, note: gp ? `${me.passes || 0} overtakes · ${contactCount} contacts` : '',
    title: 'LAPS', rows: race.laps.map((t, k) => ({ dot: t === bestLapT ? 'purple' : '', label: `Lap ${k + 1}`, value: fmt(t), tag: t === bestLapT ? 'BEST' : fmtDelta(t - bestLapT), tone: t === bestLapT ? 'good' : 'bad' })),
    stats: [{ label: 'Top speed', value: `${Math.round(race.maxSpeed * speedUnit())} ${settings.units === 'kmh' ? 'KM/H' : 'MPH'}` }, { label: 'Best lap', value: fmt(bestLapT) }, { label: 'Resets', value: `${race.respawns}` }],
    hasNext: !!EVENTS[ev.card],
  }, m, before);
}

function finish() {
  if (current.circuit) { finishCircuit(current); return; }
  const ev = current, prevRec = book[ev.id];
  const prevBest = prevRec?.best;
  const before = medalOf(ev);
  const record = !prevBest || race.total < prevBest;
  if (record) { book[ev.id] = { best: race.total, run: encodeRun(race, recorder.bytes()) }; persist(); }
  const m = medalFor(race.total, authorTime(ev.id));
  const field = rivals(ev).filter((r) => r.id !== 'pb' || !record).map((r) => r.splits[r.splits.length - 1]);
  const pos = 1 + field.filter((t) => t < race.total).length;
  let delta;
  if (prevBest) {
    const d = race.total - prevBest;
    delta = { text: d < 0 ? `New best · ${fmtDelta(d)}` : `${fmtDelta(d)} off your best`, tone: d <= 0 ? 'good' : 'bad' };
  } else delta = { text: 'First time on the board', tone: '' };
  const ref = prevRec?.run?.splits || author[ev.id]?.splits || [];
  let worst = -1, worstLoss = 0, last = 0, lastRef = 0;
  const rows = race.splits.map((t, i) => {
    const seg = t - last, refSeg = ref[i] !== undefined ? ref[i] - lastRef : null;
    last = t; if (ref[i] !== undefined) lastRef = ref[i];
    const loss = refSeg === null ? 0 : seg - refSeg;
    if (loss > worstLoss) { worstLoss = loss; worst = i; }
    return { i, seg, loss, has: refSeg !== null };
  });
  const refName = prevRec?.run ? 'your best' : 'the author';
  lastRun = encodeRun(race, recorder.bytes());
  showResults({
    card: ev.id === 'full' ? `${venue.name} · Full run` : `Practice · S${ev.card - 1} ${ev.name}`, pos, field: field.length + 1, medal: medalLine(m, before),
    time: fmt(race.total), delta,
    note: worst >= 0 && worstLoss > 12 ? `Most time lost ${worst === rows.length - 1 ? 'on the run to the finish' : `before checkpoint ${worst + 1}`}: ${(worstLoss / 120).toFixed(2)} s against ${refName}.` : '',
    title: 'SPLITS', rows: rows.map((r) => ({ dot: sectorColors[r.i] || '', label: r.i === rows.length - 1 ? 'Finish' : `CP ${r.i + 1}`, value: fmt(r.seg), tag: r.has ? fmtDelta(r.loss) : '', tone: r.loss <= 0 ? 'good' : 'bad' })),
    stats: [{ label: 'Top speed', value: `${Math.round(race.maxSpeed * speedUnit())} ${settings.units === 'kmh' ? 'KM/H' : 'MPH'}` }, { label: 'Air', value: `${(race.airTime / 120).toFixed(1)} s` }, { label: 'Tricks', value: `${race.tricks}` }, { label: 'Resets', value: `${race.respawns}` }],
    hasNext: !!EVENTS[ev.card],
  }, m, before);
}

const HINTS = {
  proving: ['gp', 'tt', 'pr'].map((ev) => ({ ev, at: 2150, use: 'air', html: () => `In the air: ${key('throttle')}${key('brake')} tilt the nose. Land on your wheels` })),
  airfield: ['gp', 'tt', 'pr'].map((ev) => ({ ev, at: 150, use: 'boost', html: () => `Hold ${key('boost')} to fire the rear thrusters` })),
}[venue.id] || [];
let hintAt = 0;
function hints() {
  if (!race || race.phase !== 'racing') return;
  for (const h of HINTS) {
    if (h.at <= hintAt || race.car.hint < h.at || race.car.hint > h.at + 60) continue;
    if (current.id !== h.ev && current.id !== 'full') continue;
    const k = h.use || h.at;
    if ((save.hints[k] || 0) >= 3) continue;
    save.hints[k] = (save.hints[k] || 0) + 1;
    persist();
    hud.hint(h.html());
    hintAt = h.at;
  }
}

function handleEvents() {
  for (const e of race.events) {
    switch (e.type) {
      case 'light': hud.light(e.n); audio.light(e.n); break;
      case 'go': cheerNear(0.7); hud.light(0); audio.lightsOut(); input.rumble(0.5, 0.4, 160); chase.bump(0.15); break;
      case 'check': {
        if (current.circuit) {
          audio.event('check');
          const k = e.index % current.perLap, color = circuitSector(e.index);
          hud.sector(k, color);
          if (lapRef && k < current.perLap - 1) hud.delta(e.t - race.lapStart - lapRef[k], color === 'purple');
          updateTower();
          break;
        }
        audio.event('check');
        const color = sectorColor(e.index, e.t);
        sectorColors[e.index] = color;
        hud.sector(e.index, color);
        const ref = ghostRun(current)?.splits;
        if (ref && ref[e.index] !== undefined) hud.delta(e.t - ref[e.index], color === 'purple');
        updateTower(e.index, e.t);
        const last = e.index === current.cps.length - 2;
        audio.radio(color === 'purple' ? 'purple' : last ? 'last_sector' : color === 'green' ? 'green' : Math.random() < 0.4 ? 'yellow' : '');
        break;
      }
      case 'lap': {
        const per = current.perLap;
        const base = e.lap > 1 ? race.splits[(e.lap - 1) * per - 1] : 0;
        const first = !bestLap;
        const improved = !bestLap || e.t < bestLap;
        if (lapRef && bestLap) hud.delta(e.t - bestLap, false); else if (lapRef) hud.delta(e.t - lapRef[per - 1], false);
        if (improved) { bestLap = e.t; lapRef = race.splits.slice((e.lap - 1) * per, e.lap * per).map((x) => x - base); }
        hud.els.target.textContent = `BEST ${fmt(bestLap)}`;
        hud.toast(`LAP ${e.lap}`, improved && !first ? 'good' : 'white', fmt(e.t));
        if (e.lap < current.laps) { audio.event('lap', e.lap + 1); if (e.lap + 1 === current.laps) audio.event('final_lap'); }
        if (improved && !first) audio.event('fastest');
        stands.cheer(0.35);
        setTimeout(() => hud.sectorsBegin(per), 1500);
        break;
      }
      case 'pass': if (e.gained) { hud.toast(`P${race.pos}`, 'good'); audio.event('overtake', race.pos === 1 ? 1 : 0); } else audio.event('overtaken'); updateTower(); break;
      case 'contact': if (e.tick - lastContact > 40) { contactCount++; audio.event('contact', e.v); } lastContact = e.tick; input.rumble(Math.min(1, e.v / 8), 0.3, 120); chase.bump(Math.min(0.6, e.v / 14)); break;
      case 'near_miss': audio.event('near_miss'); hud.toast('CLOSE', 'white'); break;
      case 'pad': hud.toast('BOOST PAD', 'orange'); audio.event('boost'); input.rumble(0.2, 0.6, 180); chase.bump(0.35); post.uniforms.uFlash.value = 0.25; break;
      case 'land': {
        const names = e.tricks.length ? [...new Set(e.tricks)].map((t) => { const n = e.tricks.filter((x) => x === t).length; return (n > 1 ? `${n}× ` : '') + t.toUpperCase(); }).join(' + ') : '';
        if (e.quality !== 'hard') cheerNear(e.tricks.length ? 0.9 : e.quality === 'perfect' ? 0.5 : 0.25);
        if (e.quality === 'perfect') { hud.toast(names || 'PERFECT LANDING', 'good', e.refill > 0.01 ? `GAS +${Math.round(e.refill * 100)}%` : ''); audio.event('slot'); audio.event('perfect'); input.rumble(0.3, 0.5, 140); chase.bump(0.25); }
        else if (e.quality === 'clean') { hud.toast(names || 'CLEAN', 'white', e.refill > 0.01 ? `GAS +${Math.round(e.refill * 100)}%` : ''); audio.event('check'); input.rumble(0.4, 0.3, 140); chase.bump(0.35); }
        else { hud.toast('HARD LANDING', 'red', '−10% SPEED'); audio.event('impact'); input.rumble(0.9, 0.4, 220); chase.bump(0.9); chase.stall(0.05); }
        if (e.tricks.length) usage.roll++;
        if (e.quality === 'hard') audio.radio('hard');
        else if (e.tricks.length) audio.radio('flip');
        else if (e.air > 2.5) sayOnce('big_air');
        else if (e.quality === 'perfect' && Math.random() < 0.35) audio.radio('perfect');
        break;
      }
      case 'wreck': cheerNear(0.2, 'gasp'); if (standGap(race.car.hint) < 260) audio.cheer('gasp'); audio.radio('wreck'); hud.toast('WRECKED', 'red'); audio.event('clip'); input.rumble(1, 0.6, 320); chase.bump(1.2); chase.stall(0.08); break;
      case 'scrape': audio.event(e.angle > 0.35 ? 'impact' : 'scrape', e.v); input.rumble(Math.min(1, e.v / 15) * (e.angle > 0.35 ? 1 : 0.4), 0.3, 120); if (e.angle > 0.35) chase.bump(0.25); break;
      case 'impact': audio.event('impact'); input.rumble(Math.min(1, e.v / 20), 0.4, 160); chase.bump(Math.min(1, e.v / 15)); break;
      case 'respawn': audio.event('respawn'); chase.snap(); snapshot(race.car, prev); break;
      case 'finish': {
        if (current.circuit) { audio.event('finish'); hud.toast('FINISH', 'white'); finishAt = performance.now(); stands.cheer(1); input.rumble(0.6, 0.6, 400); break; }
        const pb = book[current.id]?.best;
        if (!pb || race.total < pb) {
          const k = Math.min(track.n - 1, current.to + 70) * 3;
          for (const side of [-1, 1]) fireworks.show(finishAtPos.set(track.P[k] + track.R[k] * side * 32, track.P[k + 1], track.P[k + 2] + track.R[k + 2] * side * 32), pb ? 4 : 3, 24);
        }
        const beatAuthor = race.total <= authorTime(current.id) && !(pb && pb <= authorTime(current.id));
        audio.radio(beatAuthor ? 'finish_author' : !pb || race.total < pb ? 'finish_pb' : 'finish');
        audio.cheer(!pb || race.total < pb ? 'pb' : 'applause');
        stands.party(); hud.toast('FINISH', 'white'); audio.event('finish'); finishAt = performance.now(); input.rumble(0.6, 0.6, 400); break;
      }
      default: break;
    }
  }
  race.events.length = 0;
}

function tick() {
  snapshot(race.car, prev);
  for (let k = 1; k < race.entries.length; k++) snapshot(race.entries[k].car, rprev[k - 1]);
  if (mode === 'replay') {
    replay.step();
    if (race.phase === 'finished' && ++replayEnd > 300) startReplay();
    return;
  }
  if (ghost) snapshot(ghost.race.car, gprev);
  if (autoplay && current.circuit) botInput(race, simIn, 0.97);
  else if (autoplay || race.phase === 'finished') { if (!current.circuit) autopilot(race, simIn, 1); }
  else Object.assign(simIn, input.state);
  if (race.phase !== 'finished') {
    packInput(simIn, packed, 0);
    unpackInput(packed, 0, simIn);
    recorder.push(simIn);
    if (simIn.boost) usage.boost++;
  }
  stepRace(race, simIn);
  if (ghost) ghost.step();
  handleEvents();
  if (race.entries.length > 1 && race.tick % 24 === 0 && race.phase === 'racing') updateField();
}

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
const ndc = (e) => ({ x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 });
function aimAt(e, click) {
  if (!garage.active || launching) return;
  const p = ndc(e), hit = garage.pick(camera, p.x, p.y);
  pointer.tx = p.x; pointer.ty = p.y;
  canvas.style.cursor = hit && (hit.row !== undefined || hit.zone !== 'board') ? 'pointer' : '';
  if (click) { audio.start(); }
  if (hit) menu.point(hit.zone, hit, click);
}
canvas.addEventListener('pointermove', (e) => aimAt(e, false));
canvas.addEventListener('click', (e) => aimAt(e, true));
addEventListener('keydown', (e) => {
  if (!menu.listening) return;
  e.preventDefault();
  e.stopPropagation();
  menu.capture(e.code);
}, true);

function switchVenue(id) {
  if (id === venue.id) return;
  settings.venue = id;
  saveSettings();
  params.delete('venue');
  location.search = params.toString();
}

let stickDir = '';
function padNav() {
  const p = input.pad;
  if (!p) return '';
  const x = p.axes[0] || 0, y = p.axes[1] || 0;
  const dir = Math.abs(x) < 0.6 && Math.abs(y) < 0.6 ? '' : Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
  const fresh = dir && dir !== stickDir ? dir : '';
  stickDir = dir;
  return fresh;
}

function menuKeys() {
  if (menu.listening || launching) return;
  const any = (...codes) => codes.some((c) => input.wasPressed(c));
  const pad = (...ids) => ids.some((i) => input.padPressed(i));
  const back = any('Escape') || pad(1);
  if (mode === 'race') {
    if (any('Escape', 'KeyP') || pad(9)) pause();
    else if (input.actionPressed('restart') || pad(8)) startRace(current);
  } else if (mode === 'replay') {
    if (back || any('Enter', 'Space') || pad(0, 9)) endReplay();
  } else if (menu.page) {
    const page = menu.page, home = page === 'pause' || page === 'results';
    const cmd = any('ArrowUp', 'KeyW') || pad(12) ? 'up' : any('ArrowDown') || pad(13) ? 'down' : any('ArrowLeft', 'KeyA', 'BracketLeft') || pad(14, 4) ? 'left' : any('ArrowRight', 'KeyD', 'BracketRight') || pad(15, 5) ? 'right' : any('Enter', 'Space') || pad(0) ? 'confirm' : back ? 'back' : padNav();
    if (cmd) menu.command(cmd);
    else if (any('KeyS')) menu.command(page === 'board' || page === 'pause' ? 'settings' : 'down');
    else if (page === 'pause' && pad(9)) resume();
    else if (page === 'results' && pad(9)) menu.command('confirm');
    else if (home && (input.actionPressed('restart') || pad(8))) startRace(current);
    else if (page === 'results' && (any('KeyN') || pad(3))) menu.command('next');
    else if (page === 'results' && (any('KeyV') || pad(2))) menu.command('replay');
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

function followSun(p) {
  shadowFocus.value.set(p.x, p.y, p.z);
  sun.update(camera, p);
}

const fixedCam = params.has('cam') ? params.get('cam').split(',').map(Number) : null;
const perf = (window.__perf = { frames: [], scale: [], calls: 0, tris: 0, longest: 0, scene, camera });
let ema = 16.7, slowFor = 0, fastFor = 0;
function adaptResolution(ms) {
  if (params.has('fixedres')) return;
  ema += (ms - ema) * 0.05;
  if (ema > 30) { slowFor += ms; fastFor = 0; } else if (ema < 14) { fastFor += ms; slowFor = 0; } else { slowFor = fastFor = 0; }
  if (slowFor > 2500 && scale > minScale) { scale = Math.max(minScale, scale * 0.9); renderer.setPixelRatio(scale); slowFor = 0; ema = 20; }
  else if (fastFor > 4000 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.1); renderer.setPixelRatio(scale); fastFor = 0; }
}

progress(0.75, 'Compiling shaders…');
toTitle();
pose(carView.root, prev, race.car, 1, interp);
chase.update(1 / 60, interp, race.car, { reduced: settings.reduced });
ensureGhostView();
for (const v of rivalViews) { v.root.visible = true; v.root.position.copy(interp); }
const lods = [];
scene.traverse((o) => { if (o.isLOD) { lods.push(o); o.autoUpdate = false; o.levels.forEach((l) => { l.object.visible = true; }); } });
await post.compile(scene, camera);
post.render(scene, camera);
ghostView.root.visible = false;
for (const v of rivalViews) v.root.visible = false;
for (const o of lods) o.autoUpdate = true;
post.render(scene, camera);
garage.setActive(true, scene, garageKeep);
await post.compile(scene, camera);
post.render(scene, camera);
progress(1, 'Ready');
const readyAt = performance.now();
if (params.has('event')) { const ev = EVENTS.find((e) => e.id === params.get('event')); if (ev) { menu.open('board', { index: ev.card - 1 }); current = ev; } }
let resumePage = null;
try { resumePage = sessionStorage.getItem(RESUME); sessionStorage.removeItem(RESUME); } catch { }
if (resumePage === 'settings') menu.command('settings');
garage.intro();
if (params.has('autostart')) startRace(current);

let last = performance.now(), acc = 0, time = 0, garageView = null;
let warmFrames = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (warmFrames >= 0 && ++warmFrames > 8 && (now - last < 20 || performance.now() - readyAt > 1500)) { warmFrames = -1; $('loading').classList.add('done'); }
  const ms = now - last;
  last = now;
  const dt = Math.min(0.1, ms / 1000);
  perf.frames.push(ms);
  if (perf.frames.length > 20000) perf.frames.shift();
  adaptResolution(ms);
  renderer.info.reset();
  input.poll(dt);
  menuKeys();
  const inGarage = mode === 'title' || mode === 'paused' || mode === 'results';
  if (inGarage !== garage.active) {
    garage.setActive(inGarage, scene, garageKeep);
    if (!inGarage && ghostView && !ghost) ghostView.root.visible = false;
  }
  const running = mode === 'race' || mode === 'replay';
  if (running) {
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 12) { tick(); acc -= DT; n++; }
    if (n === 12) acc = 0;
    time += dt;
  }
  if (mode === 'race' && race.phase === 'finished' && finishAt && performance.now() - finishAt > 2200) { finishAt = 0; finish(); }
  if (!running) time += dt;
  const a = running ? acc / DT : 1;
  const c = inGarage ? idleCar : race.car;
  if (inGarage) { carView.root.position.copy(garage.carPosition); carView.root.quaternion.identity(); interp.copy(garage.carPosition); } else pose(carView.root, prev, c, a, interp);
  carView.update(dt, c, time);
  if (!inGarage) for (let k = 0; k < rivalViews.length; k++) {
    const v = rivalViews[k], e = race.entries[k + 1];
    if (!e) { v.root.visible = false; continue; }
    pose(v.root, rprev[k], e.car, a, rInterp);
    v.root.visible = rInterp.distanceToSquared(interp) < 500 * 500;
    if (v.root.visible) v.update(dt, e.car, time, rInterp.distanceTo(interp));
  }
  if (!inGarage && ghost && ghostView) {
    pose(ghostView.root, gprev, ghost.race.car, a, gInterp);
    ghostView.update(dt, ghost.race.car, time);
    const gd = gInterp.distanceTo(interp);
    ghostView.root.visible = gd > 3 && ghost.race.phase !== 'finished';
  }
  if (!inGarage) dust.update(time, dt, interp, c, renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360));
  if (inGarage) {
    if (menu.dirty || menu.listening) {
      garageView = menu.view();
      garage.draw(garageView, time);
      if (menu.dirty) $('menuLive').textContent = describe(garageView);
      menu.clean();
    }
    garage.update(dt, time, garageView, camera, pointer);
  } else if (mode === 'replay') broadcast.update(dt, interp, c);
  else if (running) chase.update(dt, interp, c, { reduced: settings.reduced });
  if (fixedCam) { camera.position.fromArray(fixedCam, 0); camera.up.set(0, 1, 0); camera.lookAt(fixedCam[3], fixedCam[4], fixedCam[5]); if (camera.fov !== fixedCam[6]) { camera.fov = fixedCam[6]; camera.filmOffset = 0; camera.updateProjectionMatrix(); } }
  if (!inGarage) {
    course.update(time, dt, race);
    facility.update(time);
    venueArt?.update(time, camera, NIGHT ? 1 : 0);
    stands.update(time, dt, NIGHT ? 1 : 0, camera);
    fireworks.update(time, renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360));
  }
  c.clearance = c.mode === 0 ? 6 : 0; c.contact = c.mode !== 0; c.wy = c.yawRate; c.bank = 0; c.impact = 0;
  audio.listen(camera);
  c.kerb = c.mode !== 0 && Math.abs(c.lat) > world.track.halfW[c.hint] - 1.7;
  audio.update(c, running);
  if (mode === 'race') {
    hints();
    if (race.phase === 'racing') {
      if (c.mode === 1 && c.uy < -0.5) sayOnce('inverted');
      else if (c.mode === 1 && c.uy < 0.3) sayOnce('wall');
      if (c.boosting && c.gas < 0.2 && time - gasLowAt > 20) { gasLowAt = time; audio.radio('gas_low'); }
    }
  }
  audio.crowd(inGarage ? 0.25 : 1);
  if (mode === 'race') hud.update(dt, race, camera, ghost ? gInterp : null, interp);
  followSun(interp);
  const pu = post.uniforms;
  pu.uExposure.value = NIGHT ? 1.3 : 1.2;
  const sp = Math.min(1, Math.max(0, (c.speed - 20) / 55));
  pu.uBlur.value = settings.reduced ? 0 : sp * 0.7 + (c.boosting ? 0.25 : 0);
  pu.uHeat.value = NIGHT ? 0 : 1;
  pu.uAberration.value = settings.reduced ? 0 : (c.boosting ? 0.012 : 0) + sp * 0.004;
  pu.uTime.value = time;
  pu.uFlash.value *= Math.exp(-dt * 6);
  carView.reflect(renderer, scene, camera, inGarage);
  post.render(scene, camera);
  perf.calls = renderer.info.render.calls;
  perf.tris = renderer.info.render.triangles;
  perf.scale.push(scale);
  if (perf.scale.length > 20000) perf.scale.shift();
  input.endFrame();
}
requestAnimationFrame(loop);
