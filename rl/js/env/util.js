import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import { mergeGeometries } from "@rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js";
export const ENV_QUALITY = {
low: {
tex: 512, macro: 1024, mask: 256, beams: false, stars: 2500,
keyShadow: 1024, keyBox: 30, spotShadow: 512, streakLights: 6, treeRings: 1,
rampSeg: 1, followBeam: false, envSize: 128, anisotropy: 2, haze: 0, featured: false, lattice: false,
railStreaks: false, crowdKey: 'low', dressing: false, fillMin: 0, fenceMesh: false,
},
medium: {
tex: 1024, macro: 1024, mask: 512, beams: true, stars: 5000,
keyShadow: 2048, keyBox: 36, spotShadow: 1024, streakLights: 10, treeRings: 2,
rampSeg: 2, followBeam: true, envSize: 256, anisotropy: 4, haze: 40, featured: true, lattice: true,
railStreaks: true, crowdKey: 'medium', dressing: true, fillMin: 1, fenceMesh: true,
},
high: {
tex: 1024, macro: 2048, mask: 512, beams: true, stars: 9000,
keyShadow: 2048, keyBox: 42, spotShadow: 1024, streakLights: 14, treeRings: 3,
rampSeg: 2, followBeam: true, envSize: 256, anisotropy: 16, haze: 90, featured: true, lattice: true,
railStreaks: true, crowdKey: 'high', dressing: true, fillMin: 1, fenceMesh: true,
},
ultra: {
tex: 2048, macro: 2048, mask: 1024, beams: true, stars: 14000,
keyShadow: 4096, keyBox: 48, spotShadow: 2048, streakLights: 16, treeRings: 3,
rampSeg: 3, followBeam: true, envSize: 512, anisotropy: 16, haze: 150, featured: true, lattice: true,
railStreaks: true, crowdKey: 'ultra', dressing: true, fillMin: 1, fenceMesh: true,
},
};
export const QUALITY_RANK = { low: 0, medium: 1, high: 2, ultra: 3 };
export function qualitySettings(q) { return ENV_QUALITY[q] || ENV_QUALITY.high; }
export function rng(seed = 1) {
let a = seed >>> 0;
return function () {
a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
let _mc = null; const _mcQueue = [];
export function yieldToBrowser() {
if (typeof MessageChannel === 'undefined') return Promise.resolve();
if (!_mc) {
_mc = new MessageChannel();
_mc.port1.onmessage = () => { const r = _mcQueue.shift(); if (r) r(); };
}
return new Promise((res) => { _mcQueue.push(res); _mc.port2.postMessage(0); });
}
export function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
export function makeCanvas(w, h) {
try {
if (typeof document !== 'undefined') {
const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
} catch (e) {   }
return null;
}
export function dataTexture(data, w, h, { srgb = false, repeat = true, mips = true, anisotropy = 4, nearest = false } = {}) {
const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
t.generateMipmaps = mips && !nearest;
t.minFilter = nearest ? THREE.NearestFilter : (mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter);
t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
t.anisotropy = anisotropy;
t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
t.needsUpdate = true;
return t;
}
export function canvasTexture(canvas, { srgb = false, repeat = false, anisotropy = 4, mips = true } = {}) {
const t = new THREE.CanvasTexture(canvas);
t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
t.generateMipmaps = mips;
t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
t.anisotropy = anisotropy;
t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
t.needsUpdate = true;
return t;
}
const _c = new THREE.Color();
export class GeoBucket {
constructor({ colors = false, extra = null } = {}) {
this.parts = [];
this.colors = colors;
this.extra = extra;
}
add(geom, matrix = null, color = null, extraVals = null) {
let g = geom.index ? geom.toNonIndexed() : geom;
if (g !== geom) geom.dispose();
if (matrix) g.applyMatrix4(matrix);
if (!g.attributes.normal) g.computeVertexNormals();
const n = g.attributes.position.count;
if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
for (const k of Object.keys(g.attributes)) {
if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color' && !(this.extra && k in this.extra)) g.deleteAttribute(k);
}
if (this.colors) {
if (!g.attributes.color) {
_c.set(color == null ? 0xffffff : color);
const a = new Float32Array(n * 3);
for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}
} else if (g.attributes.color) g.deleteAttribute('color');
if (this.extra) {
for (const [name, size] of Object.entries(this.extra)) {
if (g.attributes[name]) continue;
const v = extraVals && extraVals[name] != null ? extraVals[name] : 0;
const a = new Float32Array(n * size);
for (let i = 0; i < n; i++) for (let j = 0; j < size; j++) a[i * size + j] = Array.isArray(v) ? v[j] : v;
g.setAttribute(name, new THREE.BufferAttribute(a, size));
}
}
g.morphAttributes = {};
g.clearGroups();
this.parts.push(g);
return this;
}
get empty() { return this.parts.length === 0; }
build() {
if (!this.parts.length) return null;
const merged = this.parts.length === 1 ? this.parts[0] : mergeGeometries(this.parts, false);
if (merged !== this.parts[0]) for (const p of this.parts) p.dispose();
this.parts = [];
merged.computeBoundingSphere();
merged.computeBoundingBox();
return merged;
}
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
_e.set(rx, ry, rz, order); _q.setFromEuler(_e);
_p.set(x, y, z); _s.set(sx, sy, sz);
return new THREE.Matrix4().compose(_p, _q, _s);
}
export function beamMatrix(ax, ay, az, bx, by, bz, tx, tz) {
const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
const d = b.clone().sub(a); const len = d.length();
const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
return new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(tx, len, tz));
}
export function disposeObject(root) {
const seenG = new Set(), seenM = new Set(), seenT = new Set();
root.traverse((o) => {
if (o.geometry && !seenG.has(o.geometry)) { seenG.add(o.geometry); o.geometry.dispose(); }
const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
for (const m of mats) {
if (seenM.has(m)) continue; seenM.add(m);
for (const k of Object.keys(m)) {
const v = m[k];
if (v && v.isTexture && !seenT.has(v)) { seenT.add(v); v.dispose(); }
}
if (m.uniforms) for (const u of Object.values(m.uniforms)) {
if (u && u.value && u.value.isTexture && !seenT.has(u.value)) { seenT.add(u.value); u.value.dispose(); }
}
m.dispose();
}
if (o.isInstancedMesh && o.dispose) o.dispose();
if (o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
});
}
export function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function bakeLights(geometry, lamps, ambient = [0, 0, 0]) {
const pa = geometry.attributes.position, na = geometry.attributes.normal, n = pa.count;
let ab = geometry.attributes.aBake;
if (!ab) { ab = new THREE.BufferAttribute(new Float32Array(n * 3), 3); geometry.setAttribute('aBake', ab); }
const A = ab.array;
const L = lamps.map((l) => {
const at = l.at || l.aim || [l.pos[0], 0, l.pos[2]];
const d0 = Math.hypot(at[0] - l.pos[0], at[1] - l.pos[1], at[2] - l.pos[2]) || 1;
const aim = l.aim || at;
const dx = aim[0] - l.pos[0], dy = aim[1] - l.pos[1], dz = aim[2] - l.pos[2], dl = Math.hypot(dx, dy, dz) || 1;
return { p: l.pos, k: l.E * d0 * d0, ax: dx / dl, ay: dy / dl, az: dz / dl, c0: l.cos0 ?? 0.5, c1: l.cos1 ?? 0.9, col: l.color || [1, 1, 1], omni: !l.aim && !l.at };
});
for (let i = 0; i < n; i++) {
const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i);
let r = ambient[0], g = ambient[1], b = ambient[2];
for (const l of L) {
let lx = l.p[0] - x, ly = l.p[1] - y, lz = l.p[2] - z;
const d2 = Math.max(0.25, lx * lx + ly * ly + lz * lz), d = Math.sqrt(d2);
lx /= d; ly /= d; lz /= d;
const ndl = nx * lx + ny * ly + nz * lz;
if (ndl <= 0) continue;
const cone = l.omni ? 1 : smoothstep(l.c0, l.c1, -(lx * l.ax + ly * l.ay + lz * l.az));
const e = l.k / d2 * ndl * cone;
r += e * l.col[0]; g += e * l.col[1]; b += e * l.col[2];
}
A[i * 3] += r; A[i * 3 + 1] += g; A[i * 3 + 2] += b;
}
ab.needsUpdate = true;
return geometry;
}
