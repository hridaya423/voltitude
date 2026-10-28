export const GAIN = Object.freeze({
  near_miss: 0.12,
  clean: 0.08,
  perfect: 0.15,
  trick: 0.04,
  air: 0.03,
  wall: 0.05,
  draft: 0.04,
  gate: 0.25,
});

const EVERY = 60;

export function earn(race, e, source, amount) {
  e.car.gas = Math.min(1, e.car.gas + amount);
  e.earned[source] = (e.earned[source] || 0) + amount;
  if (e !== race) return;
  const p = (race.gasPending[source] ||= { amount: 0, last: -EVERY });
  p.amount += amount;
  if (race.tick - p.last >= EVERY) flushGain(race, source, p);
}

function flushGain(race, source, p) {
  race.events.push({ type: 'gas_gain', tick: race.tick, source, amount: p.amount });
  p.amount = 0;
  p.last = race.tick;
}

export function flushGains(race) {
  for (const source in race.gasPending) {
    const p = race.gasPending[source];
    if (p.amount > 0 && race.tick - p.last >= EVERY) flushGain(race, source, p);
  }
}

export function landingGain(race, e, ev) {
  if (ev.quality === 'hard') return;
  earn(race, e, ev.quality, GAIN[ev.quality]);
  earn(race, e, 'air', GAIN.air * ev.air);
  if (ev.tricks.length) earn(race, e, 'trick', GAIN.trick * ev.tricks.length);
}
