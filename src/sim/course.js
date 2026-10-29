const D = Math.PI / 180;
export const HEART = 0.62;

const ease = (u) => u - Math.sin(2 * Math.PI * u) / (2 * Math.PI);
const smooth = (u) => (1 - Math.cos(Math.PI * u)) / 2;
const bump = (u) => Math.sin(Math.PI * u) ** 2;

function frame(yaw, pitch, roll, o) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = sy * cp, fy = sp, fz = cy * cp;
  const r0x = -cy, r0z = sy;
  const u0x = -r0z * fy, u0y = r0z * fx - r0x * fz, u0z = r0x * fy;
  const cr = Math.cos(roll), sr = Math.sin(roll);
  o[0] = fx; o[1] = fy; o[2] = fz;
  o[3] = u0x * cr + r0x * sr; o[4] = u0y * cr; o[5] = u0z * cr + r0z * sr;
  o[6] = r0x * cr - u0x * sr; o[7] = -u0y * sr; o[8] = r0z * cr - u0z * sr;
  return o;
}

export function buildCourse(def) {
  const pts = [], fr = [], meta = [];
  const cps = [], pads = [], sectors = [];
  let [x, y, z] = def.start;
  let yaw = def.yaw * D, pitch = 0, roll = 0, w = def.w;
  const f = new Float64Array(9);
  let finish = -1;
  for (const p of def.pieces) {
    const steps = Math.max(1, Math.round(p.len));
    const ds = p.len / steps;
    const y0 = yaw, p0 = pitch, r0 = roll, w0 = w;
    const dy = -(p.turn || 0) * D, dp = (p.pitch || 0) * D;
    const r1 = p.bank !== undefined ? p.bank * D : r0;
    const lean = (p.lean || 0) * D;
    const w1 = p.w ?? w0;
    const at = (u) => [y0 + dy * ease(u), p0 + dp * ease(u), r0 + (r1 - r0) * smooth(u) + lean * bump(u), w0 + (w1 - w0) * smooth(u)];
    const i0 = pts.length / 3;
    if (p.cp) cps.push(i0);
    if (p.sector) sectors.push({ name: p.sector, i: i0 });
    if (p.pad) pads.push({ i: i0 + Math.min(20, steps - 1), type: p.pad });
    if (p.finish) finish = i0;
    for (let s = 0; s < steps; s++) {
      const u = s / steps, [a, b, c, ww] = at(u);
      frame(a, b, c, f);
      pts.push(x, y, z);
      fr.push(...f);
      meta.push({ w: ww, gap: p.gap ? 1 : 0, chasm: p.chasm || 0, wall: p.wall || 0, roof: p.roof || 0, bot: p.bot || '' });
      const [am, bm] = at((s + 0.5) / steps);
      const cpm = Math.cos(bm);
      const sh = (p.shift || 0) * (ease((s + 1) / steps) - ease(u));
      x += Math.sin(am) * cpm * ds - Math.cos(am) * sh;
      y += Math.sin(bm) * ds;
      z += Math.cos(am) * cpm * ds + Math.sin(am) * sh;
    }
    yaw = y0 + dy; pitch = p0 + dp; roll = r1; w = w1;
  }
  frame(yaw, pitch, roll, f);
  pts.push(x, y, z); fr.push(...f);
  meta.push({ w, gap: 0, chasm: 0, wall: 0, roof: 0, bot: '' });

  const n = pts.length / 3;
  const H = new Float64Array(pts), P = new Float64Array(n * 3), T = new Float64Array(n * 3), U = new Float64Array(n * 3), R = new Float64Array(n * 3);
  const halfW = new Float32Array(n), gap = new Uint8Array(n), chasm = new Float32Array(n), wall = new Float32Array(n), roof = new Uint8Array(n);
  const bot = new Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * 3, q = i * 9;
    T[k] = fr[q]; T[k + 1] = fr[q + 1]; T[k + 2] = fr[q + 2];
    U[k] = fr[q + 3]; U[k + 1] = fr[q + 4]; U[k + 2] = fr[q + 5];
    R[k] = fr[q + 6]; R[k + 1] = fr[q + 7]; R[k + 2] = fr[q + 8];
    for (let c = 0; c < 3; c++) P[k + c] = H[k + c] - U[k + c] * HEART;
    halfW[i] = meta[i].w; gap[i] = meta[i].gap; chasm[i] = meta[i].chasm; wall[i] = meta[i].wall; roof[i] = meta[i].roof; bot[i] = meta[i].bot;
  }
  const speedCap = new Float32Array(n), curv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 6) * 3, b = Math.min(n - 1, i + 6) * 3, k = i * 3;
    const dx = T[b] - T[a], dy = T[b + 1] - T[a + 1], dz = T[b + 2] - T[a + 2];
    curv[i] = (dx * R[k] + dy * R[k + 1] + dz * R[k + 2]) / ((b - a) / 3);
    speedCap[i] = Math.abs(curv[i]) > 1e-5 ? Math.sqrt(42 / Math.abs(curv[i])) : 999;
  }
  if (finish < 0) finish = n - 1;
  return { n, step: 1, len: n - 1, H, P, T, U, R, halfW, wallL: halfW, wallR: halfW, runoff: { L: wall, R: wall, gravelL: gap, gravelR: gap, tyreL: gap, tyreR: gap }, gap, chasm, wall, roof, bot, speedCap, curv, cps, pads, sectors, finish };
}

export function nearestIndex(track, x, y, z, hint, window = 40) {
  const { n, H } = track;
  let best = hint, bd = Infinity;
  if (track.closed) {
    const N = track.lap, w = Math.min(window, N >> 1);
    for (let d = -w; d <= w; d++) {
      const i = (hint + d + N) % N;
      const dx = H[i * 3] - x, dy = H[i * 3 + 1] - y, dz = H[i * 3 + 2] - z;
      const e = dx * dx + dy * dy + dz * dz;
      if (e < bd) { bd = e; best = i; }
    }
    return best;
  }
  const lo = Math.max(0, hint - window), hi = Math.min(n - 1, hint + window);
  for (let i = lo; i <= hi; i++) {
    const dx = H[i * 3] - x, dy = H[i * 3 + 1] - y, dz = H[i * 3 + 2] - z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

export function nearestGlobal(track, x, y, z) {
  return nearestIndex(track, x, y, z, 0, track.n);
}
