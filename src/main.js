import * as THREE from 'three';
import { buildWorld, unpackBake } from './sim/world.js';
import { VENUES, venueOf } from './sim/venues.js';
import { createRace, stepRace, createInput as createSimInput, packInput, unpackInput, eventsFor, botInput, DT, SIM_VERSION, DARES } from './sim/race.js';
import { ROSTER } from './sim/drivers.js';
import { autopilot } from './sim/bot.js';
import { createRecorder, encodeRun, createGhost } from './sim/ghost.js';
import { createSky, loadSky, bakeEnvironment, SUN_DIR, skyUniforms } from './render/sky.js';
import { createTerrain, shadowFocus, loadTerrainTextures } from './render/terrain.js';
import { createPost, exposureFor } from './render/post.js';
import { createCascades } from './render/shadows.js';
import { createBoulders } from './render/props.js';
import { createFlora } from './render/flora.js';
import { createRange } from './render/range.js';
import { createScrub } from './render/scrub.js';
import { chunkMesh } from './render/chunks.js';
import { skyFog } from './render/sky.js';
import { createRoad } from './render/road.js';
import { createTrackside } from './render/trackside.js';
import { createFacility } from './render/facility.js';
import { createGrandstands } from './render/crowd.js';
import { createDust, createFireworks } from './render/fx.js';
import { createCarFx } from './render/carfx.js';
import { createSkids } from './render/decals.js';
import { createGates } from './render/gates.js';
import { createChaseCamera, createBroadcastCamera } from './render/camera.js';
import { createInput, DEFAULT_KEYS, keyLabel } from './input.js';
import { createAudio } from './audio.js';
import { createHud, medalFor, medalTimes, MEDALS } from './hud.js';
import { stylePoints } from './style.js';
import { createHints } from './hints.js';
import { fmt, fmtDelta, lapReview } from './time.js';
import { createMenu, pauseView, describe, dareResults, rampResults, dareMedal, DARE_MEDALS } from './menu.js';
import { dailyFor, dayOf } from './sim/daily.js';
import { createGarage } from './render/garage.js';
import { createFestival } from './render/festival.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const STORE = 'voltitude.settings.v2', SAVE = `voltitude.save.v${SIM_VERSION}`;

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function store(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { }
}

const defaults = { tier: 'rookie', assist: true, cue: true, invertPitch: false, ghost: true, units: 'mph', quality: 'medium', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, rumble: true, session: 'golden', volume: 0.7, music: 0.7, keys: structuredClone(DEFAULT_KEYS) };
const settings = Object.assign(structuredClone(defaults), load(STORE, {}));
settings.keys = Object.assign(structuredClone(DEFAULT_KEYS), settings.keys);
if (!settings.venue) { settings.venue = load(SAVE, null) ? 'proving' : 'pad'; store(STORE, settings); }
if (params.has('quality')) settings.quality = params.get('quality');
const API = (params.get('api') ?? document.querySelector('meta[name="voltitude-api"]')?.content ?? '').replace(/\/$/, '');
let linked = location.hash.startsWith('#g=') ? await (await import('./share.js')).openLink(location.hash.slice(3), API) : null;
if (linked && VENUES[linked.venue] && linked.venue !== (params.get('venue') || settings.venue)) {
  params.set('venue', linked.venue);
  location.replace(`?${params}${location.hash}`);
  await new Promise(() => {});
}
const venue = venueOf(params.get('venue') || settings.venue);
const SESSION = ['golden', 'day', 'night'].find((s) => params.has(s)) || settings.session;
const NIGHT = SESSION === 'night';
const motionClass = () => document.documentElement.classList.toggle('reduced', !!settings.reduced);
const saveSettings = () => { store(STORE, settings); motionClass(); };
motionClass();

const marks = (window.__boot = [['start', performance.now()]]);
const progress = (k, text) => { marks.push([text, performance.now()]); $('loadFill').style.transform = `scaleX(${k})`; $('loadText').textContent = text; };
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
const PHONE = params.has('tier') ? params.get('tier') === 'phone' : matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
if (!settings.reduced && !PHONE) $('hero').play().catch(() => {});
const post = createPost(renderer, { msaa: params.has('msaa') ? Number(params.get('msaa')) : 0, session: SESSION, lite: PHONE, levels: PHONE ? 3 : 4 });
const maxScale = PHONE ? 1 : Math.min(devicePixelRatio || 1, 2);
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
const fogDensity = { value: SESSION === 'golden' ? 0.000476 : 0.00034 };
const heightP = fetch(`assets/terrain/height/${venue.id}.bin.gz`)
  .then(async (r) => (r.ok ? unpackBake(new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())) : null))
  .catch(() => fetch(`assets/terrain/height/${venue.id}.bin`).then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null)))
  .catch(() => null);
const { sky: skyTex, info: skyInfo, sunIrradiance } = await loadSky(SESSION, renderer);
const skyMesh = createSky(skyTex, skyInfo.maxLuminance);
scene.add(skyMesh);
const sun = createCascades(scene, NIGHT ? '#9fb3e8' : SESSION === 'golden' ? '#ffb877' : '#ffe0bc', NIGHT ? 1.5 : 6.2, SUN_DIR, NIGHT, PHONE);

progress(0.15, 'Building the course…');
await frame();
const world = buildWorld(await heightP, venue);
const { track, terrain } = world;
const texP = loadTerrainTextures(renderer, venue, !PHONE).catch((e) => { console.warn('terrain textures', e); return null; });
const authorP = fetch(`assets/ghosts/${venue.id}.json`).then((r) => r.json()).catch(() => ({}));
const bouldersP = createBoulders(world, (m) => skyFog(m, sunUniform, fogDensity), PHONE).catch((e) => { console.warn('boulders', e); return new THREE.Group(); });
const floraP = createFlora(world, (m, f) => skyFog(m, sunUniform, fogDensity, false, f)).catch((e) => { console.warn('flora', e); return { group: new THREE.Group(), update() {} }; });
const standsP = createGrandstands(world, sunUniform, fogDensity, renderer, PHONE);
const carP = import('./render/car.js').then(async (m) => { await m.loadCar(!PHONE); return m; });
const fontsP = Promise.all([document.fonts.load('800 expanded 64px Archivo'), document.fonts.load('600 30px Archivo'), document.fonts.load('500 semi-condensed 30px "Martian Mono"')]).catch(() => null);
const terrainTex = await texP;
const terrainGroup = createTerrain(terrain, sunUniform, fogDensity, terrainTex, venue, track, PHONE ? 4 : 6);
scene.add(terrainGroup);
await fontsP;
const course = createRoad(world, sunUniform, fogDensity, renderer, PHONE ? '1k' : '2k');
const author = await authorP;
scene.add(await bouldersP);
const flora = await floraP;
scene.add(flora.group);
for (const m of [...course.group.children]) if (m.isMesh && !m.isInstancedMesh && m.geometry.attributes.position.count > 20000) { course.group.remove(m); course.group.add(chunkMesh(m)); }
scene.add(createScrub(world, (m) => skyFog(m, sunUniform, fogDensity)), course.group, createTrackside(world, sunUniform, fogDensity, NIGHT).group);
const facility = createFacility(world, sunUniform, fogDensity, NIGHT);
if (track.closed) scene.add((await import('./render/circuit.js')).createCircuitProps(world).group);
const venueArt = venue.id === 'airfield' ? (await import('./render/airfield.js')).createAirfield(world, sunUniform, fogDensity, renderer)
  : venue.id === 'launch' ? (await import('./render/launch.js')).createLaunchComplex(world, sunUniform, fogDensity, renderer, NIGHT) : null;
if (venueArt) scene.add(venueArt.group);
const stands = await standsP;
const festival = createFestival(world, sunUniform, fogDensity, NIGHT, stands);
const range = createRange(world, sunUniform, fogDensity, festival.used);
if (track.spurs && Object.keys(track.spurs).length) scene.add((await import('./render/spur.js')).createSpurs(world, sunUniform, fogDensity, renderer, PHONE ? '1k' : '2k').group);
scene.add(facility.group, stands.group, festival.group, range.group);
const dust = createDust(terrain.height);
const skids = createSkids();
const carFx = createCarFx(NIGHT, post.depth);
post.overlay = carFx.overlay;
scene.add(dust.points, skids.mesh, carFx.group);
const fireworks = createFireworks(12);
const gates = createGates(world, (m) => skyFog(m, sunUniform, fogDensity));
scene.add(gates.group);
const spurGates = Object.fromEntries(Object.entries(track.spurs || {}).filter(([, t]) => t.gates.length).map(([id, t]) => [id, createGates({ ...world, track: t }, (m) => skyFog(m, sunUniform, fogDensity))]));
for (const g of Object.values(spurGates)) scene.add(g.group);
const lineup = track.lineup ? (await import('./render/lineup.js')).createLineup(world, (m) => skyFog(m, sunUniform, fogDensity)) : null;
if (lineup) scene.add(lineup.mesh);
scene.add(fireworks.points);
const finishAtPos = new THREE.Vector3();
const standGap = (h) => stands.sites.reduce((m, i) => Math.min(m, Math.abs(i - h)), Infinity);
const cheerNear = (v, kind = 'stunt') => { if (standGap(race.car.hint) < 260) { if (kind === 'gasp') stands.gasp(0.8); else stands.cheer(v); if (v >= 0.5) audio.cheer(kind); } };
let said = new Set(), raceCount = 0, gasLowAt = -1e9, boostWas = false, boostKick = 0, rushL = 0, rushR = 0, armedWas = false, liftWas = false, kerbAt = -1, gasWas = 1, leadAt = 0;
const sayOnce = (id) => { if (!said.has(id)) { said.add(id); audio.radio(id); } };

progress(0.35, 'Lighting the sky…');
await frame();
const envMap = bakeEnvironment(renderer, skyTex, NIGHT, Number(params.get('envw')) || 4096);
scene.environment = envMap;
scene.environmentIntensity = NIGHT ? 0.55 : 1.0;

progress(0.5, 'Rolling out the Roadster…');
await frame();
const { createCarView, PROBE_LAYER } = await carP;
for (const o of [skyMesh, terrainGroup, course.group, venueArt?.group].filter(Boolean)) o.traverse((m) => { if (!m.isInstancedMesh) m.layers.enable(PROBE_LAYER); });
const carView = createCarView({ quality: PHONE ? 'low' : settings.quality, envMap, headlights: NIGHT });
scene.add(carView.vapour.points);
scene.add(carView.root);
post.track(carView.root);
const garage = createGarage({ renderer, night: NIGHT, settings, sunUniform, fogDensity, skyTex });
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
const touch = matchMedia('(pointer: coarse)').matches || params.has('touch') ? (await import('./touch.js')).createTouch($('touch'), { onPause: () => pause() }) : null;
const audio = createAudio(settings);
audio.stands(stands.centres);
const hud = createHud(world, settings);
const chase = createChaseCamera(camera, terrain.height);
const broadcast = createBroadcastCamera(camera, track, terrain.height);

const EVENTS = eventsFor(track, venue);
const TODAY = dailyFor(params.get('day') || '') ? params.get('day') : dayOf(Date.now()), DAILY = dailyFor(TODAY);
const DAILY_EV = DAILY.venue === venue.id ? EVENTS.find((e) => e.id === DAILY.event) || null : null;
if (!settings.callsign) { settings.callsign = load('voltitude.callsign', '') || `RD-${Math.random().toString(16).slice(2, 6).toUpperCase()}`; saveSettings(); }
let dailyRun = false, dailyGhosts = [], submitted = null;
const dailyViews = [];
const BRIEFS = {
  proving: {
    hl: 'One lap from a standing start. The loop, the jump and both hairpins, once each.',
    gp: 'Three laps against seven Roadsters. Brake late into the hairpins, take the loop flat out, keep it straight over the jump.',
    tt: 'Three laps alone against your best run. Every sector counts.',
    pr: 'Free laps with no field. Learn the braking points, the loop and the jump.',
  },
  airfield: {
    hl: 'One lap from a standing start. The runway, the three hangars and the tower esses, once each.',
    gp: 'Three laps against seven Roadsters. Draft down the runway, brake late into the first turn, thread the three hangars.',
    tt: 'Three laps alone against your best run. The lap is won on the runway exit.',
    pr: 'Free laps with no field. Find the braking points for the hangars and the tower esses.',
  },
  launch: {
    hl: 'One lap from a standing start. The banked wall, the tank farm and the tower climb, once each.',
    gp: 'Three laps against seven Roadsters. Ride the banked wall round the tank farm, then climb past the launch tower.',
    tt: 'Three laps alone against your best run. Carry speed up the tower climb.',
    pr: 'Free laps with no field. Learn the wall and the blind crest at the tower.',
    trench: 'Time attack through the flame trench. Roll up the wall onto the ceiling, thread two gates upside down, roll back down. Every gate you miss costs three seconds.',
  },
  pad: {
    lineup: 'Jump the line off the kicker. Every clear adds a vehicle. A flip or a roll in the air multiplies the clear. Touch one and the dare is over.',
    ramp: 'Three tries at the curl. Drive up, hold the ceiling, drop off the lip and roll out onto your wheels. Square landings, kept speed and extra rolls score.',
    hl: 'One lap of the oval from a standing start. The kicker is on the racing line.',
    gp: 'Three laps against seven Roadsters round the oval. Draft down the straights, hold the line over the kicker.',
    tt: 'Three laps alone against your best run.',
    pr: 'Free laps with no field. Learn the kicker.',
  },
};
const BRIEF = BRIEFS[venue.id] || {};
const save = Object.assign({ events: {}, hints: {}, venues: {} }, load(SAVE, {}));
const book = venue.id === 'proving' ? save.events : (save.venues[venue.id] ||= {});
const persist = () => store(SAVE, save);
if (!save.player) { save.player = crypto.randomUUID(); persist(); }
const authorTime = (id) => author[id]?.total || 0;
const PODIUM = [{ id: 'gold', name: 'Gold' }, { id: 'silver', name: 'Silver' }, { id: 'bronze', name: 'Bronze' }];
const medalOf = (ev) => { const b = book[ev.id]?.best; if (!b || ev.kind === 'pr') return null; if (ev.kind === 'dare') return dareMedal(ev.id, b); return ev.kind === 'gp' ? PODIUM[b - 1] || null : medalFor(b, authorTime(ev.id)); };

let mode = 'title', launching = false;
let race = createRace(world, { event: EVENTS[0] }), ghost = null, replay = null, replayEnd = 0, recorder = null, finishAt = 0, current = EVENTS[0];
const idleCar = race.car;
const simIn = createSimInput(), packed = new Int8Array(6);
const prev = { p: new THREE.Vector3(), q: new THREE.Quaternion() }, gprev = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const interp = new THREE.Vector3(), gInterp = new THREE.Vector3(), rInterp = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const autoplay = params.has('autopilot');
let style = 0;

function carQuat(c, out) {
  _x.set(-c.rx, -c.ry, -c.rz); _y.set(c.ux, c.uy, c.uz); _z.set(c.fx, c.fy, c.fz);
  return out.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
}
function snapshot(c, o) { o.p.set(c.x, c.y, c.z); carQuat(c, o.q); }
function bodyGap(c, p, q) {
  const x = q.x - p.x, y = q.y - p.y, z = q.z - p.z;
  return Math.hypot(Math.max(0, Math.abs(x * c.fx + y * c.fy + z * c.fz) - 2.3), Math.max(0, Math.abs(x * c.rx + y * c.ry + z * c.rz) - 1), Math.max(0, Math.abs(x * c.ux + y * c.uy + z * c.uz) - 0.6));
}
function pose(obj, p, c, a, out) {
  out.set(c.x, c.y, c.z).sub(p.p).multiplyScalar(a).add(p.p);
  obj.position.copy(out);
  obj.quaternion.copy(p.q).slerp(carQuat(c, _q), a);
}

const PAD_KEYS = { throttle: 'RT', brake: 'LT', boost: 'B', lift: 'A', slide: 'X', rollLeft: 'LB', rollRight: 'RB', reset: 'Y', restart: 'BACK' };
const onPad = () => input.state.device === 'gamepad';
const key = (a) => `<kbd>${onPad() ? PAD_KEYS[a] : keyLabel((settings.keys[a] || [])[0])}</kbd>`;
function medalDot(m) { return `<i class="medal ${m ? m.id : ''}"></i>`; }

function eventRows() {
  return EVENTS.map((ev, k) => {
    const b = book[ev.id]?.best, gp = ev.kind === 'gp', dare = ev.kind === 'dare';
    const ladder = gp ? PODIUM.map((m, j) => ({ ...m, time: `P${j + 1}`, t: j + 1 })) : ev.kind === 'pr' ? [] : dare ? (DARE_MEDALS[ev.id] || []).map(([id, name, t]) => ({ id, name, time: `${t}`, t })) : medalTimes(authorTime(ev.id)).map((m) => ({ ...m, time: fmt(m.t) }));
    return {
      id: ev.id, name: ev.name, circuit: !!ev.circuit,
      tag: ev.spur ? 'DR' : ev.id === 'hl' ? 'HL' : ev.circuit ? ev.kind.slice(0, 2).toUpperCase() : k === 0 ? 'RUN' : `S${k}`,
      best: gp ? (b ? `P${b}` : '') : dare ? (b ? `${b}` : '') : b ? fmt(b) : '',
      medal: medalOf(ev),
      kicker: ev.spur ? `${venue.name} · Dare${dare ? '' : ' · Time attack'}` : ev.circuit ? `${venue.name} · ${dare ? 'Dare' : ev.kind === 'pr' ? 'Free laps' : ev.laps === 1 ? 'One lap' : `${ev.laps} laps`}` : k === 0 ? `${venue.name} · Full run` : `Practice · Sector ${k}`,
      brief: BRIEF[ev.id] || '',
      ladder: ladder.map((m) => ({ id: m.id, name: m.name, time: m.time, got: !!b && (dare ? b >= m.t : b <= m.t) })),
      bestLabel: ev.kind === 'pr' ? '' : gp ? 'BEST FINISH' : dare ? 'BEST SCORE' : 'PERSONAL BEST',
      board: boardScopes(ev).length > 0,
    };
  });
}

function dailyRow() {
  const v = VENUES[DAILY.venue];
  return {
    id: 'daily', name: `Daily · ${DARES[DAILY.event] || (DAILY.event === 'hl' ? 'Hot Lap' : 'Time Trial')}`, circuit: true, tag: 'DY', best: '', medal: null, ladder: [], bestLabel: '', board: !!DAILY_EV,
    kicker: `${TODAY} · ${v.name}${DAILY_EV ? '' : ' · loads the venue'}`,
    brief: `${DAILY.title ? `${DAILY.title}. ` : ''}One card for everyone until 00:00 UTC.${API ? ' Your run goes on the daily board, and the top twenty race beside you.' : ' The daily board is offline, so the card plays without it.'}`,
  };
}

function startDaily() {
  if (DAILY_EV) { startRace(DAILY_EV, true); return; }
  settings.venue = DAILY.venue;
  saveSettings();
  params.delete('venue');
  params.set('daily', '');
  location.search = params.toString();
}

function venueRows() {
  return Object.values(VENUES).map((v) => {
    const set = Object.values(v.id === 'proving' ? save.events : save.venues[v.id] || {}).filter((e) => e?.best).length;
    const total = v.circuit ? 4 + (v.dares?.length || 0) : v.course.pieces.filter((p) => p.sector).length + 1;
    return { id: v.id, name: v.name, place: v.place, note: `${set} of ${total} set` };
  });
}


const LB = 10, allTime = (ev) => ev.id === 'hl' || ev.kind === 'dare' || !!ev.spur;
const boardScopes = (ev) => [ev === DAILY_EV && 'day', allTime(ev) && 'all'].filter(Boolean);
const lb = { ev: null, scope: 'all', offset: 0, state: '', data: null, seq: 0 };
async function loadBoard() {
  const seq = ++lb.seq;
  lb.state = API ? 'loading' : 'offline';
  menu.refresh();
  if (!API) return;
  try {
    const res = await fetch(`${API}/board/${venue.id}.${lb.ev.id}/${lb.scope === 'day' ? TODAY : 'all'}?limit=${LB}&offset=${lb.offset}&player=${save.player}`);
    if (!res.ok) throw new Error(`board ${res.status}`);
    const data = await res.json();
    if (seq === lb.seq) Object.assign(lb, { data, state: data.total ? 'ok' : 'empty' });
  } catch (e) {
    console.warn('board', e);
    if (seq === lb.seq) lb.state = 'offline';
  }
  menu.refresh();
}
function openBoard(ev, scope) {
  const scopes = ev ? boardScopes(ev) : [];
  if (!scopes.length) return false;
  Object.assign(lb, { ev, scope: scopes.includes(scope) ? scope : scopes[0], offset: 0, data: null });
  loadBoard();
  return true;
}
function boardView() {
  const ev = lb.ev, d = lb.state === 'ok' ? lb.data : null, dare = ev.kind === 'dare';
  const line = (r) => ({ rank: r.rank, name: r.name, value: dare ? `${r.score}` : fmt(r.total), me: r.id === d.me?.id });
  return {
    title: ev.name, state: lb.state, kicker: `${venue.name} · ${lb.scope === 'day' ? `Daily · ${TODAY}` : 'All-time'}`, scopes: boardScopes(ev), scope: lb.scope,
    message: { loading: 'Loading the board…', offline: 'The board is offline. Times are not loading right now.', empty: `No runs on this board yet. Finish one to set the first ${dare ? 'score' : 'time'}.` }[lb.state] || '',
    rows: d ? d.rows.map(line) : [], around: d?.around ? d.around.map(line) : [],
    mine: d?.me ? `${d.me.rank} of ${d.total}` : '', range: d ? `RANKS ${lb.offset + 1}–${lb.offset + d.rows.length} OF ${d.total}` : '',
    prev: !!d && lb.offset > 0, next: !!d && lb.offset + LB < d.total,
  };
}
async function raceBoardRow(i) {
  const d = lb.data, row = d && [...d.rows, ...(d.around || [])][i];
  if (!row || lb.state !== 'ok') return;
  const got = await (await import('./share.js')).openLink(row.id, API);
  if (!got) { lb.state = 'offline'; menu.refresh(); return; }
  if (menu.page !== 'leaders') return;
  linked = got;
  launch(() => startRace(lb.ev, false));
}

const RESUME = 'voltitude.resume';
const menu = createMenu({
  settings,
  data: { events: () => [dailyRow(), ...eventRows()], venues: venueRows, pause: () => pauseView(race, current, venue.name), leaders: boardView },
  on: {
    sound(kind) { audio.start(); audio.event(kind === 'drive' ? 'slot' : kind === 'deny' ? 'miss' : 'ui'); },
    drive(i) { launch(() => (i ? startRace(EVENTS[i - 1]) : startDaily())); },
    venue: (id) => switchVenue(id),
    resume: () => resume(),
    restart: () => startRace(current),
    quit: () => toTitle(),
    next() { const n = EVENTS[current.card]; if (n) { menu.open('board', { index: n.card }); startRace(n); } },
    replay: () => watchReplay(),
    share: () => openShare(),
    change(k) {
      saveSettings();
      if (k === 'volume') audio.setVolume(settings.volume);
      if (k === 'music') audio.setMusicVolume();
      if (k === 'quality' || k === 'session') { try { sessionStorage.setItem(RESUME, 'settings'); } catch { } location.reload(); }
    },
    keys: () => saveSettings(),
    leaders: (i) => (i === null ? openBoard(lastResult.board.ev, lastResult.board.scope) : openBoard(i ? EVENTS[i - 1] : DAILY_EV, i ? 'all' : 'day')),
    page(dir) {
      const at = lb.offset + dir * LB;
      if (lb.state !== 'ok' || at < 0 || at >= lb.data.total) return false;
      lb.offset = at;
      loadBoard();
      return true;
    },
    scope() {
      const scopes = boardScopes(lb.ev);
      if (scopes.length < 2) return false;
      Object.assign(lb, { scope: scopes.find((x) => x !== lb.scope), offset: 0, data: null });
      loadBoard();
      return true;
    },
    race: (i) => raceBoardRow(i),
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
  dailyRun = false;
  mode = 'title';
  hud.show(false);
  $('replayBug').hidden = true;
  menu.open('board');
  current = EVENTS[menu.selected - 1] || DAILY_EV || EVENTS[0];
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
  if (linked?.run.event === ev.id) return linked.run;
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

function updateTower() {
  if (current.circuit) updateField();
  else hud.tower([]);
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

function startRace(ev = current, daily = dailyRun && ev === current) {
  dailyRun = daily;
  dailyGhosts = [];
  submitted = null;
  for (const v of dailyViews) v.root.visible = false;
  const line = raceCount > 0 ? (Math.random() < 0.3 ? 'again' : '') : 'radio_check';
  raceCount++;
  said = new Set();
  replay = null;
  sectorColors = [];
  current = ev;
  lastSeed = ev.kind === 'gp' ? 1 + Math.floor(Math.random() * 1e6) : 1;
  race = createRace(world, { event: ev, assist: settings.assist, seed: lastSeed, tier: settings.tier });
  if (daily && API) loadDailyGhosts(ev);
  lineup?.set(race.dare?.count ?? 0);
  recorder = createRecorder();
  carView.wash();
  ghost = settings.ghost || linked?.run.event === ev.id ? createGhost(world, ghostRun(ev)) : null;
  const ref = ev.kind === 'tt' ? lapSplits(ghostRun(ev)) : null;
  bestLap = 0; lapRef = ref ? ref.cum : null; contactCount = 0; clears = [];
  race.entries.forEach((e, k) => { if (k) snapshot(e.car, rprev[k - 1]); });
  rivalViews.forEach((v, k) => { v.root.visible = k + 1 < race.entries.length; });
  if (ghost) { ensureGhostView().root.visible = true; snapshot(ghost.race.car, gprev); } else if (ghostView) ghostView.root.visible = false;
  snapshot(race.car, prev);
  const c0 = race.car;
  if (garage.active && !settings.reduced) chase.from({ position: _x.set(c0.x - c0.fx * 3.4 - c0.rx * 2.2, c0.y + 0.9, c0.z - c0.fz * 3.4 - c0.rz * 2.2), fov: 38, filmOffset: 0 }, prev.p);
  else chase.snap();
  finishAt = 0;
  style = 0;
  mode = 'race';
  menu.close();
  hud.show(true);
  hud.begin(ev, targetFor(ev));
  const own = book[ev.id]?.run?.v === SIM_VERSION;
  if (ev.kind === 'dare') {
    const b = book[ev.id]?.best || 0, next = (DARE_MEDALS[ev.id] || []).slice().reverse().find((m) => b < m[2]);
    hud.els.target.textContent = [b ? `BEST ${b}` : '', next ? `${next[1].toUpperCase()} ${next[2]}` : ''].filter(Boolean).join(' · ');
  } else if (ev.circuit) hud.els.target.textContent = ref ? `${linked?.run.event === ev.id ? (linked.name || 'GHOST').toUpperCase() : own ? 'BEST' : 'AUTHOR LAP'} ${fmt(ref.t)}` : '';
  hud.sectorsBegin(ev.kind === 'dare' ? 0 : ev.circuit ? ev.perLap : ev.cps.length);
  hud.tower([]);
  updateTower();
  audio.start();
  if (line) setTimeout(() => audio.radio(line), 150);
  audio.mute(false);
}

function pause() {
  if (mode !== 'race' || race.phase === 'finished') return;
  mode = 'paused';
  audio.mute(true);
  hud.show(false);
  menu.open('pause');
}
function resume() { mode = 'race'; resumeAt = performance.now() + 700; audio.mute(false); hud.show(true); menu.close(); hud.toast('READY', 'white'); }

function watchReplay() {
  startReplay();
  if (!replay) return;
  mode = 'replay';
  $('replayBug').hidden = false;
}
function endReplay() { replay = null; $('replayBug').hidden = true; mode = 'results'; }

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4];
let clears = [], contactCount = 0, lastContact = -999, lastGainTick = -1, wreckToast = null, resumeAt = 0;
let resultsAt = 0;
const speedUnit = () => (settings.units === 'kmh' ? 3.6 : 2.237);
const medalLine = (m, before) => (m ? { id: m.id, name: m.name, fresh: !(before && before.id === m.id) } : null);
async function loadDailyGhosts(ev) {
  const r0 = race;
  try {
    const board = await (await fetch(`${API}/board/${venue.id}.${ev.id}/${TODAY}`)).json();
    const runs = await Promise.all(board.rows.slice(0, 20).map((row) => fetch(`${API}/runs/${row.id}`).then((r) => r.json())));
    if (race !== r0) return;
    for (const { run } of runs) {
      const g = createGhost(world, run);
      if (!g) continue;
      while (g.race.tick < race.tick) g.step();
      g.prev = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
      snapshot(g.race.car, g.prev);
      dailyGhosts.push(g);
    }
    while (dailyViews.length < dailyGhosts.length) { const v = createCarView({ quality: 'low', envMap, ghost: true }); v.root.visible = false; scene.add(v.root); dailyViews.push(v); }
  } catch (e) { console.warn('daily ghosts', e); }
}

async function postRun(result, day) {
  if (day) { result.note = API ? 'Posting to the daily board…' : 'Daily board offline'; menu.refresh(); }
  if (!API) return;
  const run = lastRun, score = race.dare?.score, ev = current, note = result.note;
  try {
    const og = await ogImage().catch((e) => { console.warn('og', e); return null; });
    const res = await fetch(`${API}/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ venue: venue.id, run, score, day, name: settings.callsign, player: save.player, og }) });
    const body = await res.json();
    if (!res.ok && res.status !== 409) throw new Error(body.error);
    submitted = body.id || null;
    result.board = { ev, scope: day ? 'day' : 'all' };
    const rank = res.ok ? `${body.best ? 'Rank' : 'Your best ranks'} ${body.rank} of ${body.players} · ${day ? 'daily' : 'all-time'}` : 'This exact run is already on the board';
    if (day) {
      const board = await (await fetch(`${API}/board/${venue.id}.${ev.id}/${day}?limit=8&player=${save.player}`)).json();
      result.note = `${rank} · ${settings.callsign}`;
      result.title = 'DAILY BOARD';
      result.rows = board.rows.map((r) => ({ label: `${r.rank}. ${r.name}`, value: r.score ?? fmt(r.total), tag: r.id === board.me?.id ? 'YOU' : '', tone: r.id === board.me?.id ? 'good' : '' }));
    } else result.note = [rank, note].filter(Boolean).join('. ');
  } catch (e) {
    console.warn('post', e);
    if (day) result.note = 'Daily board offline';
  }
  menu.refresh();
}

let lastResult = null;
function showResults(result, m, before, best = false) {
  hud.show(false);
  mode = 'results';
  resultsAt = performance.now();
  lastResult = result;
  menu.open('results', { results: result });
  if (dailyRun) postRun(result, TODAY);
  else if (best && allTime(current)) postRun(result);
  garage.cut();
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
  const valid = race.laps.filter((t, k) => !me.invalid.includes(k));
  const bestLapT = valid.length ? Math.min(...valid) : 0;
  const lapRow = (t, k) => {
    if (me.invalid.includes(k)) return { dot: '', label: `Lap ${k + 1}`, value: fmt(t), tag: 'INVALID', tone: 'bad' };
    return { dot: t === bestLapT ? 'purple' : '', label: `Lap ${k + 1}`, value: fmt(t), tag: t === bestLapT ? 'BEST' : fmtDelta(t - bestLapT), tone: t === bestLapT ? 'good' : 'bad' };
  };
  const penalty = me.penalty >= 0.05 ? ` · ${me.penalty.toFixed(1)} s track limits` : '';
  const review = lapReview(race.splits, ev.perLap);
  const styleKey = `${venue.id}.${ev.id}`, styleBest = (save.style ||= {})[styleKey] || 0;
  if (style > styleBest) { save.style[styleKey] = style; persist(); }
  showResults({
    card: `${venue.name} · ${ev.name}`, pos: gp ? me.pos : 0, field: race.entries.length, medal: medalLine(m, before),
    time: fmt(race.total), delta, note: gp ? `${me.passes || 0} overtakes · ${contactCount} contacts${penalty}` : linked?.run.event === ev.id ? `Linked ghost ${fmt(linked.run.total)} · you ${fmtDelta(race.total - linked.run.total)}` : [review.worst?.loss > 12 && `Most time lost in sector ${review.worst.sector} of lap ${review.worst.lap}: ${(review.worst.loss / 120).toFixed(2)} s off your own best`, penalty.slice(3)].filter(Boolean).join(' · '),
    title: 'LAPS', rows: race.laps.map(lapRow),
    stats: [{ label: 'Top speed', value: `${Math.round(race.maxSpeed * speedUnit())} ${settings.units === 'kmh' ? 'KM/H' : 'MPH'}` }, { label: 'Best lap', value: bestLapT ? fmt(bestLapT) : '—' }, ...(review.ideal ? [{ label: 'Ideal lap', value: fmt(review.ideal) }] : []), { label: 'Resets', value: `${race.respawns}` }, { label: style > styleBest && styleBest ? 'Style · new best' : 'Style', value: `${style}` }],
    hasNext: !!EVENTS[ev.card],
  }, m, before, record && !me.invalid.length);
}

function bankDare(ev) {
  const best = book[ev.id]?.best || 0;
  if (race.dare.score > best) { book[ev.id] = { best: race.dare.score }; persist(); }
  return best;
}

function finishDare(ev) {
  const before = medalOf(ev), d = race.dare, best = bankDare(ev), m = dareMedal(ev.id, d.score);
  lastRun = encodeRun(race, recorder.bytes());
  const speed = `${Math.round(race.maxSpeed * speedUnit())} ${settings.units === 'kmh' ? 'KM/H' : 'MPH'}`;
  const result = ev.dare === 'ramp'
    ? rampResults({ card: `${venue.name} · ${ev.name}`, score: d.score, best, tries: d.tries, speed, hasNext: !!EVENTS[ev.card] })
    : dareResults({ card: `${venue.name} · ${ev.name}`, score: d.score, best, line: d.count, clears, speed, hasNext: !!EVENTS[ev.card] });
  if (linked?.run.event === ev.id) {
    const g = createGhost(world, linked.run);
    while (g.race.raceTick < linked.run.total && g.race.phase !== 'finished') g.step();
    result.note = `Linked ghost scored ${g.race.dare.score} · ${d.score > g.race.dare.score ? 'you beat it' : d.score === g.race.dare.score ? 'a tie' : 'it beat you'}`;
  }
  result.medal = medalLine(m, before);
  showResults(result, m, before, d.score > best);
}

function finish() {
  if (current.kind === 'dare') { finishDare(current); return; }
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
    card: ev.id === 'full' ? `${venue.name} · Full run` : ev.spur ? `${venue.name} · ${ev.name}` : `Practice · S${ev.card - 1} ${ev.name}`, pos, field: field.length + 1, medal: medalLine(m, before),
    time: fmt(race.total), delta,
    note: worst >= 0 && worstLoss > 12 ? `Most time lost ${worst === rows.length - 1 ? 'on the run to the finish' : `before checkpoint ${worst + 1}`}: ${(worstLoss / 120).toFixed(2)} s against ${refName}.` : '',
    title: 'SPLITS', rows: rows.map((r) => ({ dot: sectorColors[r.i] || '', label: r.i === rows.length - 1 ? 'Finish' : `CP ${r.i + 1}`, value: fmt(r.seg), tag: r.has ? fmtDelta(r.loss) : '', tone: r.loss <= 0 ? 'good' : 'bad' })),
    stats: [{ label: 'Top speed', value: `${Math.round(race.maxSpeed * speedUnit())} ${settings.units === 'kmh' ? 'KM/H' : 'MPH'}` }, { label: 'Air', value: `${(race.airTime / 120).toFixed(1)} s` }, { label: 'Tricks', value: `${race.tricks}` }, { label: 'Resets', value: `${race.respawns}` }],
    hasNext: !!EVENTS[ev.card],
  }, m, before, record);
}

const HINT_HTML = {
  boost: () => `Hold ${key('boost')} to fire the rear thrusters`,
  air: () => `In the air: ${onPad() ? '<kbd>LS</kbd>' : key('throttle') + key('brake')} tilt the nose. Land on your wheels`,
  lift: () => `Hold ${key('lift')} in the air to hover`,
  flip: () => `${onPad() ? 'Push <kbd>LS</kbd> all the way' : `Hold ${key('brake')} alone`} to flip. ${key('rollLeft')}${key('rollRight')} roll`,
  slide: () => `Hold ${key('slide')} in a corner to slide. Slides refill the tank`,
  hop: () => `Tap ${key('lift')} on the ground to hop over a rival`,
  reset: () => `${key('reset')} puts you back on the road`,
  gas: () => 'Tank empty. Near misses, clean landings, slides and drafting refill it',
};
const nextHint = createHints();
function hints() {
  const id = touch?.on ? null : nextHint(race, save.hints);
  if (!id) return;
  save.hints[id] = (save.hints[id] || 0) + 1;
  persist();
  hud.hint(HINT_HTML[id]());
}

function handleEvents() {
  for (const e of race.events) {
    style += stylePoints(e);
    carFx.event(e, race.car, e.type === 'contact' ? race.entries[e.other]?.car : null);
    switch (e.type) {
      case 'light': hud.light(e.n); audio.light(e.n); break;
      case 'go': cheerNear(0.7); hud.light(0); audio.lightsOut(); input.rumble(0.5, 0.4, 160); chase.bump(0.15); break;
      case 'check': {
        if (race.dare) break;
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
        updateTower();
        const last = e.index === current.cps.length - 2;
        audio.radio(color === 'purple' ? 'purple' : last ? 'last_sector' : color === 'green' ? 'green' : Math.random() < 0.4 ? 'yellow' : '');
        break;
      }
      case 'lap': {
        if (race.dare) break;
        const per = current.perLap;
        const base = e.lap > 1 ? race.splits[(e.lap - 1) * per - 1] : 0;
        const first = !bestLap;
        const improved = !e.invalid && (!bestLap || e.t < bestLap);
        if (lapRef && bestLap) hud.delta(e.t - bestLap, false); else if (lapRef) hud.delta(e.t - lapRef[per - 1], false);
        if (improved) { bestLap = e.t; lapRef = race.splits.slice((e.lap - 1) * per, e.lap * per).map((x) => x - base); }
        if (bestLap) hud.els.target.textContent = `BEST ${fmt(bestLap)}`;
        hud.toast(`LAP ${e.lap}`, e.invalid ? 'red' : improved && !first ? 'gold' : 'white', e.invalid ? `${fmt(e.t)} · INVALID` : improved && !first ? `${fmt(e.t)} · BEST LAP` : fmt(e.t));
        if (e.lap < current.laps) { audio.event('lap', e.lap + 1); if (e.lap + 1 === current.laps) { audio.event('final_lap'); hud.toast('FINAL LAP', 'white'); } }
        if (improved && !first) audio.event('fastest');
        stands.cheer(0.35);
        setTimeout(() => hud.sectorsBegin(per), 1500);
        break;
      }
      case 'pass': if (e.gained) { hud.toast(`P${race.pos}`, race.pos === 1 ? 'gold big' : 'good', race.pos === 1 ? 'LEADING' : ''); audio.event('overtake', race.pos === 1 ? 1 : 0); } else { hud.toast(`P${race.pos}`, 'red'); audio.event('overtaken'); } updateTower(); break;
      case 'contact': if (e.tick - lastContact > 40) { contactCount++; audio.event('contact', e.v); } lastContact = e.tick; input.rumble(Math.min(1, e.v / 8), 0.3, 120); chase.bump(Math.min(0.6, e.v / 14)); break;
      case 'near_miss': { const o = race.entries[e.other]?.car, c = race.car, s = o ? (o.x - c.x) * c.rx + (o.y - c.y) * c.ry + (o.z - c.z) * c.rz : 0; if (s >= 0) rushR = 1; if (s <= 0) rushL = 1; } audio.event('near_miss'); stands.wave(race.car); cheerNear(0.45); break;
      case 'track_limits': hud.toast('TRACK LIMITS', 'orange', `+${e.gain.toFixed(1)} S · TOTAL ${race.penalty.toFixed(1)} S`); audio.event('miss'); break;
      case 'clear': {
        clears.push(e);
        lineup.set(race.dare.count);
        hud.toast(`+${e.count * e.mult} CLEARED${e.mult > 1 ? ` ×${e.mult}` : ''}`, e.hard ? 'white' : e.mult >= 3 ? 'gold big' : 'good', `LINE ${race.dare.count} NEXT`);
        audio.event('clear', e.mult); input.rumble(0.4, 0.6, 180); chase.punch(-0.25 * e.mult); chase.bump(0.15 * e.mult); cheerNear(0.5 + 0.2 * e.mult);
        break;
      }
      case 'clip': lineup.clip(e.k); hud.toast('CLIPPED', 'red', `SCORE ${e.score} · ${key('restart')} RETRY`); audio.event('clip', 1); cheerNear(0.2, 'gasp'); input.rumble(1, 0.6, 320); chase.bump(1.2); chase.stall(0.08); break;
      case 'wide': hud.toast('WIDE', 'white', 'TAKE OFF OVER THE ROW'); audio.event('miss'); break;
      case 'release': hud.toast('LIP', 'white', 'ROLL OUT'); chase.punch(0.4); cheerNear(0.4); break;
      case 'try': {
        const why = { wreck: 'WRECKED', stall: 'STALLED', reset: 'RESET' }[e.why];
        hud.toast(why || `+${e.points}`, why ? 'red' : e.rolls ? 'good' : 'white', why ? `TRY ${e.n} · NO SCORE` : `${Math.round(e.align * 100)}% SQUARE · ${Math.round(e.kept * 100)}% SPEED${e.rolls ? ` · ${e.rolls} ROLL${e.rolls > 1 ? 'S' : ''}` : ''}`);
        if (!why) cheerNear(0.4 + 0.2 * e.rolls);
        break;
      }
      case 'retry': wreckToast?.remove(); if (!settings.reduced) post.uniforms.uFlash.value = 0.3; chase.snap(); snapshot(race.car, prev); break;
      case 'gate': (spurGates[current.spur] || gates).pass(e.index); audio.event('gate'); input.rumble(0.25, 0.5, 140); break;
      case 'gas_gain': hud.gasGain(e.source, e.amount); if (e.amount >= 0.05 && e.tick !== lastGainTick) { lastGainTick = e.tick; audio.event('slot', e.amount); } break;
      case 'pad': hud.toast('BOOST PAD', 'orange'); audio.event('boost'); input.rumble(0.2, 0.6, 180); chase.bump(0.35); post.uniforms.uFlash.value = 0.25; break;
      case 'land': {
        const names = e.tricks.length ? [...new Set(e.tricks)].map((t) => { const n = e.tricks.filter((x) => x === t).length; return (n > 1 ? `${n}× ` : '') + t.toUpperCase(); }).join(' + ') : '';
        if (e.quality !== 'hard') cheerNear(e.tricks.length ? 0.9 : e.quality === 'perfect' ? 0.5 : 0.25);
        if (e.quality === 'perfect') { hud.toast(names || 'PERFECT LANDING', e.tricks.length >= 2 ? 'gold big' : 'good'); audio.event('perfect'); input.rumble(0.45, 0.6, 160); chase.bump(0.3); chase.punch(-0.6); }
        else if (e.quality === 'clean') { hud.toast(names || 'CLEAN', 'white'); audio.event('clean'); input.rumble(0.3, 0.3, 140); chase.bump(0.2); chase.punch(-0.3); }
        else { hud.toast('HARD LANDING', 'red', '−10% SPEED'); audio.event('impact'); input.rumble(0.9, 0.4, 220); chase.bump(0.9); chase.stall(0.05); }
        if (e.quality === 'hard') audio.radio('hard');
        else if (e.tricks.length) audio.radio('flip');
        else if (e.air > 2.5) sayOnce('big_air');
        else if (e.quality === 'perfect' && Math.random() < 0.35) audio.radio('perfect');
        break;
      }
      case 'wreck': if (!settings.reduced) post.uniforms.uFlash.value = 0.5; cheerNear(0.2, 'gasp'); if (standGap(race.car.hint) < 260) audio.cheer('gasp'); audio.radio('wreck'); wreckToast = hud.toast('WRECKED', 'red'); audio.event('clip', 1); input.rumble(1, 0.6, 320); chase.bump(1.2); chase.stall(0.08); break;
      case 'scrape': audio.event(e.angle > 0.35 ? 'impact' : 'scrape', e.v); input.rumble(Math.min(1, e.v / 15) * (e.angle > 0.35 ? 1 : 0.4), 0.3, 120); if (e.angle > 0.35) chase.bump(0.25); break;
      case 'impact': audio.event('impact'); input.rumble(Math.min(1, e.v / 20), 0.4, 160); chase.bump(Math.min(1, e.v / 15)); break;
      case 'respawn': wreckToast?.remove(); hud.toast('RESET', 'white'); if (!settings.reduced) post.uniforms.uFlash.value = 0.3; audio.event('respawn'); chase.snap(); snapshot(race.car, prev); break;
      case 'finish': {
        if (race.dare) { finishAt = performance.now(); break; }
        if (current.circuit) {
          const k = track.finish % track.lap * 3;
          for (const side of [-1, 1]) fireworks.show(finishAtPos.set(track.P[k] + track.R[k] * side * 32, track.P[k + 1], track.P[k + 2] + track.R[k + 2] * side * 32), race.order[0] === race ? 5 : 3, 24);
          const p = current.kind === 'gp' ? race.pos : 0;
          audio.event('finish', p);
          hud.toast(p === 1 ? 'WINNER' : p ? `P${p}` : 'FINISH', p && p <= 3 ? 'good' : 'white', p ? 'FINISH' : '');
          finishAt = performance.now(); stands.party(); input.rumble(p === 1 ? 1 : 0.6, p === 1 ? 0.8 : 0.6, p === 1 ? 700 : 400); break;
        }
        const pb = book[current.id]?.best;
        if (!pb || race.total < pb) {
          const ft = race.world.track, k = Math.min(ft.n - 1, current.to + 70) * 3;
          for (const side of [-1, 1]) fireworks.show(finishAtPos.set(ft.P[k] + ft.R[k] * side * 32, ft.P[k + 1], ft.P[k + 2] + ft.R[k + 2] * side * 32), pb ? 4 : 3, 24);
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
    if (race.dare) lineup.set(race.dare.count);
    if (!clipping && race.phase === 'finished' && ++replayEnd > 300) startReplay();
    return;
  }
  if (ghost) snapshot(ghost.race.car, gprev);
  for (const g of dailyGhosts) { snapshot(g.race.car, g.prev); g.step(); }
  const racer = current.circuit && !current.spur && current.kind !== 'dare';
  if (autoplay && racer) botInput(race, simIn, 0.97);
  else if ((autoplay || race.phase === 'finished') && !racer) autopilot(race, simIn, 1);
  else { Object.assign(simIn, input.state); touch?.apply(simIn, DT, race.car.mode === 0); }
  if (race.phase !== 'finished') {
    packInput(simIn, packed, 0);
    unpackInput(packed, 0, simIn);
    recorder.push(simIn);
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
  if (hit && $('share').hidden) menu.point(hit.zone, hit, click);
}
canvas.addEventListener('pointermove', (e) => aimAt(e, false));
canvas.addEventListener('click', (e) => aimAt(e, true));
addEventListener('keydown', (e) => {
  if (!menu.listening) return;
  e.preventDefault();
  e.stopPropagation();
  menu.capture(e.code, e.key);
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
  if (!$('share').hidden) { if (any('Escape')) closeShare(); return; }
  const pad = (...ids) => ids.some((i) => input.padPressed(i));
  const back = any('Escape') || pad(1);
  if (mode === 'race') {
    if (any('Escape', 'KeyP') || pad(9)) pause();
    else if (input.actionPressed('restart') || pad(8)) {
      const over = race.phase === 'finished' || race.dare?.over;
      if (over && race.dare && !dailyRun) bankDare(current);
      if (!over || (race.dare && !dailyRun)) startRace(current);
    }
  } else if (mode === 'replay') {
    if (back || any('Enter', 'Space') || pad(0, 9)) endReplay();
  } else if (menu.page) {
    const page = menu.page, home = page === 'pause' || page === 'results';
    const cmd = any('ArrowUp', 'KeyW') || pad(12) ? 'up' : any('ArrowDown', 'KeyS') || pad(13) ? 'down' : any('ArrowLeft', 'KeyA', 'BracketLeft') || pad(14, 4) ? 'left' : any('ArrowRight', 'KeyD', 'BracketRight') || pad(15, 5) ? 'right' : any('Enter', 'Space') || pad(0) ? 'confirm' : back ? 'back' : padNav();
    if (cmd && !(cmd === 'confirm' && page === 'results' && performance.now() - resultsAt < 600)) menu.command(cmd);
    else if (any('KeyO')) menu.command('settings');
    else if (any('KeyL') || (page === 'board' && pad(2))) menu.command('leaders');
    else if (page === 'leaders' && (any('KeyT') || pad(3))) menu.command('scope');
    else if (page === 'pause' && pad(9)) resume();
    else if (page === 'results' && pad(9)) menu.command('confirm');
    else if (home && (input.actionPressed('restart') || pad(8))) startRace(current);
    else if (page === 'results' && (any('KeyN') || pad(3))) menu.command('next');
    else if (page === 'results' && (any('KeyV') || pad(2))) menu.command('replay');
    else if (page === 'results' && any('KeyC')) menu.command('share');
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('gamepaddisconnected', () => pause());
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
const perf = (window.__perf = { frames: [], scale: [], calls: 0, tris: 0, longest: 0, scene, camera, tier: PHONE ? 'phone' : 'desktop', bench: 0 });
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
if (!Object.keys(book).length) { menu.open('board', { index: 1 }); current = EVENTS[0]; }
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
if (!PHONE && !params.has('tier')) {
  const t0 = performance.now();
  let n = 0;
  const gl = renderer.getContext(), px = new Uint8Array(4);
  while (performance.now() - t0 < 1000 && n < 30) { post.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); n++; }
  perf.bench = (performance.now() - t0) / n;
  if (perf.bench > 28) { post.lite = true; perf.tier = 'lite'; }
}
progress(1, 'Ready');
const readyAt = performance.now();
if (params.has('event')) { const ev = EVENTS.find((e) => e.id === params.get('event')); if (ev) { menu.open('board', { index: ev.card }); current = ev; } }
const dailyBoot = params.has('daily') && !!DAILY_EV;
if (params.has('daily') && DAILY_EV) { menu.open('board', { index: 0 }); current = DAILY_EV; params.delete('daily'); history.replaceState(null, '', `?${params}${location.hash}`); }
let resumePage = null;
try { resumePage = sessionStorage.getItem(RESUME); sessionStorage.removeItem(RESUME); } catch { }
if (resumePage === 'settings') menu.command('settings');
garage.intro();
if (linked && EVENTS.some((e) => e.id === linked.run.event)) { current = EVENTS.find((e) => e.id === linked.run.event); menu.open('board', { index: current.card }); }
if (dailyBoot) startRace(DAILY_EV, true); else if (params.has('autostart') || linked?.run.event === current.id) startRace(current);

let last = performance.now(), acc = 0, time = 0, garageView = null, clipping = false;
let warmFrames = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (clipping) { last = now; return; }
  if (warmFrames >= 0 && ++warmFrames > 8 && (now - last < 20 || performance.now() - readyAt > 1500)) { warmFrames = -1; $('loading').classList.add('done'); $('hero').pause(); }
  const ms = now - last;
  last = now;
  const dt = Math.min(0.1, ms / 1000);
  perf.frames.push(ms);
  if (perf.frames.length > 20000) perf.frames.shift();
  adaptResolution(ms);
  draw(dt);
}

function draw(dt, ticks = -1) {
  renderer.info.reset();
  if (ticks < 0) { input.poll(dt); menuKeys(); }
  if (touch && (touch.on !== (mode === 'race') || touch.dare !== (current.kind === 'dare'))) touch.show(mode === 'race', current.kind === 'dare');
  const inGarage = mode === 'title' || mode === 'paused' || mode === 'results';
  if (inGarage !== garage.active) {
    garage.setActive(inGarage, scene, garageKeep);
    if (!inGarage && ghostView && !ghost) ghostView.root.visible = false;
  }
  const running = (mode === 'race' && performance.now() >= resumeAt) || mode === 'replay';
  if (running) {
    if (ticks >= 0) { for (let n = 0; n < ticks; n++) tick(); acc = 0; }
    else {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 12) { tick(); acc -= DT; n++; }
      if (n === 12) acc = 0;
    }
    time += dt;
  }
  if (mode === 'race' && race.phase === 'finished' && finishAt && performance.now() - finishAt > (race.dare ? 700 : 2200)) { finishAt = 0; finish(); }
  if (!running) time += dt;
  const a = running || mode === 'race' ? acc / DT : 1;
  const c = inGarage ? idleCar : race.car;
  if (inGarage) { carView.root.position.copy(garage.carPosition); carView.root.quaternion.copy(garage.carQuaternion); interp.copy(garage.carPosition); } else pose(carView.root, prev, c, a, interp);
  carView.update(dt, c, time);
  if (!inGarage) for (let k = 0; k < rivalViews.length; k++) {
    const v = rivalViews[k], e = race.entries[k + 1];
    if (!e) { v.root.visible = false; continue; }
    pose(v.root, rprev[k], e.car, a, rInterp);
    v.root.visible = rInterp.distanceToSquared(interp) < 500 * 500 && bodyGap(e.car, rInterp, camera.position) > 2;
    if (v.root.visible) v.update(dt, e.car, time, rInterp.distanceTo(interp));
  }
  const near = dailyGhosts.map((g, k) => [Math.hypot(g.race.car.x - interp.x, g.race.car.z - interp.z), k]).sort((x, y) => x[0] - y[0]);
  near.forEach(([d, k], rank) => {
    const v = dailyViews[k], g = dailyGhosts[k];
    if (!v) return;
    v.root.visible = !inGarage && mode === 'race' && rank < 8 && d > 3 && g.race.phase !== 'finished';
    if (!v.root.visible) return;
    pose(v.root, g.prev, g.race.car, a, rInterp);
    v.update(dt, g.race.car, time);
  });
  if (!inGarage && ghost && ghostView) {
    pose(ghostView.root, gprev, ghost.race.car, a, gInterp);
    ghostView.update(dt, ghost.race.car, time);
    const gd = gInterp.distanceTo(interp);
    ghostView.root.visible = gd > 3 && ghost.race.phase !== 'finished';
  }
  const pixelScale = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  if (!inGarage) dust.update(time, dt, interp, c, pixelScale);
  carView.vapour.update(time, pixelScale);
  flora.update(time);
  if (!inGarage && running) skids.update(carView.root.matrixWorld, c, dt);
  if (!inGarage) carFx.update(dt, time, c, carView.root.matrixWorld, renderer.domElement.width, renderer.domElement.height, pixelScale, running);
  if (inGarage) {
    if (menu.dirty || menu.listening || garage.sliding) {
      garageView = menu.view();
      garage.draw(garageView, time);
      if (menu.dirty) $('menuLive').textContent = describe(garageView);
      menu.clean();
    }
    garage.update(dt, time, garageView, camera, pointer);
  } else if (mode === 'replay' && (current.spur || (clipping && !broadcast.onLine(c.hint)))) chase.update(dt, interp, c, { reduced: false });
  else if (mode === 'replay') broadcast.update(dt, interp, c);
  else chase.update(dt, interp, c, { reduced: settings.reduced });
  if (fixedCam) { camera.position.fromArray(fixedCam, 0); if (fixedCam.length > 7) camera.up.fromArray(fixedCam, 7); else camera.up.set(0, 1, 0); camera.lookAt(fixedCam[3], fixedCam[4], fixedCam[5]); if (camera.fov !== fixedCam[6]) { camera.fov = fixedCam[6]; camera.filmOffset = 0; camera.updateProjectionMatrix(); } }
  if (!inGarage) {
    course.update(time, dt, race);
    facility.update(time);
    venueArt?.update(time, camera, NIGHT ? 1 : 0);
    stands.update(time, dt, NIGHT ? 1 : 0, camera);
    const px = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
    festival.update(time, px, race);
    range.update(time, px, NIGHT ? 1 : 0);
    fireworks.update(time, px);
    gates.update(time, dt, px);
    for (const g of Object.values(spurGates)) g.update(time, dt, px);
    lineup?.update(dt);
  }
  c.clearance = c.mode === 0 ? 6 : 0; c.contact = c.mode !== 0; c.wy = c.yawRate; c.bank = 0; c.impact = 0;
  audio.listen(camera);
  c.kerb = c.mode !== 0 && Math.abs(c.lat) > race.world.track.halfW[c.hint] - 1.7;
  if (mode === 'race' && c.boosting && !boostWas) { boostKick = 1; chase.punch(1); input.rumble(0.15, 0.6, 200); }
  boostWas = c.boosting;
  if (mode === 'race' && race.dare?.armed && !armedWas) { chase.punch(0.5); audio.event('lip'); input.rumble(0.3, 0.5, 160); }
  armedWas = !!race.dare?.armed;
  if (mode === 'race' && c.kerb && c.speed > 4 && time - kerbAt > 0.08) { kerbAt = time; input.rumble(0, Math.min(0.4, c.speed / 90), 100); }
  if (mode === 'race' && c.lifting && !liftWas) input.rumble(0.1, 0.45, 180);
  liftWas = c.lifting;
  audio.update(c, running);
  if (mode === 'race') {
    hints();
    if (race.phase === 'racing') {
      if (c.mode === 1 && c.uy < -0.5) sayOnce('inverted');
      else if (c.mode === 1 && c.uy < 0.3) sayOnce('wall');
      if (c.boosting && c.gas < 0.2 && time - gasLowAt > 20) { gasLowAt = time; audio.radio('gas_low'); }
      if (c.gas >= 1 && gasWas < 1) sayOnce('gas_full');
      if (race.entries.length > 1 && race.pos === 1) { if (!leadAt) leadAt = time; else if (time - leadAt > 15 && !said.has('leading')) { said.add('leading'); audio.event('leading'); } } else leadAt = 0;
    }
    gasWas = c.gas;
  }
  audio.crowd(inGarage ? 0.25 : 1);
  if (mode === 'race') hud.update(dt, race, camera, ghost ? gInterp : null, interp);
  followSun(interp);
  const pu = post.uniforms;
  pu.uExposure.value = inGarage ? (NIGHT ? 1.3 : 1.2) : exposureFor(SESSION);
  post.auto.uOn.value = inGarage ? 0 : 1;
  skyMesh.material.uniforms.uGain.value = inGarage && !NIGHT ? 2.3 : 1;
  if (NIGHT) facility.floodLight(sun.lights[0], inGarage ? null : interp);
  else for (const l of sun.lights) l.intensity = inGarage ? 6.2 : sunIrradiance;
  const sp = Math.min(1, Math.max(0, Math.min((c.speed - 20) / 55, 0.75 + (c.speed - 60) / 220)));
  pu.uBlur.value = settings.reduced ? 0 : sp * 0.7 + (c.boosting ? 0.25 : 0);
  pu.uHeat.value = NIGHT ? 0 : SESSION === 'golden' ? 0.5 : 1;
  skyUniforms.uCloud.value = SESSION === 'day' && !inGarage ? 0.55 : 0;
  skyUniforms.uCloudT.value = time;
  boostKick *= Math.exp(-dt * 5); rushL *= Math.exp(-dt * 3.5); rushR *= Math.exp(-dt * 3.5);
  pu.uAberration.value = settings.reduced ? 0 : (c.boosting ? 0.012 : 0) + sp * 0.004 + boostKick * 0.05;
  pu.uWind.value = settings.reduced || inGarage ? 0 : Math.min(1, Math.max(0, (c.speed - (c.boosting ? 50 : 64)) / 26)) * (c.boosting ? 1 : 0.6);
  pu.uRush.value.set(settings.reduced || inGarage ? 0 : rushL, settings.reduced || inGarage ? 0 : rushR);
  pu.uTime.value = time;
  pu.uFlash.value *= Math.exp(-dt * 6);
  carView.reflect(renderer, scene, camera, inGarage);
  post.render(scene, camera);
  perf.calls = renderer.info.render.calls;
  perf.tris = renderer.info.render.triangles;
  perf.scale.push(scale);
  if (perf.scale.length > 20000) perf.scale.shift();
  if (ticks < 0) input.endFrame();
}
requestAnimationFrame(loop);

let shareFile = null;
const shareEls = () => ({ sheet: $('share'), pick: $('sharePick'), done: $('shareDone'), fill: $('shareFill'), note: $('shareNote') });
function openShare() {
  const el = shareEls();
  shareFile = null;
  el.sheet.hidden = false; el.pick.hidden = false; el.done.hidden = true;
  el.fill.style.transform = 'scaleX(0)';
  el.note.textContent = lastRun ? '' : 'Finish a run first.';
  for (const b of el.pick.querySelectorAll('button')) b.disabled = !lastRun;
  el.pick.querySelector('button').focus();
}
function closeShare() { if (clipping) return; $('share').hidden = true; }
async function makeClip(portrait) {
  const el = shareEls(), t0 = performance.now();
  for (const b of el.pick.querySelectorAll('button')) b.disabled = true;
  el.note.textContent = 'Rendering the clip…';
  try {
    const clip = await exportClip({ seconds: 10, portrait, onProgress: (k) => { el.fill.style.transform = `scaleX(${k.toFixed(3)})`; } });
    const score = race.dare ? race.dare.score : fmt(lastRun.total).replace(/[:.]/g, '-');
    shareFile = new File([clip.blob], `voltitude-${current.id}-${score}.mp4`, { type: 'video/mp4' });
    el.note.textContent = `Ready in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${(clip.blob.size / 1048576).toFixed(1)} MB${clip.audio ? '' : ' · no sound in this browser'}`;
    el.pick.hidden = true; el.done.hidden = false;
    $('shareSend').hidden = !(navigator.canShare && navigator.canShare({ files: [shareFile] }));
    ($('shareSend').hidden ? $('shareSave') : $('shareSend')).focus();
  } catch (e) {
    el.note.textContent = `This browser could not make the clip: ${e.message}`;
    for (const b of el.pick.querySelectorAll('button')) b.disabled = false;
  }
}
async function ghostUrl() {
  if (submitted) return `${API}/r/${submitted}`;
  const { encodeLink } = await import('./share.js');
  return `${location.origin}${location.pathname}#g=${await encodeLink(lastRun, venue.id)}`;
}

function peakTick(run) {
  const g = createGhost(world, run), { track } = g.race.world;
  let best = Math.max(0, run.total - 240), top = 2;
  while (g.race.phase !== 'finished' && g.race.tick < 120 * 600) {
    g.step();
    const c = g.race.car, alt = c.y - track.H[c.hint * 3 + 1];
    if (c.mode === 0 && c.uy > 0.7 && alt > top) { top = alt; best = g.race.raceTick; }
  }
  return best;
}

async function ogImage() {
  if (!lastRun || clipping) return null;
  const [width, height] = [1200, 630], at = peakTick(lastRun);
  const out = Object.assign(document.createElement('canvas'), { width, height }), g2 = out.getContext('2d');
  clipping = true;
  const was = { mode, aspect: camera.aspect, race };
  try {
    replay = createGhost(world, lastRun);
    while (replay.race.phase === 'countdown' || replay.race.raceTick < at - 40) replay.step();
    race = replay.race;
    mode = 'replay';
    snapshot(race.car, prev);
    chase.snap();
    if (ghostView) ghostView.root.visible = false;
    ghost = null;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (let f = 0; f < 20; f++) draw(1 / 60, 2);
    g2.drawImage(renderer.domElement, 0, 0, width, height);
    const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.85));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  } finally {
    replay = null;
    race = was.race;
    mode = was.mode;
    renderer.setPixelRatio(scale);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = was.aspect;
    camera.updateProjectionMatrix();
    clipping = false;
  }
}
$('sharePick').addEventListener('click', (e) => { const f = e.target.closest('button')?.dataset.fmt; if (f) makeClip(f === 'portrait'); });
$('shareClose').addEventListener('click', closeShare);
$('shareSave').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(shareFile); a.download = shareFile.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
$('shareSend').addEventListener('click', async () => {
  const url = await ghostUrl();
  navigator.share({ files: [shareFile], title: 'Voltitude', text: `Beat my run: ${url}` }).catch(() => {});
});
$('shareLink').addEventListener('click', async () => {
  const url = await ghostUrl();
  const ok = await navigator.clipboard?.writeText(url).then(() => true, () => false);
  shareEls().note.textContent = ok ? 'Ghost link copied. Anyone who opens it races your run.' : url;
});

async function exportClip({ seconds = 10, portrait = true, onProgress } = {}) {
  if (!lastRun || clipping) return null;
  const [width, height] = portrait ? [1080, 1920] : [1920, 1080];
  const { renderClip } = await import('./clip/render.js');
  const fps = 60, ev = current, d = race.dare;
  const card = d ? { title: ev.name, value: `${d.score}`, sub: `${venue.name} · ${ev.dare === 'ramp' ? `${d.tries.length} tries` : `line ${d.count}`}` } : { title: ev.name, value: fmt(lastRun.total), sub: venue.name };
  clipping = true;
  const was = { mode, aspect: camera.aspect, race };
  try {
    replay = createGhost(world, lastRun);
    const from = Math.max(0, lastRun.total - seconds * 120);
    while (replay.race.phase === 'countdown' || replay.race.raceTick < from) replay.step();
    race = replay.race;
    mode = 'replay';
    snapshot(race.car, prev);
    race.entries.forEach((e, k) => { if (k) snapshot(e.car, rprev[k - 1]); });
    broadcast.reset();
    chase.snap();
    if (ghostView) ghostView.root.visible = false;
    ghost = null;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const frames = Math.round(Math.min(seconds * 120, lastRun.total - from + 120) / 2);
    const pre = createGhost(world, lastRun), cues = [], speeds = [];
    while (pre.race.phase === 'countdown' || pre.race.raceTick < from) pre.step();
    let armed = !!pre.race.dare?.armed;
    for (let f = 0; f < frames; f++) for (let k = 0; k < 2; k++) {
      const sink = [], t = (f * 2 + k) / 120;
      pre.step(sink);
      for (const e of sink) cues.push({ ...e, t });
      if (pre.race.dare && pre.race.dare.armed && !armed) cues.push({ type: 'lip', t });
      armed = !!pre.race.dare?.armed;
      if (k) speeds.push(pre.race.car.speed);
    }
    const { mixClip } = await import('./clip/audio.js');
    const audio = await mixClip({ seconds: frames / fps, cues, speeds, fps }).catch((e) => { console.warn('clip audio', e); return null; });
    return { ...(await renderClip({ source: renderer.domElement, width, height, fps, frames, card, audio, onProgress, step: () => draw(1 / fps, 2) })), cues };
  } finally {
    replay = null;
    race = was.race;
    mode = was.mode;
    renderer.setPixelRatio(scale);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = was.aspect;
    camera.updateProjectionMatrix();
    clipping = false;
  }
}
