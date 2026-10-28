import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';

export function lightPoints() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uNight: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float aSize; attribute float aStrobe;
      uniform float uTime; uniform float uScale; uniform float uNight;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float k = 1.0;
        if (aStrobe >= 0.0) k = 0.08 + 3.0 * pow(max(0.0, 1.0 - fract(uTime * 2.0 - aStrobe) * 9.0), 2.0);
        float dist = -mv.z;
        vColor = color * k * mix(0.35, 1.0, uNight) * exp(-dist * 0.00035);
        gl_PointSize = clamp(aSize * uScale / dist, 2.2, 48.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 5.0) + 0.6 * exp(-d * d * 40.0);
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pos = [], col = [], size = [], strobe = [];
  const add = (x, y, z, c, s = 0.9, st = -1) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); size.push(s); strobe.push(st); };
  return { mat, add, build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    g.setAttribute('aStrobe', new THREE.Float32BufferAttribute(strobe, 1));
    const p = new THREE.Points(g, mat);
    p.frustumCulled = false;
    return p;
  } };
}

export function roofRuns(track) {
  const out = [];
  for (let i = 1; i < track.n; i++) if (track.roof[i] && !track.roof[i - 1]) { let j = i; while (track.roof[j + 1]) j++; out.push([i, j]); }
  return out;
}

export function sectorCentroid(track, name) {
  const k = track.sectors.findIndex((s) => s.name === name);
  if (k < 0) return null;
  const end = track.sectors[k + 1]?.i ?? track.finish;
  let x = 0, z = 0, n = 0, top = 0;
  for (let i = track.sectors[k].i; i < end; i++) {
    if (track.U[i * 3 + 1] > 0.6) continue;
    x += track.H[i * 3]; z += track.H[i * 3 + 2]; n++;
    top = Math.max(top, track.H[i * 3 + 1]);
  }
  return n ? { x: x / n, z: z / n, top } : null;
}

export function merged(group, list, mat, shadow) {
  if (!list.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))), mat);
  mesh.castShadow = shadow; mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}
