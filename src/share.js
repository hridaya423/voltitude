import { STRIDE, decodeInputs } from './sim/ghost.js';

const KEYS = ['v', 'event', 'assist', 'seed', 'tier', 'total'];

function fnv(bytes) {
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ (b & 0xff), 0x01000193) >>> 0;
  return h;
}

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

const toB64url = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function encodeLink(run, venue) {
  const inputs = decodeInputs(run), frames = inputs.length / STRIDE;
  const head = new TextEncoder().encode(JSON.stringify({ ...Object.fromEntries(KEYS.map((k) => [k, run[k]])), venue, frames, hash: fnv(inputs) }));
  const body = new Int8Array(inputs.length);
  for (let ch = 0; ch < STRIDE; ch++) {
    let prev = 0;
    for (let i = 0; i < frames; i++) { const x = inputs[i * STRIDE + ch]; body[ch * frames + i] = x - prev; prev = x; }
  }
  const raw = new Uint8Array(2 + head.length + body.length);
  raw[0] = head.length & 0xff; raw[1] = head.length >> 8;
  raw.set(head, 2);
  raw.set(new Uint8Array(body.buffer), 2 + head.length);
  return toB64url(await pipe(raw, new CompressionStream('deflate-raw')));
}

export async function decodeLink(fragment) {
  try {
    const raw = await pipe(fromB64url(fragment), new DecompressionStream('deflate-raw'));
    const n = raw[0] | (raw[1] << 8);
    const head = JSON.parse(new TextDecoder().decode(raw.subarray(2, 2 + n)));
    const body = new Int8Array(raw.buffer, raw.byteOffset + 2 + n, raw.length - 2 - n), frames = head.frames;
    if (body.length !== frames * STRIDE) return null;
    const inputs = new Int8Array(body.length);
    for (let ch = 0; ch < STRIDE; ch++) {
      let prev = 0;
      for (let i = 0; i < frames; i++) { prev = (prev + body[ch * frames + i]) << 24 >> 24; inputs[i * STRIDE + ch] = prev; }
    }
    if (fnv(inputs) !== head.hash) return null;
    let s = '';
    const u = new Uint8Array(inputs.buffer);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { venue: head.venue, run: { ...Object.fromEntries(KEYS.map((k) => [k, head[k]])), splits: [], laps: [], inputs: btoa(s) } };
  } catch {
    return null;
  }
}

export async function openLink(fragment, api) {
  if (!/^[0-9a-f]{12}$/.test(fragment)) return decodeLink(fragment);
  if (!api) return null;
  try {
    const res = await fetch(`${api}/runs/${fragment}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
