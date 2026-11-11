import * as THREE from 'three';
import { GLTFLoader } from '../../rl/vendor/three-r169/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, shared, trackClearance } from './props.js';

const CELL = 300, KEEP = ['wild_rooibos_bush_a', 'wild_rooibos_bush_b', 'wild_rooibos_bush_c'];

function variants(gltf) {
  gltf.scene.updateMatrixWorld(true);
  return KEEP.map((name) => {
    const node = gltf.scene.getObjectByName(name), byMat = new Map();
    node.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(geo.index ? geo.toNonIndexed() : geo);
    });
    const mats = [...byMat.keys()];
    const geo = mergeGeometries(mats.map((m) => mergeGeometries(byMat.get(m))), true);
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    const h = b.max.y - b.min.y, n = geo.attributes.normal;
    for (let i = 0; i < n.count; i++) {
      const x = n.getX(i) * 0.3, y = n.getY(i) * 0.3 + 0.7, z = n.getZ(i) * 0.3, l = Math.hypot(x, y, z);
      n.setXYZ(i, x / l, y / l, z / l);
    }
    geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2).scale(1 / h, 1 / h, 1 / h);
    return { geo, mats };
  });
}

const sway = (uTime) => (sh) => {
  sh.uniforms.uTime = uTime;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
    float ph = dot(vec2(instanceMatrix[3][0], instanceMatrix[3][2]), vec2(0.13, 0.07));
    float bend = transformed.y * transformed.y * 0.05;
    transformed.x += bend * (sin(uTime * 1.7 + ph) + 0.35 * sin(uTime * 4.3 + ph * 2.1));
    transformed.z += bend * 0.7 * sin(uTime * 1.3 + ph * 1.3);`);
  sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;');
};

export async function createFlora(world, fogPatch) {
  const loader = new GLTFLoader();
  const [hiG, loG] = await Promise.all(['rooibos', 'rooibos_lod1'].map((n) => loader.loadAsync(`assets/models/flora/${n}.glb`)));
  const uTime = { value: 0 };
  const hi = variants(hiG), lo = variants(loG);
  for (const m of new Set([...hi, ...lo].flatMap((v) => v.mats))) {
    if (m.transparent) { m.transparent = false; m.alphaTest = 0.5; m.depthWrite = true; m.side = THREE.DoubleSide; }
    m.envMapIntensity = 0.25;
    m.metalness = 0;
    m.normalMap = null;
    m.color.setScalar(9);
    fogPatch(m, sway(uTime));
  }
  const { track, terrain } = world;
  const clear = trackClearance(track);
  const rand = rng(4321);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const items = hi.map(() => []);
  const place = (x, z, size) => {
    if (clear(x, z) < 2.5) return;
    const y = terrain.height(x, z);
    if (Math.hypot(terrain.height(x + 2, z) - terrain.height(x - 2, z), terrain.height(x, z + 2) - terrain.height(x, z - 2)) / 4 > 0.35) return;
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    s.set(size * (0.85 + rand() * 0.3), size * (0.8 + rand() * 0.4), size * (0.85 + rand() * 0.3));
    m.compose(p.set(x, y - 0.05, z), q, s);
    items[Math.floor(rand() * hi.length)].push({ m: m.clone(), cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) });
  };
  for (let i = 0; i < track.n; i += 2) {
    const k = i * 3;
    for (let t = 0; t < 3; t++) {
      if (rand() > 0.55) continue;
      const side = rand() < 0.5 ? -1 : 1;
      const lat = Math.max(track.wallL[i], track.wallR[i]) + 3 + Math.pow(rand(), 1.5) * 120;
      const x = track.P[k] + track.R[k] * lat * side + (rand() - 0.5) * 6, z = track.P[k + 2] + track.R[k + 2] * lat * side + (rand() - 0.5) * 6;
      const n = rand() < 0.3 ? 3 : 1;
      for (let c = 0; c < n; c++) place(x + (rand() - 0.5) * 4 * c, z + (rand() - 0.5) * 4 * c, 0.7 + rand() * 1.3);
    }
  }
  const group = new THREE.Group();
  hi.forEach((v, k) => {
    const cells = new Map();
    for (const it of items[k]) {
      const key = `${it.cx},${it.cz}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(it);
    }
    for (const list of cells.values()) {
      const lod = new THREE.LOD();
      const c = new THREE.Vector3();
      for (const it of list) c.add(p.setFromMatrixPosition(it.m));
      lod.position.copy(c.divideScalar(list.length));
      const back = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
      for (const [src, at, cast] of [[v, 0, true], [lo[k], 45, false]]) {
        const inst = new THREE.InstancedMesh(shared(src.geo), src.mats, list.length);
        list.forEach((it, j) => inst.setMatrixAt(j, m.multiplyMatrices(back, it.m)));
        inst.computeBoundingSphere();
        inst.castShadow = cast;
        lod.addLevel(inst, at);
      }
      lod.addLevel(new THREE.Object3D(), 260);
      group.add(lod);
    }
  });
  group.userData.count = items.reduce((n, l) => n + l.length, 0);
  return { group, update(time) { uTime.value = time; } };
}
