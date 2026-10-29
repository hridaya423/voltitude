import { fbm, ridged, smoothstep } from './noise.js';

export const RUNWAY_Y = 1.2;
const BASIN = 7, BASIN_REACH = 36;

function playa(x, z, T) {
  const r = Math.hypot(x - T.cx, z - T.cz);
  let h = 0.5 * fbm(x / 300, z / 300, 2, 3) + 0.25 * fbm(x / 40, z / 40, 2, 7) - 0.4;
  const fan = smoothstep(T.ring - 300, T.ring + 200, r);
  h += fan * 22 * fbm(x / 260, z / 260, 3, 5);
  h += smoothstep(T.ring, T.ring + 700, r) * (220 + 520 * ridged(x / 640, z / 640, 5, 11));
  return h;
}

export function seaMask(x, z, T) {
  const [east, bays] = T.sea;
  let m = smoothstep(east - 120, east + 120, x + 160 * (fbm(z / 400, x / 400, 2, 71) - 0.5));
  const wob = 0.12 * (fbm(x / 120, z / 120, 2, 73) - 0.5);
  for (const [bx, bz, rx, rz] of bays) m = Math.max(m, smoothstep(1.08, 0.92, Math.hypot((x - bx) / rx, (z - bz) / rz) + wob));
  return m;
}

function coast(x, z, T) {
  const sea = seaMask(x, z, T);
  const r = Math.hypot(x - T.cx, z - T.cz);
  let land = 2.2 + 2.2 * fbm(x / 260, z / 260, 3, 3) + 1.6 * ridged(x / 70, z / 110, 3, 7) * smoothstep(0.0, 0.5, sea + 0.3);
  land += smoothstep(T.ring, T.ring + 800, r) * (40 + 160 * ridged(x / 700, z / 700, 4, 11)) * (1 - smoothstep(0.0, 0.3, sea));
  const floor = -16 + 4 * fbm(x / 300, z / 300, 2, 5);
  return land + (floor - land) * smoothstep(0.0, 1.0, sea);
}

function base(x, z, T) {
  if (T.style === 'playa') return playa(x, z, T);
  if (T.style === 'coast') return coast(x, z, T);
  let h = 18 * fbm(x / 420, z / 420, 3, 3) + 7 * fbm(x / 70, z / 70, 3, 7) - 14;
  const r = Math.hypot(x - T.cx, z - T.cz);
  h += smoothstep(T.ring, T.ring + 650, r) * (140 + 320 * ridged(x / 520, z / 520, 5, 11));
  const edge = 22 * (fbm(x / 55, z / 55, 3, 5) - 0.5);
  const wx = x + 90 * (fbm(x / 210, z / 210, 2, 3) - 0.5), wz = z + 90 * (fbm(x / 210 + 7.3, z / 210 + 2.1, 2, 4) - 0.5);
  const mesa = (cx, cz, r, top, cliff, talus) => {
    const d = Math.hypot(wx - cx, wz - cz) + edge;
    if (d > r + cliff + talus) return;
    const ledge = 0.5 + 0.12 * fbm(x / 70, z / 70, 2, 17);
    let k;
    if (d < r) k = 1;
    else if (d < r + cliff) { const u = (d - r) / cliff; k = 1 - (1 - ledge) * (u < 0.5 ? u * u * 2 : 1 - (1 - u) * (1 - u) * 2); }
    else k = ledge * Math.pow(1 - (d - r - cliff) / talus, 2.2);
    const t = top + 5 * fbm(x / 40, z / 40, 2, 9) + (d < r ? 3 * smoothstep(r, r - 30, d) : 0);
    if (k > 0) h = Math.max(h, h + (t - h) * k);
  };
  for (const [mx, mz, mr, top] of T.mesas) mesa(mx, mz, mr, top, 16, 70);
  for (const [bx, bz, br, bh] of T.buttes) mesa(bx, bz, br, bh + 6 * fbm(x / 30, z / 30, 2, 13), 14, 55);
  return h;
}

export function grid(T) {
  const { cx, cz, size, res } = T;
  const cell = size / (res - 1);
  return { res, cell, x0: cx - size / 2, z0: cz - size / 2, N: res * res, size };
}

export function sampleGrid(H, g, x, z) {
  const fx = Math.max(0, Math.min(g.res - 1.001, (x - g.x0) / g.cell)), fz = Math.max(0, Math.min(g.res - 1.001, (z - g.z0) / g.cell));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * g.res + i;
  return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + g.res] * (1 - u) + H[k + g.res + 1] * u) * v;
}

function sweep(track, g, every, radius, visit) {
  const { res, cell, x0, z0 } = g;
  const { n, H, halfW } = track;
  for (let s = 0; s < n; s += every) {
    const px = H[s * 3], pz = H[s * 3 + 2];
    const R = radius(s, halfW[s]);
    if (R <= 0) continue;
    const i0 = Math.max(0, Math.floor((px - R - x0) / cell)), i1 = Math.min(res - 1, Math.ceil((px + R - x0) / cell));
    const j0 = Math.max(0, Math.floor((pz - R - z0) / cell)), j1 = Math.min(res - 1, Math.ceil((pz + R - z0) / cell));
    for (let j = j0; j <= j1; j++) {
      const z = z0 + j * cell - pz;
      for (let i = i0; i <= i1; i++) {
        const x = x0 + i * cell - px;
        const d = Math.sqrt(x * x + z * z);
        if (d < R) visit(j * res + i, d, s, x + px, z + pz);
      }
    }
  }
}

export function shapeTerrain(track, T) {
  const g = grid(T);
  const H = new Float32Array(g.N);
  for (let j = 0; j < g.res; j++) for (let i = 0; i < g.res; i++) H[j * g.res + i] = base(g.x0 + i * g.cell, g.z0 + j * g.cell, T);
  const { H: L, halfW, wall, chasm } = track;
  sweep(track, g, 3, (s, w) => (wall[s] ? w + 90 : 0), (k, d, s, wx, wz) => {
    const top = L[s * 3 + 1] + wall[s] * (0.8 + 0.45 * fbm(wx / 45, wz / 45, 3, 21));
    const v = top * smoothstep(halfW[s] + 90, halfW[s] + 24, d) + H[k] * (1 - smoothstep(halfW[s] + 90, halfW[s] + 24, d));
    if (v > H[k]) H[k] = v;
  });
  sweep(track, g, 3, (s, w) => (chasm[s] ? w + 60 : 0), (k, d, s, wx, wz) => {
    const floor = L[s * 3 + 1] - chasm[s] * (0.85 + 0.3 * fbm(wx / 30, wz / 30, 2, 31));
    const t = smoothstep(halfW[s] + 60, halfW[s] + 8, d);
    const v = H[k] + (Math.min(H[k], floor) - H[k]) * t;
    if (v < H[k]) H[k] = v;
  });
  return H;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function erode(H, res, cell, drops, seed = 7) {
  const rand = rng(seed);
  const h = new Float32Array(H.length);
  for (let k = 0; k < H.length; k++) h[k] = H[k] / cell;
  const R = 3;
  const brushI = [], brushW = [];
  let wsum = 0;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, y);
    if (d <= R) { brushI.push([x, y]); brushW.push(1 - d / R); wsum += 1 - d / R; }
  }
  for (let i = 0; i < brushW.length; i++) brushW[i] /= wsum;
  const inertia = 0.05, capacityK = 4, minSlope = 0.01, depositK = 0.3, erodeK = 0.3, evap = 0.012, gravity = 4, life = 40;
  const sample = (x, y) => {
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * res + i;
    const a = h[k], b = h[k + 1], c = h[k + res], d = h[k + res + 1];
    return { hgt: a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v, gx: (b - a) * (1 - v) + (d - c) * v, gy: (c - a) * (1 - u) + (d - b) * u };
  };
  for (let n = 0; n < drops; n++) {
    let x = 1 + rand() * (res - 3), y = 1 + rand() * (res - 3);
    let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
    for (let t = 0; t < life; t++) {
      const i = x | 0, j = y | 0, u = x - i, v = y - j;
      const s0 = sample(x, y);
      dx = dx * inertia - s0.gx * (1 - inertia);
      dy = dy * inertia - s0.gy * (1 - inertia);
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) break;
      dx /= len; dy /= len;
      x += dx; y += dy;
      if (x < 1 || y < 1 || x >= res - 2 || y >= res - 2) break;
      const dh = sample(x, y).hgt - s0.hgt;
      const cap = Math.max(-dh, minSlope) * speed * water * capacityK;
      const k = j * res + i;
      if (sed > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depositK;
        sed -= amt;
        h[k] += amt * (1 - u) * (1 - v); h[k + 1] += amt * u * (1 - v);
        h[k + res] += amt * (1 - u) * v; h[k + res + 1] += amt * u * v;
      } else {
        const amt = Math.min((cap - sed) * erodeK, -dh);
        for (let b = 0; b < brushI.length; b++) {
          const bi = i + brushI[b][0], bj = j + brushI[b][1];
          if (bi < 0 || bj < 0 || bi >= res || bj >= res) continue;
          const bk = bj * res + bi;
          h[bk] -= amt * brushW[b];
          sed += amt * brushW[b];
        }
      }
      speed = Math.sqrt(Math.max(0, speed * speed + dh * gravity));
      water *= 1 - evap;
    }
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let j = 1; j < res - 1; j++) for (let i = 1; i < res - 1; i++) {
      const k = j * res + i;
      let mx = -Infinity, mn = Infinity, sum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const v = h[k + dj * res + di];
        if (v > mx) mx = v; if (v < mn) mn = v; sum += v;
      }
      const lim = 0.25;
      if (h[k] > mx + lim) h[k] = (mx + lim + sum / 8) * 0.5;
      else if (h[k] < mn - lim) h[k] = (mn - lim + sum / 8) * 0.5;
    }
  }
  const tmp = new Float32Array(h.length);
  for (let pass = 0; pass < 3; pass++) {
    tmp.set(h);
    for (let j = 1; j < res - 1; j++) for (let i = 1; i < res - 1; i++) {
      const k = j * res + i;
      const gx = (tmp[k + 1] - tmp[k - 1]) * 0.5, gz = (tmp[k + res] - tmp[k - res]) * 0.5;
      const slope = Math.hypot(gx, gz);
      const w = 0.75 * Math.min(1, Math.max(0, (2.6 - slope) / 1.8));
      if (w <= 0) continue;
      const avg = (tmp[k - 1] + tmp[k + 1] + tmp[k - res] + tmp[k + res]) * 0.125 + (tmp[k - res - 1] + tmp[k - res + 1] + tmp[k + res - 1] + tmp[k + res + 1]) * 0.0625 + tmp[k] * 0.25;
      h[k] += (avg - h[k]) * w;
    }
  }
  for (let k = 0; k < H.length; k++) H[k] = h[k] * cell;
  return H;
}

export const RAISE = 14;
const RUN_SINK = 0.2, ROAD_SINK = 0.6, FILL = 8;

export function buildTerrain(track, shaped, T) {
  const g = grid(T);
  const { res, cell, x0, z0, N, size } = g;
  const H = shaped ? Float32Array.from(shaped) : shapeTerrain(track, T);
  if (T.pad) {
    const [hw, za, zb] = T.pad;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = x0 + i * cell, z = z0 + j * cell;
      const pad = smoothstep(hw, hw - 20, Math.abs(x)) * smoothstep(za, za + 30, z) * smoothstep(zb, zb - 40, z);
      if (pad > 0) H[j * res + i] += (RUNWAY_Y - H[j * res + i]) * pad;
    }
  }
  const { P, T: TT, U, R, halfW, gap, wall, wallL, wallR } = track;
  const ceil = new Float32Array(N).fill(1e9), floor = new Float32Array(N).fill(-1e9), pin = new Float32Array(N), pinD = new Float32Array(N).fill(Infinity);
  const low = new Float32Array(track.n);
  for (let s = 0; s < track.n; s++) {
    const k = s * 3, w = halfW[s];
    const edge = Math.abs(R[k + 1]) * w;
    low[s] = gap[s] ? P[k + 1] - 4 : Math.min(P[k + 1], P[k + 1] + U[k + 1] * 2.2) - edge - 0.35;
  }
  const [cutSlope, cutReach] = T.cut || [1.4, 70];
  sweep(track, g, 1, (s) => Math.max(wallL[s], wallR[s]) + cutReach, (k, d, s, x, z) => {
    const k3 = s * 3, lat = (x - P[k3]) * R[k3] + (z - P[k3 + 2]) * R[k3 + 2], w = lat < 0 ? wallL[s] : wallR[s];
    const slope = wall[s] ? 7 : cutSlope;
    const a = Math.abs(lat), under = a <= halfW[s];
    if (!gap[s] && U[k3 + 1] > 0.9 && w > halfW[s] && a < w + 2 * cell && Math.abs((x - P[k3]) * TT[k3] + (z - P[k3 + 2]) * TT[k3 + 2]) < 0.75 + Math.abs(track.curv[s] * lat)) {
      if (a < pinD[k]) { pinD[k] = a; pin[k] = P[k3 + 1] + R[k3 + 1] * lat - (under ? ROAD_SINK : RUN_SINK); }
      return;
    }
    const c = low[s] + slope * Math.max(0, d - w - 1);
    if (c < ceil[k]) ceil[k] = c;
    if (!gap[s] && U[k3 + 1] > 0.97 && d < w + 30) {
      const f = P[k3 + 1] - 0.3 - 0.9 * Math.max(0, d - w - 2);
      if (f > floor[k]) floor[k] = f;
    }
  });
  for (const { from, to } of track.airs ?? []) {
    const a = from * 3, b = to * 3, dx = P[b] - P[a], dz = P[b + 2] - P[a + 2], len2 = dx * dx + dz * dz;
    const i0 = Math.max(0, Math.floor((Math.min(P[a], P[b]) - BASIN_REACH - x0) / cell)), i1 = Math.min(res - 1, Math.ceil((Math.max(P[a], P[b]) + BASIN_REACH - x0) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(P[a + 2], P[b + 2]) - BASIN_REACH - z0) / cell)), j1 = Math.min(res - 1, Math.ceil((Math.max(P[a + 2], P[b + 2]) + BASIN_REACH - z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + i * cell - P[a], pz = z0 + j * cell - P[a + 2];
      const u = Math.max(0, Math.min(1, (px * dx + pz * dz) / len2));
      const d = Math.hypot(px - dx * u, pz - dz * u);
      if (d > BASIN_REACH) continue;
      const k = j * res + i;
      const c = Math.max(P[a + 1] + (P[b + 1] - P[a + 1]) * u - BASIN + 0.5 * Math.max(0, d - BASIN_REACH / 2), floor[k]);
      if (c < ceil[k]) ceil[k] = c;
    }
  }
  for (let k = 0; k < N; k++) {
    if (floor[k] > H[k] && floor[k] - H[k] < RAISE) H[k] = floor[k];
    const fill = pin[k] - H[k];
    if (ceil[k] < H[k]) H[k] = ceil[k];
    if (pinD[k] < Infinity && fill < FILL) H[k] = pin[k];
  }
  const height = (x, z) => {
    let fx = (x - x0) / cell, fz = (z - z0) / cell;
    if (fx < 0) fx = 0; else if (fx > res - 1.001) fx = res - 1.001;
    if (fz < 0) fz = 0; else if (fz > res - 1.001) fz = res - 1.001;
    const i = Math.floor(fx), j = Math.floor(fz);
    fx -= i; fz -= j;
    const k = j * res + i;
    const h00 = H[k], h10 = H[k + 1], h01 = H[k + res], h11 = H[k + res + 1];
    return fx >= fz
      ? h00 + (h10 - h00) * fx + (h11 - h10) * fz
      : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  };
  return { H, res, cell, x0, z0, size, height };
}
