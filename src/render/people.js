import * as THREE from 'three';
import { skyFog } from './sky.js';
import { shared } from './props.js';

const BASE = new URL('../../assets/crowd/', import.meta.url);
const FRAMES = 12, NEAR = 48, VARIANTS = 8, POSES = 5, TILE_W = 1.7, TILE_H = 3.4, TILE_PX = 96;
const WEIGHTS = [0.28, 0.24, 0.26, 0.22];
export const ANIM = { idle: 0, fold: 1, cheer: 2, clap: 3, phone: 4, flag: 5, gasp: 6 };

const COMMON = /* glsl */`
uniform float uTime; uniform float uCheer; uniform float uGasp; uniform float uParty; uniform float uNight; uniform vec3 uWave;
uniform float uDur[7];
void crowdAnim(vec4 s, vec2 at, out int a0, out int a1, out float w, out float u0, out float u1) {
  float pPhone = 0.08 + 0.22 * uNight;
  float r = s.y;
  a0 = r < pPhone ? 4 : r < pPhone + 0.12 ? 3 : r < pPhone + 0.26 ? 1 : 0;
  float th = s.z;
  float wc = smoothstep(th - 0.25, th, uCheer);
  float wg = smoothstep(th - 0.25, th, uGasp);
  float wp = smoothstep(0.0, 0.2, uParty) * step(s.w, 0.18);
  a1 = 2;
  w = wc;
  if (s.x > 0.5 && uCheer < 0.65) a1 = 3;
  if (wp > w) { a1 = 5; w = wp; }
  if (wg > w) { a1 = 6; w = wg; }
  float wf = (uTime - uWave.z) * 22.0 - length(at - uWave.xy);
  float wv = smoothstep(0.0, 2.5, wf) * smoothstep(9.0, 5.0, wf) * step(abs(wf - 4.5), 4.5 + 2.0 * s.z);
  if (wv > w) { a1 = 2; w = wv; }
  float spd = 0.9 + 0.2 * fract(s.x * 7.13);
  u0 = fract(uTime * spd / uDur[a0] + s.w * 7.3);
  u1 = fract(uTime * spd / uDur[a1] + s.x * 5.1);
}`;

const NEAR_VERTEX = /* glsl */`
uniform highp sampler2D uVatPos; uniform highp sampler2D uVatNrm; uniform float uRow;
attribute vec4 aSeed; attribute vec4 aAttr;
#ifdef BAKE
attribute vec2 aPose;
#endif
flat varying float vKind; varying float vT; flat varying vec4 vSeed; varying float vWash; varying vec2 vSkinUv;
${COMMON}
vec3 fetchP(int a, float u) {
  float f = u * 12.0; int i0 = int(f); int i1 = i0 == 11 ? 0 : i0 + 1; float k = f - float(i0);
  int row = int(uRow) + a * 12;
  return mix(texelFetch(uVatPos, ivec2(gl_VertexID, row + i0), 0).xyz, texelFetch(uVatPos, ivec2(gl_VertexID, row + i1), 0).xyz, k);
}
vec3 fetchN(int a, float u) {
  int row = int(uRow) + a * 12 + int(u * 12.0 + 0.5) % 12;
  return texelFetch(uVatNrm, ivec2(gl_VertexID, row), 0).xyz * 2.0 - 1.0;
}`;

const NEAR_POSE = /* glsl */`
int a0, a1; float pw, u0, u1;
#ifdef BAKE
a0 = int(aPose.x + 0.5); a1 = a0; pw = 0.0; u0 = aPose.y; u1 = u0;
#else
crowdAnim(aSeed, instanceMatrix[3].xz, a0, a1, pw, u0, u1);
#endif
vec3 vatP = mix(fetchP(a0, u0), fetchP(a1, u1), pw);
vec3 objectNormal = normalize(mix(fetchN(a0, u0), fetchN(a1, u1), pw));
vKind = floor(aAttr.x * 255.0 + 0.5); vT = aAttr.y; vSeed = aSeed; vWash = max(objectNormal.z, 0.0); vSkinUv = uv;`;

const FRAG_COMMON = /* glsl */`
uniform sampler2D uSkin;
flat varying float vKind; varying float vT; flat varying vec4 vSeed; varying float vWash; varying vec2 vSkinUv;
const vec3 SHIRT[10] = vec3[10](vec3(0.06), vec3(0.8), vec3(0.72, 0.05, 0.08), vec3(0.1, 0.16, 0.36), vec3(0.36), vec3(0.85, 0.65, 0.1), vec3(0.1, 0.5, 0.5), vec3(0.85, 0.35, 0.08), vec3(0.3, 0.34, 0.14), vec3(0.5, 0.1, 0.15));
const vec3 PANTS[5] = vec3[5](vec3(0.15, 0.22, 0.4), vec3(0.07, 0.09, 0.15), vec3(0.06), vec3(0.5, 0.42, 0.3), vec3(0.3));
const vec3 HAIR[6] = vec3[6](vec3(0.03), vec3(0.1, 0.06, 0.04), vec3(0.25, 0.14, 0.07), vec3(0.65, 0.5, 0.25), vec3(0.55), vec3(0.4, 0.14, 0.07));
const vec3 FLAG[18] = vec3[18](
  vec3(0.1, 0.2, 0.55), vec3(0.9), vec3(0.72, 0.05, 0.08),
  vec3(0.05, 0.5, 0.2), vec3(0.9), vec3(0.72, 0.05, 0.08),
  vec3(0.72, 0.05, 0.08), vec3(0.9, 0.75, 0.1), vec3(0.05, 0.5, 0.2),
  vec3(0.1, 0.1, 0.1), vec3(0.72, 0.05, 0.08), vec3(0.9, 0.75, 0.1),
  vec3(0.9, 0.75, 0.1), vec3(0.1, 0.2, 0.55), vec3(0.9, 0.75, 0.1),
  vec3(0.72, 0.05, 0.08), vec3(0.9), vec3(0.72, 0.05, 0.08));
float pick(float r, float n, float skew) { return min(n - 1.0, floor(pow(r, skew) * n)); }
vec3 crowdColor(vec2 uv) {
  vec4 s = vSeed;
  vec3 tex = texture2D(uSkin, uv).rgb;
  float lum = dot(tex, vec3(0.3, 0.5, 0.2));
  float sk = fract(s.x * 13.7 + s.z * 3.1);
  vec3 skin = mix(vec3(0.82, 0.58, 0.46), vec3(0.22, 0.12, 0.08), sk * sk * 0.95) * clamp(lum / 0.55, 0.6, 1.3);
  float sleeve = s.z < 0.15 ? 0.04 : s.z < 0.6 ? 0.38 : 0.97;
  float legs = fract(s.w * 5.3 + s.x) < 0.25 ? 0.45 : 1.01;
  vec3 shirt = SHIRT[int(pick(fract(s.x * 3.7 + s.y * 5.9), 10.0, 1.25))];
  vec3 pants = PANTS[int(pick(fract(s.y * 11.3 + s.w), 5.0, 1.0))];
  float k = vKind;
  if (k < 0.5) return skin;
  if (k < 1.5) return shirt;
  if (k < 2.5) return mix(shirt, skin, smoothstep(sleeve - 0.02, sleeve + 0.02, vT));
  if (k < 3.5) return mix(pants, skin, smoothstep(legs - 0.02, legs + 0.02, vT));
  if (k < 4.5) return fract(s.w * 9.1) < 0.3 ? vec3(0.75) : vec3(0.05);
  if (k < 5.5) return HAIR[int(pick(fract(s.z * 7.7 + s.y), 6.0, 1.6))];
  if (k < 6.5) return vec3(0.02);
  if (k < 7.5) return vec3(0.55, 0.45, 0.3);
  int f = int(floor(fract(s.z * 6.1 + s.x) * 6.0)) * 3 + int(clamp(floor(vT * 3.0), 0.0, 2.0));
  return FLAG[f];
}`;

function shaderExtend(uniforms, row, atlas) {
  return (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.uniforms.uRow = { value: row };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + NEAR_VERTEX)
      .replace('#include <beginnormal_vertex>', NEAR_POSE)
      .replace('#include <begin_vertex>', 'vec3 transformed = vatP;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvFogWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_COMMON)
      .replace('#include <color_fragment>', 'diffuseColor.rgb = crowdColor(vSkinUv);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uNight * (0.1 + 0.4 * vWash);
        if (vKind > 5.5 && vKind < 6.5) totalEmissiveRadiance += vec3(2.6, 2.7, 3.0) * uNight;`)
      .replace('#include <opaque_fragment>', atlas ? 'gl_FragColor = vec4(diffuseColor.rgb, 1.0);' : '#include <opaque_fragment>');
  };
}

const CARD_VERTEX = /* glsl */`
attribute vec4 aSeed; attribute float aChar;
varying vec2 vCardUv;
${COMMON}`;

const CARD_NORMAL = /* glsl */`
vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
vec3 toCam = cameraPosition - center;
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
vec3 transformedNormal = normalize((viewMatrix * vec4(normalize(vec3(toCam.x, 0.0, toCam.z)) + vec3(0.0, 0.3, 0.0), 0.0)).xyz);`;

const CARD_BODY = /* glsl */`
float scl = length(instanceMatrix[1].xyz);
vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + vec3(1e-5, 0.0, 0.0));
vec3 cardWorld = center + right * position.x * scl + vec3(0.0, 1.0, 0.0) * position.y * scl;
int c0, c1; float cw, cu0, cu1;
crowdAnim(aSeed, center.xz, c0, c1, cw, cu0, cu1);
float pose = c0 == 4 ? 3.0 : c0 == 5 ? 4.0 : 0.0;
if (cw > 0.5) {
  if (c1 == 5) pose = 4.0;
  else if (c1 == 2) pose = 1.0 + floor(mod(uTime * 2.4 + aSeed.w * 4.0, 2.0));
  else pose = 0.0;
}
float variant = floor(aSeed.x * ${VARIANTS}.0);
vCardUv = vec2((aChar * ${VARIANTS}.0 + variant + uv.x) / (4.0 * ${VARIANTS}.0), (${POSES - 1}.0 - pose + uv.y) / ${POSES}.0);
vec3 transformed = cardWorld;`;

function cardMaterial(uniforms, atlas, sunUniform, fogDensity) {
  const m = new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.4, roughness: 0.9, metalness: 0 });
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + CARD_VERTEX)
      .replace('#include <beginnormal_vertex>', CARD_NORMAL)
      .replace('#include <defaultnormal_vertex>', '')
      .replace('#include <begin_vertex>', CARD_BODY)
      .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(cardWorld, 1.0);\ngl_Position = projectionMatrix * mvPosition;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvFogWorld = cardWorld;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCardUv;')
      .replace('#include <map_fragment>', 'diffuseColor *= texture2D(map, vCardUv);');
  });
  m.customProgramCacheKey = () => 'crowd-card';
  return m;
}

const buffers = new Map();
function loadBuffer(name) {
  if (!buffers.has(name)) {
    buffers.set(name, fetch(new URL(`${name}.gz`, BASE))
      .then((r) => (r.ok ? new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : Promise.reject(new Error(r.status))))
      .catch(() => fetch(new URL(name, BASE)).then((r) => r.arrayBuffer())));
  }
  return buffers.get(name);
}

export async function createPeople(renderer, sunUniform, fogDensity, cards = false) {
  const meta = await (await fetch(new URL('crowd.json', BASE))).json();
  const [bin, posBuf, nrmBuf] = await Promise.all([loadBuffer('crowd.bin'), loadBuffer('vat_pos.bin'), loadBuffer('vat_nrm.bin')]);
  const { width, height } = meta.vat;
  const vatPos = new THREE.DataTexture(new Uint16Array(posBuf), width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  const vatNrm = new THREE.DataTexture(new Uint8Array(nrmBuf), width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  for (const t of [vatPos, vatNrm]) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }
  const skin = await new THREE.TextureLoader().loadAsync(new URL('skin.webp', BASE).href);
  skin.colorSpace = THREE.SRGBColorSpace;
  const uniforms = {
    uTime: { value: 0 }, uCheer: { value: 0 }, uGasp: { value: 0 }, uParty: { value: 0 }, uNight: { value: 0 }, uWave: { value: new THREE.Vector3(0, 0, -1e3) },
    uDur: { value: meta.anims.map((a) => a.dur) }, uVatPos: { value: vatPos }, uVatNrm: { value: vatNrm }, uSkin: { value: skin },
  };

  const geoms = meta.chars.map((c) => {
    const g = new THREE.InstancedBufferGeometry();
    const rest = new Float32Array(c.verts * 3);
    const row = new Uint16Array(posBuf, (c.rowBase * width) * 8, c.verts * 4);
    for (let i = 0; i < c.verts; i++) for (let k = 0; k < 3; k++) rest[i * 3 + k] = halfToFloat(row[i * 4 + k]);
    g.setAttribute('position', new THREE.BufferAttribute(rest, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(bin, c.uv, c.verts * 2), 2));
    g.setAttribute('aAttr', new THREE.BufferAttribute(new Uint8Array(bin, c.attr, c.verts * 4), 4, true));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(bin, c.index, c.tris * 3), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 3.2);
    return g;
  });
  const nearMaterial = (ci, bake) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    if (bake) m.defines = { BAKE: 1 };
    skyFog(m, sunUniform, fogDensity, false, shaderExtend(uniforms, meta.chars[ci].rowBase, bake));
    m.customProgramCacheKey = () => (bake ? 'crowd-bake' : 'crowd-near');
    return m;
  };

  const atlasRT = bakeAtlas(renderer, meta, geoms, (ci) => nearMaterial(ci, true));
  const cardMat = cardMaterial(uniforms, atlasRT.texture, sunUniform, fogDensity);
  const cardGeom = new THREE.PlaneGeometry(TILE_W, TILE_H).translate(0, TILE_H / 2 - 0.15, 0);
  const mats = meta.chars.map((_, i) => nearMaterial(i, false));

  const group = new THREE.Group();
  const chunks = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let count = 0;

  function addSeats(seats) {
    const byChunk = new Map();
    for (const st of seats) {
      let c = byChunk.get(st.chunk);
      if (!c) byChunk.set(st.chunk, c = { center: st.center, radius: st.radius, seats: [] });
      c.seats.push(st);
    }
    for (const c of byChunk.values()) {
      const near = [];
      for (let ci = 0; ci < meta.chars.length; ci++) {
        const list = c.seats.filter((x) => x.char === ci);
        if (!list.length) continue;
        const g = shared(geoms[ci]);
        const seed = new Float32Array(list.length * 4);
        const mesh = new THREE.InstancedMesh(g, mats[ci], list.length);
        list.forEach((it, i) => {
          p.set(it.x, it.y, it.z);
          q.setFromAxisAngle(up, it.yaw);
          s.set(it.scale * meta.chars[ci].scale[0], it.scale * meta.chars[ci].scale[1], it.scale * meta.chars[ci].scale[2]);
          mesh.setMatrixAt(i, m4.compose(p, q, s));
          seed.set(it.seed, i * 4);
        });
        g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
        mesh.boundingSphere = new THREE.Sphere(c.center, c.radius);
        mesh.frustumCulled = true;
        mesh.receiveShadow = true;
        near.push(mesh);
        group.add(mesh);
      }
      const cg = shared(cardGeom);
      const seed = new Float32Array(c.seats.length * 4), chr = new Float32Array(c.seats.length);
      const card = new THREE.InstancedMesh(cg, cardMat, c.seats.length);
      c.seats.forEach((it, i) => {
        p.set(it.x, it.y, it.z);
        q.identity();
        s.setScalar(it.scale);
        card.setMatrixAt(i, m4.compose(p, q, s));
        seed.set(it.seed, i * 4);
        chr[i] = it.char;
      });
      cg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
      cg.setAttribute('aChar', new THREE.InstancedBufferAttribute(chr, 1));
      card.boundingSphere = new THREE.Sphere(c.center, c.radius);
      card.visible = false;
      group.add(card);
      chunks.push({ center: c.center, near, card });
      count += c.seats.length;
    }
  }

  function update(camera) {
    for (const ch of chunks) {
      const near = !cards && ch.center.distanceTo(camera.position) - 9 < NEAR;
      for (const m of ch.near) m.visible = near;
      ch.card.visible = !near;
    }
  }

  return {
    group, uniforms, addSeats, update, atlas: atlasRT.texture,
    pickChar(r) { let a = 0; for (let i = 0; i < WEIGHTS.length; i++) { a += WEIGHTS[i]; if (r < a) return i; } return WEIGHTS.length - 1; },
    get count() { return count; },
  };
}


function halfToFloat(h) {
  const e = (h >> 10) & 31, f = h & 1023, sg = h & 0x8000 ? -1 : 1;
  if (e === 0) return sg * 5.960464477539063e-8 * f;
  if (e === 31) return f ? NaN : sg * Infinity;
  return sg * Math.pow(2, e - 15) * (1 + f / 1024);
}

function bakeAtlas(renderer, meta, geoms, material) {
  const cols = meta.chars.length * VARIANTS;
  const rt = new THREE.WebGLRenderTarget(cols * TILE_PX, POSES * TILE_PX * 2, { type: THREE.UnsignedByteType, depthBuffer: true });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  rt.texture.generateMipmaps = true;
  rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
  rt.texture.anisotropy = 4;
  const scene = new THREE.Scene();
  const poses = [[ANIM.idle, 0.2], [ANIM.cheer, 0], [ANIM.cheer, 0.5], [ANIM.phone, 0.3], [ANIM.flag, 0.25]];
  const rng = mulberry(7);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  meta.chars.forEach((c, ci) => {
    const n = VARIANTS * POSES;
    const g = shared(geoms[ci]);
    const seed = new Float32Array(n * 4), pose = new Float32Array(n * 2);
    const mesh = new THREE.InstancedMesh(g, material(ci), n);
    const variants = Array.from({ length: VARIANTS }, (_, v) => [(v + 0.5) / VARIANTS, rng(), rng(), rng()]);
    for (let v = 0; v < VARIANTS; v++) {
      for (let k = 0; k < POSES; k++) {
        const i = v * POSES + k;
        p.set((ci * VARIANTS + v + 0.5) * TILE_W, (POSES - 1 - k) * TILE_H + 0.15, 0);
        s.set(c.scale[0], c.scale[1], c.scale[2]);
        mesh.setMatrixAt(i, m4.compose(p, q.identity(), s));
        seed.set(variants[v], i * 4);
        pose.set(poses[k], i * 2);
      }
    }
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.setAttribute('aPose', new THREE.InstancedBufferAttribute(pose, 2));
    mesh.frustumCulled = false;
    scene.add(mesh);
  });
  const cam = new THREE.OrthographicCamera(0, cols * TILE_W, POSES * TILE_H, 0, 0.1, 50);
  cam.position.set(0, 0, 10);
  const prevTarget = renderer.getRenderTarget(), prevAlpha = renderer.getClearAlpha(), prevColor = renderer.getClearColor(new THREE.Color());
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevColor, prevAlpha);
  return rt;
}

function mulberry(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
