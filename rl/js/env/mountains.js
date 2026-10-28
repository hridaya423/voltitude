import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
const D2R = Math.PI / 180;
export const MOUNTAINS = {
LAYERS: [
{ name: 'far', minDeg: 2.6, maxDeg: 6.0, freq: 3.4, seed: [13.7, 41.3], col: [0.0118, 0.0122, 0.0142], glow: 0.30, mist: 0.70, gain: 1.6, crest: 0.42 },
{ name: 'mid', minDeg: 1.9, maxDeg: 4.4, freq: 5.2, seed: [71.1, 5.9], col: [0.0078, 0.0080, 0.0090], glow: 0.16, mist: 0.62, gain: 1.5, crest: 0.42 },
{ name: 'near', minDeg: 1.2, maxDeg: 3.0, freq: 7.4, seed: [29.3, 97.7], col: [0.0046, 0.0047, 0.0052], glow: 0.06, mist: 0.52, gain: 1.5, crest: 0.38 },
],
WARM: [0.0, 0.0, 0.0],
MIST: [0.0112, 0.0115, 0.0128],
MIST_WARM: [0.0150, 0.0136, 0.0130],
MIST_DEG: 0.85,
MIST_SKY: [0.0165, 0.0166, 0.0182],
MIST_SKY_WARM: [0.0240, 0.0192, 0.0168],
SAMPLES: 16384,
};
export const HORIZON_MIST = new THREE.Color(...MOUNTAINS.MIST);
export const FAR_RIDGE = new THREE.Color(...MOUNTAINS.LAYERS[0].col);
const fract = (x) => x - Math.floor(x);
function hash12(px, py) {
let x = fract(px * 0.1031), y = fract(py * 0.1031), z = fract(px * 0.1031);
const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
x += d; y += d; z += d;
return fract((x + y) * z);
}
function vnoise2(x, y) {
const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
const ab = a + (b - a) * ux, cd = c + (d - c) * ux;
return ab + (cd - ab) * uy;
}
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function ridged(hx, hz, f, sx, sy) {
let px = hx * f + sx, py = hz * f + sy, h = 0, a = 1, w = 1, n = 0;
for (let o = 0; o < 4; o++) {
const r = 1 - Math.abs(2 * vnoise2(px, py) - 1);
h += r * a * w; n += a;
w = Math.min(1, Math.max(0, r * 1.3));
a *= 0.5; px = px * 2.17 + 5.31; py = py * 2.17 + 1.73;
}
return h / n;
}
function layerSin(L, hx, hz) {
const f = L.freq, [ax, ay] = L.seed;
const m = sstep(0.22, 0.78, vnoise2(hx * 0.33 * f + ay + 101, hz * 0.33 * f + ax + 101));
const base = sstep(0.12, 0.92, vnoise2(hx * 0.55 * f + ax + 7, hz * 0.55 * f + ay + 3));
const r = ridged(hx, hz, 1.5 * f, ax, ay);
const cr = L.crest == null ? 0.60 : L.crest;
const shape = ((1 - cr) * base + cr * r * r) * (0.30 + 0.70 * m);
let deg = L.minDeg * (0.5 + 0.5 * m) + (L.maxDeg - L.minDeg) * shape * L.gain;
const k = L.maxDeg * 0.85, w = L.maxDeg * 0.15;
if (deg > k) deg = k + w * Math.tanh((deg - k) / w);
return Math.sin(deg * D2R);
}
export function mountainHeightDeg(az, layer = 0) {
return Math.asin(layerSin(MOUNTAINS.LAYERS[layer], Math.cos(az), Math.sin(az))) / D2R;
}
let _tex = null, _top = 0;
function bake() {
if (_tex) return _tex;
const N = MOUNTAINS.SAMPLES, W = 128, H = N / W, data = new Float32Array(N * 4);
for (let i = 0; i < N; i++) {
const az = (i / N - 0.5) * Math.PI * 2, hx = Math.cos(az), hz = Math.sin(az);
for (let k = 0; k < 3; k++) { const v = layerSin(MOUNTAINS.LAYERS[k], hx, hz); data[i * 4 + k] = v; if (v > _top) _top = v; }
data[i * 4 + 3] = 1;
}
_tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
_tex.minFilter = _tex.magFilter = THREE.NearestFilter;
_tex.generateMipmaps = false;
_tex.colorSpace = THREE.NoColorSpace;
_tex.name = 'env.mountains.profile';
_tex.needsUpdate = true;
return _tex;
}
export function mountainUniforms() {
const L = MOUNTAINS.LAYERS, tex = bake();
return {
uMtnTex: { value: tex },
uMtnCol: { value: L.map((l) => new THREE.Vector3(...l.col)) },
uMtnMist: { value: new THREE.Vector3(...L.map((l) => l.mist)) },
uMtnGlow: { value: new THREE.Vector3(...L.map((l) => l.glow)) },
uMtnWarm: { value: new THREE.Vector3(...MOUNTAINS.WARM) },
uMistCol: { value: new THREE.Vector3(...MOUNTAINS.MIST_SKY) },
uMistWarm: { value: new THREE.Vector3(...MOUNTAINS.MIST_SKY_WARM) },
uMistH: { value: Math.sin(MOUNTAINS.MIST_DEG * D2R) },
uMtnTopA: { value: _top + 0.002 },
};
}
export const MOUNTAIN_GLSL =  `
uniform highp sampler2D uMtnTex;
uniform vec3 uMtnCol[3];
uniform vec3 uMtnMist, uMtnGlow, uMtnWarm, uMistCol, uMistWarm;
uniform float uMistH, uMtnTopA;

vec3 mtnH3( vec2 hz ) {
  const float N = ${MOUNTAINS.SAMPLES.toFixed(1)};
  float x = ( atan( hz.y, hz.x ) * 0.15915494 + 0.5 ) * N - 0.5;
  float i0 = floor( x ), t = x - i0;
  i0 = mod( i0, N );
  float i1 = mod( i0 + 1.0, N );
  vec3 a = texelFetch( uMtnTex, ivec2( int( mod( i0, 128.0 ) ), int( floor( i0 / 128.0 ) ) ), 0 ).rgb;
  vec3 b = texelFetch( uMtnTex, ivec2( int( mod( i1, 128.0 ) ), int( floor( i1 / 128.0 ) ) ), 0 ).rgb;
  return mix( a, b, t );
}
`;
