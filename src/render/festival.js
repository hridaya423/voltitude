import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { lineFor } from '../sim/driver.js';
import { ROSTER } from '../sim/drivers.js';
import { trackClearance } from './props.js';
import { skyFog } from './sky.js';

const FLAG_COLORS = ['#e3263b', '#f4f2ee', '#1069f0', '#ffc21a', '#17a84f', '#ff6a14', '#08a6ab', '#111216'];
const TENT_COLORS = ['#f4f2ee', '#e3263b', '#f4f2ee', '#1b1d22', '#f4f2ee', '#08a6ab'];
const VIEW_COS = 0.8, VIEW_NEAR = 12, VIEW_FAR = 260, BLEACH = 34, ROWS = 5, RISE = 0.5, STEP = 0.9;
const CAMPER_COLORS = ['#f1efea', '#e9e2d3', '#d8dde3', '#f1efea', '#2f8f8a', '#c9b48f'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function festivalSites(world, gaps = [9, 24, 44]) {
  const { track, terrain } = world, N = track.lap, line = lineFor(track), clear = trackClearance(track);
  const cams = [];
  for (let i = 0; i < N; i += 10) {
    const k = i * 3, l = Math.hypot(track.T[k], track.T[k + 2]) || 1;
    cams.push({ x: track.H[k] + track.R[k] * line.off[i] - track.T[k] * 7, z: track.H[k + 2] + track.R[k + 2] * line.off[i] - track.T[k + 2] * 7, fx: track.T[k] / l, fz: track.T[k + 2] / l });
  }
  const sites = [];
  for (let i = 0; i < N; i += 6) {
    const k = i * 3;
    if (track.gap[i] || track.loopMask[i] || track.U[k + 1] < 0.95) continue;
    for (const side of [-1, 1]) for (const gap of gaps) {
      const lat = side * ((side < 0 ? track.wallL[i] : track.wallR[i]) + gap);
      const x = track.P[k] + track.R[k] * lat, z = track.P[k + 2] + track.R[k + 2] * lat;
      if (clear(x, z) < gap - 2) continue;
      const y = terrain.height(x, z), road = track.P[k + 1];
      if (Math.abs(y - road) > 5) continue;
      let rough = 0;
      for (const [a, b] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) rough = Math.max(rough, Math.abs(terrain.height(x + a, z + b) - y));
      if (rough > 2.5) continue;
      let score = 0;
      for (const c of cams) {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
        if (d < VIEW_NEAR || d > VIEW_FAR) continue;
        const cos = (dx * c.fx + dz * c.fz) / d;
        if (cos < VIEW_COS) continue;
        score += ((cos - VIEW_COS) / (1 - VIEW_COS)) * (60 / (d + 30));
      }
      if (score > 0) sites.push({ i, side, gap, x, y, z, score, yaw: Math.atan2(-track.R[k] * side, -track.R[k + 2] * side) });
    }
  }
  return sites.sort((a, b) => b.score - a.score);
}

function pick(list, used, n, spacing, test = () => true) {
  const out = [];
  for (const s of list) {
    if (out.length >= n) break;
    if (!test(s) || used.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < (spacing + u.r) / 2)) continue;
    out.push(s);
    used.push({ x: s.x, z: s.z, r: spacing });
  }
  return out;
}

function flagMaterial(sunUniform, fogDensity, uniforms) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        float a = uv.x;
        transformed.z += a * (0.35 * sin(uTime * 5.5 - a * 4.0 + ph) + 0.12 * sin(uTime * 11.0 - a * 7.0 + ph * 1.7));
        transformed.y += a * a * 0.12 * sin(uTime * 4.0 + ph);`);
  });
  return m;
}

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = (lines, phase) => {
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 512, 288);
    grd.addColorStop(0, '#0b0f1a'); grd.addColorStop(1, '#1d0a14');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#e3263b'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 278, 512, 10);
    g.strokeStyle = 'rgba(127,227,255,0.35)'; g.lineWidth = 2;
    for (let x = -288; x < 512; x += 36) { g.beginPath(); g.moveTo(x + (phase % 36), 288); g.lineTo(x + 288 + (phase % 36), 0); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4f2ee';
    g.font = '600 46px Michroma, Saira, sans-serif'; g.fillText(lines[0], 256, 118);
    g.fillStyle = '#7fe3ff'; g.font = '600 26px Saira, sans-serif'; g.fillText(lines[1], 256, 186);
    t.needsUpdate = true;
  };
  return { texture: t, draw };
}

function tentGeometry() {
  const roof = new THREE.ConeGeometry(4.6, 2.2, 4, 1, true).rotateY(Math.PI / 4).translate(0, 4.1, 0);
  const legs = [-1, 1].flatMap((a) => [-1, 1].map((b) => new THREE.CylinderGeometry(0.06, 0.06, 3, 5).translate(a * 3.1, 1.5, b * 3.1)));
  const valance = new THREE.CylinderGeometry(4.4, 4.4, 0.45, 4, 1, true).rotateY(Math.PI / 4).translate(0, 2.85, 0);
  return [roof, valance, ...legs].map((g) => g.toNonIndexed());
}

function truckGeometry() {
  const box = new THREE.BoxGeometry(2.5, 3.2, 13.6).translate(0, 2.55, -1.2);
  const cab = new THREE.BoxGeometry(2.45, 2.9, 2.3).translate(0, 2.2, 6.9);
  const skirt = new THREE.BoxGeometry(2.4, 0.8, 15.8).translate(0, 0.65, -0.1);
  return { body: [box, cab].map((g) => g.toNonIndexed()), dark: skirt.toNonIndexed() };
}

function droneSwarm(count, centre, radius) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = i / count;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCentre: { value: centre }, uR: { value: radius }, uScale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform vec3 uCentre; uniform float uR; uniform float uScale;
      varying vec3 vC;
      vec3 ring(float s) { float a = s * 6.2832; return vec3(cos(a) * uR, 18.0 * sin(a * 3.0 + uTime * 0.6), sin(a) * uR); }
      vec3 grid(float s) { float n = 22.0; float i = floor(s * n * n / n); float j = mod(floor(s * n * n), n); return vec3((j - n * 0.5) * uR / 9.0, (i - n * 0.5) * uR / 14.0 + uR * 0.4, 0.0); }
      vec3 bolt(float s) { float t = fract(s * 3.0); float k = floor(s * 3.0); vec2 p = k < 1.0 ? mix(vec2(0.2, 1.0), vec2(-0.25, 0.05), t) : k < 2.0 ? mix(vec2(-0.25, 0.05), vec2(0.25, -0.05), t) : mix(vec2(0.25, -0.05), vec2(-0.2, -1.0), t); return vec3(p.x * uR * 1.2, p.y * uR * 0.9 + uR * 0.4, 0.0); }
      void main() {
        float ph = mod(uTime / 9.0, 3.0), k = smoothstep(0.0, 0.35, fract(ph));
        vec3 a = ph < 1.0 ? ring(aSeed) : ph < 2.0 ? grid(aSeed) : bolt(aSeed);
        vec3 b = ph < 1.0 ? grid(aSeed) : ph < 2.0 ? bolt(aSeed) : ring(aSeed);
        vec3 p = uCentre + mix(a, b, k) + vec3(0.0, 0.6 * sin(uTime * 2.0 + aSeed * 40.0), 0.0);
        float hue = fract(aSeed + uTime * 0.05);
        vC = mix(vec3(0.5, 0.9, 1.0), vec3(1.0, 0.25, 0.35), step(0.5, fract(hue * 2.0))) * 2.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uScale * 0.9 / -mv.z, 1.5, 7.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.1, d), 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

function helicopter(sunUniform, fogDensity) {
  const body = new THREE.MeshStandardMaterial({ color: '#e3263b', roughness: 0.35, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.5, metalness: 0.4 });
  skyFog(body, sunUniform, fogDensity); skyFog(dark, sunUniform, fogDensity);
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 3.2, 4, 10).rotateX(Math.PI / 2), body);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 5.5, 8).rotateX(Math.PI / 2).translate(0, 0.35, -4.4), body);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.9).translate(0, 1.0, -7), dark);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2.4).translate(0, 0.2, 1.5), dark);
  const skids = new THREE.Mesh(mergeGeometries([-0.9, 0.9].map((x) => new THREE.BoxGeometry(0.1, 0.1, 3.4).translate(x, -1.5, 0))), dark);
  const rotor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24).rotateX(-Math.PI / 2).translate(0, 1.35, 0), new THREE.MeshBasicMaterial({ color: '#1a1b20', transparent: true, opacity: 0.28, depthWrite: false }));
  g.add(hull, boom, fin, glass, skids, rotor);
  return g;
}

export function createFestival(world, sunUniform, fogDensity, night, stands) {
  const { track, terrain } = world, N = track.lap;
  const group = new THREE.Group(), rand = rng(7 + N);
  const sites = festivalSites(world);
  const start = track.sectors[0].i;
  const near = (s, from, d) => Math.min((s.i - from + N) % N, (from - s.i + N) % N) < d;
  const used = (stands?.centres || []).map((c) => ({ x: c.x, z: c.z, r: 70 }));
  for (const sp of Object.values(world.track.spurs || {})) for (let i = 0; i < sp.n; i += 10) used.push({ x: sp.P[i * 3], z: sp.P[i * 3 + 2], r: 40 });
  const ground = (x, z, r) => Math.min(terrain.height(x, z), terrain.height(x + r, z), terrain.height(x - r, z), terrain.height(x, z + r), terrain.height(x, z - r));
  const uniforms = { uTime: { value: 0 } };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const place = (x, z, yaw, r) => { p.set(x, ground(x, z, r), z); q.setFromAxisAngle(up, yaw); return m4.compose(p, q, s1); };
  const local = (s, ax, az) => ({ x: s.x + Math.cos(s.yaw) * ax + Math.sin(s.yaw) * az, z: s.z - Math.sin(s.yaw) * ax + Math.cos(s.yaw) * az });

  const stage = pick(sites, used, 1, 60, (s) => s.gap >= 24 && near(s, start, 450))[0];
  const paddock = pick(sites, used, 1, 80, (s) => s.gap >= 44 && near(s, start, 900))[0];
  const clear = trackClearance(track);
  const fits = (s) => s.gap === 9 && [-BLEACH / 2, BLEACH / 2].every((a) => { const e = local(s, a, 0); return clear(e.x, e.z) > 7; });
  const zones = [];
  for (const a of track.jumps ?? []) for (const at of [a.lip - 40, a.to + 20]) zones.push(...pick(sites, used, 1, 44, (s) => fits(s) && near(s, (at + N) % N, 120)));
  zones.push(...pick(sites, used, 26, 44, fits));
  const flagSites = pick(sites, used, 8, 30, (s) => s.gap === 24);
  const tentSites = pick(sites, used, 8, 40, (s) => s.gap >= 24);
  const camps = pick(sites, used, 26, 60, (s) => s.gap === 44);

  const white = new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.55, metalness: 0.1 });
  const steel = new THREE.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.45, metalness: 0.7 });
  const canvas = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const livery = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.25 });
  for (const m of [white, steel, canvas, livery]) skyFog(m, sunUniform, fogDensity);
  const flagMat = flagMaterial(sunUniform, fogDensity, uniforms);
  const lights = [];

  let screen = null;
  if (stage) {
    const parts = { w: [], s: [] };
    parts.w.push(new THREE.BoxGeometry(18, 1.6, 10).translate(0, 0.8, 0));
    for (const x of [-9, 9]) for (const z of [-5, 5]) parts.s.push(new THREE.BoxGeometry(0.6, 11, 0.6).translate(x, 5.5, z));
    parts.s.push(new THREE.BoxGeometry(19.2, 0.9, 0.9).translate(0, 11, -5), new THREE.BoxGeometry(19.2, 0.9, 0.9).translate(0, 11, 5));
    parts.w.push(new THREE.BoxGeometry(20, 0.4, 11.5).translate(0, 11.7, 0));
    for (const x of [-15.5, 15.5]) parts.s.push(new THREE.BoxGeometry(0.5, 12, 0.5).translate(x, 6, 0));
    const merge = (list, mat) => { const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => g.toNonIndexed())), mat); mesh.applyMatrix4(place(stage.x, stage.z, stage.yaw, 10)); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); };
    merge(parts.w, white); merge(parts.s, steel);
    screen = screenTexture();
    screen.draw(['VOLTITUDE', 'THRUSTER FESTIVAL · PROVING GROUND'], 0);
    const smat = new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: true });
    for (const x of [-15.5, 15.5]) {
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.1).translate(x, 9.5, 0.3), smat);
      scr.applyMatrix4(place(stage.x, stage.z, stage.yaw, 10));
      group.add(scr);
    }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(17, 9).translate(0, 6.2, -4.6), smat);
    back.applyMatrix4(place(stage.x, stage.z, stage.yaw, 10));
    group.add(back);
    for (let k = 0; k < 7; k++) { const at = local(stage, -7.5 + k * 2.5, 4.6); lights.push([at.x, ground(stage.x, stage.z, 10) + 11.2, at.z, k % 2 ? '#7fe3ff' : '#ff4a5c', 1.4]); }
  }

  if (paddock) {
    const truck = truckGeometry(), bodies = [], skirts = [];
    const trucks = ROSTER.slice(0, 6);
    const tbody = new THREE.InstancedMesh(mergeGeometries(truck.body), livery, trucks.length);
    const tskirt = new THREE.InstancedMesh(truck.dark, steel, trucks.length);
    trucks.forEach((r, k) => {
      const at = local(paddock, -22 + k * 8.5, -6);
      place(at.x, at.z, paddock.yaw + Math.PI / 2, 7);
      tbody.setMatrixAt(k, m4); tskirt.setMatrixAt(k, m4);
      tbody.setColorAt(k, new THREE.Color(r.color));
    });
    for (const mesh of [tbody, tskirt]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
    const camper = new THREE.BoxGeometry(2.3, 2.8, 6.4).translate(0, 1.7, 0);
    const campers = new THREE.InstancedMesh(camper, white, 8);
    for (let k = 0; k < 8; k++) {
      const at = local(paddock, -26 + k * 7 + rand() * 2, 26 + rand() * 6);
      place(at.x, at.z, paddock.yaw + (rand() - 0.5) * 0.4, 4);
      campers.setMatrixAt(k, m4);
    }
    campers.castShadow = true; campers.receiveShadow = true;
    group.add(campers);
    for (let k = 0; k < 6; k++) { const at = local(paddock, -20 + k * 8, 10); tentSites.push({ ...paddock, x: at.x, z: at.z, cluster: 1 }); }
  }

  const tentParts = tentGeometry(), tentList = [];
  for (const s of tentSites) {
    const count = s.cluster ? 1 : 3;
    for (let k = 0; k < count; k++) {
      const at = s.cluster ? s : local(s, (k - 1) * 10.5, 0);
      tentList.push({ x: at.x, z: at.z, yaw: s.yaw + Math.PI / 4 * (k % 2), color: TENT_COLORS[Math.floor(rand() * TENT_COLORS.length)] });
    }
  }
  if (tentList.length) {
    const tents = new THREE.InstancedMesh(mergeGeometries(tentParts), canvas, tentList.length);
    tentList.forEach((t, k) => { place(t.x, t.z, t.yaw, 4); tents.setMatrixAt(k, m4); tents.setColorAt(k, new THREE.Color(t.color)); });
    tents.castShadow = true; tents.receiveShadow = true;
    group.add(tents);
    for (const t of tentList) for (let k = 0; k < 4; k++) { const a = t.yaw + k * Math.PI / 2 + Math.PI / 4; lights.push([t.x + Math.cos(a) * 4.3, ground(t.x, t.z, 4) + 3.1, t.z + Math.sin(a) * 4.3, '#ffcf8a', 0.7]); }
  }

  if (camps.length) {
    const vans = [], domes = [];
    for (const c of camps) {
      for (let k = 0; k < 5; k++) { const at = local(c, -18 + k * 9 + (rand() - 0.5) * 3, -4 + (rand() - 0.5) * 6); vans.push({ ...at, yaw: c.yaw + Math.PI / 2 + (rand() - 0.5) * 0.6, color: CAMPER_COLORS[Math.floor(rand() * CAMPER_COLORS.length)] }); }
      for (let k = 0; k < 7; k++) { const at = local(c, -20 + rand() * 40, 5 + rand() * 9); domes.push({ ...at, yaw: rand() * 6.28, color: FLAG_COLORS[Math.floor(rand() * FLAG_COLORS.length)] }); }
      for (const a of [-24, 24]) { const at = local(c, a, 3); flagSites.push({ ...c, ...at, single: 1 }); }
    }
    const van = new THREE.InstancedMesh(mergeGeometries([new THREE.BoxGeometry(2.3, 2.6, 6.2).translate(0, 1.6, 0).toNonIndexed(), new THREE.BoxGeometry(2.0, 0.7, 2.2).translate(0, 3.2, 0.6).toNonIndexed()]), livery, vans.length);
    const dome = new THREE.InstancedMesh(new THREE.SphereGeometry(1.7, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1.25), canvas, domes.length);
    vans.forEach((v, k) => { place(v.x, v.z, v.yaw, 3); van.setMatrixAt(k, m4); van.setColorAt(k, new THREE.Color(v.color)); });
    domes.forEach((v, k) => { place(v.x, v.z, v.yaw, 1.5); dome.setMatrixAt(k, m4); dome.setColorAt(k, new THREE.Color(v.color)); });
    for (const mesh of [van, dome]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  }

  const poles = [], flags = [];
  for (const s of flagSites) {
    const k = s.i * 3, along = Math.atan2(track.T[k], track.T[k + 2]);
    for (let n = s.single ? 0 : -5; n <= (s.single ? 0 : 5); n++) {
      const back = s.single ? 0 : s.gap - 4;
      const x = s.x + track.T[k] * n * 4.5 - track.R[k] * s.side * back, z = s.z + track.T[k + 2] * n * 4.5 - track.R[k + 2] * s.side * back;
      poles.push({ x, z, yaw: along });
      flags.push({ x, z, yaw: along + (rand() - 0.5) * 0.5, color: FLAG_COLORS[(n + 5 + s.i) % FLAG_COLORS.length] });
    }
  }
  if (poles.length) {
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 7.5, 5).translate(0, 3.75, 0), steel, poles.length);
    const flag = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 1.5, 8, 1).translate(1.3, 6.6, 0), flagMat, flags.length);
    poles.forEach((o, k) => { place(o.x, o.z, o.yaw, 0.5); pole.setMatrixAt(k, m4); });
    flags.forEach((o, k) => { place(o.x, o.z, o.yaw, 0.5); flag.setMatrixAt(k, m4); flag.setColorAt(k, new THREE.Color(o.color)); });
    pole.castShadow = true; flag.castShadow = true;
    group.add(pole, flag);
  }

  if (zones.length) {
    const w = [], d = [], seats = [];
    for (const z of zones) {
      const base = Math.min(...[-0.5, 0, 0.5].map((a) => { const e = local(z, a * BLEACH, 4); return terrain.height(e.x, e.z); }));
      p.set(z.x, base, z.z); q.setFromAxisAngle(up, z.yaw); m4.compose(p, q, s1);
      const parts = [new THREE.BoxGeometry(BLEACH, 1.2, ROWS * STEP + 1).translate(0, -0.6, 5.5 - (ROWS - 1) * STEP / 2)];
      for (let r = 0; r < ROWS; r++) parts.push(new THREE.BoxGeometry(BLEACH, RISE, STEP * (r + 1)).translate(0, r * RISE + RISE / 2, 5.5 + STEP / 2 - STEP * (r + 1) / 2));
      const back = 5.5 - ROWS * STEP;
      const frame = [new THREE.BoxGeometry(BLEACH + 0.4, 0.25, 0.25).translate(0, ROWS * RISE + 1.1, back)];
      for (let c = -4; c <= 4; c++) frame.push(new THREE.BoxGeometry(0.16, ROWS * RISE + 4.2, 0.16).translate(c * BLEACH / 8, (ROWS * RISE + 4.2) / 2 - 1.2, back));
      frame.push(new THREE.BoxGeometry(BLEACH, 1.6, 0.08).translate(0, ROWS * RISE + 2.2, back - 0.1));
      w.push(...parts.map((g) => g.toNonIndexed().applyMatrix4(m4)));
      d.push(...frame.map((g) => g.toNonIndexed().applyMatrix4(m4)));
      if (!stands?.people) continue;
      for (let r = 0; r < ROWS; r++) for (let x = -BLEACH / 2 + 0.6 + (r % 2) * 0.3; x < BLEACH / 2 - 0.6; x += 0.62) {
        if (rand() < 0.05) continue;
        p.set(x + (rand() - 0.5) * 0.14, (r + 1) * RISE, 5.5 - r * STEP - STEP / 2 + (rand() - 0.5) * 0.2).applyMatrix4(m4);
        const c = Math.floor((x + BLEACH / 2) / (BLEACH / 2)), mid = local(z, (c - 0.5) * BLEACH / 2, 3);
        seats.push({
          x: p.x, y: p.y, z: p.z, yaw: z.yaw + (rand() - 0.5) * 0.7, scale: 0.94 + rand() * 0.12,
          char: stands.people.pickChar(rand()), seed: [rand(), rand(), rand(), rand()],
          chunk: `fz:${z.i}:${z.side}:${c}`, center: new THREE.Vector3(mid.x, base + 2, mid.z), radius: BLEACH / 4 + 6,
        });
      }
    }
    const mw = new THREE.Mesh(mergeGeometries(w), white), md = new THREE.Mesh(mergeGeometries(d), steel);
    for (const mesh of [mw, md]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
    if (seats.length) stands.people.addSeats(seats);
  }

  const heli = helicopter(sunUniform, fogDensity);
  group.add(heli);
  let cx = 0, cz = 0, ext = 0;
  for (let i = 0; i < N; i += 20) { cx += track.P[i * 3]; cz += track.P[i * 3 + 2]; }
  cx /= Math.ceil(N / 20); cz /= Math.ceil(N / 20);
  for (let i = 0; i < N; i += 20) ext = Math.max(ext, Math.hypot(track.P[i * 3] - cx, track.P[i * 3 + 2] - cz));
  const orbitY = terrain.height(cx, cz) + 120, orbitR = ext * 0.55;

  let drones = null;
  if (night) {
    const at = stage ? local(stage, 0, -90) : { x: cx, z: cz };
    drones = droneSwarm(360, new THREE.Vector3(at.x, ground(at.x, at.z, 0) + 70, at.z), 34);
    group.add(drones);
  }

  let bulbs = null;
  if (night && lights.length) {
    const pos = new Float32Array(lights.length * 3), col = new Float32Array(lights.length * 3), size = new Float32Array(lights.length);
    const c = new THREE.Color();
    lights.forEach(([x, y, z, hex, sz], k) => { pos.set([x, y, z], k * 3); c.set(hex); col.set([c.r * 3, c.g * 3, c.b * 3], k * 3); size[k] = sz; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    bulbs = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: 'attribute vec3 color; attribute float aSize; uniform float uScale; varying vec3 vC; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vC = color; gl_PointSize = clamp(aSize * uScale * 0.12 / -mv.z, 1.5, 9.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.0, d), 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    bulbs.frustumCulled = false;
    group.add(bulbs);
  }

  let lastDraw = -1;
  return {
    group,
    used,
    sites: { stage, paddock, zones, flags: flagSites, tents: tentSites },
    finishAt(out) { const k = track.finish * 3; return out.set(track.P[k], track.P[k + 1], track.P[k + 2]); },
    update(time, scale, race) {
      uniforms.uTime.value = time;
      const a = time * 0.09;
      heli.position.set(cx + Math.cos(a) * orbitR, orbitY + Math.sin(time * 0.3) * 4, cz + Math.sin(a) * orbitR);
      heli.rotation.set(0.06 * Math.sin(time * 0.4), -a, 0.12);
      heli.children[5].rotation.y = time * 40;
      if (drones) { drones.material.uniforms.uTime.value = time; drones.material.uniforms.uScale.value = scale; }
      if (bulbs) bulbs.material.uniforms.uScale.value = scale;
      if (screen && race && Math.floor(time) !== lastDraw) {
        lastDraw = Math.floor(time);
        const lead = race.order?.[0], lap = Math.min((race.laps?.length || 0) + 1, race.event?.laps || 1);
        screen.draw(race.phase === 'racing' && lead ? [`P1 ${lead.identity.code}`, `LAP ${lap} · ${Math.round(race.car.speed * 2.237)} MPH ON BOARD`] : ['VOLTITUDE', 'THRUSTER FESTIVAL'], time * 30);
      }
    },
  };
}
