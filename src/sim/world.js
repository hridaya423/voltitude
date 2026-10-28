import { buildCourse } from './course.js';
import { buildCircuit } from './circuit.js';
import { buildTerrain } from './terrain.js';
import { VENUES } from './venues.js';

export function trackHash(track, venue) {
  let h = 2166136261;
  const mix = (v) => { h = Math.imul(h ^ Math.round(v * 100), 16777619) >>> 0; };
  const { course, circuit, terrain: T } = venue;
  if (circuit) for (const nd of circuit.nodes) for (const v of Array.isArray(nd) ? nd.slice(0, 5) : Object.values(nd.loop)) mix(v);
  else {
    for (const v of course.start) mix(v);
    for (const p of course.pieces) for (const k of ['len', 'turn', 'pitch', 'bank', 'lean', 'shift', 'w', 'wall', 'chasm']) mix(p[k] || 0);
  }
  for (const v of [T.res, T.size, T.cx, T.cz, T.ring, ...T.mesas.flat(), ...T.buttes.flat(), ...(T.pad || []), ...(T.sea ? T.sea.flat(2) : []), ...(T.cut || [])]) mix(v);
  if (venue.id !== 'proving') for (const ch of T.style) mix(ch.charCodeAt(0));
  mix(track.n);
  return h >>> 0;
}

export function encodeHeights(H, hash) {
  let lo = Infinity, hi = -Infinity;
  for (const v of H) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const out = new ArrayBuffer(16 + H.length * 2);
  const head = new DataView(out);
  head.setUint32(0, hash, true); head.setUint32(4, H.length, true);
  head.setFloat32(8, lo, true); head.setFloat32(12, hi, true);
  const q = new Uint16Array(out, 16);
  for (let i = 0; i < H.length; i++) q[i] = Math.round(((H[i] - lo) / (hi - lo)) * 65535);
  return new Uint8Array(out);
}

export function decodeHeights(buf, track, venue) {
  const head = new DataView(buf.buffer || buf, buf.byteOffset || 0);
  if (head.getUint32(0, true) !== trackHash(track, venue)) return null;
  const n = head.getUint32(4, true), lo = head.getFloat32(8, true), hi = head.getFloat32(12, true);
  const q = new Uint16Array((buf.buffer || buf).slice((buf.byteOffset || 0) + 16, (buf.byteOffset || 0) + 16 + n * 2));
  const H = new Float32Array(n);
  for (let i = 0; i < n; i++) H[i] = lo + (q[i] / 65535) * (hi - lo);
  return H;
}

export const buildTrack = (venue) => (venue.circuit ? buildCircuit(venue.circuit) : buildCourse(venue.course));

export function buildWorld(heights, venue = VENUES.proving) {
  const track = buildTrack(venue);
  const shaped = heights ? decodeHeights(heights, track, venue) : null;
  const terrain = buildTerrain(track, shaped, venue.terrain);
  return { venue, track, terrain, baked: !!shaped };
}
