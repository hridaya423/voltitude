import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import { GLSL_NOISE } from "@rl/js/env/glsl.js";
import { rng } from "@rl/js/env/util.js";
import { SKY as SKY_CFG, VENUE } from "@rl/js/config.js";
import { MOUNTAIN_GLSL, mountainUniforms, HORIZON_MIST } from "@rl/js/env/mountains.js";
export { HORIZON_MIST };
export const SKY_VERSION = 'sky-v5.2 skylight r2';
const D2R = Math.PI / 180;
const bearingDir = (b, alt = 0) => new THREE.Vector3(Math.sin(b * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R), Math.cos(b * D2R) * Math.cos(alt * D2R));
const compassDir = (A, alt = 0) => bearingDir(291 - A, alt);
const LAT = 31.40 * D2R, LST = 303.9 * D2R;
const NORTH = [-0.934, 0.358], EAST = [-0.358, -0.934];
function altAzDir(alt, az) {
const c = Math.cos(alt), ca = Math.cos(az), sa = Math.sin(az);
return new THREE.Vector3(c * (NORTH[0] * ca + EAST[0] * sa), Math.sin(alt), c * (NORTH[1] * ca + EAST[1] * sa));
}
export function eqDir(raH, decD) {
const H = LST - raH * 15 * D2R, dec = decD * D2R;
const alt = Math.asin(Math.sin(dec) * Math.sin(LAT) + Math.cos(dec) * Math.cos(LAT) * Math.cos(H));
const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(LAT) - Math.cos(dec) * Math.sin(LAT) * Math.cos(H));
return altAzDir(alt, az);
}
const BRIGHT = [
[14.261, 19.18, -0.05, 'o'], [18.616, 38.78, 0.03, 'b'], [5.278, 46.00, 0.08, 'y'], [19.846, 8.87, 0.77, 'w'],
[4.599, 16.51, 0.85, 'o'], [16.490, -26.43, 1.06, 'r'], [13.420, -11.16, 0.97, 'b'], [22.961, -29.62, 1.16, 'w'],
[20.690, 45.28, 1.25, 'w'], [10.139, 11.97, 1.35, 'b'], [17.560, -37.10, 1.62, 'b'], [17.622, -43.00, 1.86, 'y'],
[18.403, -34.38, 1.85, 'b'], [22.137, -46.96, 1.74, 'b'], [12.900, 55.96, 1.76, 'w'], [11.062, 61.75, 1.79, 'o'],
[3.405, 49.86, 1.79, 'y'], [13.792, 49.31, 1.86, 'b'], [2.530, 89.26, 1.98, 'y'], [2.120, 23.46, 2.00, 'o'],
[0.727, -17.99, 2.02, 'o'], [18.921, -26.30, 2.05, 'b'], [0.140, 29.09, 2.06, 'b'], [1.163, 35.62, 2.05, 'r'],
[14.845, 74.16, 2.08, 'o'], [17.582, 12.56, 2.08, 'w'], [3.136, 40.96, 2.12, 'b'], [2.065, 42.33, 2.10, 'o'],
[11.818, 14.57, 2.13, 'w'], [20.370, 40.26, 2.23, 'y'], [0.675, 56.54, 2.24, 'o'], [17.943, 51.49, 2.24, 'o'],
[0.153, 59.15, 2.28, 'w'], [13.399, 54.93, 2.23, 'w'], [0.945, 60.72, 2.15, 'b'], [15.578, 26.71, 2.22, 'w'],
[16.006, -22.62, 2.29, 'b'], [14.750, 27.07, 2.37, 'o'], [11.031, 56.38, 2.37, 'w'], [17.708, -39.03, 2.39, 'b'],
[21.736, 9.88, 2.39, 'o'], [11.897, 53.69, 2.44, 'w'], [23.063, 28.08, 2.42, 'r'], [17.173, -15.72, 2.43, 'w'],
[21.310, 62.59, 2.45, 'w'], [23.079, 15.21, 2.48, 'b'], [20.770, 33.97, 2.48, 'o'], [3.038, 4.09, 2.54, 'r'],
[19.044, -29.88, 2.60, 'w'], [15.738, 6.43, 2.63, 'o'], [1.911, 20.81, 2.64, 'w'], [1.430, 60.24, 2.68, 'w'],
[18.350, -29.83, 2.70, 'o'], [19.771, 10.61, 2.72, 'o'], [16.504, 21.49, 2.77, 'y'], [17.507, 52.30, 2.79, 'y'],
[18.466, -25.42, 2.81, 'o'], [16.688, 31.60, 2.81, 'y'], [21.784, -16.13, 2.85, 'w'], [3.791, 24.11, 2.87, 'b'],
[19.750, 45.13, 2.87, 'b'], [21.526, -5.57, 2.90, 'y'], [22.097, -0.32, 2.95, 'y'], [18.097, -30.42, 2.99, 'o'],
[15.345, 71.83, 3.00, 'w'], [19.512, 27.96, 3.05, 'o'], [17.244, 14.39, 3.10, 'r'], [21.216, 30.23, 3.20, 'y'],
[18.982, 32.69, 3.25, 'b'], [12.257, 57.03, 3.31, 'w'], [19.425, 3.11, 3.36, 'w'], [18.835, 33.36, 3.50, 'w'],
[14.073, 64.38, 3.65, 'w'], [3.749, 24.11, 3.70, 'b'], [3.819, 24.05, 3.62, 'b'], [3.763, 24.37, 3.87, 'b'],
[3.772, 23.95, 4.18, 'b'], [3.754, 24.47, 4.30, 'b'], [22.717, 30.22, 2.94, 'y'], [21.478, 70.56, 3.23, 'b'],
[23.656, 77.63, 3.21, 'o'], [1.907, 63.67, 3.37, 'b'], [2.159, 34.99, 3.00, 'w'], [0.655, 30.86, 3.27, 'o'],
[19.116, -27.67, 3.32, 'o'], [19.163, -21.02, 2.89, 'y'], [16.836, -34.29, 2.29, 'o'], [16.865, -38.05, 3.00, 'b'],
[17.793, -40.13, 3.00, 'y'], [16.353, -25.59, 2.90, 'b'], [16.091, -19.81, 2.62, 'b'], [16.598, -28.22, 2.82, 'b'],
[16.619, -10.57, 2.56, 'b'], [16.239, -3.69, 2.74, 'r'], [16.305, -4.69, 3.24, 'y'], [17.725, 4.57, 2.77, 'o'],
[17.251, 36.81, 3.16, 'o'], [14.535, 38.31, 3.03, 'w'], [13.911, 18.40, 2.68, 'y'], [20.350, -14.78, 3.05, 'y'],
[22.911, -15.82, 3.27, 'w'], [22.711, -46.88, 2.07, 'r'], [0.221, 15.18, 2.83, 'b'],
];
const TINT = { b: [0.72, 0.84, 1.0], w: [0.97, 0.98, 1.0], y: [1.0, 0.94, 0.80], o: [1.0, 0.80, 0.58], r: [1.0, 0.72, 0.54] };
const _md = new THREE.Vector3(...SKY_CFG.MOON_DIR).normalize();
const _gnp = eqDir(12.857, 27.13), _gc = eqDir(17.761, -28.94);
const _gl90 = (() => { const e = new THREE.Vector3().crossVectors(_gnp, _gc).normalize(); if (e.dot(eqDir(21.2, 48.33)) < 0) e.negate(); return e; })();
export const MW_RISE_BEARING = 76, MW_INCL = 70;
const MW_GAIN = 1.15, MW_HI = 0.9;
const _mwRise = bearingDir(MW_RISE_BEARING), _mwPk = bearingDir(MW_RISE_BEARING - 90, MW_INCL);
const _mwN = new THREE.Vector3().crossVectors(_mwRise, _mwPk).normalize();
const _mwE2 = (() => { const e = new THREE.Vector3().crossVectors(_mwN, _mwRise).normalize(); if (e.y < 0) e.negate(); return e; })();
export const SKY = {
ZENITH: new THREE.Color(0.0050, 0.0053, 0.0068),
HORIZON: new THREE.Color(0.0230, 0.0228, 0.0245),
GLOW: new THREE.Color(0.056, 0.040, 0.031),
GLOW_ROSE: new THREE.Color(0.030, 0.026, 0.0235),
DUSK_DIR: new THREE.Vector3(...SKY_CFG.DUSK_DIR).normalize(),
GLOW_DIR: bearingDir(72),
GLOW_HALF_DEG: 30,
GLOW2_DIR: compassDir(62),
GROUND: new THREE.Color(0.0085, 0.0090, 0.0102),
MOON_DIR: _md,
MOON_PHASE: SKY_CFG.MOON_PHASE,
PLANET_DIR: bearingDir(-62, 27),
MW_NORMAL: _mwN.clone(), MW_RISE: _mwRise.clone(), MW_L90: _mwE2.clone(),
};
const VERT_FAR =  `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww;
}`;
const GLOW_GLSL =  `
uniform vec3 uGlowCol;
uniform vec4 uGlowK;
vec3 skyGlow( float up, float lobe, float lobe2 ) {
  float L = max( lobe, lobe2 * uGlowK.y );
  float band = exp( - up / uGlowK.z );
  float dome = exp( - up / uGlowK.w );
  vec3 g = uGlowCol * ( uGlowK.x * band + L * ( 0.40 * band + 0.60 * dome ) );
  return g * mix( vec3( 1.0 ), vec3( 0.90, 0.97, 1.08 ), smoothstep( 0.0, 0.16, up ) );
}`;
export function createSky({ q, uTime }) {
const group = new THREE.Group();
group.name = 'env.sky';
const mtnU = mountainUniforms();
const uLevel = { value: 1 };
const sigOf = (halfDeg) => halfDeg * D2R / Math.sqrt(2 * Math.LN2);
const g2 = (v) => new THREE.Vector2(v.x, v.z).normalize();
const domeMat = new THREE.ShaderMaterial({
name: 'env.skyDome',
uniforms: {
uTime, uLevel, ...mtnU,
uHorizon: { value: SKY.HORIZON.clone() }, uZenith: { value: SKY.ZENITH.clone() }, uGlowCol: { value: SKY.GLOW.clone() },
uGlowDir: { value: g2(SKY.GLOW_DIR) }, uGlow2Dir: { value: g2(SKY.GLOW2_DIR) },
uGlowSig: { value: sigOf(SKY.GLOW_HALF_DEG) }, uGlow2Sig: { value: sigOf(26) },
uGlowK: { value: new THREE.Vector4(0.22, 0.45, Math.sin(2.4 * D2R), Math.sin(5.5 * D2R)) },
uGround: { value: SKY.GROUND.clone() },
uMW: { value: SKY.MW_NORMAL.clone() }, uMWC: { value: SKY.MW_RISE.clone() }, uMWE2: { value: SKY.MW_L90.clone() },
uMWCol: { value: new THREE.Color(0.0135, 0.0134, 0.0148) }, uMWGain: { value: MW_GAIN }, uMWHi: { value: MW_HI },
uMoon: { value: SKY.MOON_DIR.clone() }, uMoonPhase: { value: SKY.MOON_PHASE }, uMoonSize: { value: 0.0052 }, uMoonHdr: { value: 2.0 },
uRidgeSoft: { value: 0 },
},
vertexShader: VERT_FAR,
fragmentShader:  `
varying vec3 vDir;
uniform float uTime, uLevel;
uniform vec3 uHorizon, uZenith, uGround, uMW, uMWC, uMWE2, uMWCol, uMoon;
uniform vec2 uGlowDir, uGlow2Dir;
uniform float uGlowSig, uGlow2Sig, uMWGain, uMWHi, uMoonPhase, uMoonSize, uMoonHdr;
uniform float uRidgeSoft;
${GLSL_NOISE}
${MOUNTAIN_GLSL}
${GLOW_GLSL}
float sq( float x ) { return x * x; }
void main() {
  vec3 d = normalize( vDir );

  vec2 hz = normalize( d.xz + vec2( 1e-6 ) );
  vec3 mH = mtnH3( hz ), mHx = dFdx( mH ), mHy = dFdy( mH );
  float aX = dFdx( d.y ), aY = dFdy( d.y );
  float a = d.y;
  float up = max( a, 0.0 );


  vec3 col = uZenith + ( uHorizon - uZenith ) * ( 0.72 * exp( - up / 0.096 ) + 0.28 * exp( - up / 0.276 ) );
  float az1 = acos( clamp( dot( hz, uGlowDir ), -1.0, 1.0 ) ), az2 = acos( clamp( dot( hz, uGlow2Dir ), -1.0, 1.0 ) );
  float lobe = exp( -0.5 * az1 * az1 / ( uGlowSig * uGlowSig ) );
  float lobe2 = exp( -0.5 * az2 * az2 / ( uGlow2Sig * uGlow2Sig ) );
  col += skyGlow( up, lobe, lobe2 );


  {
    float bG = asin( clamp( dot( d, uMW ), -1.0, 1.0 ) );
    if ( abs( bG ) < 0.45 && a > 0.0 ) {
      float lG = atan( dot( d, uMWE2 ), dot( d, uMWC ) );
      float aL = abs( lG );
      float lp = 0.55 + 0.45 * exp( - sq( aL / 0.55 ) ) + 0.35 * exp( - sq( ( aL - 0.62 ) / 0.25 ) ) + 0.55 * exp( - sq( ( aL - 2.55 ) / 0.45 ) ) + 0.25 * exp( - sq( ( aL - 1.55 ) / 0.40 ) )
               + uMWHi * exp( - sq( ( aL - 1.20 ) / 0.60 ) );
      float w = 0.090 + 0.05 * exp( - sq( aL / 0.40 ) ) + 0.03 * exp( - sq( ( aL - 2.6 ) / 0.5 ) );
      float band = exp( - 0.5 * bG * bG / ( w * w ) );
      float cl = max( 0.0, 0.40 + 1.20 * envFbm3( d * 7.0 + 17.0 ) ) * ( 0.75 + 0.5 * envFbm3( d * 19.0 + 3.0 ) );

      float riftL = smoothstep( 0.15, 0.45, aL ) * ( 1.0 - smoothstep( 2.4, 2.8, aL ) );
      float rift = riftL * exp( - sq( ( bG - 0.03 - 0.015 * envSnoise( d * 4.0 + 7.0 ) ) / 0.04 ) );
      float moonW = 1.0 - 0.85 * pow( max( dot( d, normalize( uMoon ) ), 0.0 ), 10.0 );
      float lowW = smoothstep( 0.02, 0.22, up );
      col += uMWCol * band * lp * cl * ( 1.0 - 0.65 * rift ) * moonW * lowW * uMWGain;
    }
  }



  {
    vec3 md = normalize( uMoon );
    vec3 rt = normalize( cross( md, vec3( 0.0, 1.0, 0.0 ) ) );
    vec3 upv = cross( rt, md );
    vec2 uv = vec2( dot( d, rt ), dot( d, upv ) ) / uMoonSize;
    float r2 = dot( uv, uv );
    float cp = 1.0 - 2.0 * uMoonPhase;
    float sp = sqrt( max( 0.0, 1.0 - cp * cp ) );
    vec3 sun = vec3( vec2( 0.62, -0.78 ) * sp, -cp );
    if ( dot( d, md ) > 0.0 && r2 < 16.0 ) {
      float r = sqrt( r2 );
      float z = sqrt( max( 0.0, 1.0 - r2 ) );
      vec3 n = vec3( uv, z );
      float disc = smoothstep( 1.0, 0.90, r );
      float lit = smoothstep( -0.04, 0.14, dot( n, sun ) );
      float mare = 0.82 + 0.18 * envFbm3( vec3( uv * 2.3, 4.0 ) );
      float limb = 0.82 + 0.18 * z;
      col += vec3( 0.010, 0.011, 0.014 ) * mare * ( 1.0 - lit ) * disc;
      col += vec3( 1.0, 0.98, 0.94 ) * uMoonHdr * lit * mare * limb * disc;
      float side = 0.55 + 0.45 * clamp( dot( normalize( uv + 1e-5 ), sun.xy / max( sp, 1e-3 ) ), 0.0, 1.0 );
      col += vec3( 0.030, 0.030, 0.032 ) * exp( - max( r - 1.0, 0.0 ) * 1.6 ) * side * ( 1.0 - disc );
    }
    float mdot = max( dot( d, md ), 0.0 );
    col += vec3( 0.0014, 0.0015, 0.0018 ) * pow( mdot, 40.0 );
  }





  float rHw = 0.5 + uRidgeSoft;
  float rSm = min( uRidgeSoft * 2.0, 1.0 );
  if ( a < uMtnTopA + uRidgeSoft * 4.0 * length( vec2( aX, aY ) ) ) {
    vec3 gl = skyGlow( 0.03, lobe, lobe2 );
    vec3 mist = mix( uMistCol, uMistWarm, max( lobe, lobe2 * 0.6 ) ) + gl * 0.10;
    float gul = 0.94 + 0.12 * envFbm3( vec3( hz * 90.0, a * 22.0 ) );
    for ( int i = 0; i < 3; i++ ) {
      float g = a - mH[ i ];
      float gpx = max( length( vec2( aX - mHx[ i ], aY - mHy[ i ] ) ), 1e-7 );
      float cov = clamp( 0.5 - g / ( 2.0 * rHw * gpx ), 0.0, 1.0 );
      cov = mix( cov, cov * cov * ( 3.0 - 2.0 * cov ), rSm );
      if ( cov <= 0.0 ) continue;
      float foot = i == 0 ? mH.y : i == 1 ? mH.z : 0.0;
      float m = uMtnMist[ i ] * exp( - max( a - foot, 0.0 ) / uMistH );
      vec3 lc = ( uMtnCol[ i ] + gl * uMtnGlow[ i ] ) * gul;
      lc = mix( lc, mist, m );
      if ( i == 2 ) lc = mix( lc, uGround, smoothstep( 0.0, -0.012, a ) );
      col = mix( col, lc, cov );
    }
  }
  gl_FragColor = vec4( col * uLevel, 1.0 );
}`,
depthWrite: false,
depthTest: true,
side: THREE.BackSide,
fog: false,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), domeMat);
dome.name = 'env.skyDome';
dome.frustumCulled = false;
dome.renderOrder = 1e6;
dome.onBeforeRender = (renderer, scene, camera) => {
const px = camera && camera.userData ? +camera.userData.dofRidgePx : 0;
domeMat.uniforms.uRidgeSoft.value = Number.isFinite(px) && px > 0 ? Math.min(px, 24) : 0;
};
group.add(dome);
const STAR = { F6: 0.060, GAMMA: 0.56, F_CAP: 1.0, K_EXT: 0.09, M_FIELD: [3.0, 8.0], COUNT_K: 3.0, M_KEEP: 8.2, BAND: [0.28, 0.72, 0.17] };
const FAINT = { BASE: 1.4, UP: 1.1, MAX: 2.6, BR: [0.12, 0.50] };
const PLANET_K = 1.0;
const airmass = (sinAlt) => { const h = Math.asin(Math.max(-0.05, Math.min(1, sinAlt))) / D2R; return 1 / (Math.max(sinAlt, 0) + 0.50572 * Math.pow(Math.max(h, 0) + 6.07995, -1.6364)); };
const r = rng(1015);
const cand = [];
for (const [ra, dec, m, t] of BRIGHT) { const v = eqDir(ra, dec); if (v.y > 0.01) cand.push({ v, m, tint: TINT[t], tw: true }); }
{
const [m1, m2] = STAR.M_FIELD, N = Math.round(Math.pow(10, 0.5 * m2 + 0.95) - Math.pow(10, 0.5 * m1 + 0.95));
const c1 = Math.pow(10, 0.5 * m1), c2 = Math.pow(10, 0.5 * m2), tmp = new THREE.Vector3();
for (let k = 0, made = 0; made < N && k < N * 6; k++) {
const z = r() * 2 - 1, az = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
tmp.set(Math.cos(az) * s, z, Math.sin(az) * s);
const b = tmp.dot(_mwN);
const u = r(), tt = r();
if (r() > (STAR.BAND[0] + STAR.BAND[1] * Math.exp(-b * b / (2 * STAR.BAND[2] * STAR.BAND[2])))) continue;
made++;
if (tmp.y < 0.01) continue;
const m = 2 * Math.log10(c1 + (c2 - c1) * u);
cand.push({ v: tmp.clone(), m, tint: tt < 0.14 ? TINT.b : tt < 0.26 ? TINT.y : tt < 0.34 ? TINT.o : TINT.w, tw: true });
}
}
for (const c of cand) c.me = c.m + STAR.K_EXT * (airmass(c.v.y) - 1);
cand.sort((p, q2) => p.me - q2.me);
const count = Math.max(1, Math.round((q.stars | 0) * STAR.COUNT_K));
const keep = cand.filter((c) => c.me < STAR.M_KEEP).slice(0, count);
const n = keep.length + 1;
const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), prm = new Float32Array(n * 2);
for (let i = 1; i < n; i++) {
const c = keep[i - 1], F = Math.min(STAR.F_CAP, STAR.F6 * Math.pow(10, -0.4 * STAR.GAMMA * (c.me - 6)));
pos[i * 3] = c.v.x * 90; pos[i * 3 + 1] = c.v.y * 90; pos[i * 3 + 2] = c.v.z * 90;
const kc = Math.min(1, Math.max(0, (4.8 - c.me) / 2.4));
for (let j = 0; j < 3; j++) col[i * 3 + j] = (1 + (c.tint[j] - 1) * kc) * F;
prm[i * 2] = 0.62 + 0.18 * Math.min(1, Math.max(0, (3.0 - c.me) / 3.0));
prm[i * 2 + 1] = r() * 100;
}
const P = SKY.PLANET_DIR, Fp = 9.0;
pos[0] = P.x * 90; pos[1] = P.y * 90; pos[2] = P.z * 90;
col[0] = Fp; col[1] = Fp * 0.95; col[2] = Fp * 0.82;
prm[0] = 0.95; prm[1] = -1;
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
sg.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
sg.setAttribute('aParam', new THREE.BufferAttribute(prm, 2));
const starMat = new THREE.ShaderMaterial({
name: 'env.stars',
uniforms: { uTime, uLevel, ...mtnU, uPx: { value: 1 }, uFade: { value: 1 }, uFluxK: { value: 1 }, uPtGain: { value: 1 }, uFaintK: { value: 1 }, uSigK: { value: 1 }, uFaintBr: { value: new THREE.Vector2(...FAINT.BR) }, uPlanetK: { value: PLANET_K } },
vertexShader:  `
attribute vec3 aCol;
attribute vec2 aParam;
uniform float uTime, uFluxK, uPtGain, uFaintK, uPlanetK, uSigK;
uniform vec2 uFaintBr;
varying vec3 vCol;
varying float vSig, vSize;
${GLSL_NOISE}
${MOUNTAIN_GLSL}
void main() {
  vec3 d = normalize( position );

  float low = 1.0 - smoothstep( 0.08, 0.40, d.y );
  float tw = aParam.y < 0.0 ? 1.0 : 1.0 - 0.15 * low * ( 0.5 + 0.5 * sin( uTime * ( 2.0 + mod( aParam.y, 5.0 ) ) + aParam.y ) );
  float br = max( aCol.r, max( aCol.g, aCol.b ) );
  float fk = aParam.y < 0.0 ? uPlanetK : mix( uFaintK, 1.0, smoothstep( uFaintBr.x, uFaintBr.y, br ) );
  vCol = aCol * tw * uFluxK * uPtGain * fk;
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
  gl_Position = p.xyww;
  vSig = aParam.x * uSigK;
  vSize = ceil( vSig * 6.0 ) + 1.0;
  gl_PointSize = vSize;

  vec3 mH = d.y < uMtnTopA ? mtnH3( normalize( d.xz + vec2( 1e-6 ) ) ) : vec3( -1.0 );
  if ( d.y < -0.004 || d.y < max( mH.x, max( mH.y, mH.z ) ) + 0.0006 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); gl_PointSize = 0.0; }
}`,
fragmentShader:  `
varying vec3 vCol;
varying float vSig, vSize;
uniform float uFade, uLevel;
void main() {
  vec2 c = ( gl_PointCoord - 0.5 ) * vSize;
  float a = exp( -0.5 * dot( c, c ) / ( vSig * vSig ) );
  gl_FragColor = vec4( vCol * a * uFade * uLevel, 1.0 );
}`,
blending: THREE.AdditiveBlending,
transparent: true,
depthWrite: false,
depthTest: true,
fog: false,
});
const stars = new THREE.Points(sg, starMat);
stars.name = 'env.stars';
stars.frustumCulled = false;
stars.renderOrder = -100;
const _vp = new THREE.Vector4(), _cs = new THREE.Vector2();
const faint = { ...FAINT };
stars.onBeforeRender = (renderer, scene, camera) => {
renderer.getCurrentViewport(_vp);
const p11 = camera.projectionMatrix.elements[5];
const pa = _vp.w > 0 && p11 > 0 ? 2 / (p11 * _vp.w) : 6.48e-4;
starMat.uniforms.uFluxK.value = Math.min(1.25, Math.max(0.7, (6.48e-4 / pa) ** 0.6));
renderer.getSize(_cs);
const wdpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
const s = _vp.w > 0 && _cs.y > 0 ? Math.min(2, Math.max(1, (_cs.y * wdpr) / _vp.w)) : 1;
starMat.uniforms.uFaintK.value = Math.min(faint.MAX, faint.BASE * (1 + faint.UP * (s - 1)));
starMat.userData.stretch = s;
};
group.add(stars);
const site = (() => {
const rs = rng(4471), P2 = [], C2 = [];
const add = (x, y, z, k, warm) => { k *= 3.0; P2.push(x, y, z); const c = warm ? [1.0, 0.72, 0.42] : [0.92, 0.96, 1.0]; C2.push(c[0] * k, c[1] * k, c[2] * k); };
const aR = Math.atan2(-VENUE.R_DIR[2], -VENUE.R_DIR[0]);
const stands = [[aR - 0.12, 2400, 62], [aR - 0.03, 2600, 48], [aR + 0.05, 2250, 70], [aR + 0.16, 2500, 38], [aR + 2.6, 2200, 30]];
for (const [a, R, h] of stands) {
const cx = Math.cos(a) * R, cz = Math.sin(a) * R;
const nL = 3 + Math.round(h / 14);
for (let i = 0; i < nL; i++) add(cx + (rs() - 0.5) * 6, 4 + (h - 4) * (i / (nL - 1)) * (0.92 + 0.08 * rs()), cz + (rs() - 0.5) * 6, 0.10 + 0.14 * rs(), rs() < 0.15);
for (let i = 0; i < 8; i++) add(cx + (rs() - 0.5) * 140, 3 + rs() * 6, cz + (rs() - 0.5) * 140, 0.04 + 0.08 * rs(), rs() < 0.35);
}
const yards = [];
for (let i = 0; i < 9; i++) yards.push([30 + rs() * 90, 2600 + rs() * 3800, 6 + Math.round(rs() * 10), 120 + rs() * 260]);
for (let i = 0; i < 16; i++) yards.push([rs() * 360, 2600 + rs() * 4400, 2 + Math.round(rs() * 6), 80 + rs() * 220]);
for (const [b, R, nY, sp] of yards) {
const cx = Math.sin(b * D2R) * R, cz = Math.cos(b * D2R) * R;
for (let i = 0; i < nY; i++) add(cx + (rs() - 0.5) * sp, 2 + rs() * 7, cz + (rs() - 0.5) * sp * 0.5, 0.025 + 0.07 * rs() * rs(), rs() < 0.45);
}
for (let i = 0; i < 140; i++) { const b = rs() * 360, R = 2200 + rs() * 5000; add(Math.sin(b * D2R) * R, 2 + rs() * 4, Math.cos(b * D2R) * R, 0.015 + 0.03 * rs(), rs() < 0.6); }
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
g.setAttribute('aCol', new THREE.Float32BufferAttribute(C2, 3));
const mat = new THREE.ShaderMaterial({
name: 'env.siteLights',
uniforms: { uLevel, uSiteGain: { value: 1 } },
vertexShader:  `
attribute vec3 aCol;
uniform float uSiteGain;
varying vec3 vCol;
void main() {
  vec3 rel = position - cameraPosition;
  float dist = length( rel );
  vec3 d = rel / max( dist, 1.0 );
  vCol = aCol * uSiteGain * exp( - dist / 9000.0 );
  vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * d, 1.0 );
  gl_Position = p.xyww;
  gl_PointSize = 5.0;
}`,
fragmentShader:  `
varying vec3 vCol;
uniform float uLevel;
void main() {
  vec2 c = ( gl_PointCoord - 0.5 ) * 5.0;
  gl_FragColor = vec4( vCol * exp( -0.5 * dot( c, c ) / 0.36 ) * uLevel, 1.0 );
}`,
blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, fog: false,
});
const pts = new THREE.Points(g, mat);
pts.name = 'env.siteLights';
pts.frustumCulled = false;
pts.renderOrder = -99;
return pts;
})();
group.add(site);
return {
group,
version: SKY_VERSION,
setPixelRatio(pr) { starMat.uniforms.uPx.value = pr; },
domeMat, starMat, siteMat: site.material,
setLevel(k) { uLevel.value = Number.isFinite(k) ? Math.max(0, k) : 1; },
setLevels({ zenith, horizon, glow, dusk, glowDeg, glowBearing, glowK, moonHdr, mw, mwHi, starGain, ptGain, siteGain, faintBase, faintUp, faintMax, faintBr, planet, sigK } = {}) {
const u = domeMat.uniforms;
if (zenith) u.uZenith.value.setRGB(...zenith);
if (horizon) u.uHorizon.value.setRGB(...horizon);
if (glow || dusk) u.uGlowCol.value.setRGB(...(glow || dusk));
if (glowDeg != null) u.uGlowSig.value = sigOf(glowDeg);
if (glowBearing != null) u.uGlowDir.value.copy(g2(bearingDir(glowBearing)));
if (glowK) u.uGlowK.value.set(...glowK);
if (moonHdr != null) u.uMoonHdr.value = moonHdr;
if (mw != null) u.uMWGain.value = mw;
if (mwHi != null) u.uMWHi.value = mwHi;
if (faintBase != null) faint.BASE = faintBase;
if (faintUp != null) faint.UP = faintUp;
if (faintMax != null) faint.MAX = faintMax;
if (faintBr) starMat.uniforms.uFaintBr.value.set(...faintBr);
if (planet != null) starMat.uniforms.uPlanetK.value = planet;
if (sigK != null) starMat.uniforms.uSigK.value = sigK;
if (starGain != null || ptGain != null) starMat.uniforms.uPtGain.value = ptGain != null ? ptGain : starGain;
if (siteGain != null) site.material.uniforms.uSiteGain.value = siteGain;
},
setMilkyWay() {},
milkyWay() { return { normal: domeMat.uniforms.uMW.value.clone(), rise: domeMat.uniforms.uMWC.value.clone() }; },
};
}
