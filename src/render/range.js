import * as THREE from 'three';
import { panelMaterial } from './road.js';
import { skyFog } from './sky.js';
import { lightPoints, merged } from './venue-kit.js';
import { festivalSites } from './festival.js';
import { trackClearance } from './props.js';

const RED = new THREE.Color('#ff2a2a').multiplyScalar(7);
const NOREPEAT = 200;

function kit() {
  const parts = { white: [], steel: [], concrete: [], silver: [], paint: [] };
  const lights = [];
  const box = (mat, w, h, d, x, y, z) => parts[mat].push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const cyl = (mat, r, h, x, y, z, seg = 20) => parts[mat].push(new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z));
  const hcyl = (mat, r, len, x, y, z, seg = 20) => parts[mat].push(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z));
  const dome = (mat, r, x, y, z, flip = false) => parts[mat].push(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(flip ? Math.PI : 0).translate(x, y, z));
  const paint = (hex, w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z), c = new THREE.Color(hex), n = g.attributes.position.count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
    parts.paint.push(g);
  };
  const lattice = (half, H, bay, x = 0, z = 0) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('steel', 0.8, H, 0.8, x + sx * half, H / 2, z + sz * half);
    const diag = Math.hypot(half * 2, bay), ang = Math.atan2(bay, half * 2);
    for (let y = bay; y <= H; y += bay) {
      for (const s of [-1, 1]) {
        box('steel', half * 2, 0.4, 0.4, x, y, z + s * half);
        box('steel', 0.4, 0.4, half * 2, x + s * half, y, z);
        parts.steel.push(new THREE.BoxGeometry(diag, 0.25, 0.25).rotateZ(((y / bay) % 2 ? 1 : -1) * ang).translate(x, y - bay / 2, z + s * half));
        parts.steel.push(new THREE.BoxGeometry(0.25, 0.25, diag).rotateX(((y / bay) % 2 ? 1 : -1) * ang).translate(x + s * half, y - bay / 2, z));
      }
    }
  };
  const beacon = (x, y, z, phase) => lights.push([x, y, z, phase]);
  return { parts, lights, box, cyl, hcyl, dome, paint, lattice, beacon };
}

const BUILD = {
  testStand(k) {
    k.box('concrete', 26, 14, 22, 0, 3, 0);
    k.box('concrete', 10, 9, 24, 0, 14.5, -2);
    k.parts.concrete.push(new THREE.BoxGeometry(14, 2, 18).rotateX(-0.5).translate(0, 4, 14));
    k.lattice(5, 52, 6.5);
    k.box('steel', 14, 1.2, 14, 0, 30, 0);
    k.box('steel', 14, 1.2, 14, 0, 52, 0);
    k.cyl('white', 3, 14, 0, 40, 0); k.dome('white', 3, 0, 47, 0); k.dome('white', 3, 0, 33, 0, true);
    k.cyl('white', 1.8, 12, 9, 46, 0); k.dome('white', 1.8, 9, 52, 0);
    k.box('steel', 0.6, 18, 0.6, 0, 61, 0);
    k.beacon(0, 70, 0, 0.1); k.beacon(5, 52.8, 5, 0.6);
    return 30;
  },
  trenchStand(k) {
    for (const s of [-1, 1]) k.box('concrete', 4, 8, 46, s * 7, 4, 0);
    k.box('concrete', 18, 2, 46, 0, -0.5, 0);
    k.box('concrete', 22, 12, 12, 0, 6, -26);
    k.lattice(4, 22, 5.5, 0, -26);
    k.hcyl('white', 2.4, 16, 0, 26, -26); k.dome('white', 2.4, 0, 26, -18);
    k.parts.white.push(new THREE.SphereGeometry(2.4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 26, -34));
    k.beacon(0, 29.5, -26, 0.3);
    return 34;
  },
  tankFarm(k) {
    for (const x of [-9, 0, 9]) {
      k.hcyl('white', 3.2, 22, x, 4.6, 0);
      for (const z of [-11, 11]) k.parts.white.push(new THREE.SphereGeometry(3.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(z > 0 ? Math.PI / 2 : -Math.PI / 2).translate(x, 4.6, z));
      for (const z of [-7, 7]) k.box('concrete', 5, 2, 1.6, x, 1, z);
    }
    for (const x of [-18, 18]) { k.cyl('white', 4.5, 20, x, 10, -4); k.dome('white', 4.5, x, 20, -4); k.beacon(x, 24.8, -4, x > 0 ? 0.4 : 0.9); }
    for (const y of [9.5, 10.6]) k.hcyl('steel', 0.4, 34, 0, y, 14, 8);
    for (let z = -2; z <= 14; z += 8) k.box('steel', 0.5, 10, 0.5, 13.5, 5, z);
    k.parts.steel.push(new THREE.CylinderGeometry(0.4, 0.4, 40, 8).rotateZ(Math.PI / 2).translate(0, 10, 14));
    k.box('steel', 6, 2.4, 3.5, 0, 1.2, 18); k.box('steel', 0.8, 3.4, 0.8, -2, 2.5, 18); k.box('steel', 0.8, 3.4, 0.8, 2, 2.5, 18);
    k.box('concrete', 48, 0.6, 40, 0, 0, 2);
    return 28;
  },
  waterTower(k) {
    const H = 26, r = 6.5;
    for (let a = 0; a < 4; a++) { const x = Math.cos(a * Math.PI / 2 + Math.PI / 4) * 5, z = Math.sin(a * Math.PI / 2 + Math.PI / 4) * 5; k.box('steel', 0.7, H, 0.7, x, H / 2, z); }
    for (let y = 6; y < H; y += 6.5) { k.box('steel', 7.4, 0.35, 0.35, 0, y, 3.5); k.box('steel', 7.4, 0.35, 0.35, 0, y, -3.5); k.box('steel', 0.35, 0.35, 7.4, 3.5, y, 0); k.box('steel', 0.35, 0.35, 7.4, -3.5, y, 0); }
    k.cyl('white', r, 7, 0, H + 3.5, 0, 28);
    k.parts.white.push(new THREE.ConeGeometry(r, 3, 28).translate(0, H + 8.5, 0));
    k.parts.white.push(new THREE.ConeGeometry(r, 2.2, 28).rotateX(Math.PI).translate(0, H - 1.1, 0));
    k.cyl('steel', 0.5, H, 0, H / 2, 0, 8);
    k.beacon(0, H + 10.5, 0, 0.7);
    return 12;
  },
  tanker(k) {
    k.paint('#e9e7e2', 2.5, 2.6, 3.2, 0, 1.9, 6.4);
    k.paint('#2b2e34', 2.5, 0.8, 13.4, 0, 0.9, 0);
    k.hcyl('silver', 1.25, 11, 0, 2.6, -1.2);
    k.dome('silver', 1.25, 0, 2.6, 4.3); k.parts.silver.push(new THREE.SphereGeometry(1.25, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 2.6, -6.7));
    return 8;
  },
  containers(k) {
    const C = ['#c4422f', '#2f5e8c', '#e1e0dc', '#3c6e4a', '#d38a2b', '#7a7d84'];
    let n = 0;
    for (const [x, layers] of [[-3.4, 3], [0, 5], [3.4, 4]]) for (let y = 0; y < layers; y++) k.paint(C[(n++ * 5) % C.length], 2.44, 2.59, 12.2, x, 1.3 + y * 2.62, (y % 2) * 0.6);
    k.paint('#e1e0dc', 2.44, 2.59, 12.2, 0, 1.3, 13.4);
    return 10;
  },
  antenna(k) {
    k.lattice(1.4, 38, 4.2);
    k.parts.white.push(new THREE.SphereGeometry(4.2, 24, 8, 0, Math.PI * 2, 0, 0.75).rotateX(-1.2).translate(0, 30, 2.6));
    k.box('steel', 0.4, 0.4, 3, 0, 30, 2);
    k.box('concrete', 6, 1, 6, 0, 0.3, 0);
    k.beacon(0, 38.6, 0, 0.2);
    return 6;
  },
  tankPair(k) {
    for (const x of [-5.5, 5.5]) { k.cyl('white', 3.6, 16, x, 8, 0); k.dome('white', 3.6, x, 16, 0); for (const z of [-2.6, 2.6]) k.box('steel', 0.5, 2.5, 0.5, x + 2.6, 1.2, z); }
    k.box('steel', 7.4, 0.8, 1.6, 0, 13, 0);
    k.hcyl('steel', 0.45, 11, 0, 1.2, 4.5, 8);
    for (const z of [-1, 9]) k.box('steel', 0.4, 1.6, 0.4, 0, 0.8, z);
    k.box('concrete', 22, 0.6, 12, 0, 0, 0);
    k.beacon(-5.5, 19.8, 0, 0.35);
    return 12;
  },
  generators(k) {
    for (const x of [-4, 0, 4]) { k.paint('#e9e7e2', 3, 3.2, 7, x, 1.6, 0); k.paint('#2b2e34', 2.4, 0.5, 1.2, x, 3.45, -2); }
    k.cyl('steel', 0.3, 5, -4, 4.6, 2.4, 8);
    return 9;
  },
  rocket(k) {
    const R = 5.2, H = 92;
    k.box('concrete', 26, 6, 26, 0, 1, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('steel', 2, 12, 2, sx * 7, 10, sz * 7);
    k.box('steel', 18, 2, 18, 0, 16, 0);
    k.parts.silver.push(new THREE.CylinderGeometry(R, R, H, 16, 1, false, 0, Math.PI).translate(0, 17 + H / 2, 0));
    k.parts.steel.push(new THREE.CylinderGeometry(R, R, H, 16, 1, false, Math.PI, Math.PI).translate(0, 17 + H / 2, 0));
    k.parts.silver.push(new THREE.LatheGeometry([[R, 0], [R * 0.98, 4], [R * 0.85, 9], [R * 0.6, 13], [R * 0.3, 16], [0.01, 18]].map(([x, y]) => new THREE.Vector2(x, y)), 32).translate(0, 17 + H, 0));
    for (const s of [-1, 1]) {
      k.parts.silver.push(new THREE.BoxGeometry(0.5, 9, 4.5).translate(s * (R + 1.8), 17 + H + 3, 0));
      k.parts.silver.push(new THREE.BoxGeometry(0.5, 12, 6).translate(s * (R + 2.6), 26, 0));
    }
    k.lattice(3.4, 112, 8, 15, 0);
    for (const y of [56, 98]) k.box('steel', 8, 1.6, 2, 9.5, y, 0);
    k.beacon(15, 113, 0, 0.5); k.beacon(0, 17 + H + 18.5, 0, 0);
    return 34;
  },
};

const LOW = new Set(['tanker', 'generators']);
const MID = ['antenna', 'containers', 'tankPair', 'tanker', 'containers', 'antenna', 'tankPair', 'generators'];

function rocketSite(world, clear, blocks, minA = 14, block = 45) {
  const { track, terrain } = world;
  const g = track.closed ? track.sectors[0].i : (track.lineup?.i0 ?? 0) - 40;
  const k = Math.max(0, g) * 3, l = Math.hypot(track.T[k], track.T[k + 2]) || 1;
  const fx = track.T[k] / l, fz = track.T[k + 2] / l, eye = { x: track.P[k] - fx * 12, y: track.P[k + 1] + 2.5, z: track.P[k + 2] - fz * 12 };
  const t = world.venue.terrain, half = t.size / 2 - 250;
  let best = null;
  for (let a = -30; a <= 30; a += 2) for (let d = 420; d <= 1300; d += 60) {
    const ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180);
    const x = eye.x + (fx * ca - fz * sa) * d, z = eye.z + (fz * ca + fx * sa) * d;
    if (Math.abs(a) < minA || Math.abs(x - t.cx) > half || Math.abs(z - t.cz) > half || clear(x, z) < 90) continue;
    if (blocks.some((b) => { const dx = x - eye.x, dz = z - eye.z, f = Math.max(0, Math.min(1, ((b.x - eye.x) * dx + (b.z - eye.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(eye.x + dx * f - b.x, eye.z + dz * f - b.z) < block; })) continue;
    const y = terrain.height(x, z);
    if (Math.abs(y - track.P[k + 1]) > 40) continue;
    if (Math.max(...[[15, 0], [-15, 0], [0, 15], [0, -15]].map(([a2, b]) => Math.abs(terrain.height(x + a2, z + b) - y))) > 4) continue;
    let seen = 0;
    for (let s = 1; s < 40; s++) {
      const f = s / 40, px = eye.x + (x - eye.x) * f, pz = eye.z + (z - eye.z) * f;
      if (terrain.height(px, pz) < eye.y + (y + 90 - eye.y) * f) seen++;
    }
    const score = (seen / 39) ** 3 / (1 + Math.abs(Math.abs(a) - 20) / 8) / (1 + Math.abs(d - 620) / 500);
    if (!best || score > best.score) best = { x, y, z, score, yaw: Math.atan2(eye.x - x, eye.z - z) };
  }
  return best;
}

export function createRange(world, sunUniform, fogDensity, used) {
  const { track, terrain } = world, N = track.lap;
  const group = new THREE.Group();
  const clear = trackClearance(track);
  const out = { white: [], steel: [], concrete: [], silver: [], paint: [] };
  const lights = lightPoints(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
  const placed = [];
  const ground = (x, z, r) => Math.min(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7]].map(([a, b]) => terrain.height(x + a, z + b)));
  const put = (type, x, z, yaw, i = -1) => {
    const k = kit(), r = BUILD[type](k);
    m4.compose(v.set(x, ground(x, z, r) - 0.3, z), q.setFromAxisAngle(up, yaw), new THREE.Vector3(1, 1, 1));
    for (const [mat, list] of Object.entries(k.parts)) for (const g of list) out[mat].push(g.applyMatrix4(m4));
    for (const [lx, ly, lz, ph] of k.lights) { v.set(lx, ly, lz).applyMatrix4(m4); lights.add(v.x, v.y, v.z, RED, 1.4, ph); }
    placed.push({ type, x, z, i, r });
    used.push({ x, z, r: r * 2 });
  };
  const free = (s, r) => !used.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < (r * 2 + u.r) / 2);
  const stands = used.filter((u) => u.r >= 70);
  const rocket = rocketSite(world, clear, stands) || rocketSite(world, clear, stands, 6, 20) || rocketSite(world, clear, [], 0, 0);
  if (rocket) put('rocket', rocket.x, rocket.z, rocket.yaw);
  const sites = festivalSites(world, [24, 50, 70, 110]);
  const length = N * track.step;
  const anchors = length > 3000 ? ['testStand', 'tankFarm', 'waterTower', 'testStand', 'tankFarm', 'trenchStand', 'testStand', 'tankFarm'] : ['testStand', 'tankFarm', 'waterTower', 'tankFarm'];
  const apart = (s, d) => placed.every((p) => p.i < 0 || Math.min((s.i - p.i + N) % N, (p.i - s.i + N) % N) * track.step > d);
  for (const type of anchors) {
    const s = sites.find((c) => c.gap === 110 && clear(c.x, c.z) > 45 && free(c, 30) && apart(c, length / (anchors.length + 1)));
    if (s) put(type, s.x, s.z, s.yaw, s.i);
  }
  let n = 0;
  for (const s of sites) {
    if (n >= Math.floor(length / 110)) break;
    const type = MID[n % MID.length];
    if (s.gap === 110 || (s.gap === 24) !== LOW.has(type) || clear(s.x, s.z) < 20 || !free(s, 14)) continue;
    if (placed.some((p) => p.type === type && Math.hypot(p.x - s.x, p.z - s.z) < NOREPEAT)) continue;
    put(type, s.x, s.z, s.yaw + (n % 2 ? Math.PI / 2 : 0), s.i);
    n++;
  }
  const white = panelMaterial('#e8e6e1', 0.5, 0.08, sunUniform, fogDensity, 'range-white', 0.0625);
  const concrete = panelMaterial('#a9a398', 0.9, 0, sunUniform, fogDensity, 'range-concrete', 4);
  const steel = new THREE.MeshStandardMaterial({ color: '#2c2f35', roughness: 0.5, metalness: 0.7 });
  const silver = new THREE.MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.28, metalness: 0.95, envMapIntensity: 1.1 });
  const paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
  for (const m of [steel, silver, paint]) skyFog(m, sunUniform, fogDensity);
  merged(group, out.white, white, true);
  merged(group, out.concrete, concrete, true);
  merged(group, out.steel, steel, true);
  merged(group, out.silver, silver, true);
  merged(group, out.paint, paint, true);
  group.add(lights.build());
  return {
    group,
    placed,
    update(time, scale, night) {
      lights.mat.uniforms.uTime.value = time;
      lights.mat.uniforms.uScale.value = scale;
      lights.mat.uniforms.uNight.value = night;
    },
  };
}
