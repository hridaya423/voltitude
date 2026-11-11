import * as THREE from 'three';
import { shared, trackClearance } from './props.js';

const CELL = 160;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function foliageTexture(rand, palette, strokes, length) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.5;
    const len = length * (0.45 + rand() * 0.55);
    const x0 = 128 + (rand() - 0.5) * 26, y0 = 252;
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.strokeStyle = palette[Math.floor(rand() * palette.length)];
    g.lineWidth = 1.2 + rand() * 2.2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (rand() - 0.5) * 24, (y0 + y1) / 2, x1, y1);
    g.stroke();
    for (let k = 0; k < 6; k++) {
      const t = 0.4 + k * 0.1;
      g.fillStyle = palette[Math.floor(rand() * palette.length)];
      g.beginPath();
      g.ellipse(x0 + (x1 - x0) * t + (rand() - 0.5) * 8, y0 + (y1 - y0) * t, 3 + rand() * 4, 1.5 + rand() * 2, a + (rand() - 0.5), 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

function cards(n, w, h) {
  const pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI, ca = Math.cos(a) * w / 2, sa = Math.sin(a) * w / 2;
    const b = pos.length / 3;
    pos.push(-ca, 0, -sa, ca, 0, sa, ca, h, sa, -ca, h, -sa);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let k = 0; k < 4; k++) nor.push(0, 1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

export function createScrub(world, fogPatch) {
  const { track, terrain } = world;
  const rand = rng(777);
  const clear = trackClearance(track);
  const kinds = [
    { geo: cards(4, 0.9, 0.7), tex: foliageTexture(rng(23), ['#b9a56a', '#cdb878', '#a8935a', '#d6c58a'], 90, 100), count: 2.2, reach: 55, size: [0.6, 1.4], far: 160 },
  ];
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const kind of kinds) {
    const mat = new THREE.MeshStandardMaterial({ map: kind.tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, metalness: 0, envMapIntensity: 0.5 });
    fogPatch(mat);
    const cells = new Map();
    for (let i = 0; i < track.n; i += 2) {
      const k = i * 3;
      let want = kind.count;
      while (want > 0) {
        if (want < 1 && rand() > want) break;
        want -= 1;
        const lat = Math.max(track.wallL[i], track.wallR[i]) + 3 + Math.pow(rand(), 1.8) * kind.reach;
        const side = rand() < 0.5 ? -1 : 1;
        const x = track.P[k] + track.R[k] * lat * side + (rand() - 0.5) * 4, z = track.P[k + 2] + track.R[k + 2] * lat * side + (rand() - 0.5) * 4;
        if (clear(x, z) < 3) continue;
        const h = terrain.height(x, z);
        if (Math.abs(terrain.height(x + 2, z) - terrain.height(x - 2, z)) > 2.2 || Math.abs(terrain.height(x, z + 2) - terrain.height(x, z - 2)) > 2.2) continue;
        const s = kind.size[0] + rand() * (kind.size[1] - kind.size[0]);
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        m.compose(p.set(x, h - 0.05, z), q, sc.set(s, s * (0.8 + rand() * 0.5), s));
        const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(m.clone());
      }
    }
    for (const list of cells.values()) {
      const center = new THREE.Vector3();
      for (const t of list) center.add(p.setFromMatrixPosition(t));
      center.divideScalar(list.length);
      const back = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
      const inst = new THREE.InstancedMesh(shared(kind.geo), mat, list.length);
      list.forEach((t, j) => inst.setMatrixAt(j, m.multiplyMatrices(back, t)));
      inst.computeBoundingSphere();
      inst.receiveShadow = true;
      const lod = new THREE.LOD();
      lod.position.copy(center);
      lod.addLevel(inst, 0);
      lod.addLevel(new THREE.Object3D(), kind.far);
      group.add(lod);
    }
  }
  return group;
}
