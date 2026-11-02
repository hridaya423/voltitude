import * as THREE from 'three';
import { GLTFLoader } from '../../rl/vendor/three-r169/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { lineupBoxes, LINEUP, HALF_W } from '../sim/lineup.js';

const MAX = 64;
const MODEL = { hatch: 'hatchback-sports', robotaxi: 'taxi', pickup: 'truck', van: 'van', semi: 'delivery' };
const CLIP = new THREE.Color('#ff2a1a'), WHITE = new THREE.Color(1, 1, 1);
const FLASH_S = 0.5;

async function unitGeometry(loader, file) {
  const gltf = await loader.loadAsync(`assets/models/lineup/${file}.glb`);
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  let map = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    map ||= o.material.map;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    parts.push(g.index ? g.toNonIndexed() : g);
  });
  const g = mergeGeometries(parts);
  g.computeBoundingBox();
  const b = g.boundingBox, size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  g.translate(-c.x, -b.min.y, -c.z).scale(1 / size.x, 1 / size.y, 1 / size.z);
  return { g, map };
}

export function createLineup(world, fog) {
  const { track } = world;
  const group = new THREE.Group();
  const meshes = {};
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const R = new THREE.Vector3(), U = new THREE.Vector3(), T = new THREE.Vector3(), color = new THREE.Color();
  let boxes = [], flash = 0, flashK = -1, shown = -1;

  const place = () => {
    const slot = {};
    for (const mesh of Object.values(meshes)) mesh.count = 0;
    for (const b of boxes) {
      const mesh = meshes[b.kind];
      if (!mesh) continue;
      const k = Math.round((b.s0 + b.s1) / 2) * 3;
      R.set(track.R[k], track.R[k + 1], track.R[k + 2]); U.set(track.U[k], track.U[k + 1], track.U[k + 2]); T.set(track.T[k], track.T[k + 1], track.T[k + 2]);
      q.setFromRotationMatrix(basis.makeBasis(R.negate(), U, T));
      p.set(track.P[k], track.P[k + 1], track.P[k + 2]).addScaledVector(T, (b.s0 + b.s1) / 2 - Math.round((b.s0 + b.s1) / 2));
      const i = (slot[b.kind] = (slot[b.kind] ?? -1) + 1);
      b.slot = i;
      mesh.setMatrixAt(i, m.compose(p, q, s.set(HALF_W * 2, b.h, b.s1 - b.s0)));
      mesh.count = i + 1;
    }
    for (const mesh of Object.values(meshes)) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
    paint();
  };
  const paint = () => {
    for (const b of boxes) {
      const mesh = meshes[b.kind];
      if (mesh) mesh.setColorAt(b.slot, color.copy(WHITE).lerp(CLIP, b.k === flashK ? Math.min(1, flash * 2) : 0));
    }
    for (const mesh of Object.values(meshes)) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const loader = new GLTFLoader();
  Promise.all(LINEUP.map((v) => unitGeometry(loader, MODEL[v.kind]).then((r) => [v.kind, r]))).then((list) => {
    const mat = new THREE.MeshStandardMaterial({ map: list[0][1].map, roughness: 0.6, metalness: 0.1 });
    fog?.(mat);
    for (const [kind, { g }] of list) {
      const mesh = new THREE.InstancedMesh(g, mat, MAX);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.count = 0;
      meshes[kind] = mesh;
      group.add(mesh);
    }
    place();
  }).catch((e) => console.warn('lineup models', e));

  return {
    mesh: group,
    set(count) {
      if (count === shown) return;
      shown = count;
      boxes = lineupBoxes(track, Math.min(count, MAX));
      flashK = -1;
      place();
    },
    clip(k) { flashK = k; flash = 1; },
    update(dt) {
      if (flash <= 0) return;
      flash = Math.max(0, flash - dt / FLASH_S);
      paint();
    },
  };
}
