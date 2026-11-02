import * as THREE from 'three';
import { GLTFLoader } from '../../rl/vendor/three-r169/examples/jsm/loaders/GLTFLoader.js';

const CELL = 300;
const MODELS = ['desert_boulder_blocky', 'desert_boulder_brown', 'desert_boulder_orange', 'desert_boulder_round'];

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trackClearance(track) {
  const S = 24, grid = new Map();
  for (let i = 0; i < track.n; i += 2) {
    const key = `${Math.floor(track.P[i * 3] / S)},${Math.floor(track.P[i * 3 + 2] / S)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }
  return (x, z) => {
    let best = Infinity;
    const cx = Math.floor(x / S), cz = Math.floor(z / S);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of grid.get(`${cx + a},${cz + b}`) || []) best = Math.min(best, Math.hypot(x - track.P[i * 3], z - track.P[i * 3 + 2]) - Math.max(track.wallL[i], track.wallR[i]));
    return best;
  };
}

export async function createBoulders(world, fogPatch) {
  const loader = new GLTFLoader();
  const load = (url) => loader.loadAsync(url).catch(() => null);
  const loaded = await Promise.all(MODELS.flatMap((m) => [load(`assets/models/${m}.glb`), load(`assets/models/${m}_lod1.glb`)]));
  const first = (gltf) => { let mesh = null; gltf?.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; }); return mesh; };
  const kinds = [];
  for (let i = 0; i < loaded.length; i += 2) {
    const mesh = first(loaded[i]), low = first(loaded[i + 1]);
    if (!mesh) continue;
    const fit = (src) => {
      const geo = src.geometry.clone();
      src.updateWorldMatrix(true, false);
      geo.applyMatrix4(src.matrixWorld);
      return geo;
    };
    const geo = fit(mesh), lgeo = low ? fit(low) : geo;
    geo.computeBoundingBox();
    const bb = geo.boundingBox, size = new THREE.Vector3();
    bb.getSize(size);
    const s = 1 / Math.max(size.x, size.y, size.z);
    for (const g of new Set([geo, lgeo])) {
      g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      g.scale(s, s, s);
    }
    const mat = mesh.material;
    mat.envMapIntensity = 0.7;
    fogPatch(mat);
    kinds.push({ geo, lgeo, mat });
  }
  const group = new THREE.Group();
  if (!kinds.length) return group;
  const { track, terrain } = world;
  const rand = rng(1234);
  const per = kinds.map(() => []), small = kinds.map(() => []);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), tilt = new THREE.Quaternion();
  const clear = trackClearance(track);
  const place = (x, z, size, sink, out = per) => {
    if (clear(x, z) < 3 + size * 0.6) return;
    const h = terrain.height(x, z);
    n.set(terrain.height(x - 2, z) - terrain.height(x + 2, z), 4, terrain.height(x, z - 2) - terrain.height(x, z + 2)).normalize();
    if (n.y < 0.55) return;
    tilt.setFromUnitVectors(up, n);
    q.setFromAxisAngle(up, rand() * Math.PI * 2).premultiply(tilt.slerp(new THREE.Quaternion(), 0.4));
    sc.set(size * (0.8 + rand() * 0.5), size * (0.6 + rand() * 0.6), size * (0.8 + rand() * 0.5));
    p.set(x, h - size * sink, z);
    m.compose(p, q, sc);
    out[out === small ? 0 : Math.floor(rand() * kinds.length)].push({ m: m.clone(), cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) });
  };
  for (let i = 0; i < track.n; i += 2) {
    const k = i * 3;
    const lat = Math.max(track.wallL[i], track.wallR[i]) + 6 + rand() * 90;
    const side = rand() < 0.5 ? -1 : 1;
    if (rand() > 0.32) continue;
    const x = track.P[k] + track.R[k] * lat * side, z = track.P[k + 2] + track.R[k + 2] * lat * side;
    const near = lat < 40;
    place(x, z, near ? 1.2 + rand() * 4 : 2 + rand() * 9, 0.25);
    if (rand() < 0.5) place(x + (rand() - 0.5) * 8, z + (rand() - 0.5) * 8, 0.5 + rand() * 1.5, 0.2);
  }
  for (let i = 0; i < 260; i++) {
    const x = terrain.x0 + 300 + rand() * (terrain.size - 600), z = terrain.z0 + 300 + rand() * (terrain.size - 600);
    place(x, z, 3 + rand() * 14, 0.3);
  }
  for (let i = 0; i < track.n; i += 2) {
    const k = i * 3;
    for (let q = 0; q < 3; q++) {
      const lat = Math.max(track.wallL[i], track.wallR[i]) + 2.5 + Math.pow(rand(), 2.4) * 70;
      const side = rand() < 0.5 ? -1 : 1;
      place(track.P[k] + track.R[k] * lat * side + (rand() - 0.5) * 3, track.P[k + 2] + track.R[k + 2] * lat * side + (rand() - 0.5) * 3, 0.14 + Math.pow(rand(), 2.2) * 0.7, 0.35, small);
    }
  }
  const batches = [];
  kinds.forEach((kind, i) => {
    batches.push({ kind, items: per[i], lo: 50, far: 0 }, { kind, items: small[i], lo: 22, far: 100 });
  });
  batches.forEach(({ kind, items, lo, far }) => {
    const cells = new Map();
    for (const it of items) {
      const key = `${it.cx},${it.cz}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(it);
    }
    for (const list of cells.values()) {
      const lod = new THREE.LOD();
      const center = new THREE.Vector3();
      for (const it of list) center.add(p.setFromMatrixPosition(it.m));
      center.divideScalar(list.length);
      lod.position.copy(center);
      const back = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
      const build = (geo, cast) => {
        const inst = new THREE.InstancedMesh(geo, kind.mat, list.length);
        list.forEach((it, j) => inst.setMatrixAt(j, m.multiplyMatrices(back, it.m)));
        inst.computeBoundingSphere();
        inst.castShadow = cast;
        inst.receiveShadow = true;
        return inst;
      };
      if (far) {
        lod.addLevel(build(kind.lgeo, false), 0);
        lod.addLevel(new THREE.Object3D(), far);
      } else {
        lod.addLevel(build(kind.geo, true), 0);
        lod.addLevel(build(kind.lgeo, false), lo);
      }
      group.add(lod);
    }
  });
  return group;
}
