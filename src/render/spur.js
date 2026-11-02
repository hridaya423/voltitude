import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { extrude, runs, panelMaterial } from './road.js';
import { skyFog } from './sky.js';
import { merged } from './venue-kit.js';

const SLAB = 0.7, RAIL = 1.1, POST = 0.5, BAY = 4;

function deckParts(track, list, wall) {
  const top = extrude(track, list, [(w) => [w, 0], (w) => [-w, 0]]);
  const under = extrude(track, list, [(w) => [-w, 0], (w) => [-w - 0.3, -SLAB], (w) => [w + 0.3, -SLAB], (w) => [w, 0]]);
  const rails = [1, -1].map((s) => extrude(track, list, s > 0
    ? [(w, i) => [w, 0], (w, i) => [w, wall(i)], (w, i) => [w + 0.3, wall(i)], (w, i) => [w + 0.3, -SLAB]]
    : [(w, i) => [-w - 0.3, -SLAB], (w, i) => [-w - 0.3, wall(i)], (w, i) => [-w, wall(i)], (w, i) => [-w, 0]]));
  return { top, under, rails };
}

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

export function createSpurs(world, sunUniform, fogDensity) {
  const group = new THREE.Group();
  const deck = panelMaterial('#2f3033', 0.82, 0.02, sunUniform, fogDensity, 'spur-deck', 4);
  const concrete = panelMaterial('#b3ada2', 0.9, 0, sunUniform, fogDensity, 'spur-concrete', 4);
  const steel = new THREE.MeshStandardMaterial({ color: '#3a3e45', roughness: 0.45, metalness: 0.75 });
  const paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
  for (const m of [steel, paint]) skyFog(m, sunUniform, fogDensity);
  const tops = [], unders = [], rails = [], posts = [], marks = [];
  for (const track of Object.values(world.track.spurs || {})) {
    const at = Object.fromEntries(track.sectors.map((s) => [s.name, s.i]));
    const list = runs(track);
    const parts = deckParts(track, list, () => RAIL);
    tops.push(parts.top); unders.push(parts.under); rails.push(...parts.rails);
    if (at.Curl !== undefined) {
      posts.push(...supports(track, world.terrain.height, at.Curl, track.n - 1));
      marks.push(...chevrons(track, at.Curl, at.Ceiling ?? track.n - 1));
    }
  }
  if (!tops.length) return { group };
  merged(group, tops, deck, true);
  merged(group, unders, concrete, true);
  merged(group, rails, concrete, true);
  merged(group, posts, steel, true);
  if (marks.length) group.add(new THREE.Mesh(mergeGeometries(marks), paint));
  return { group };
}
