import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { panelMaterial } from './road.js';
import { createPeople } from './people.js';

const ROWS = 9, RISE = 0.62, STEP = 0.95, SEAT = 0.62, CHUNK = 16;

function mulberry(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function createGrandstands(world, sunUniform, fogDensity, renderer, cards = false) {
  const { track, terrain } = world;
  const group = new THREE.Group();
  const white = panelMaterial('#e8e6e1', 0.5, 0.05, sunUniform, fogDensity, 'stands', 4);
  const dark = new THREE.MeshStandardMaterial({ color: '#16171c', roughness: 0.5, metalness: 0.6 });
  const whites = [], darks = [], seats = [];
  const sites = [];
  const s0 = track.sectors[0].i;
  const want = track.stands ?? [[s0 + 30, 1, 110], [track.finish - 70, 1, 90], ...track.sectors.slice(1).map((s) => [s.i + 10, -1, 70])];
  for (const [i0, side, len] of want) {
    for (let i = i0; i < Math.min(track.n - 1, i0 + 120); i += 10) {
      if (track.U[i * 3 + 1] > 0.985 && !track.gap[i]) { sites.push([i, side, len]); break; }
    }
  }
  const people = await createPeople(renderer, sunUniform, fogDensity, cards).catch((e) => { console.warn('crowd', e); return null; });
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), p = new THREE.Vector3(), place = new THREE.Vector3(), centre = new THREE.Vector3(), centres = [];
  for (const [i, side, len] of sites) {
    const k = i * 3;
    const off = (side < 0 ? track.wallL[i] : track.wallR[i]) + 14;
    p.set(track.P[k] + track.R[k] * side * off, 0, track.P[k + 2] + track.R[k + 2] * side * off);
    let lo = Infinity;
    for (const a of [-0.5, 0, 0.5]) lo = Math.min(lo, terrain.height(p.x + track.T[k] * a * len, p.z + track.T[k + 2] * a * len));
    p.y = Math.min(lo, track.P[k + 1] - 1);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(track.R[k] * side, track.R[k + 2] * side));
    centres.push(p.clone());
    m.compose(p, q, new THREE.Vector3(1, 1, 1));
    const parts = { w: [], d: [] };
    const rand = mulberry(1000 + i * 7 + (side > 0 ? 1 : 2));
    const yaw = Math.atan2(track.R[k] * side, track.R[k + 2] * side);
    parts.w.push(new THREE.BoxGeometry(len, 3, ROWS * STEP + 4).translate(0, -1.5, ROWS * STEP / 2));
    for (let r = 0; r < ROWS; r++) {
      parts.w.push(new THREE.BoxGeometry(len, RISE, ROWS * STEP - r * STEP).translate(0, r * RISE + RISE / 2, (ROWS * STEP + r * STEP) / 2));
      for (let x = -len / 2 + 1 + (r % 2) * SEAT / 2; x < len / 2 - 1; x += SEAT) {
        if (rand() < 0.02) continue;
        const lx = x + (rand() - 0.5) * 0.14, lz = r * STEP + STEP * 0.5 + (rand() - 0.5) * 0.24, c = Math.floor((x + len / 2) / CHUNK);
        const chunk = `${i}:${side}:${c}`;
        centre.set(-len / 2 + (c + 0.5) * CHUNK, ROWS * RISE / 2 + 1, ROWS * STEP / 2).applyMatrix4(m);
        seats.push({
          ...place.set(lx, (r + 1) * RISE, lz).applyMatrix4(m),
          yaw: yaw + Math.PI + (rand() - 0.5) * 0.7, scale: 0.94 + rand() * 0.12, char: people ? people.pickChar(rand()) : 0, seed: [rand(), rand(), rand(), rand()],
          chunk, center: centre.clone(), radius: Math.hypot(CHUNK / 2, ROWS * STEP / 2, ROWS * RISE / 2 + 2) + 3,
        });
      }
    }
    const top = ROWS * RISE + 4.5, back = ROWS * STEP + 1;
    parts.w.push(new THREE.BoxGeometry(len, ROWS * RISE + 4, 0.6).translate(0, (ROWS * RISE + 4) / 2, back));
    parts.d.push(new THREE.BoxGeometry(len + 4, 0.5, ROWS * STEP + 6).translate(0, top, ROWS * STEP / 2 - 1));
    for (let c = -2; c <= 2; c++) parts.w.push(new THREE.BoxGeometry(0.5, top, 0.5).translate(c * len / 4.4, top / 2, back - 0.3));
    for (const [list, src] of [[whites, parts.w], [darks, parts.d]]) for (const g of src) list.push(g.applyMatrix4(m));
  }
  const add = (list, mat, shadow) => {
    if (!list.length) return null;
    const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g).map((g) => { for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'aSeat'].includes(n)) g.deleteAttribute(n); return g; })), mat);
    mesh.castShadow = shadow; mesh.receiveShadow = shadow;
    group.add(mesh);
    return mesh;
  };
  add(whites, white, true);
  add(darks, dark, true);
  if (people) {
    people.addSeats(seats);
    group.add(people.group);
  }
  let cheer = 0, gasp = 0, party = 0;
  const U = people?.uniforms;
  return {
    group,
    sites: sites.map(([i]) => i),
    centres,
    people,
    cheer(v) { cheer = Math.min(1, cheer + v); },
    gasp(v) { gasp = Math.min(1, gasp + v); },
    party() { party = 1; cheer = 1; },
    wave(at) { if (U) U.uWave.value.set(at.x, at.z, U.uTime.value); },
    update(time, dt, night, camera) {
      cheer = Math.max(0, cheer - dt * 0.35);
      gasp = Math.max(0, gasp - dt * 0.9);
      party = Math.max(0, party - dt * 0.08);
      if (!U) return;
      const k = Math.min(1, dt * 5);
      U.uTime.value = time;
      U.uNight.value = night;
      U.uCheer.value += (cheer - U.uCheer.value) * k;
      U.uGasp.value += (gasp - U.uGasp.value) * k;
      U.uParty.value += (party - U.uParty.value) * k;
      people.update(camera);
    },
  };
}
