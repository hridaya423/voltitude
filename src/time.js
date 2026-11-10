export function fmt(ticks) {
  const ms = Math.round(ticks * 1000 / 120);
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}

export function fmtDelta(ticks) {
  const s = Math.abs(ticks) / 120;
  return `${ticks < 0 ? '−' : '+'}${s.toFixed(3)}`;
}

export function lapReview(splits, per) {
  const laps = Math.floor(splits.length / per), best = new Array(per).fill(Infinity);
  const at = (l, j) => splits[l * per + j] - (l * per + j ? splits[l * per + j - 1] : 0);
  for (let l = 0; l < laps; l++) for (let j = l ? 0 : 1; j < per; j++) best[j] = Math.min(best[j], at(l, j));
  if (laps < 2) return { ideal: 0, worst: null };
  let worst = null;
  for (let l = 0; l < laps; l++) for (let j = l ? 0 : 1; j < per; j++) if (!worst || at(l, j) - best[j] > worst.loss) worst = { lap: l + 1, sector: j + 1, loss: at(l, j) - best[j] };
  return { ideal: best.reduce((a, b) => a + b, 0), worst };
}
