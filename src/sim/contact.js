const OFFSETS = [1.35, 0, -1.35];
const RADIUS = 1.05;
const REACH = 2 * RADIUS;
const RESTITUTION = 0.2;
const YAW = 0.012;
const MAX_PUSH = 0.35;

function yaw(c, a) {
  const k = Math.max(-0.05, Math.min(0.05, a)), ca = Math.cos(k), sa = Math.sin(k);
  const fx = c.fx * ca + c.rx * sa, fy = c.fy * ca + c.ry * sa, fz = c.fz * ca + c.rz * sa;
  c.rx = c.rx * ca - c.fx * sa; c.ry = c.ry * ca - c.fy * sa; c.rz = c.rz * ca - c.fz * sa;
  c.fx = fx; c.fy = fy; c.fz = fz;
}

export function contactPair(a, b, out) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  if (dx * dx + dz * dz > 36 || Math.abs(dy) > 2.2) return false;
  let best = 0, ia = 0, ib = 0, nx = 0, ny = 0, nz = 0;
  for (let p = 0; p < 3; p++) {
    const ax = a.x + a.fx * OFFSETS[p], ay = a.y + a.fy * OFFSETS[p], az = a.z + a.fz * OFFSETS[p];
    for (let q = 0; q < 3; q++) {
      const ex = b.x + b.fx * OFFSETS[q] - ax, ey = b.y + b.fy * OFFSETS[q] - ay, ez = b.z + b.fz * OFFSETS[q] - az;
      const d = Math.hypot(ex, ey, ez), pen = REACH - d;
      if (pen > best) { best = pen; ia = p; ib = q; nx = ex / (d || 1); ny = ey / (d || 1); nz = ez / (d || 1); }
    }
  }
  if (best <= 0) return false;
  const k = nx * a.ux + ny * a.uy + nz * a.uz;
  nx -= a.ux * k; ny -= a.uy * k; nz -= a.uz * k;
  const l = Math.hypot(nx, ny, nz) || 1;
  out.nx = nx / l; out.ny = ny / l; out.nz = nz / l; out.pen = best; out.ia = ia; out.ib = ib;
  return true;
}

export function clearance(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  if (dx * dx + dz * dz > 100 || Math.abs(dy) > 2.2) return Infinity;
  let d = Infinity;
  for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) {
    d = Math.min(d, Math.hypot(dx + b.fx * OFFSETS[q] - a.fx * OFFSETS[p], dy + b.fy * OFFSETS[q] - a.fy * OFFSETS[p], dz + b.fz * OFFSETS[q] - a.fz * OFFSETS[p]));
  }
  return d - REACH;
}

const hit = { nx: 0, ny: 0, nz: 0, pen: 0, ia: 0, ib: 0 };

export function resolveContacts(entries, onContact) {
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].car, b = entries[j].car;
      if (!contactPair(a, b, hit)) continue;
      const { nx, ny, nz, pen } = hit;
      const push = Math.min(pen, MAX_PUSH) * 0.5;
      a.x -= nx * push; a.y -= ny * push; a.z -= nz * push;
      b.x += nx * push; b.y += ny * push; b.z += nz * push;
      const rx = b.vx - a.vx, ry = b.vy - a.vy, rz = b.vz - a.vz;
      const vn = rx * nx + ry * ny + rz * nz;
      if (vn >= 0) continue;
      const jn = (-(1 + RESTITUTION) * vn) / 2;
      a.vx -= nx * jn; a.vy -= ny * jn; a.vz -= nz * jn;
      b.vx += nx * jn; b.vy += ny * jn; b.vz += nz * jn;
      const tx = rx - nx * vn, ty = ry - ny * vn, tz = rz - nz * vn, tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-6) {
        const jt = Math.min(tl / 2, jn * 0.25) / tl;
        a.vx += tx * jt; a.vy += ty * jt; a.vz += tz * jt;
        b.vx -= tx * jt; b.vy -= ty * jt; b.vz -= tz * jt;
      }
      if (a.mode !== 0) yaw(a, YAW * OFFSETS[hit.ia] * (-jn) * (nx * a.rx + ny * a.ry + nz * a.rz));
      if (b.mode !== 0) yaw(b, YAW * OFFSETS[hit.ib] * jn * (nx * b.rx + ny * b.ry + nz * b.rz));
      onContact?.(i, j, -vn);
    }
  }
}
