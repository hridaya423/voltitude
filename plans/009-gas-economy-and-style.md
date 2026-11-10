# Plan 009: Retune the gas economy and add a style score

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/gas.js src/sim/race.js src/main.js tests/racing.test.js tools/gas-econ.mjs src/style.js`
> Earlier plans edit `src/sim/race.js` and `src/main.js`. That is expected. `src/sim/gas.js` must be unchanged, and `tools/gas-econ.mjs` and `src/style.js` must not exist. Compare the "Current state" excerpts against the live code. On a mismatch in the excerpts themselves, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M (seven constants, a measuring tool, one new pure module, results wiring)
- **Risk**: MED (changes the deterministic sim and the rival AI's gas, so the version bumps and the author ghosts are re-baked)
- **Depends on**: `plans/002-sim-rules-batch.md` (it changes what a landing and a wall hit cost; this plan tunes income on top)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The car's signature is its thrusters, and the player almost never gets to fire them. A full tank is 4 seconds of boost. The rival AI, driving a clean lap, earns between 0.21 and 1.19 tanks a lap depending on the venue. That is 0.8 to 4.8 seconds of boost in a lap of 38 to 80 seconds: 2% to 6% of the time. A roll in the air pays 0.04 of a tank, a perfect landing 0.15, so outside the dares a trick is not worth its risk. This plan raises what stunts, walls, drafting and near misses pay, measures the result with a tool that stays in the repo, and adds a style score to circuit results so that tricks count for something even when they do not fill the tank.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation shared by the browser, the node tests and the Cloudflare Worker in `server/`. A recorded run stores inputs only and is replayed through the sim. **Any behaviour change breaks every stored run**, which is why `SIM_VERSION` in `src/sim/race.js` exists. Changing a gas amount is a behaviour change.
- Gas is a number from 0 to 1 on each car. Boost burns a full tank in `TUNING.burn` seconds (4, in `src/sim/drive.js`). This plan does not change the burn rate.
- Rivals run through the same code and earn the same gas. More income makes them faster too.
- `earn(race, e, source, amount)` (`src/sim/gas.js`) adds gas and records it in `e.earned[source]`. For the player it also emits a `gas_gain` event, at most once every 60 ticks per source, carrying the amount gathered since the last one.
- The sources: `near_miss` (passing a rival within 1 m), `clean` and `perfect` (landing quality), `trick` (per flip, roll or spin landed), `air` (per second airborne, paid on landing), `wall` (per second with the fans holding the car on a banked or vertical surface above 30 m/s), `draft` (per second in a rival's tow), `gate` (a ring gate on the course).
- A `land` event carries `quality` (`perfect`, `clean`, `hard`), `air` in seconds, and `tricks`, an array with one name per rotation.
- `handleEvents` in `src/main.js` reads the sim's events every tick. `finishCircuit` builds circuit results. `save` is the player's stored progress and `persist()` writes it.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.
- The owner asked that heavy commands stay off the MacBook. `npm test`, `tools/medals.mjs`, `tools/exploits.mjs`, `tools/ai-bench.mjs` and `tools/gas-econ.mjs` each run for seconds to minutes on all cores. If the operator gave you a remote machine, run them there.

## Current state

Line numbers are from commit `9ee19cc`.

**The amounts.** `src/sim/gas.js:1-10`:

```js
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
```

**Tests that pin amounts.** `tests/racing.test.js:147-176`:

```js
test('gas: a near miss pays the player 0.12', () => {
  const near = pass(2.8, 42, 0.5);
  assert.equal(near.length, 1);
  assert.ok(Math.abs(near.race.car.gas - 0.62) < 1e-9, `gas ${near.race.car.gas}`);
  assert.deepEqual(near.race.earned, { near_miss: 0.12 });
  assert.deepEqual(near.gains.map((e) => [e.source, e.amount]), [['near_miss', 0.12]]);
});

test('gas: a perfect landing after 1.5 s of air pays 0.15 plus 0.03 per second', () => {
  ...
  assert.equal(race.earned.perfect, 0.15);
  assert.ok(Math.abs(race.earned.air - 0.03 * land.air) < 1e-9);
  assert.ok(Math.abs(total(race.earned) - 0.195) < 0.005, `${total(race.earned)}`);
...
test('gas: a rival earns from a near miss too', () => {
  const near = pass(2.8, 42, 0.5);
  assert.ok(near.rival.earned.near_miss > 0);
  assert.ok(Math.abs(near.rival.car.gas - 0.62) < 1e-9);
});
```

**Counters that are written and never read.** `src/main.js:236`, `:726`, `:779`:

```js
let usage = { boost: 0, air: 0, roll: 0 };
...
        if (e.tricks.length) usage.roll++;
...
    if (simIn.boost) usage.boost++;
```

**The event loop.** `src/main.js:655-657`:

```js
function handleEvents() {
  for (const e of race.events) {
    switch (e.type) {
```

**Circuit results.** `finishCircuit` in `src/main.js` ends with `showResults({ ..., stats: [{ label: 'Top speed', ... }, { label: 'Best lap', ... }, { label: 'Resets', ... }], ... })`. Plan 007 may have added an `Ideal lap` stat. The results screen spreads any number of stats across its width.

**What the advisor measured at `9ee19cc`**, with the tool from step 1. The driver is the rival AI at full pace, three laps, tank full at the start.

| Venue | Event | Lap | Tanks earned per lap | Share of the lap spent boosting |
|---|---|---|---|---|
| Proving Ground | Time Trial | 80.3 s | 1.19 | 5.5% |
| Proving Ground | Grand Prix | 85.5 s | 1.16 | 4.7% |
| Airfield | Time Trial | 78.3 s | 0.36 | 2.6% |
| Airfield | Grand Prix | 83.9 s | 0.54 | 3.3% |
| Launch Complex | Time Trial | 69.3 s | 0.53 | 3.9% |
| Launch Complex | Grand Prix | 72.5 s | 0.76 | 5.0% |
| The Pad | Time Trial | 37.8 s | 0.21 | 5.2% |
| The Pad | Grand Prix | 41.6 s | 0.26 | 3.9% |

With the amounts of step 3 applied to the same commit:

| Venue | Time Trial tanks per lap | Grand Prix tanks per lap |
|---|---|---|
| Proving Ground | 1.63 | 1.79 |
| Airfield | 0.47 | 0.84 |
| Launch Complex | 0.88 | 1.38 |
| The Pad | 0.32 | 0.55 |

The author Time Trial times moved by less than 1% (Proving Ground 238.358 s to 238.200 s, The Pad 112.550 s to 111.650 s). Three tests failed, the three quoted above. The exploit patterns passed on all four venues. `node tools/ai-bench.mjs 5 proving` passed on every tier, with the elite lap ratio at 0.954 against a floor of 0.95 (it was 0.963 before).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Gas table (after step 1) | `node tools/gas-econ.mjs [venue]` | a table, then one JSON line |
| Exploit patterns | `node tools/exploits.mjs <venue>` | last line `PASS` |
| AI bench | `node tools/ai-bench.mjs 5 <venue>` | one JSON line and `<tier>: PASS` per tier |
| Re-bake author ghosts | `node tools/medals.mjs all` | one line per event, no throw |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**:
- `tools/gas-econ.mjs` (create)
- `src/sim/gas.js` (the `GAIN` table only)
- `src/sim/race.js` (`SIM_VERSION` only)
- `src/style.js` (create), `tests/style.test.js` (create)
- `src/main.js` (remove `usage`, accumulate the style score, show and store it)
- `tests/racing.test.js` (the three tests quoted above)
- `assets/ghosts/*.json` (rewritten by `tools/medals.mjs`, never by hand)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `TUNING.burn`, `TUNING.thrustG`, the hop and lift costs in `src/sim/drive.js`. A longer or stronger boost changes top speed and every lap time.
- `GAIN.gate`. Gates already pay the most of any source.
- The `NEAR` and `DRAFT` distances in `src/sim/race.js`.
- Any passive refill. The owner decided against it: gas is earned.
- `src/sim/driver.js`, `src/sim/bot.js`, `src/sim/line.js`. If the AI bench fails, stop.
- `server/`. The Worker needs a redeploy after this plan. The owner does that.

## Git workflow

- Branch: `advisor/009-gas-economy-and-style` from the branch that holds plan 002.
- One commit per step, for example `feat(gas): stunts, walls and drafting pay more`. The ghost re-bake is its own commit: `chore(ghosts): re-bake author runs for sim <N>`.
- Do NOT push. Do NOT run `wrangler`.

## Steps

### Step 1: Add the measuring tool and record the baseline

Create `tools/gas-econ.mjs` with exactly this content:

```js
import { loadWorld } from './load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const rows = [];
for (const id of process.argv[2] ? [process.argv[2]] : Object.keys(VENUES)) {
  const world = loadWorld(id);
  for (const kind of ['tt', 'gp']) {
    const race = createRace(world, { event: eventsFor(world.track, world.venue).find((e) => e.id === kind), seed: 3 }), inp = createInput();
    let n = 0, boost = 0, dry = 0;
    while (race.phase !== 'finished' && race.tick < 120 * 400) {
      botInput(race, inp, 1);
      stepRace(race, inp);
      race.events.length = 0;
      if (race.phase !== 'racing') continue;
      n++; if (race.car.boosting) boost++; if (race.car.gas < 0.02) dry++;
    }
    const laps = race.laps.length, total = Object.values(race.earned).reduce((a, b) => a + b, 0);
    rows.push({ venue: id, event: kind, lapS: +(n / 120 / laps).toFixed(1), tanksPerLap: +(total / laps).toFixed(2), boostPct: +(100 * boost / n).toFixed(1), dryPct: +(100 * dry / n).toFixed(1), ...Object.fromEntries(Object.entries(race.earned).map(([k, v]) => [k, +(v / laps).toFixed(2)])) });
  }
}
console.table(rows);
console.log(JSON.stringify(rows.map((r) => [r.venue, r.event, r.tanksPerLap])));
```

Then record every baseline:

```sh
mkdir -p /tmp/plan009
npm test > /tmp/plan009/test-before.txt 2>&1; echo "tests exit $?"
node tools/gas-econ.mjs | tee /tmp/plan009/gas-before.txt | tail -1
for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -1; done
node tools/ai-bench.mjs 5 proving > /tmp/plan009/bench-before.txt 2>&1; grep ": PASS\|: FAIL" /tmp/plan009/bench-before.txt
grep -n "SIM_VERSION = " src/sim/race.js
```

**Verify**: tests exit 0. The gas table's last line is close to `[["proving","tt",1.19],["proving","gp",1.16],["airfield","tt",0.36],["airfield","gp",0.54],["launch","tt",0.53],["launch","gp",0.76],["pad","tt",0.21],["pad","gp",0.26]]`. Earlier plans move these a little. Four `PASS` from the exploits. Three `PASS` lines from the bench. Call the current `SIM_VERSION` `N`.

### Step 2: Bump the version

Raise `SIM_VERSION` in `src/sim/race.js` to `N + 1`. Run `npm test 2>&1 | grep "✖" > /tmp/plan009/after-bump.txt` and keep the list.

**Verify**: `grep -n "SIM_VERSION = " src/sim/race.js` → `N + 1`.

### Step 3: The new amounts

Update the three tests in `tests/racing.test.js` first:

```js
test('gas: a near miss pays the player 0.2', () => {
  const near = pass(2.8, 42, 0.5);
  assert.equal(near.length, 1);
  assert.ok(Math.abs(near.race.car.gas - 0.7) < 1e-9, `gas ${near.race.car.gas}`);
  assert.deepEqual(near.race.earned, { near_miss: 0.2 });
  assert.deepEqual(near.gains.map((e) => [e.source, e.amount]), [['near_miss', 0.2]]);
});

test('gas: a perfect landing after 1.5 s of air pays 0.2 plus 0.06 per second', () => {
  const { race, events, land } = drop(10.6, true);
  assert.equal(land?.quality, 'perfect');
  assert.ok(Math.abs(land.air - 1.5) < 0.1, `air ${land.air}`);
  assert.equal(race.earned.perfect, 0.2);
  assert.ok(Math.abs(race.earned.air - 0.06 * land.air) < 1e-9);
  assert.ok(Math.abs(total(race.earned) - 0.29) < 0.01, `${total(race.earned)}`);
  const gains = events.filter((e) => e.type === 'gas_gain').map((e) => e.source).sort();
  assert.deepEqual(gains, ['air', 'perfect']);
});
```

and in `'gas: a rival earns from a near miss too'` change `0.62` to `0.7`.

**Verify**: `node --test tests/racing.test.js 2>&1 | grep "✖"` → these three fail (others may be in `/tmp/plan009/after-bump.txt`).

Then set the table in `src/sim/gas.js`:

```js
export const GAIN = Object.freeze({
  near_miss: 0.2,
  clean: 0.1,
  perfect: 0.2,
  trick: 0.12,
  air: 0.06,
  wall: 0.08,
  draft: 0.1,
  gate: 0.25,
});
```

| Source | Was | Now | Why |
|---|---|---|---|
| `trick` | 0.04 | 0.12 | A roll now buys half a second of boost. It bought a sixth. |
| `air` | 0.03 per second | 0.06 | Long jumps pay for the gas the hover costs. |
| `wall` | 0.05 per second | 0.08 | Riding a wall is the car's other signature. |
| `draft` | 0.04 per second | 0.10 | Following closely is the main source in a race on a flat track. |
| `near_miss` | 0.12 | 0.20 | Rare (0.04 tanks a lap for the AI) and risky. |
| `perfect` | 0.15 | 0.20 | |
| `clean` | 0.08 | 0.10 | Stays half of a perfect landing. |

**Verify**: `node --test tests/racing.test.js 2>&1 | grep "✖"` → only tests from `/tmp/plan009/after-bump.txt` remain.

**Verify**: `node tools/gas-econ.mjs | tee /tmp/plan009/gas-after.txt | tail -1` → compare with `/tmp/plan009/gas-before.txt`. Every one of the eight `tanksPerLap` numbers rose, by between 20% and 130%. On `9ee19cc` the line is `[["proving","tt",1.63],["proving","gp",1.79],["airfield","tt",0.47],["airfield","gp",0.84],["launch","tt",0.88],["launch","gp",1.38],["pad","tt",0.32],["pad","gp",0.55]]`. A number that fell, or that rose by more than 130%, is a STOP condition.

### Step 4: Re-bake and run the sim gates

1. `node tools/medals.mjs all` → one line per event, `respawns 0`. Author Time Trial totals move by less than 2% against the values before the re-bake. A larger move is a STOP condition.
2. `npm test` → exit 0. Every test from `/tmp/plan009/after-bump.txt` is green again.
3. `npm run test:server` → exit 0.
4. `for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -1; done` → `PASS` four times. The patterns check that no lap goes under 0.9 times the author's and that boost time stays inside the gas budget, so they are the guard against the new income being farmed.
5. `node tools/ai-bench.mjs 5 proving | grep ": PASS\|: FAIL"` → three `PASS`. Then `node tools/ai-bench.mjs 5 launch` → no check fails that passed before this plan (the Launch bench has a known failing `air` check at `9ee19cc`).

### Step 5: The style score, as a pure function with a test

Create `tests/style.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stylePoints } from '../src/style.js';
import { GAIN } from '../src/sim/gas.js';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

test('tricks, air and a perfect landing make the score; a hard landing scores nothing', () => {
  assert.equal(stylePoints({ type: 'land', quality: 'perfect', air: 2, tricks: ['flip', 'roll'] }), 360);
  assert.equal(stylePoints({ type: 'land', quality: 'clean', air: 1, tricks: [] }), 20);
  assert.equal(stylePoints({ type: 'land', quality: 'hard', air: 3, tricks: ['flip'] }), 0);
});

test('a near miss scores 75, and wall and draft time score 25 a second', () => {
  assert.equal(stylePoints({ type: 'near_miss' }), 75);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'wall', amount: GAIN.wall * 2 }), 50);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'draft', amount: GAIN.draft * 0.5 }), 13);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'perfect', amount: GAIN.perfect }), 0);
  assert.equal(stylePoints({ type: 'check' }), 0);
});

test('the same run always scores the same, and a bot lap of the Proving Ground scores something', () => {
  const world = loadWorld('proving'), ev = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
  const run = () => {
    const race = createRace(world, { event: ev }), inp = createInput();
    let s = 0;
    while (race.laps.length < 1 && race.tick < 120 * 200) { botInput(race, inp, 1); stepRace(race, inp); for (const e of race.events) s += stylePoints(e); race.events.length = 0; }
    return s;
  };
  const a = run();
  assert.ok(a > 100, `style ${a}`);
  assert.equal(run(), a);
});
```

**Verify**: `node --test tests/style.test.js` → fails on the missing module.

Create `src/style.js`:

```js
import { GAIN } from './sim/gas.js';

export function stylePoints(e) {
  if (e.type === 'land') return e.quality === 'hard' ? 0 : Math.round((e.tricks.length * 100 + e.air * 20) * (e.quality === 'perfect' ? 1.5 : 1));
  if (e.type === 'near_miss') return 75;
  if (e.type === 'gas_gain' && (e.source === 'wall' || e.source === 'draft')) return Math.round((e.amount / GAIN[e.source]) * 25);
  return 0;
}
```

The wall and draft points come from the `gas_gain` event, whose amount divided by the per-second rate is the time spent. So the points do not change when the gas amounts are tuned.

**Verify**: `node --test tests/style.test.js` → 3 pass. The advisor ran this file on `9ee19cc`, with the old amounts and with the new ones: 3 pass both times. One bot lap of the Proving Ground scored 273 with the old amounts and 283 with the new ones (the faster lap changes the air time a little). A three-lap bot Time Trial scored 863.

### Step 6: Count it, show it, keep the best

In `src/main.js`:

1. Add `import { stylePoints } from './style.js';` below the `./hud.js` import.
2. Replace `let usage = { boost: 0, air: 0, roll: 0 };` with `let style = 0;`. Delete the two lines that write `usage` (`if (e.tricks.length) usage.roll++;` in the `land` case and `if (simIn.boost) usage.boost++;` in `tick`).
3. In `startRace`, next to `finishAt = 0;`, add `style = 0;`.
4. In `handleEvents`, count every event:

```js
  for (const e of race.events) {
    style += stylePoints(e);
    switch (e.type) {
```

5. In `finishCircuit`, before `showResults(`:

```js
  const styleKey = `${venue.id}.${ev.id}`, styleBest = (save.style ||= {})[styleKey] || 0;
  if (style > styleBest) { save.style[styleKey] = style; persist(); }
```

and add one stat at the end of the `stats` array:

```js
{ label: style > styleBest && styleBest ? 'Style · new best' : 'Style', value: `${style}` }
```

`finishCircuit` runs the remaining rivals to the flag with `stepRace` and then clears `race.events`, so their events never reach `handleEvents`. The score is the player's own.

**Verify**: `grep -c "usage" src/main.js` → 0. `npm test` → exit 0. With `npm start` running:

```sh
node tools/smoke.mjs '?venue=proving&event=gp&autostart&autopilot' --until results --timeout 400 --eval '({ stats: window.__cap.menu.view().board.stats.map((s) => s.label + " " + s.value), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("voltitude.save")))).style })'
```

→ exit 0, `"errors": []`, the last stat is `Style <number>` with a number above 300, and `saved` is `{ "proving.gp": <the same number> }`.

### Step 7: Log

Append to `progress.md` a section `## Session <date>: gas economy and style (plan 009), SIM_VERSION <N + 1>`. Paste the before and after gas tables, the author times before and after, the bench lap ratios, and the smoke output of step 6.

## Test plan

- `tests/racing.test.js`: three tests updated to the new amounts, changed first and seen failing.
- `tests/style.test.js` (new, 3 tests): the scoring table on hand-made events, and a real bot lap scored twice.
- `tools/gas-econ.mjs` is the measurement, kept in the repo so the next tuning pass starts from numbers.
- The exploit patterns and the AI bench are the guard against side effects.

## Done criteria

- [ ] `npm test` exits 0, with 3 more tests than before this plan
- [ ] `npm run test:server` exits 0
- [ ] `/tmp/plan009/gas-after.txt` shows all eight `tanksPerLap` values higher than in `gas-before.txt`
- [ ] `node tools/exploits.mjs` ends in `PASS` for all four venues
- [ ] `node tools/ai-bench.mjs 5 proving` prints `PASS` for every tier
- [ ] `grep -c "usage" src/main.js` prints 0
- [ ] `git diff --stat -- src/sim/drive.js src/sim/driver.js src/sim/bot.js src/sim/line.js rl server` is empty
- [ ] `assets/ghosts/*.json` carry the new version number
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- A baseline gate in step 1 fails.
- An exploit pattern that passed in step 1 fails in step 4. Report the pattern and its `why` column. Do not lower the amounts on your own: which source to cut is a design call.
- The Proving Ground bench fails a tier in step 4. On `9ee19cc` the elite lap ratio after the change was 0.954 against a floor of 0.95, so this is the gate most likely to trip. Report the number. Do not edit `tools/ai-bench.mjs` or the AI.
- An author Time Trial time moves by more than 2%.
- `tools/medals.mjs` throws `author run failed`.
- Plan 006 has landed and its test `'the autopilot clears four lines in under a minute'` fails. More landing gas should help the autopilot, not hurt it.

## Maintenance notes

For the owner, after this lands:

- **Redeploy the Worker** (`npx wrangler deploy` in `server/`), once, after the last sim plan.
- **The Airfield and The Pad stay starved.** Their Time Trials still earn 0.47 and 0.32 tanks a lap, because there is little there to earn from: no walls, one jump. That is a track problem, and plan 011 is about it. Raising amounts further would overpay the Proving Ground.
- **The Lineup gets a little easier past line 4**, because landings and tricks pay more. If that undoes the tuning of 2026-11-02, raise `pitch` in `src/sim/venues.js` or lower `perfect` here.
- **The AI is about 1% faster relative to the ideal line**, because it boosts more. If the bench band is tight after other plans land, the fix belongs in the bench bands or the AI's boost logic, with the owner's say.
- The style score is shown on circuit results only. Not done: a live style counter in the HUD, style on the daily board, and style medals. The points table is `src/style.js`.
- `tools/gas-econ.mjs` drives the AI, which never does tricks and never runs dry. A human who rolls on every jump earns more than the table shows. Read it as the floor.
- Reviewer: check that `style` is reset in `startRace` and is not counted during a replay. `handleEvents` is not called in replay mode at `9ee19cc`.
