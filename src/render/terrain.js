import * as THREE from 'three';
import { fbm, smoothstep } from '../sim/noise.js';
import { skyFog } from './sky.js';

const SAND = new THREE.Color('#b9876a');
const DUNE = new THREE.Color('#8f6450');
const ROCK = new THREE.Color('#7a3f2c');
const ROCK_DARK = new THREE.Color('#4a2a22');
const TOP = new THREE.Color('#c79a76');
const PAD = new THREE.Color('#2c2b30');

function bakeSunVisibility(terrain, sun) {
  const { H, res, cell, height } = terrain;
  const vis = new Float32Array(res * res);
  const sx = sun.x, sy = sun.y, sz = sun.z;
  const hl = Math.hypot(sx, sz);
  const tan = sy / hl;
  const dx = sx / hl, dz = sz / hl;
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const k = j * res + i;
    const x = terrain.x0 + i * cell, z = terrain.z0 + j * cell, y = H[k] + 0.5;
    let v = 1, t = cell * 0.7;
    while (t < 1400) {
      const ray = y + t * tan;
      if (ray > 480) break;
      const gap = ray - height(x + dx * t, z + dz * t);
      const pen = gap / (t * 0.035 + 1.5);
      if (pen < v) { v = pen; if (v <= 0) { v = 0; break; } }
      t += Math.max(cell * 0.7, t * 0.06);
    }
    vis[k] = Math.max(0, Math.min(1, v));
  }
  return vis;
}

const BAND = 52, FINE = 3, FINE_RANGE = 330;

export const shadowFocus = { value: new THREE.Vector3() };

const GROUND = {
  mesa: [['laterite', 6, 0.92], ['dry_rocks', 5, 0.9], ['desert_sand', 7, 0.95]],
  playa: [['lakebed', 13, 0.85], ['desert_sand', 7, 0.95], ['dry_rocks', 5, 0.9]],
  coast: [['desert_sand', 7, 0.95], ['dry_rocks', 5, 0.9], ['laterite', 6, 0.92]],
};

export async function loadTerrainTextures(renderer, venue) {
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const get = (url, srgb) => loader.loadAsync(url).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  });
  const set = async (name) => {
    const [a, n] = await Promise.all([get(`assets/terrain/${name}/ground_albedo_2k.webp`, true), get(`assets/terrain/${name}/ground_nrm_2k.webp`, false)]);
    return { a, n };
  };
  const rows = GROUND[venue.terrain.style] || GROUND.mesa;
  const [rock, ...ground] = await Promise.all([set('sandstone_cliff'), ...rows.map(([name]) => set(name))]);
  return { rock, ground: ground.map((g, i) => ({ ...g, scale: rows[i][1], rough: rows[i][2] })) };
}

function terrainShader(shader, tex, look) {
  const u = shader.uniforms;
  u.uSandSat = { value: look.sat }; u.uSandTint = { value: new THREE.Vector3(...look.tint) };
  u.tRockA = { value: tex.rock.a }; u.tRockN = { value: tex.rock.n };
  tex.ground.forEach((g, i) => { u[`tG${i}A`] = { value: g.a }; u[`tG${i}N`] = { value: g.n }; });
  u.uGScale = { value: new THREE.Vector3(...tex.ground.map((g) => g.scale)) };
  u.uGRough = { value: new THREE.Vector3(...tex.ground.map((g) => g.rough)) };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float lake;\nattribute float roadK;\nvarying float vLake;\nvarying float vRoad;\nvarying vec3 vWN;\nvarying vec3 vWP;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLake = lake;\nvRoad = roadK;\nvWN = normalize(mat3(modelMatrix) * normal);\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform sampler2D tRockA, tRockN, tG0A, tG0N, tG1A, tG1N, tG2A, tG2N;
      uniform vec3 uGScale, uGRough;
      uniform float uSandSat; uniform vec3 uSandTint;
      varying float vLake; varying float vRoad; varying vec3 vWN; varying vec3 vWP;
      vec3 tAlb; float tRough; vec3 tNor;
      vec3 unpackN(vec2 t) { vec2 x = t * 2.0 - 1.0; return vec3(x, sqrt(max(1.0 - dot(x, x), 0.0))); }
      float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm2(vec2 p) { return vnoise(p) * 0.6 + vnoise(p * 2.13 + 7.1) * 0.3 + vnoise(p * 4.37 + 3.3) * 0.1; }
      vec2 rot(vec2 p) { return mat2(0.8, 0.6, -0.6, 0.8) * p; }
      void groundSample(sampler2D ta, sampler2D tn, float scale, float near, out vec3 alb, out vec3 nn, out float h) {
        vec2 q = vWP.xz / scale;
        vec4 n0 = texture2D(tn, q);
        vec3 a0 = texture2D(ta, q).rgb;
        h = n0.b; alb = a0; nn = unpackN(n0.rg);
        if (near > 0.001) {
          vec2 q2 = rot(vWP.xz) / (scale * 5.7) + 0.37;
          vec4 n1 = texture2D(tn, q2);
          alb = mix(a0, texture2D(ta, q2).rgb, 0.4 * near);
          h = mix(h, n1.b, 0.4 * near);
          nn = normalize(mix(nn, unpackN(n1.rg), 0.4 * near));
        }
      }
      void surface() {
        vec3 n = normalize(vWN);
        float dist = length(vWP - cameraPosition);
        float near = 1.0 - smoothstep(60.0, 220.0, dist);
        vec3 tW = pow(abs(n), vec3(5.0)); tW /= (tW.x + tW.y + tW.z);
        float strata = vWP.y * 0.012 + sin(vWP.x * 0.011 + vWP.z * 0.007) * 0.35;
        float rockW = smoothstep(0.84, 0.62, n.y);
        vec2 mq = vWP.xz;
        float m1 = fbm2(mq / 210.0), m2 = fbm2(mq / 71.0 + 11.0), m3 = fbm2(mq / 23.0 + 29.0);
        vec3 alb = vec3(0.0), nw = vec3(0.0); float rough = 0.9;
        float groundW = 1.0 - rockW;
        if (groundW > 0.001) {
          float w0 = smoothstep(0.62, 0.34, m1);
          float w2 = smoothstep(0.42, 0.7, m2) * (1.0 - w0);
          float w1 = max(1.0 - w0 - w2, 0.0) + vRoad * 0.6;
          if (uGScale.x > 10.0) { w0 = vLake; w1 *= 1.0 - vLake; w2 *= 1.0 - vLake; }
          vec3 a0 = vec3(0.0), a1 = vec3(0.0), a2 = vec3(0.0), n0 = vec3(0.0, 0.0, 1.0), n1 = n0, n2 = n0;
          float h0 = 0.0, h1 = 0.0, h2 = 0.0;
          if (w0 > 0.02) groundSample(tG0A, tG0N, uGScale.x, near, a0, n0, h0);
          if (w1 > 0.02) groundSample(tG1A, tG1N, uGScale.y, near, a1, n1, h1);
          if (w2 > 0.02) groundSample(tG2A, tG2N, uGScale.z, near, a2, n2, h2);
          float s0 = w0 + h0 * 0.55 * step(0.02, w0), s1 = w1 + h1 * 0.55 * step(0.02, w1), s2 = w2 + h2 * 0.55 * step(0.02, w2);
          float top = max(max(s0, s1), s2) - 0.16;
          float b0 = max(s0 - top, 0.0), b1 = max(s1 - top, 0.0), b2 = max(s2 - top, 0.0);
          float bs = b0 + b1 + b2 + 1e-4;
          b0 /= bs; b1 /= bs; b2 /= bs;
          alb = a0 * b0 + a1 * b1 + a2 * b2;
          alb = mix(vec3(dot(alb, vec3(0.333))), alb, uSandSat) * uSandTint;
          rough = dot(vec3(b0, b1, b2), uGRough);
          vec3 nn = n0 * b0 + n1 * b1 + n2 * b2;
          nw = vec3(nn.x, 0.0, nn.y) * groundW;
          float macro = 0.72 + 0.5 * m1 + 0.28 * (m3 - 0.5);
          alb *= macro * mix(vec3(1.0), vec3(1.06, 0.97, 0.9), smoothstep(0.35, 0.65, m2) * 0.5);
          alb *= mix(1.0, 0.78 + 0.45 * h0 * b0 + 0.45 * h1 * b1 + 0.45 * h2 * b2, 0.7);
        }
        tAlb = alb * groundW;
        tRough = rough * groundW;
        if (rockW > 0.001) {
          float s = 1.0 / 24.0;
          vec2 ux = vec2(vWP.z * s, vWP.y * s * 1.15 + strata), uz = vec2(vWP.x * s, vWP.y * s * 1.15 + strata), uy = vWP.xz * s;
          vec3 a = texture2D(tRockA, ux).rgb * tW.x + texture2D(tRockA, uz).rgb * tW.z + texture2D(tRockA, uy).rgb * tW.y;
          vec3 nx = unpackN(texture2D(tRockN, ux).rg), nz = unpackN(texture2D(tRockN, uz).rg), ny = unpackN(texture2D(tRockN, uy).rg);
          vec3 wx = vec3(0.0, nx.y, nx.x) * sign(n.x), wz = vec3(nz.x, nz.y, 0.0) * sign(n.z), wy = vec3(ny.x, 0.0, ny.y);
          vec3 macroR = texture2D(tRockA, vWP.xz / 310.0 + vec2(vWP.y * 0.002)).rgb;
          tAlb += a * mix(vec3(1.0), macroR * 2.2, 0.35) * (0.8 + 0.4 * m1) * rockW;
          tRough += 0.85 * rockW;
          nw += (wx * tW.x + wy * tW.y + wz * tW.z) * rockW;
        }
        float fade = 1.0 - smoothstep(250.0, 1400.0, dist) * 0.7;
        tNor = normalize(n + nw * fade);
      }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      surface();
      diffuseColor.rgb = tAlb * mix(vec3(1.0), vColor * 2.4, 0.4);`)
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(tRough, 0.45, 1.0);')
    .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.0;')
    .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tNor, 0.0)).xyz);');
}

export function createTerrain(terrain, sunUniform, fogDensity, textures, venue, track, tiles = 6) {
  const padRect = venue.terrain.pad;
  const look = venue.look || { sat: 1, tint: [1, 1, 1] };
  const sand = look.sand ? new THREE.Color(look.sand) : SAND, dune = look.dune ? new THREE.Color(look.dune) : DUNE;
  const { H, res, cell, x0, z0 } = terrain;
  const N = res * res;
  const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const k = j * res + i;
    const x = x0 + i * cell, z = z0 + j * cell, y = H[k];
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    const hl = H[j * res + Math.max(0, i - 1)], hr = H[j * res + Math.min(res - 1, i + 1)];
    const hd = H[Math.max(0, j - 1) * res + i], hu = H[Math.min(res - 1, j + 1) * res + i];
    let nx = hl - hr, ny = 2 * cell, nz = hd - hu;
    const l = Math.hypot(nx, ny, nz);
    nx /= l; ny /= l; nz /= l;
    nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
    const steep = smoothstep(0.85, 0.55, ny);
    const n1 = fbm(x / 160, z / 160, 3, 41), n2 = fbm(x / 23, z / 23, 2, 43);
    c.copy(sand).lerp(dune, n1 * 0.9);
    const strata = 0.5 + 0.5 * Math.sin(y * 0.21 + n1 * 6 + n2 * 2.5) * Math.sin(y * 0.047 + n2 * 3);
    const rock = c.clone().copy(ROCK).lerp(ROCK_DARK, strata * 0.4 + n2 * 0.35);
    c.lerp(rock, steep);
    if (y > 150) c.lerp(TOP, smoothstep(150, 166, y) * (1 - steep) * 0.6);
    if (padRect) c.lerp(PAD, smoothstep(padRect[0] - 12, padRect[0] - 24, Math.abs(x)) * smoothstep(padRect[1] + 30, padRect[1] + 50, z) * smoothstep(padRect[2] - 10, padRect[2] - 30, z) * 0.9);
    c.multiplyScalar(0.85 + 0.3 * n2);
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const vis = bakeSunVisibility(terrain, sunUniform.value);
  const lake = new Float32Array(res * res);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = x0 + i * cell, z = z0 + j * cell;
    const wob = (fbm(x / 90, z / 90, 3, 61) - 0.5) * 0.5;
    let v = 0;
    for (const [lx, lz, rx, rz] of venue.lakes) v = Math.max(v, smoothstep(1.1, 0.75, Math.hypot((x - lx) / rx, (z - lz) / rz) + wob));
    lake[j * res + i] = v;
  }
  const roadD = new Float32Array(N).fill(1e9);
  const reach = Math.ceil((BAND + 14) / cell);
  for (let s = 0; s < track.n; s += 2) {
    const px = track.P[s * 3], pz = track.P[s * 3 + 2], hw = track.halfW[s];
    const ci = Math.round((px - x0) / cell), cj = Math.round((pz - z0) / cell);
    for (let j = Math.max(0, cj - reach); j <= Math.min(res - 1, cj + reach); j++) for (let i = Math.max(0, ci - reach); i <= Math.min(res - 1, ci + reach); i++) {
      const d = Math.hypot(x0 + i * cell - px, z0 + j * cell - pz) - hw;
      const k = j * res + i;
      if (d < roadD[k]) roadD[k] = d;
    }
  }
  const roadK = new Float32Array(N);
  for (let k = 0; k < N; k++) roadK[k] = smoothstep(34, 6, roadD[k]);
  const cells = res - 1;
  const band = new Uint8Array(cells * cells);
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const k = j * res + i;
    band[j * cells + i] = (roadD[k] + roadD[k + 1] + roadD[k + res] + roadD[k + res + 1]) * 0.25 < BAND ? 1 : 0;
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.6 });
  mat.userData.shadowFocus = shadowFocus;
  skyFog(mat, sunUniform, fogDensity, true, textures ? (sh) => terrainShader(sh, textures, look) : null);
  const group = new THREE.Group();
  const cellsPer = Math.ceil((res - 1) / tiles);
  const LODS = [[1, 0], [2, 520], [4, 1150]];
  for (let tj = 0; tj < tiles; tj++) for (let ti = 0; ti < tiles; ti++) {
    const i0 = ti * cellsPer, i1 = Math.min(res - 1, i0 + cellsPer);
    const j0 = tj * cellsPer, j1 = Math.min(res - 1, j0 + cellsPer);
    const lod = new THREE.LOD();
    const center = new THREE.Vector3(x0 + (i0 + i1) / 2 * cell, 0, z0 + (j0 + j1) / 2 * cell);
    lod.position.copy(center);
    lod.updateMatrix();
    const fine = bandGeometry(i0, i1, j0, j1, center);
    for (const [stepK, dist] of LODS) {
      const m = new THREE.Mesh(tileGeometry(i0, i1, j0, j1, stepK, stepK === 1 && fine ? band : null).translate(-center.x, 0, -center.z), mat);
      m.updateMatrix();
      m.castShadow = stepK === 1;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      if (stepK === 1 && fine) {
        const grp = new THREE.Group();
        grp.add(m, fine);
        lod.addLevel(grp, 0);
        const full = new THREE.Mesh(tileGeometry(i0, i1, j0, j1, 1, null).translate(-center.x, 0, -center.z), mat);
        full.castShadow = true; full.receiveShadow = true; full.matrixAutoUpdate = false; full.updateMatrix();
        lod.addLevel(full, FINE_RANGE);
      } else lod.addLevel(m, stepK === 1 ? 0 : dist);
    }
    lod.matrixAutoUpdate = false;
    lod.updateMatrixWorld(true);
    group.add(lod);
  }
  function tileGeometry(i0, i1, j0, j1, st, skip) {
    const cols = [], rows = [];
    for (let i = i0; i < i1; i += st) cols.push(i);
    cols.push(i1);
    for (let j = j0; j < j1; j += st) rows.push(j);
    rows.push(j1);
    const nc = cols.length, nr = rows.length;
    const ring = 2 * (nc + nr) - 4;
    const vc = nc * nr + ring;
    const P = new Float32Array(vc * 3), Nn = new Float32Array(vc * 3), C = new Float32Array(vc * 3), V = new Float32Array(vc), L = new Float32Array(vc), Rk = new Float32Array(vc);
    const put = (o, k, drop) => {
      P[o * 3] = pos[k * 3]; P[o * 3 + 1] = pos[k * 3 + 1] - drop; P[o * 3 + 2] = pos[k * 3 + 2];
      for (let q = 0; q < 3; q++) { Nn[o * 3 + q] = nor[k * 3 + q]; C[o * 3 + q] = col[k * 3 + q]; }
      V[o] = vis[k];
      L[o] = lake[k];
      Rk[o] = roadK[k];
    };
    let o = 0;
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) put(o++, rows[r] * res + cols[c], 0);
    const idx = [];
    for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc - 1; c++) {
      if (skip && skip[rows[r] * cells + cols[c]]) continue;
      const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
      idx.push(a, d, e, a, e, b);
    }
    const border = [];
    for (let c = 0; c < nc; c++) border.push(c);
    for (let r = 1; r < nr; r++) border.push(r * nc + nc - 1);
    for (let c = nc - 2; c >= 0; c--) border.push((nr - 1) * nc + c);
    for (let r = nr - 2; r > 0; r--) border.push(r * nc);
    const base = o;
    for (const b of border) {
      const r = Math.floor(b / nc), c = b % nc;
      put(o++, rows[r] * res + cols[c], 18 * st);
    }
    for (let q = 0; q < border.length; q++) {
      const a = border[q], b = border[(q + 1) % border.length];
      const a2 = base + q, b2 = base + ((q + 1) % border.length);
      idx.push(a, b, b2, a, b2, a2, a, b2, b, a, a2, b2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setAttribute('sunVis', new THREE.BufferAttribute(V, 1));
    g.setAttribute('lake', new THREE.BufferAttribute(L, 1));
    g.setAttribute('roadK', new THREE.BufferAttribute(Rk, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  function bandGeometry(i0, i1, j0, j1, center) {
    const list = [];
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (band[j * cells + i]) list.push(j * cells + i);
    if (!list.length) return null;
    const n = list.length, S = FINE + 1, per = S * S;
    const P = new Float32Array(n * per * 3), Nn = new Float32Array(n * per * 3), C = new Float32Array(n * per * 3), V = new Float32Array(n * per), L = new Float32Array(n * per), Rk = new Float32Array(n * per);
    const idx = new Uint32Array(n * FINE * FINE * 6);
    const lerp4 = (arr, comps, k, u, v, q) => (arr[k * comps + q] * (1 - u) + arr[(k + 1) * comps + q] * u) * (1 - v) + (arr[(k + res) * comps + q] * (1 - u) + arr[(k + res + 1) * comps + q] * u) * v;
    let o = 0, t = 0;
    list.forEach((cellIndex, cn) => {
      const ci = cellIndex % cells, cj = (cellIndex - ci) / cells, k = cj * res + ci, base = cn * per;
      for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) {
        const u = a / FINE, v = b / FINE, x = x0 + (ci + u) * cell, z = z0 + (cj + v) * cell;
        const d = lerp4(roadD, 1, k, u, v, 0);
        const ramp = smoothstep(4, 18, d) * smoothstep(BAND - 6, BAND - 22, d);
        const micro = ramp ? ramp * (0.5 * (fbm(x / 13, z / 13, 2, 81) - 0.5) + 0.16 * (fbm(x / 3.3, z / 3.3, 2, 83) - 0.5)) : 0;
        P[o * 3] = x - center.x; P[o * 3 + 1] = terrain.height(x, z) + micro; P[o * 3 + 2] = z - center.z;
        let nx = lerp4(nor, 3, k, u, v, 0), ny = lerp4(nor, 3, k, u, v, 1), nz = lerp4(nor, 3, k, u, v, 2);
        const l = Math.hypot(nx, ny, nz);
        Nn[o * 3] = nx / l; Nn[o * 3 + 1] = ny / l; Nn[o * 3 + 2] = nz / l;
        for (let q = 0; q < 3; q++) C[o * 3 + q] = lerp4(col, 3, k, u, v, q);
        V[o] = lerp4(vis, 1, k, u, v, 0);
        L[o] = lerp4(lake, 1, k, u, v, 0);
        Rk[o] = lerp4(roadK, 1, k, u, v, 0);
        o++;
      }
      for (let b = 0; b < FINE; b++) for (let a = 0; a < FINE; a++) {
        const p = base + b * S + a;
        idx[t++] = p; idx[t++] = p + S; idx[t++] = p + S + 1; idx[t++] = p; idx[t++] = p + S + 1; idx[t++] = p + 1;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setAttribute('sunVis', new THREE.BufferAttribute(V, 1));
    g.setAttribute('lake', new THREE.BufferAttribute(L, 1));
    g.setAttribute('roadK', new THREE.BufferAttribute(Rk, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.matrixAutoUpdate = false;
    m.updateMatrix();
    return m;
  }
  return group;
}
