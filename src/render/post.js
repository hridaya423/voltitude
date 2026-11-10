import * as THREE from 'three';
import { UNIT_LUX } from './sky.js';

export const EV100 = { day: 13.9, golden: 13.0, night: 7.8 };
export const exposureFor = (s) => 0.18 * 2 ** 4.026 * UNIT_LUX[s] / (1.2 * 2 ** EV100[s]);
export const AUTO_EV = { day: { key: 0.19, min: -0.5, max: 1.5 }, golden: { key: 0.17, min: -0.6, max: 1.2 }, night: { key: 0.17, min: -0.25, max: 0.4 } };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DEPTH = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uInvProj;
vec3 viewPos(vec2 uv, float depth) {
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}
`;

const CAR_VERT = /* glsl */ `
uniform mat4 uPrevModel; uniform mat4 uVP; uniform mat4 uPrevVP;
varying vec2 vMotion; varying float vZ;
void main() {
  vec4 cur = uVP * modelMatrix * vec4(position, 1.0);
  vec4 prev = uPrevVP * uPrevModel * vec4(position, 1.0);
  vMotion = (cur.xy / cur.w - prev.xy / prev.w) * 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vZ = gl_Position.z / gl_Position.w * 0.5 + 0.5;
}`;

const CAR_FRAG = /* glsl */ `
varying vec2 vMotion; varying float vZ;
void main() { gl_FragColor = vec4(vMotion, vZ, 1.0); }`;

const VELOCITY = /* glsl */ `
${DEPTH}
uniform sampler2D tCar; uniform mat4 uCamWorld; uniform mat4 uPrevVP;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).r;
  vec4 car = texture2D(tCar, vUv);
  vec3 v = viewPos(vUv, d);
  if (car.a > 0.5 && abs(viewPos(vUv, car.b).z - v.z) < 0.06 + 0.01 * abs(v.z)) { gl_FragColor = vec4(car.rg, 0.0, 1.0); return; }
  if (d > 0.99999) v = normalize(v) * 4000.0;
  vec4 pc = uPrevVP * (uCamWorld * vec4(v, 1.0));
  gl_FragColor = vec4(vUv - (pc.xy / pc.w * 0.5 + 0.5), 0.0, 1.0);
}`;

const GTAO = /* glsl */ `
${DEPTH}
uniform vec2 uFullTexel; uniform float uRadius; uniform vec2 uFocal; uniform float uFrame; uniform float uPower;
varying vec2 vUv;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec3 vp(vec2 uv) { return viewPos(uv, texture2D(tDepth, uv).r); }
void main() {
  float d = texture2D(tDepth, vUv).r;
  if (d > 0.99999) { gl_FragColor = vec4(1.0, 1e4, 0.0, 1.0); return; }
  vec3 P = viewPos(vUv, d);
  vec3 Pr = vp(vUv + vec2(uFullTexel.x, 0.0)), Pl = vp(vUv - vec2(uFullTexel.x, 0.0));
  vec3 Pu = vp(vUv + vec2(0.0, uFullTexel.y)), Pd = vp(vUv - vec2(0.0, uFullTexel.y));
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  vec3 V = normalize(-P);
  if (dot(N, V) < 0.0) N = -N;
  float radiusPx = min(uRadius * uFocal.y / -P.z, 0.11 / uFullTexel.y);
  if (radiusPx < 3.0 || -P.z > 170.0) { gl_FragColor = vec4(1.0, -P.z, 0.0, 1.0); return; }
  float noise = ign(gl_FragCoord.xy * 2.0 + uFrame * 5.588238);
  float noise2 = ign(gl_FragCoord.xy * 2.0 + 17.0 + uFrame * 3.1);
  float vis = 0.0;
  for (int s = 0; s < 2; s++) {
    float phi = (float(s) + noise) * 1.5707963;
    vec2 omega = vec2(cos(phi), sin(phi));
    vec3 dir = vec3(omega, 0.0);
    vec3 orthoDir = dir - dot(dir, V) * V;
    vec3 axis = cross(dir, V);
    vec3 projN = N - axis * dot(N, axis);
    float projLen = length(projN);
    float sgn = sign(dot(orthoDir, projN));
    float cosN = clamp(dot(projN, V) / max(projLen, 1e-4), -1.0, 1.0);
    float n = sgn * acos(cosN);
    float hc0 = -1.0, hc1 = -1.0;
    for (int j = 0; j < 8; j++) {
      float t = (float(j) + noise2) / 8.0;
      t = t * t + 0.02;
      vec2 off = omega * t * radiusPx * uFullTexel;
      vec3 a = vp(vUv + off) - P, b = vp(vUv - off) - P;
      float la = length(a), lb = length(b);
      float fa = clamp((uRadius * 1.25 - la) / (uRadius * 0.5), 0.0, 1.0);
      float fb = clamp((uRadius * 1.25 - lb) / (uRadius * 0.5), 0.0, 1.0);
      hc1 = max(hc1, mix(-1.0, dot(a / max(la, 1e-4), V), fa));
      hc0 = max(hc0, mix(-1.0, dot(b / max(lb, 1e-4), V), fb));
    }
    float h0 = -acos(clamp(hc0, -1.0, 1.0)), h1 = acos(clamp(hc1, -1.0, 1.0));
    h0 = n + max(h0 - n, -1.5707963);
    h1 = n + min(h1 - n, 1.5707963);
    float i0 = (cosN + 2.0 * h0 * sin(n) - cos(2.0 * h0 - n)) * 0.25;
    float i1 = (cosN + 2.0 * h1 * sin(n) - cos(2.0 * h1 - n)) * 0.25;
    vis += projLen * (i0 + i1);
  }
  vis = clamp(vis * 0.5, 0.0, 1.0);
  vis = mix(vis, 1.0, smoothstep(110.0, 170.0, -P.z));
  gl_FragColor = vec4(pow(vis, uPower), -P.z, 0.0, 1.0);
}`;

const AO_BLUR = /* glsl */ `
uniform sampler2D tAO; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 c = texture2D(tAO, vUv).rg;
  float sum = c.r, wsum = 1.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    if (x == 0 && y == 0) continue;
    vec2 s = texture2D(tAO, vUv + vec2(float(x), float(y)) * uTexel).rg;
    float w = exp(-abs(s.g - c.g) / (0.04 * c.g + 0.05)) * exp(-float(x * x + y * y) * 0.12);
    sum += s.r * w; wsum += w;
  }
  gl_FragColor = vec4(sum / wsum, c.g, 0.0, 1.0);
}`;

const TAA = /* glsl */ `
uniform sampler2D tCur, tHist, tVel, tAO;
uniform vec2 uTexel; uniform float uReset; uniform float uAOAmount;
varying vec2 vUv;
vec3 tm(vec3 c) { return c / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722))); }
vec3 itm(vec3 c) { return c / max(1.0 - dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.001); }
vec3 rgb2ycc(vec3 c) { return vec3(dot(c, vec3(0.25, 0.5, 0.25)), dot(c, vec3(0.5, 0.0, -0.5)), dot(c, vec3(-0.25, 0.5, -0.25))); }
vec3 ycc2rgb(vec3 y) { return vec3(y.x + y.y - y.z, y.x + y.z, y.x - y.y - y.z); }
float aoK;
vec3 cur(vec2 o) { return tm(texture2D(tCur, vUv + o * uTexel).rgb * aoK); }
vec3 hist(vec2 uv) {
  vec2 pos = uv / uTexel;
  vec2 c = floor(pos - 0.5) + 0.5;
  vec2 f = pos - c;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 s12 = w1 + w2;
  vec2 o12 = w2 / s12;
  vec2 t0 = (c - 1.0) * uTexel, t3 = (c + 2.0) * uTexel, t12 = (c + o12) * uTexel;
  vec3 r = texture2D(tHist, vec2(t12.x, t0.y)).rgb * s12.x * w0.y
    + texture2D(tHist, vec2(t0.x, t12.y)).rgb * w0.x * s12.y
    + texture2D(tHist, t12).rgb * s12.x * s12.y
    + texture2D(tHist, vec2(t3.x, t12.y)).rgb * w3.x * s12.y
    + texture2D(tHist, vec2(t12.x, t3.y)).rgb * s12.x * w3.y;
  return max(r, 0.0);
}
void main() {
  aoK = mix(1.0, texture2D(tAO, vUv).r, uAOAmount);
  vec3 c0 = cur(vec2(0.0));
  vec3 vel = texture2D(tVel, vUv).rgb;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    vec3 v = texture2D(tVel, vUv + o * uTexel * 2.0).rgb;
    if (dot(v.xy, v.xy) > dot(vel.xy, vel.xy)) vel = v;
  }
  if (uReset > 0.5) { gl_FragColor = vec4(itm(c0), 1.0); return; }
  vec2 huv = vUv - vel.xy;
  if (any(lessThan(huv, vec2(0.0))) || any(greaterThan(huv, vec2(1.0)))) { gl_FragColor = vec4(itm(c0), 1.0); return; }
  vec3 m1 = rgb2ycc(c0), m2 = m1 * m1;
  vec3 mn = m1, mx = m1;
  for (int i = 0; i < 8; i++) {
    vec2 o = i == 0 ? vec2(-1.0, -1.0) : i == 1 ? vec2(0.0, -1.0) : i == 2 ? vec2(1.0, -1.0) : i == 3 ? vec2(-1.0, 0.0) : i == 4 ? vec2(1.0, 0.0) : i == 5 ? vec2(-1.0, 1.0) : i == 6 ? vec2(0.0, 1.0) : vec2(1.0, 1.0);
    vec3 y = rgb2ycc(cur(o));
    m1 += y; m2 += y * y;
    mn = min(mn, y); mx = max(mx, y);
  }
  m1 /= 9.0; m2 /= 9.0;
  vec3 sd = sqrt(max(m2 - m1 * m1, 0.0));
  vec3 lo = max(mn, m1 - 1.25 * sd), hi = min(mx, m1 + 1.25 * sd);
  vec3 h = rgb2ycc(tm(hist(huv)));
  vec3 center = 0.5 * (lo + hi), ext = 0.5 * (hi - lo) + 1e-4;
  vec3 dv = h - center;
  float k = max(abs(dv.x) / ext.x, max(abs(dv.y) / ext.y, abs(dv.z) / ext.z));
  vec3 hc = k > 1.0 ? center + dv / k : h;
  float clipped = length(hc - h) / (length(h) + 0.02);
  float vlen = length(vel.xy / uTexel);
  float a = clamp(0.1 + clipped * 0.5 + vlen * 0.004, 0.1, 0.85);
  gl_FragColor = vec4(itm(ycc2rgb(mix(hc, rgb2ycc(c0), a))), 1.0);
}`;

const METER_W = 32, METER_H = 16;

const DOWN = /* glsl */ `
uniform sampler2D tSrc; uniform sampler2D tEV; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee; uniform bool uPrefilter; uniform float uExposure;
varying vec2 vUv;
float gain;
vec3 tap(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb * gain; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 karis(vec3 a, vec3 b, vec3 c, vec3 d) {
  float wa = 1.0 / (1.0 + luma(a)), wb = 1.0 / (1.0 + luma(b)), wc = 1.0 / (1.0 + luma(c)), wd = 1.0 / (1.0 + luma(d));
  return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
}
void main() {
  gain = uPrefilter ? uExposure * exp2(texture2D(tEV, vec2(0.5)).r) : 1.0;
  vec3 a = tap(vec2(-2, 2)), b = tap(vec2(0, 2)), c = tap(vec2(2, 2));
  vec3 d = tap(vec2(-2, 0)), e = tap(vec2(0, 0)), f = tap(vec2(2, 0));
  vec3 g = tap(vec2(-2, -2)), h = tap(vec2(0, -2)), i = tap(vec2(2, -2));
  vec3 j = tap(vec2(-1, 1)), k = tap(vec2(1, 1)), l = tap(vec2(-1, -1)), m = tap(vec2(1, -1));
  vec3 col;
  if (uPrefilter) {
    col = karis(j, k, l, m) * 0.5 + karis(a, b, d, e) * 0.125 + karis(b, c, e, f) * 0.125 + karis(d, e, g, h) * 0.125 + karis(e, f, h, i) * 0.125;
    float br = max(col.r, max(col.g, col.b));
    float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    col *= max(soft, br - uThreshold) / max(br, 1e-4);
    col = min(col, vec3(10.0));
  } else {
    col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const METER = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float s = 0.0;
  for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++) {
    vec3 c = texture2D(tSrc, vUv + (vec2(x, y) - 1.5) * uTexel).rgb;
    s += clamp(log2(dot(c, vec3(0.2126, 0.7152, 0.0722)) + 1e-4), -12.0, 12.0);
  }
  vec2 d = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.4);
  float w = exp(-dot(d, d) * 3.0);
  gl_FragColor = vec4(s / 16.0 * w, w, 0.0, 1.0);
}`;

const ADAPT = /* glsl */ `
uniform sampler2D tMeter, tPrev; uniform float uKey, uMin, uMax, uOn, uDt, uReset, uExposure;
varying vec2 vUv;
void main() {
  vec2 s = vec2(0.0);
  for (int y = 0; y < ${METER_H}; y++) for (int x = 0; x < ${METER_W}; x++) s += texture2D(tMeter, (vec2(x, y) + 0.5) / vec2(${METER_W}.0, ${METER_H}.0)).rg;
  float raw = log2(uKey / uExposure) - s.x / s.y;
  float ev = clamp(max(raw, min(uMin, raw + 1.0)), uMin - 1.5, uMax) * uOn;
  float prev = texture2D(tPrev, vec2(0.5)).r;
  float k = uReset > 0.5 ? 1.0 : 1.0 - exp(-uDt * (ev > prev ? 1.4 : 2.8));
  gl_FragColor = vec4(prev + (ev - prev) * k, 0.0, 0.0, 1.0);
}`;

const UP = /* glsl */ `
uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 uTexel; uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 r = uTexel * uRadius;
  vec3 s = texture2D(tSrc, vUv + vec2(-r.x, r.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, r.y)).rgb * 2.0 + texture2D(tSrc, vUv + r).rgb
    + texture2D(tSrc, vUv + vec2(-r.x, 0.0)).rgb * 2.0 + texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv + vec2(r.x, 0.0)).rgb * 2.0
    + texture2D(tSrc, vUv - r).rgb + texture2D(tSrc, vUv + vec2(0.0, -r.y)).rgb * 2.0 + texture2D(tSrc, vUv + vec2(r.x, -r.y)).rgb;
  gl_FragColor = vec4(texture2D(tPrev, vUv).rgb + s / 16.0, 1.0);
}`;

const COMPOSITE = /* glsl */ `
${DEPTH}
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tVel; uniform sampler2D tEV; uniform highp sampler3D tLut;
uniform float uBloom; uniform float uExposure; uniform vec2 uTexel;
uniform float uBlur; uniform float uShutter; uniform float uSharpen; uniform float uAberration; uniform float uVignette; uniform float uTime; uniform float uGrain;
uniform vec3 uLift; uniform vec3 uGain; uniform float uSaturation; uniform float uFlash; uniform float uHeat; uniform mat4 uCamWorld;
uniform float uWind; uniform vec2 uRush;
varying vec2 vUv;
vec3 agx(vec3 color) {
  const mat3 toRec2020 = mat3(0.6274039, 0.0690973, 0.0163914, 0.3292830, 0.9195404, 0.0880133, 0.0433131, 0.0113623, 0.8955953);
  const mat3 fromRec2020 = mat3(1.6604910, -0.1245505, -0.0181508, -0.5876411, 1.1328999, -0.1005789, -0.0728499, -0.0083494, 1.1187297);
  const mat3 inset = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859);
  const mat3 outset = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
  color = inset * (toRec2020 * color);
  color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = color * color, x4 = x2 * x2;
  color = 15.5 * x4 * x2 - 40.14 * x4 * color + 31.96 * x4 - 6.868 * x2 * color + 0.4298 * x2 + 0.1191 * color - 0.00232;
  color = pow(max(vec3(0.0), outset * color), vec3(2.2));
  return clamp(fromRec2020 * color, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.31) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 uv = vUv;
  if (uHeat > 0.001) {
    vec4 fd = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    float ray = normalize(mat3(uCamWorld) * (fd.xyz / fd.w)).y;
    if (ray < 0.0 && ray > -0.075) {
      float z = texture2D(tDepth, uv).r;
      vec3 v = viewPos(uv, z);
      vec3 w = (uCamWorld * vec4(v, 1.0)).xyz;
      vec3 n = normalize(cross(dFdx(w), dFdy(w)));
      float ground = smoothstep(0.82, 0.96, abs(n.y)) * smoothstep(0.0, -0.004, ray) * smoothstep(-0.075, -0.012, ray) * (1.0 - step(0.99999, z));
      float far = smoothstep(35.0, 140.0, -v.z);
      float k = ground * far * uHeat;
      vec2 q = vec2(uv.x * 90.0, uv.y * 14.0 - uTime * 1.7);
      uv += (vec2(vnoise(q) - 0.5, vnoise(q + 31.7) - 0.5)) * k * vec2(0.0028, 0.0016);
    }
  }
  vec3 col;
  if (uAberration > 0.0005) {
    vec2 d = uv - 0.5;
    vec2 o = d * uAberration * dot(d, d);
    col = vec3(texture2D(tScene, uv - o).r, texture2D(tScene, uv).g, texture2D(tScene, uv + o).b);
  } else col = texture2D(tScene, uv).rgb;
  if (uSharpen > 0.0) {
    vec3 nu = texture2D(tScene, uv + vec2(0.0, uTexel.y)).rgb, nd = texture2D(tScene, uv - vec2(0.0, uTexel.y)).rgb, nr = texture2D(tScene, uv + vec2(uTexel.x, 0.0)).rgb, nl = texture2D(tScene, uv - vec2(uTexel.x, 0.0)).rgb;
    vec3 lo = min(min(nu, nd), min(nr, nl)), hi = max(max(nu, nd), max(nr, nl));
    col = clamp(col + (col - (nu + nd + nr + nl) * 0.25) * uSharpen, min(col, lo), max(col, hi));
  }
  if (uBlur > 0.0005) {
    vec3 vel = texture2D(tVel, uv).rgb;
    vec2 b = vel.xy * uBlur * uShutter;
    float bl = length(b);
    b *= min(1.0, 0.03 / max(bl, 1e-5));
    float vm = length(vel.xy);
    vec3 acc = col; float wsum = 1.0;
    float j = hash(gl_FragCoord.xy) - 0.5;
    for (int i = 1; i <= 10; i++) {
      float t = (float(i) + j) / 10.0 - 0.5;
      vec2 su = uv + b * t;
      float sv = length(texture2D(tVel, su).xy);
      float w = smoothstep(0.2 * vm, 0.6 * vm + 1e-5, sv);
      acc += texture2D(tScene, su).rgb * w; wsum += w;
    }
    col = acc / wsum;
  }
  col = agx(col * uExposure * exp2(texture2D(tEV, vec2(0.5)).r) + texture2D(tBloom, vUv).rgb * uBloom);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation);
  col = col * uGain + uLift * (1.0 - col);
  col = srgb(clamp(col, 0.0, 1.0));
  col = texture(tLut, col * (31.0 / 32.0) + 0.5 / 32.0).rgb;
  vec2 vq = (vUv - 0.5) * vec2(1.0, 0.82);
  col *= 1.0 - uVignette * smoothstep(0.18, 0.75, dot(vq, vq) * 2.0);
  if (uWind + uRush.x + uRush.y > 0.002) {
    vec2 d = (vUv - 0.5) * vec2(uTexel.y / uTexel.x, 1.0);
    float r = length(d), a = atan(d.y, d.x) * 0.1591549 + 0.5;
    float lane = floor(a * 220.0), f = fract(a * 220.0);
    float h1 = fract(sin(lane * 12.9898) * 43758.5453), h2 = fract(sin(lane * 78.233) * 12543.123);
    float rush = d.x < 0.0 ? uRush.x : uRush.y;
    float s = 0.2 + fract(h1 + uTime * (1.1 + h2 * 1.8)) * 1.1, len = 0.1 + h2 * 0.22 + uWind * 0.14;
    float line = smoothstep(s - len, s, r) * (1.0 - smoothstep(s, s + 0.012, r)) * (1.0 - smoothstep(0.0, 0.14 + uWind * 0.2, abs(f - 0.5)));
    float k = uWind * step(0.5 - uWind * 0.25, h2) * 1.6 + rush * step(0.25, h2) * 1.6;
    col = mix(col, vec3(1.0), clamp(line * k * smoothstep(0.3, 0.7, r) * smoothstep(0.27, 0.4, abs(d.x)) * (0.6 + uWind * 0.35), 0.0, 0.9));
  }
  col += uFlash;
  col += (hash(vUv * 913.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

function makeLut(session) {
  const night = session === 'night', golden = session === 'golden';
  const n = 32, data = new Uint8Array(n * n * n * 4);
  const curve = (c) => c + (night ? 0.75 : 1) * (c * c * (3 - 2 * c) - c);
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    let c = [r, g, b].map((v) => curve(v / (n - 1)));
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const sh = Math.pow(1 - l, 2.5), hi = Math.pow(l, 2);
    const tint = night ? [[-0.012, 0.004, 0.03], [0.006, 0.0, -0.004]] : golden ? [[-0.018, 0.006, 0.034], [0.05, 0.02, -0.036]] : [[-0.008, 0.006, 0.022], [0.026, 0.012, -0.022]];
    if (night) {
      const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      c = c.map((v, k) => (lum + (v - lum) * 0.95) * [0.96, 0.99, 1.06][k]);
    }
    c = c.map((v, k) => Math.min(1, Math.max(0, v + tint[0][k] * sh + tint[1][k] * hi)));
    const o = ((b * n + g) * n + r) * 4;
    data[o] = Math.round(c[0] * 255); data[o + 1] = Math.round(c[1] * 255); data[o + 2] = Math.round(c[2] * 255); data[o + 3] = 255;
  }
  const t = new THREE.Data3DTexture(data, n, n, n);
  t.format = THREE.RGBAFormat;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

const CAR_RANGE = 70;

const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

function packed(t) {
  t.texture.format = THREE.RGBFormat;
  t.texture.internalFormat = 'R11F_G11F_B10F';
  return t;
}

function target(w, h, opts = {}) {
  const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, ...opts });
  t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
  t.texture.generateMipmaps = false;
  return t;
}

export function createPost(renderer, { levels = 4, msaa = 4, session = 'day', lite = false } = {}) {
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const shared = {
    tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uVP: { value: new THREE.Matrix4() },
  };
  const fs = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const exposure = { value: exposureFor(session) };
  const tEV = { value: null };
  const auto = AUTO_EV[session];
  const meter = fs(METER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2(0.25 / METER_W, 0.25 / METER_H) } });
  const adapt = fs(ADAPT, { tMeter: { value: null }, tPrev: { value: null }, uKey: { value: auto.key }, uMin: { value: auto.min }, uMax: { value: auto.max }, uOn: { value: 1 }, uDt: { value: 0 }, uReset: { value: 1 }, uExposure: exposure });
  const down = fs(DOWN, { tSrc: { value: null }, tEV, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 2.0 }, uKnee: { value: 1.0 }, uPrefilter: { value: true }, uExposure: exposure });
  const up = fs(UP, { tSrc: { value: null }, tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } });
  const velocity = fs(VELOCITY, { tDepth: shared.tDepth, tCar: { value: null }, uInvProj: shared.uInvProj, uCamWorld: shared.uCamWorld, uPrevVP: shared.uPrevVP });
  const gtao = fs(GTAO, { tDepth: shared.tDepth, uInvProj: shared.uInvProj, uFullTexel: { value: new THREE.Vector2() }, uRadius: { value: 1.5 }, uFocal: { value: new THREE.Vector2() }, uFrame: { value: 0 }, uPower: { value: 1.4 } });
  const aoBlur = fs(AO_BLUR, { tAO: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const taa = fs(TAA, { tCur: { value: null }, tHist: { value: null }, tVel: { value: null }, tAO: { value: null }, uTexel: { value: new THREE.Vector2() }, uReset: { value: 1 }, uAOAmount: { value: 0.85 } });
  const lut = makeLut(session);
  const comp = fs(COMPOSITE, {
    tDepth: shared.tDepth, uInvProj: shared.uInvProj, uCamWorld: shared.uCamWorld,
    tScene: { value: null }, tBloom: { value: null }, tVel: { value: null }, tEV, tLut: { value: lut }, uBloom: { value: 0.08 }, uExposure: exposure, uTexel: { value: new THREE.Vector2() },
    uBlur: { value: 0 }, uShutter: { value: 1 }, uSharpen: { value: 0.5 }, uAberration: { value: 0 }, uVignette: { value: 0.38 },
    uTime: { value: 0 }, uGrain: { value: 0.016 }, uLift: { value: new THREE.Vector3(0.006, 0.005, 0.01) }, uGain: { value: new THREE.Vector3(1.0, 1.0, 1.0) }, uSaturation: { value: 1.08 }, uFlash: { value: 0 }, uHeat: { value: 0 }, uWind: { value: 0 }, uRush: { value: new THREE.Vector2() },
  });
  const carMat = new THREE.ShaderMaterial({
    vertexShader: CAR_VERT, fragmentShader: CAR_FRAG,
    uniforms: { uPrevModel: { value: new THREE.Matrix4() }, uVP: shared.uVP, uPrevVP: shared.uPrevVP },
  });
  let scene = null, carRT = null, velRT = null, aoRT = null, aoBlurRT = null, hist = [null, null], downs = [], ups = [];
  const meterRT = target(METER_W, METER_H, { format: THREE.RGFormat }), evRT = [target(1, 1, { format: THREE.RedFormat }), target(1, 1, { format: THREE.RedFormat })];
  let lastRender = 0, overlay = null;
  const far = new THREE.DataTexture(new Float32Array([1]), 1, 1, THREE.RedFormat, THREE.FloatType);
  far.needsUpdate = true;
  const size = new THREE.Vector2();
  let w = 0, h = 0, frame = 0, reset = true, writing = false;
  const movers = [], roots = [];
  const carScene = new THREE.Scene();
  carScene.overrideMaterial = carMat;
  carScene.matrixWorldAutoUpdate = false;
  const vp = new THREE.Matrix4(), prevVP = new THREE.Matrix4(), prevView = new THREE.Matrix4(), tmpM = new THREE.Matrix4();
  let havePrev = false;

  function resize(width, height) {
    w = width; h = height;
    for (const t of [scene, carRT, velRT, aoRT, aoBlurRT, ...hist, ...downs, ...ups]) t?.dispose();
    scene = packed(target(w, h, { depthBuffer: true, samples: msaa }));
    scene.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
    scene.depthTexture.minFilter = scene.depthTexture.magFilter = THREE.NearestFilter;
    carRT = target(Math.max(1, w >> 1), Math.max(1, h >> 1), { depthBuffer: true });
    carRT.texture.minFilter = carRT.texture.magFilter = THREE.NearestFilter;
    velRT = target(Math.max(1, w >> 1), Math.max(1, h >> 1), { format: THREE.RGFormat });
    velRT.texture.minFilter = velRT.texture.magFilter = THREE.NearestFilter;
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    aoRT = target(hw, hh, { format: THREE.RGFormat });
    aoBlurRT = target(hw, hh, { format: THREE.RGFormat });
    hist = [target(w, h), target(w, h)];
    downs = []; ups = [];
    let bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    for (let i = 0; i < levels; i++) {
      downs.push(packed(target(bw, bh)));
      ups.push(packed(target(bw, bh)));
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    }
    shared.tDepth.value = scene.depthTexture;
    reset = true;
  }
  function pass(mat, out) {
    quad.material = mat;
    renderer.setRenderTarget(out);
    renderer.render(qScene, qCam);
  }
  function track(root) {
    roots.push(root);
    root.traverse((o) => {
      if (!o.isMesh || o.userData.fx) return;
      o.layers.enable(3);
      o.userData.prevMW = new THREE.Matrix4();
      o.onBeforeRender = () => {
        if (!writing) return;
        carMat.uniforms.uPrevModel.value = o.userData.prevMW;
        carMat.uniformsNeedUpdate = true;
      };
      movers.push(o);
    });
  }
  return {
    set overlay(o) { overlay = o; },
    depth: shared.tDepth,
    get lite() { return lite; },
    set lite(v) { lite = v; reset = true; },
    uniforms: comp.uniforms,
    auto: adapt.uniforms,
    ao: gtao.uniforms,
    taa: taa.uniforms,
    resize,
    track,
    async compile(world, camera) {
      renderer.getDrawingBufferSize(size);
      if (size.x !== w || size.y !== h) resize(size.x, size.y);
      const target = renderer.getRenderTarget();
      renderer.setRenderTarget(scene);
      await renderer.compileAsync(world, camera);
      if (overlay) await renderer.compileAsync(overlay, camera);
      renderer.setRenderTarget(target);
    },
    render(world, camera, frameDt) {
      renderer.getDrawingBufferSize(size);
      if (size.x !== w || size.y !== h) resize(size.x, size.y);
      camera.updateMatrixWorld();
      const proj = camera.projectionMatrix;
      const jx = (halton(frame % 8 + 1, 2) - 0.5) * 2 / w, jy = (halton(frame % 8 + 1, 3) - 0.5) * 2 / h;
      vp.multiplyMatrices(proj, camera.matrixWorldInverse);
      if (!havePrev) prevView.copy(camera.matrixWorldInverse);
      prevVP.multiplyMatrices(proj, prevView);
      shared.uInvProj.value.copy(camera.projectionMatrixInverse);
      shared.uCamWorld.value.copy(camera.matrixWorld);
      shared.uVP.value.copy(vp);
      shared.uPrevVP.value.copy(prevVP);
      if (!lite) { proj.elements[8] += jx; proj.elements[9] += jy; }
      renderer.setRenderTarget(scene);
      renderer.render(world, camera);
      let cur = scene;
      if (lite) { for (const k of ['uBlur', 'uAberration', 'uHeat', 'uSharpen', 'uWind']) comp.uniforms[k].value = 0; comp.uniforms.uRush.value.set(0, 0); }
      else {
      const mask = camera.layers.mask, clearAlpha = renderer.getClearAlpha(), clear = renderer.getClearColor(new THREE.Color()), autoClear = renderer.autoClear;
      camera.layers.set(3);
      writing = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(carRT);
      renderer.clear();
      renderer.autoClear = false;
      for (const r of roots) {
        if (!r.visible || r.position.distanceToSquared(camera.position) > CAR_RANGE * CAR_RANGE) continue;
        carScene.children[0] = r;
        renderer.render(carScene, camera);
      }
      renderer.autoClear = autoClear;
      renderer.setClearColor(clear, clearAlpha);
      writing = false;
      camera.layers.mask = mask;
      proj.elements[8] -= jx; proj.elements[9] -= jy;
      for (const o of movers) o.userData.prevMW.copy(o.matrixWorld);

      velocity.uniforms.tCar.value = carRT.texture;
      pass(velocity, velRT);

      gtao.uniforms.uFullTexel.value.set(1 / w, 1 / h);
      gtao.uniforms.uFocal.value.set(proj.elements[0] * 0.5 * w, proj.elements[5] * 0.5 * h);
      gtao.uniforms.uFrame.value = frame % 16;
      pass(gtao, aoRT);
      aoBlur.uniforms.tAO.value = aoRT.texture;
      aoBlur.uniforms.uTexel.value.set(1 / aoRT.width, 1 / aoRT.height);
      pass(aoBlur, aoBlurRT);

      cur = hist[frame & 1];
      const prev = hist[(frame + 1) & 1];
      taa.uniforms.tCur.value = scene.texture;
      taa.uniforms.tHist.value = prev.texture;
      taa.uniforms.tVel.value = velRT.texture;
      taa.uniforms.tAO.value = aoBlurRT.texture;
      taa.uniforms.uTexel.value.set(1 / w, 1 / h);
      taa.uniforms.uReset.value = reset ? 1 : 0;
      pass(taa, cur);
      }
      if (overlay) {
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.setRenderTarget(cur);
        if (lite) shared.tDepth.value = far;
        renderer.render(overlay, camera);
        shared.tDepth.value = scene.depthTexture;
        renderer.autoClear = autoClear;
      }
      meter.uniforms.tSrc.value = cur.texture;
      pass(meter, meterRT);
      const now = performance.now(), dt = Math.min(0.1, frameDt ?? (now - lastRender) / 1000);
      adapt.uniforms.tMeter.value = meterRT.texture;
      adapt.uniforms.tPrev.value = evRT[(frame + 1) & 1].texture;
      adapt.uniforms.uDt.value = dt;
      comp.uniforms.uShutter.value = Math.min(1, 1 / (60 * dt));
      adapt.uniforms.uReset.value = reset ? 1 : 0;
      pass(adapt, evRT[frame & 1]);
      tEV.value = evRT[frame & 1].texture;
      lastRender = now;
      reset = false;

      let src = cur.texture, sw = w, sh = h;
      for (let i = 0; i < levels; i++) {
        down.uniforms.tSrc.value = src;
        down.uniforms.uTexel.value.set((i ? 1 : 2) / sw, (i ? 1 : 2) / sh);
        down.uniforms.uPrefilter.value = i === 0;
        pass(down, downs[i]);
        src = downs[i].texture; sw = downs[i].width; sh = downs[i].height;
      }
      let prevBloom = downs[levels - 1].texture;
      for (let i = levels - 2; i >= 0; i--) {
        up.uniforms.tSrc.value = prevBloom;
        up.uniforms.tPrev.value = downs[i].texture;
        up.uniforms.uTexel.value.set(1 / ups[i + 1].width, 1 / ups[i + 1].height);
        pass(up, ups[i]);
        prevBloom = ups[i].texture;
      }
      comp.uniforms.tScene.value = cur.texture;
      comp.uniforms.tBloom.value = prevBloom;
      comp.uniforms.tVel.value = velRT.texture;
      comp.uniforms.uTexel.value.set(1 / w, 1 / h);
      pass(comp, null);
      prevView.copy(camera.matrixWorldInverse);
      havePrev = true;
      frame++;
    },
  };
}
