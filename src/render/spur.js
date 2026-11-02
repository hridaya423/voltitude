import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { roadBody, panelMaterial } from './road.js';
import { skyFog } from './sky.js';
import { merged } from './venue-kit.js';

const SLAB = 0.7, POST = 0.5, BAY = 4, PANEL = 6;

function supports(track, height, from, to) {
  const out = [];
  const { P, U, R, halfW } = track;
  const v = new THREE.Vector3();
  for (let i = from; i < to; i += BAY) {
    const k = i * 3, w = halfW[i] + 0.6;
    const ends = [];
    for (const s of [-1, 1]) {
      v.set(P[k] + R[k] * w * s - U[k] * SLAB, P[k + 1] + R[k + 1] * w * s - U[k + 1] * SLAB, P[k + 2] + R[k + 2] * w * s - U[k + 2] * SLAB);
      const g = height(v.x, v.z), h = v.y - g;
      if (h < 1.2) continue;
      out.push(new THREE.BoxGeometry(POST, h, POST).translate(v.x, g + h / 2, v.z));
      ends.push(v.clone());
    }
    if (ends.length === 2 && U[k + 1] < -0.5) {
      const mid = ends[0].clone().add(ends[1]).multiplyScalar(0.5), len = ends[0].distanceTo(ends[1]);
      const beam = new THREE.BoxGeometry(len, 0.6, 0.6);
      beam.lookAt(new THREE.Vector3().subVectors(ends[1], ends[0]).cross(new THREE.Vector3(0, 1, 0)));
      out.push(beam.translate(mid.x, mid.y + 0.3, mid.z));
    }
  }
  return out;
}

function chevrons(track, from, to) {
  const out = [];
  const { P, U, R, T, halfW } = track;
  const m = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  for (let i = from; i < to; i += 2) {
    const k = i * 3, w = halfW[i] + 0.31;
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(1.6, 0.5);
      x.set(T[k], T[k + 1], T[k + 2]); y.set(U[k], U[k + 1], U[k + 2]); z.set(R[k] * s, R[k + 1] * s, R[k + 2] * s);
      m.makeBasis(x, y, z).setPosition(P[k] + R[k] * w * s + U[k] * 0.62, P[k + 1] + R[k + 1] * w * s + U[k + 1] * 0.62, P[k + 2] + R[k + 2] * w * s + U[k + 2] * 0.62);
      g.applyMatrix4(m);
      const c = new THREE.Color(((i - from) >> 1) % 2 ? '#f4f1ea' : '#d7261e'), n = g.attributes.position.count;
      g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, j) => [c.r, c.g, c.b][j % 3]), 3));
      out.push(g);
    }
  }
  return out;
}

function tunnel(track) {
  const walls = [], ribs = [], leds = [], warn = [];
  const { P, T, R, roof, halfW } = track;
  let a = 0;
  while (a < track.n && !roof[a]) a++;
  if (a >= track.n) return { walls, ribs, leds, warn };
  let b = a;
  while (b + 1 < track.n && roof[b + 1]) b++;
  const k = a * 3, len = Math.hypot(P[b * 3] - P[k], P[b * 3 + 2] - P[k + 2]), w = halfW[a], wallH = 2 * w + 0.4;
  const yaw = Math.atan2(T[k], T[k + 2]), y = P[k + 1];
  const at = (lat, d, up) => [P[k] + R[k] * lat + T[k] * d, y + up, P[k + 2] + R[k + 2] * lat + T[k + 2] * d];
  const put = (list, g, lat, d, up, tint) => {
    g.rotateY(yaw).translate(...at(lat, d, up));
    if (tint) {
      const c = new THREE.Color(tint), n = g.attributes.position.count;
      g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, j) => [c.r, c.g, c.b][j % 3]), 3));
    }
    list.push(g);
  };
  const off = w + 1.2;
  for (let d = 0, n = 0; d < len; d += PANEL, n++) for (const s of [-1, 1]) {
    const shade = 0.86 + 0.1 * Math.abs(Math.sin(n * 12.9898 + s * 4.1));
    put(walls, new THREE.BoxGeometry(1.2, wallH + 1.2, PANEL - 0.12), s * (off + 0.6), d + PANEL / 2, wallH / 2 - 0.6, new THREE.Color(shade, shade * 0.98, shade * 0.95));
  }
  for (let d = 0; d <= len; d += PANEL * 2) for (const s of [-1, 1]) put(ribs, new THREE.BoxGeometry(1.0, wallH + 1.6, 0.8), s * (off + 1.6), d, wallH / 2 - 0.4);
  for (const s of [-1, 1]) {
    put(ribs, new THREE.BoxGeometry(2.4, 0.5, len), s * (off + 1.0), len / 2, wallH + 0.25);
    for (const up of [0.55, wallH - 0.55]) for (let d = 1; d < len - 2; d += 4) put(leds, new THREE.BoxGeometry(0.12, 0.14, 2.6), s * (off - 0.02), d + 1.3, up);
  }
  for (const [from, to] of rolls(track, a, b)) {
    const d0 = (from - a) * track.step, d1 = (to - a) * track.step;
    for (let d = d0; d < d1; d += 3) for (const s of [-1, 1]) {
      const red = Math.floor((d - d0) / 3) % 2 === 0;
      put(warn, new THREE.BoxGeometry(0.05, 1.1, 2.9), s * (off - 0.03), d + 1.5, wallH / 2, red ? '#c8231c' : '#ece8de');
    }
  }
  return { walls, ribs, leds, warn };
}

function rolls(track, a, b) {
  const out = [];
  let from = -1;
  for (let i = a; i <= b + 1; i++) {
    const tilted = i <= b && Math.abs(track.U[i * 3 + 1]) < 0.985;
    if (tilted && from < 0) from = i;
    if (!tilted && from >= 0) { out.push([from, i]); from = -1; }
  }
  return out;
}

export function createSpurs(world, sunUniform, fogDensity, renderer, res) {
  const group = new THREE.Group();
  const concrete = panelMaterial('#c4bdb1', 0.88, 0, sunUniform, fogDensity, 'spur-concrete', 4);
  concrete.vertexColors = true;
  const rib = panelMaterial('#8f8a82', 0.8, 0.05, sunUniform, fogDensity, 'spur-rib', 4);
  const steel = new THREE.MeshStandardMaterial({ color: '#3a3e45', roughness: 0.45, metalness: 0.75 });
  const paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.7, 2.1), toneMapped: false });
  for (const m of [steel, paint]) skyFog(m, sunUniform, fogDensity);
  const posts = [], marks = [], walls = [], ribs = [], leds = [];
  for (const track of Object.values(world.track.spurs || {})) {
    const body = roadBody(track, sunUniform, fogDensity, renderer, res);
    for (const m of [body.surface, body.shell, body.rails, body.caps]) { m.frustumCulled = false; group.add(m); }
    const at = Object.fromEntries(track.sectors.map((s) => [s.name, s.i]));
    if (at.Curl !== undefined) {
      posts.push(...supports(track, world.terrain.height, at.Curl, track.n - 1));
      marks.push(...chevrons(track, at.Curl, at.Ceiling ?? track.n - 1));
    }
    const t = tunnel(track);
    walls.push(...t.walls); ribs.push(...t.ribs); leds.push(...t.leds); marks.push(...t.warn);
  }
  if (walls.length) merged(group, walls, concrete, true);
  if (ribs.length) merged(group, ribs, rib, true);
  if (posts.length) merged(group, posts, steel, true);
  if (leds.length) group.add(new THREE.Mesh(mergeGeometries(leds), led));
  if (marks.length) group.add(new THREE.Mesh(mergeGeometries(marks), paint));
  return { group };
}
