const D = Math.PI / 180;

export function turtle(x, z, h, y, w, steps) {
  const nodes = [];
  for (const [len, turn = 0, y1 = y, flags = null, bank = 0] of steps) {
    if (flags) nodes[nodes.length - 1][5] = { ...nodes[nodes.length - 1][5], ...flags };
    const n = turn ? Math.max(2, Math.ceil(Math.abs(turn) / 8)) : 1;
    for (let k = 0; k < n; k++) {
      h += turn / n / 2;
      x += (Math.sin(h * D) * len) / n; z += (Math.cos(h * D) * len) / n;
      h += turn / n / 2;
      nodes.push([+x.toFixed(2), +z.toFixed(2), +(y + ((y1 - y) * (k + 1)) / n).toFixed(2), bank, w, null]);
    }
    y = y1;
  }
  return nodes;
}

export const arc = (r, deg) => (r * Math.abs(deg) * D);
