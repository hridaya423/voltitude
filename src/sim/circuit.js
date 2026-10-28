import { HEART } from './course.js';

const D = Math.PI / 180;
const DENSE = 0.25;
export const LIM_BAND = 2.8;

const smoother = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
const smootherD = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u));

function pchip(t, y, total) {
  const m = y.length;
  const h = (k) => (k + 1 < m ? t[k + 1] : total) - t[k];
  const d = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const a = (k + m - 1) % m, h0 = h(a), h1 = h(k);
    const d0 = (y[k] - y[a]) / h0, d1 = (y[(k + 1) % m] - y[k]) / h1;
    if (d0 * d1 <= 0) { d[k] = 0; continue; }
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
    d[k] = (w0 + w1) / (w0 / d0 + w1 / d1);
  }
  return d;
}

export function loopShape(len, width, clear) {
  const n = Math.round(len / DENSE), ds = len / n;
  const kmax = (4 * Math.PI) / len;
  const phi = (s) => (s <= len / 2 ? (kmax * s * s) / len : 2 * Math.PI - (kmax * (len - s) ** 2) / len);
  const a = new Float64Array(n + 1), h = new Float64Array(n + 1), f = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const s0 = i * ds, s1 = s0 + ds, sm = (s0 + s1) / 2;
    f[i] = phi(s0);
    a[i + 1] = a[i] + Math.cos(phi(sm)) * ds;
    h[i + 1] = h[i] + Math.sin(phi(sm)) * ds;
  }
  f[n] = 2 * Math.PI;
  const reach = a[n];
  let i1 = 0;
  while (a[i1 + 1] < reach / 2) i1++;
  const u1 = i1 / n;
  const lam = (u) => smoother((u - 0.18) / 0.64);
  const lamD = (u) => smootherD((u - 0.18) / 0.64) / 0.64;
  const sep = lam(1 - u1) - lam(u1);
  const shift = (width + clear) / Math.max(sep, 0.2);
  let top = 0;
  for (let i = 0; i <= n; i++) top = Math.max(top, h[i]);
  return { n, ds, a, h, phi: f, reach, shift, top, lam, lamD, len };
}

function expand(def) {
  const out = [];
  for (const item of def.nodes) {
    if (Array.isArray(item)) { out.push({ x: item[0], z: item[1], y: item[2] ?? 0, bank: item[3] ?? 0, w: item[4] ?? def.w, flags: item[5] || null }); continue; }
    const L = item.loop;
    const shape = loopShape(L.len, L.width, L.clear ?? 3);
    const yaw = L.yaw * D, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const side = L.side ?? 1;
    const w = L.width / 2 + LIM_BAND + 0.6;
    out.push({ x: L.x, z: L.z, y: L.y, bank: 0, w, yaw, loop: 'in', shape, side, flags: L.flags || null });
    out.push({ x: L.x + fx * shape.reach + rx * shape.shift * side, z: L.z + fz * shape.reach + rz * shape.shift * side, y: L.y, bank: 0, w, yaw, loop: 'out', flags: null });
  }
  return out;
}

export function profileJump({ kick, ramp, flare }, len, rise) {
  const th = Math.tan(kick * D), land = len - ramp - flare;
  const s = ((th * ramp) / 2 - rise) / (land + flare / 2);
  const top = (th * ramp) / 2;
  return {
    lip: ramp, slope: s, land, len,
    y: (x) => (x < ramp ? (th * x * x) / (2 * ramp) : x < ramp + land ? top - s * (x - ramp) : top - s * land - s * ((x - ramp - land) - (x - ramp - land) ** 2 / (2 * flare))),
    dy: (x) => (x < ramp ? (th * x) / ramp : x < ramp + land ? -s : -s * (1 - (x - ramp - land) / flare)),
  };
}

function hermite(p0, p1, m0, m1, h, u) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
}

function hermiteD(p0, p1, m0, m1, h, u) {
  const u2 = u * u;
  return ((6 * u2 - 6 * u) * p0 + (3 * u2 - 4 * u + 1) * h * m0 + (-6 * u2 + 6 * u) * p1 + (3 * u2 - 2 * u) * h * m1) / h;
}

function dense(nodes) {
  const m = nodes.length;
  const t = new Float64Array(m);
  let total = 0;
  for (let k = 0; k < m; k++) {
    t[k] = total;
    const b = nodes[(k + 1) % m];
    total += Math.hypot(b.x - nodes[k].x, b.z - nodes[k].z) + 1e-6;
  }
  const hk = (k) => (k + 1 < m ? t[k + 1] : total) - t[k];
  const mx = new Float64Array(m), mz = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const a = nodes[(k + m - 1) % m], b = nodes[(k + 1) % m], n = nodes[k];
    if (n.yaw !== undefined) { mx[k] = Math.sin(n.yaw); mz[k] = Math.cos(n.yaw); continue; }
    const span = hk((k + m - 1) % m) + hk(k);
    mx[k] = (b.x - a.x) / span; mz[k] = (b.z - a.z) / span;
  }
  const my = pchip(t, nodes.map((n) => n.y), total);
  const mb = pchip(t, nodes.map((n) => n.bank), total);
  const mw = pchip(t, nodes.map((n) => n.w), total);
  for (let k = 0; k < m; k++) if (nodes[k].yaw !== undefined) { my[k] = 0; mb[k] = 0; }
  for (let k = 0; k < m; k++) if (nodes[k].flags?.jump) { my[k] = 0; my[(k + 1) % m] = 0; }

  const S = { x: [], y: [], z: [], T: [], U: [], R: [], w: [], bank: [], loop: [], jump: [], roof: [] };
  const push = (x, y, z, T, U, R, w, loop, bank = 0, jump = 0, roof = 0) => {
    S.x.push(x); S.y.push(y); S.z.push(z); S.T.push(T); S.U.push(U); S.R.push(R); S.w.push(w); S.loop.push(loop); S.bank.push(bank); S.jump.push(jump); S.roof.push(roof);
  };
  const marks = [];
  for (let k = 0; k < m; k++) {
    const a = nodes[k], b = nodes[(k + 1) % m], h = hk(k);
    marks.push({ at: S.x.length, node: a });
    if (a.loop === 'in') {
      const sh = a.shape, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = -Math.cos(a.yaw), rz = Math.sin(a.yaw), sd = a.side;
      for (let i = 0; i < sh.n; i++) {
        const u = i / sh.n, l = sh.shift * sh.lam(u) * sd;
        const dl = (sh.lamD(u) * sh.shift * sd) / sh.len;
        const c = Math.cos(sh.phi[i]), s = Math.sin(sh.phi[i]);
        const T = [c * fx + dl * rx, s, c * fz + dl * rz];
        const tl = Math.hypot(...T);
        T[0] /= tl; T[1] /= tl; T[2] /= tl;
        let U = [-s * fx, c, -s * fz];
        const d = U[0] * T[0] + U[1] * T[1] + U[2] * T[2];
        U = [U[0] - T[0] * d, U[1] - T[1] * d, U[2] - T[2] * d];
        const ul = Math.hypot(...U);
        U = [U[0] / ul, U[1] / ul, U[2] / ul];
        const R = [T[1] * U[2] - T[2] * U[1], T[2] * U[0] - T[0] * U[2], T[0] * U[1] - T[1] * U[0]];
        push(a.x + sh.a[i] * fx + l * rx, a.y + sh.h[i], a.z + sh.a[i] * fz + l * rz, T, U, R, a.w, 1);
      }
      continue;
    }
    const K = Math.max(4, Math.ceil((h * 1.15) / DENSE));
    const flat = (u) => Math.hypot(hermiteD(a.x, b.x, mx[k], mx[(k + 1) % m], h, u), hermiteD(a.z, b.z, mz[k], mz[(k + 1) % m], h, u)) * (h / K);
    let jump = null, run = 0;
    if (a.flags?.jump) {
      let len = 0;
      for (let i = 0; i < K; i++) len += flat((i + 0.5) / K);
      jump = profileJump(a.flags.jump, len, b.y - a.y);
    }
    for (let i = 0; i < K; i++) {
      const u = i / K;
      const x = hermite(a.x, b.x, mx[k], mx[(k + 1) % m], h, u), z = hermite(a.z, b.z, mz[k], mz[(k + 1) % m], h, u);
      const dx = hermiteD(a.x, b.x, mx[k], mx[(k + 1) % m], h, u), dz = hermiteD(a.z, b.z, mz[k], mz[(k + 1) % m], h, u);
      let y = hermite(a.y, b.y, my[k], my[(k + 1) % m], h, u), dy = hermiteD(a.y, b.y, my[k], my[(k + 1) % m], h, u);
      if (jump) {
        y = a.y + jump.y(run); dy = jump.dy(run) * Math.hypot(dx, dz);
        run += flat((i + 0.5) / K);
      }
      const bank = hermite(a.bank, b.bank, mb[k], mb[(k + 1) % m], h, u);
      const w = hermite(a.w, b.w, mw[k], mw[(k + 1) % m], h, u);
      const tl = Math.hypot(dx, dy, dz);
      const T = [dx / tl, dy / tl, dz / tl];
      const r0 = [-T[2], 0, T[0]], rl = Math.hypot(r0[0], r0[2]);
      r0[0] /= rl; r0[2] /= rl;
      const u0 = [r0[1] * T[2] - r0[2] * T[1], r0[2] * T[0] - r0[0] * T[2], r0[0] * T[1] - r0[1] * T[0]];
      push(x, y, z, T, [u0[0], u0[1], u0[2]], r0, w, 0, bank, jump ? (run < jump.lip ? 1 : 2) : 0, a.flags?.roof ? 1 : 0);
    }
  }
  return { S, marks, total };
}

export function buildCircuit(def) {
  const nodes = expand(def);
  const m = nodes.length;
  const { S, marks } = dense(nodes);
  const nd = S.x.length;

  const W = 40, BW = 120;
  const yawOf = (i) => Math.atan2(S.T[i][0], S.T[i][2]);
  const signed = new Float64Array(nd);
  for (let i = 0; i < nd; i++) {
    if (S.loop[i]) continue;
    let d = yawOf((i + W) % nd) - yawOf((i - W + nd) % nd);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const k = -d / (2 * W * DENSE);
    signed[i] = S.bank[i] * D * Math.sign(k) * Math.min(1, Math.abs(k) / 0.002);
  }
  for (let i = 0; i < nd; i++) {
    if (S.loop[i]) continue;
    let sum = 0;
    for (let j = -BW; j <= BW; j++) sum += signed[(i + j + nd) % nd];
    const bank = sum / (2 * BW + 1);
    const U = S.U[i], R = S.R[i], c = Math.cos(bank), s = Math.sin(bank);
    S.U[i] = [U[0] * c + R[0] * s, U[1] * c + R[1] * s, U[2] * c + R[2] * s];
    S.R[i] = [R[0] * c - U[0] * s, R[1] * c - U[1] * s, R[2] * c - U[2] * s];
  }

  const cum = new Float64Array(nd + 1);
  for (let i = 0; i < nd; i++) {
    const j = (i + 1) % nd;
    cum[i + 1] = cum[i] + Math.hypot(S.x[j] - S.x[i], S.y[j] - S.y[i], S.z[j] - S.z[i]);
  }
  const length = cum[nd];
  const N = Math.round(length), step = length / N;
  const n = N + 1;
  const H = new Float64Array(n * 3), P = new Float64Array(n * 3), T = new Float64Array(n * 3), U = new Float64Array(n * 3), R = new Float64Array(n * 3);
  const halfW = new Float32Array(n), loopMask = new Uint8Array(n), roof = new Uint8Array(n), bot = new Array(n).fill('');
  let q = 0;
  const at = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const s = i * step;
    while (cum[q + 1] < s) q++;
    const f = (s - cum[q]) / (cum[q + 1] - cum[q] || 1), j = (q + 1) % nd;
    at[i] = q;
    const k = i * 3;
    H[k] = S.x[q] + (S.x[j] - S.x[q]) * f; H[k + 1] = S.y[q] + (S.y[j] - S.y[q]) * f; H[k + 2] = S.z[q] + (S.z[j] - S.z[q]) * f;
    const lerp = (A, c) => A[q][c] + (A[j][c] - A[q][c]) * f;
    let tx = lerp(S.T, 0), ty = lerp(S.T, 1), tz = lerp(S.T, 2);
    const tl = Math.hypot(tx, ty, tz);
    tx /= tl; ty /= tl; tz /= tl;
    let ux = lerp(S.U, 0), uy = lerp(S.U, 1), uz = lerp(S.U, 2);
    const d = ux * tx + uy * ty + uz * tz;
    ux -= tx * d; uy -= ty * d; uz -= tz * d;
    const ul = Math.hypot(ux, uy, uz);
    ux /= ul; uy /= ul; uz /= ul;
    T[k] = tx; T[k + 1] = ty; T[k + 2] = tz;
    U[k] = ux; U[k + 1] = uy; U[k + 2] = uz;
    R[k] = ty * uz - tz * uy; R[k + 1] = tz * ux - tx * uz; R[k + 2] = tx * uy - ty * ux;
    halfW[i] = S.w[q] + (S.w[j] - S.w[q]) * f;
    loopMask[i] = S.loop[q] || S.loop[j] ? 1 : 0;
    if (S.jump[q]) bot[i] = 'jump';
    roof[i] = S.roof[q];
  }
  for (let c = 0; c < 3; c++) { H[N * 3 + c] = H[c]; T[N * 3 + c] = T[c]; U[N * 3 + c] = U[c]; R[N * 3 + c] = R[c]; }
  halfW[N] = halfW[0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) P[i * 3 + c] = H[i * 3 + c] - U[i * 3 + c] * HEART;

  const curv = new Float32Array(n), speedCap = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ia = (((i - 6) % N) + N) % N, ib = (i + 6) % N, k = i * 3, a = ia * 3, b = ib * 3;
    const dx = T[b] - T[a], dy = T[b + 1] - T[a + 1], dz = T[b + 2] - T[a + 2];
    curv[i] = (dx * R[k] + dy * R[k + 1] + dz * R[k + 2]) / 12;
    speedCap[i] = Math.abs(curv[i]) > 1e-5 ? Math.sqrt(42 / Math.abs(curv[i])) : 999;
  }
  const sectors = [], loops = [], airs = [];
  const toSample = (di) => {
    let lo = 0, hi = N - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (at[mid] < di) lo = mid + 1; else hi = mid; }
    return lo;
  };
  for (const mk of marks) {
    if (mk.node.flags?.sector) sectors.push({ name: mk.node.flags.sector, i: toSample(mk.at) });
    if (mk.node.loop === 'in') loops.push({ from: toSample(mk.at), to: 0 });
    if (mk.node.loop === 'out') loops[loops.length - 1].to = toSample(mk.at);
    if (mk.node.flags?.air) { const from = toSample(mk.at); airs.push({ from, to: (from + Math.round(mk.node.flags.air.len / step)) % N }); }
  }
  const air = new Uint8Array(n);
  airs.forEach((a, k) => { for (let i = a.from; i !== a.to; i = (i + 1) % N) air[i] = k + 1; });
  const jumps = [];
  for (let i = 0; i < N; i++) {
    if (bot[i] && !bot[(i + N - 1) % N]) jumps.push({ from: i, lip: i, to: i });
    if (bot[i]) jumps[jumps.length - 1].to = i;
    if (bot[i] && S.jump[at[i]] === 2 && S.jump[at[(i + N - 1) % N]] === 1) jumps[jumps.length - 1].lip = i;
  }
  sectors.sort((x, y) => x.i - y.i);
  if (!sectors.length || sectors[0].i !== 0) sectors.unshift({ name: 'Start', i: 0 });
  const cps = sectors.slice(1).map((s) => s.i);
  for (const i of [0, ...cps]) if (air[i]) throw new Error(`checkpoint at sample ${i} is inside an air span`);
  const zeros = (T2) => new T2(n);
  return {
    n, step, len: N, closed: true, lap: N, H, P, T, U, R, halfW, gap: zeros(Uint8Array), chasm: zeros(Float32Array), wall: zeros(Float32Array), roof,
    bot, speedCap, curv, cps, pads: [], sectors, finish: N, loops, loopMask, jumps, airs, air, length,
  };
}

export function wrap(track, i) {
  const N = track.lap;
  return ((i % N) + N) % N;
}
