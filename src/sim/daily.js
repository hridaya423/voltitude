export const LAUNCH_DAY = '2026-11-09';

export const DAILIES = Object.freeze([
  { venue: 'pad', event: 'lineup', title: 'Opening night on The Pad' },
  { venue: 'airfield', event: 'hl', title: 'One lap of the lakebed' },
  { venue: 'pad', event: 'ramp', title: 'The reveal curl' },
  { venue: 'proving', event: 'hl', title: 'Loop and leap' },
  { venue: 'launch', event: 'trench', title: 'Upside down in the trench' },
  { venue: 'launch', event: 'hl', title: 'The tank farm wall' },
  { venue: 'pad', event: 'lineup', title: 'Lineup rematch' },
]);

const ROTATION = [['pad', 'lineup'], ['proving', 'hl'], ['launch', 'trench'], ['airfield', 'hl'], ['pad', 'ramp'], ['launch', 'hl'], ['pad', 'hl']];
const DAY_MS = 86400000;

export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
export const dayIndex = (day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${LAUNCH_DAY}T00:00:00Z`)) / DAY_MS);

export function dailyFor(day) {
  const k = dayIndex(day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(k)) return null;
  const authored = k >= 0 && k < DAILIES.length ? DAILIES[k] : null;
  const [venue, event] = authored ? [authored.venue, authored.event] : ROTATION[((k % ROTATION.length) + ROTATION.length) % ROTATION.length];
  return { day, venue, event, title: authored?.title || '' };
}
