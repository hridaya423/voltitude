export function fmt(ticks) {
  const ms = Math.round(ticks * 1000 / 120);
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}

export function fmtDelta(ticks) {
  const s = Math.abs(ticks) / 120;
  return `${ticks < 0 ? '−' : '+'}${s.toFixed(3)}`;
}
