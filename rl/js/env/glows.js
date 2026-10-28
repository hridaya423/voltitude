import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
export const GLOW_CH = { GENERAL: 0, FLOOD: 1, RED: 2, ACCENT: 3, XING: 4, YARD: 5, GANTRY: 6, STAGE: 7 };
export const GLOW_SHAPE = { SOFT: 0, GLARE: 1, STAR: 2 };
export const GLOW_ANIM = { STEADY: 0, BLINK: 1, TWINKLE: 2, PULSE: 3 };
export const GLOW_LOOK = { SOFT_SCALE: 0.28, CORE_SCALE: 0.35, STREAK_SLOTS: 6, STREAK_HEADS: 3, GLARE_ASPECT: 1.35 };
const _sv = { x: 0, y: 0, z: 0 };
export class GlowField {
constructor(capacity = 1024) {
this.capacity = capacity;
this.count = 0;
this.aPos = new Float32Array(capacity * 4);
this.aCol = new Float32Array(capacity * 4);
this.aDir = new Float32Array(capacity * 4);
this.aPrm = new Float32Array(capacity * 4);
this.uniforms = {
uTime: { value: 0 },
uChan: { value: new THREE.Vector4(1, 1, 1, 1) },
uChan2: { value: new THREE.Vector4(0.15, 0, 0, 1) },
uScale: { value: 1 },
uSel: { value: new Float32Array(GLOW_LOOK.STREAK_SLOTS).fill(-1) },
};
this._seed = 1;
this._streakIds = null;
this._selIdx = new Int32Array(GLOW_LOOK.STREAK_SLOTS);
this._selScore = new Float32Array(GLOW_LOOK.STREAK_SLOTS);
}
selectStreaks(camera, k = GLOW_LOOK.STREAK_HEADS) {
const ids = this._streakIds, sel = this.uniforms.uSel.value;
if (!ids || !camera || !camera.position) return;
const cp = camera.position, e = camera.matrixWorld && camera.matrixWorld.elements;
let fx = 0, fy = 0, fz = -1;
if (e) { fx = -e[8]; fy = -e[9]; fz = -e[10]; const l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l; }
k = Math.min(k, GLOW_LOOK.STREAK_SLOTS);
const P = this.aPos, C = this.aCol, D = this.aDir, si = this._selIdx, ss = this._selScore;
let n = 0;
for (let m = 0; m < ids.length; m++) {
const i = ids[m], j = i * 4;
_sv.x = cp.x - P[j]; _sv.y = cp.y - P[j + 1]; _sv.z = cp.z - P[j + 2];
const d2 = Math.max(1, _sv.x * _sv.x + _sv.y * _sv.y + _sv.z * _sv.z), d = Math.sqrt(d2);
const vx = _sv.x / d, vy = _sv.y / d, vz = _sv.z / d;
if (-(vx * fx + vy * fy + vz * fz) < 0.55) continue;
let facing = 1;
const w = D[j + 3];
if (w > 0) { const c = Math.max(0, vx * D[j] + vy * D[j + 1] + vz * D[j + 2]); facing = 1 + (0.08 + 0.92 * c * c - 1) * w; }
const lum = 0.2126 * C[j] + 0.7152 * C[j + 1] + 0.0722 * C[j + 2];
const sc = lum * P[j + 3] * P[j + 3] * facing / d2;
if (n < k) { si[n] = i; ss[n] = sc; n++; continue; }
let mi = 0;
for (let q = 1; q < n; q++) if (ss[q] < ss[mi]) mi = q;
if (sc > ss[mi]) { si[mi] = i; ss[mi] = sc; }
}
for (let q = 0; q < sel.length; q++) sel[q] = q < n ? si[q] : -1;
}
add(x, y, z, size, r, g, b, { dir = null, directional = 0, channel = 0, shape = GLOW_SHAPE.SOFT, anim = GLOW_ANIM.STEADY, phase = null, push = 0.5 } = {}) {
if (this.count >= this.capacity) return -1;
if (phase == null) { this._seed = (this._seed * 16807) % 2147483647; phase = (this._seed / 2147483647) * 10; }
const i = this.count++;
this.aPos.set([x, y, z, size], i * 4);
this.aCol.set([r, g, b, push], i * 4);
this.aDir.set(dir ? [dir[0], dir[1], dir[2], directional] : [0, 0, 0, 0], i * 4);
this.aPrm.set([channel, shape, anim, phase], i * 4);
return i;
}
build() {
const quad = new THREE.PlaneGeometry(1, 1);
const g = new THREE.InstancedBufferGeometry();
g.index = quad.index;
g.setAttribute('position', quad.getAttribute('position'));
g.setAttribute('uv', quad.getAttribute('uv'));
const n = Math.max(1, this.count);
g.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.aPos.slice(0, n * 4), 4));
g.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.aCol.slice(0, n * 4), 4));
g.setAttribute('iDir', new THREE.InstancedBufferAttribute(this.aDir.slice(0, n * 4), 4));
g.setAttribute('iPrm', new THREE.InstancedBufferAttribute(this.aPrm.slice(0, n * 4), 4));
g.instanceCount = this.count;
const sid = [];
for (let i = 0; i < this.count; i++) if (this.aPrm[i * 4 + 1] > 0.5) sid.push(i);
this._streakIds = Int32Array.from(sid);
const mat = new THREE.ShaderMaterial({
name: 'env.glows',
uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
vertexShader:  `
attribute vec4 iPos, iCol, iDir, iPrm;
uniform float uTime, uScale;
uniform vec4 uChan, uChan2;
uniform float uSel[ ${GLOW_LOOK.STREAK_SLOTS} ];
varying vec2 vUv;
varying vec3 vCol;
varying float vShape;
varying float vStreak;
varying vec3 vWorld;
varying float vMist;
void main() {
  vUv = uv * 2.0 - 1.0;
  vec3 wp = iPos.xyz;
  vWorld = wp;
  vec3 toCam = cameraPosition - wp;
  float dist = length( toCam );
  vec3 V = toCam / max( dist, 1e-3 );

  float facing = iDir.w > 0.0 ? mix( 1.0, 0.08 + 0.92 * pow( max( dot( V, iDir.xyz ), 0.0 ), 2.0 ), iDir.w ) : 1.0;
  float ch = iPrm.x;
  vec4 cv = ch < 3.5 ? uChan : uChan2;
  float cl = ch < 3.5 ? ch : ch - 4.0;
  float chan = cl < 0.5 ? cv.x : cl < 1.5 ? cv.y : cl < 2.5 ? cv.z : cv.w;
  float anim = 1.0;
  float ph = iPrm.w;
  if ( iPrm.z > 0.5 && iPrm.z < 1.5 ) anim = step( 0.55, fract( uTime * 0.75 + ph ) );
  else if ( iPrm.z > 1.5 && iPrm.z < 2.5 ) anim = step( 0.72, fract( uTime * 0.31 + ph * 0.37 ) ) * ( 0.6 + 0.4 * sin( uTime * 9.0 + ph ) );
  else if ( iPrm.z > 2.5 ) anim = 0.75 + 0.25 * sin( uTime * 2.4 + ph );
  vCol = iCol.rgb * facing * chan * anim * uScale;
  vShape = iPrm.y;



  vMist = vShape > 0.5 && vShape < 1.5 ? smoothstep( 40.0, 170.0, dist ) : 0.0;
  float size = iPos.w;
  if ( vShape < 0.5 ) size *= ${GLOW_LOOK.SOFT_SCALE.toFixed(3)};
  vStreak = 1.0;
  if ( vShape > 0.5 ) {

    float id = float( gl_InstanceID ), sel = 0.0;
    for ( int k = 0; k < ${GLOW_LOOK.STREAK_SLOTS}; k ++ ) sel += 1.0 - step( 0.5, abs( id - uSel[ k ] ) );
    vStreak = min( sel, 1.0 );
    size *= mix( ${GLOW_LOOK.CORE_SCALE.toFixed(3)}, 1.0, vStreak );
  }

  size = max( size, dist * 0.0022 );
  vec4 mv = viewMatrix * vec4( wp, 1.0 );
  mv.xyz += normalize( - mv.xyz ) * min( iCol.w, dist * 0.5 );
  float aspect = vShape > 0.5 && vShape < 1.5 ? ${GLOW_LOOK.GLARE_ASPECT.toFixed(2)} : 1.0;
  mv.xy += position.xy * vec2( size * aspect, size );
  vUv.x *= aspect;

  gl_Position = projectionMatrix * mv;
}`,
fragmentShader:  `
#include <fog_pars_fragment>
varying vec2 vUv;
varying vec3 vCol;
varying float vShape;
varying float vStreak;
varying vec3 vWorld;
varying float vMist;
void main() {
  vec2 p = vUv;
  float r2 = dot( p, p );
  float a, haloA = 0.0;
  if ( vShape < 0.5 ) {
    a = exp( - r2 * 9.0 ) + 0.15 * exp( - r2 * 2.5 );
  } else if ( vShape < 1.5 ) {






    a = 1.6 * exp( - r2 * 120.0 );


    haloA = 0.11 * exp( - r2 * 16.0 ) + vMist * 0.035 * exp( - r2 * mix( 5.0, 22.0, vStreak ) );
    a += vStreak * 0.035 * exp( - p.y * p.y * 1600.0 ) * exp( - abs( p.x ) * 15.0 );
  } else {
    a = exp( - r2 * 14.0 ) + vStreak * 0.04 * exp( - p.y * p.y * 400.0 ) * exp( - abs( p.x ) * 14.0 );
  }
  float clip = smoothstep( 1.0, 0.55, length( vec2( p.x / ( vShape > 0.5 && vShape < 1.5 ? ${GLOW_LOOK.GLARE_ASPECT.toFixed(2)} : 1.0 ), p.y ) ) );
  vec3 c = vCol * ( a + haloA * vec3( 0.78, 0.92, 1.25 ) ) * clip;
  #ifdef USE_FOG
  #ifdef FOG_EXP2
    c *= 1.0 - 0.8 * envFogFactor( cameraPosition, vWorld, fogDensity );
  #endif
  #endif
  gl_FragColor = vec4( c, 1.0 );
}`,
blending: THREE.AdditiveBlending,
transparent: true,
depthWrite: false,
depthTest: true,
fog: true,
});
mat.uniforms.uTime = this.uniforms.uTime;
mat.uniforms.uChan = this.uniforms.uChan;
mat.uniforms.uChan2 = this.uniforms.uChan2;
mat.uniforms.uScale = this.uniforms.uScale;
mat.uniforms.uSel = this.uniforms.uSel;
const mesh = new THREE.Mesh(g, mat);
mesh.name = 'env.glows';
mesh.frustumCulled = false;
mesh.renderOrder = 50;
this.mesh = mesh;
return mesh;
}
}
