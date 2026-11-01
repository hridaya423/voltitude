export const LINEUP = Object.freeze([
  { kind: 'hatch', len: 4.4, h: 1.5 },
  { kind: 'robotaxi', len: 4.2, h: 1.5 },
  { kind: 'pickup', len: 5.6, h: 1.9 },
  { kind: 'van', len: 5.4, h: 2.3 },
  { kind: 'semi', len: 7.2, h: 4.0 },
]);
export const HALF_W = 1.1;
export const NEAR_GAP = 0.6;

const PTS = [];
for (const a of [-2.2, 0, 2.2]) for (const b of [-0.95, 0.95]) for (const u of [-0.55, 0.6]) PTS.push([a, b, u]);

export function lineupBoxes(track, count) {
  const { i0, pitch } = track.lineup;
  return Array.from({ length: count }, (_, k) => {
    const v = LINEUP[k % LINEUP.length], s0 = i0 + Math.round(k * pitch);
    return { k, kind: v.kind, s0, s1: s0 + v.len, h: v.h };
  });
}

export function lineupHit(c, track, boxes) {
  const { H, P, T, R, U } = track, j = c.hint * 3;
  let near = -1, gap = Infinity;
  for (const [a, b, u] of PTS) {
    const x = c.x + c.fx * a + c.rx * b + c.ux * u - P[j], y = c.y + c.fy * a + c.ry * b + c.uy * u - P[j + 1], z = c.z + c.fz * a + c.rz * b + c.uz * u - P[j + 2];
    const s = c.hint + x * T[j] + y * T[j + 1] + z * T[j + 2];
    const lat = x * R[j] + y * R[j + 1] + z * R[j + 2], up = x * U[j] + y * U[j + 1] + z * U[j + 2];
    if (Math.abs(lat) > HALF_W) continue;
    for (const bx of boxes) {
      if (s < bx.s0 || s > bx.s1) continue;
      if (up <= bx.h) return { clip: bx.k };
      if (up - bx.h < gap) { gap = up - bx.h; near = bx.k; }
    }
  }
  return gap < NEAR_GAP ? { near, gap } : null;
}
