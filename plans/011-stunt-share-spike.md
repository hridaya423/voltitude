# Plan 011: Design spike: put more of the lap on walls and in the air

> **Executor instructions**: This is a spike. It ends with one prototype
> corner on a branch and a written proposal for all four circuits.
> **Nothing merges.** Follow the steps in order and run every verification
> command. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/venues.js src/sim/circuit.js tools/bake-terrain.mjs tools/lap-map.mjs`
> `src/sim/venues.js` may have changed in the `pad` entry (plan 006 edits the Lineup). The `AIRFIELD` node list quoted under "Current state" must be unchanged, and `tools/lap-map.mjs` must not exist. Otherwise treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L (a measuring tool, one prototype corner with its knock-on failures, a proposal covering four circuits)
- **Risk**: LOW (prototype branch only)
- **Depends on**: `plans/009-gas-economy-and-style.md` (its `tools/gas-econ.mjs` and its gas amounts are the yardstick)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The game sells a car that rides walls and flies. The circuits ask for something else. The advisor timed where a clean lap goes, by driving the rival AI at full pace and classifying every tick:

| Venue | Lap | Braking | Turning on flat road | Flat out, straight | On a wall | In the air |
|---|---|---|---|---|---|---|
| Proving Ground | 75.8 s | 30.3% | 30.2% | 23.4% | 7.3% | 8.8% |
| Airfield | 80.6 s | 36.2% | 34.7% | 27.3% | 0% | 1.8% |
| Launch Complex | 69.4 s | 37.8% | 28.8% | 24.4% | 6.8% | 2.2% |
| The Pad | 37.4 s | 22.0% | 46.3% | 26.3% | 0% | 5.4% |

A lap of the Airfield is 98% ordinary circuit driving, and more than a third of it is spent on the brakes. The car tops 300 km/h and the median corner apex is about 100 km/h, so braking zones eat the straights: on the Airfield's main straight the AI is flat out for 3.5 s and is on the brakes from 325 km/h by metre 297. The stunt share is 16% on the Proving Ground, 9% on the Launch Complex, 5% on The Pad and 2% on the Airfield. Those shares are also why the Airfield and The Pad earn so little gas (plan 009).

The straights are not the problem. The longest stretch with nothing to do is 5.5 s. The flat corners are the problem: each one is brake, turn, wait. A banked corner replaces all three with a wall ride that keeps the speed and pays gas.

The advisor tried it on one corner. This spike repeats that, fixes what it breaks, and proposes a set of changes for the owner to choose from.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation. Changing a track changes every recorded run on it.
- A circuit is a list of nodes in `src/sim/venues.js`: `[x, z, y, bank, width, flags]`. `x` and `z` are metres on the ground, `y` is height, `bank` is degrees. `flags` is optional: `jump: { kick, ramp, flare }` makes a kicker, `gate` a ring gate, `sector` names a sector, `roof` puts a roof over the road.
- `src/sim/circuit.js` turns nodes into a road sampled every metre. Banking is applied in proportion to curvature (`circuit.js:182`): a straight cannot be banked, and the bank fades in and out through a smoothing window on its own.
- The fans pull the car onto any road surface tilted more than about 31 degrees (`src/sim/drive.js:469-477`), with up to 14 g at 60 degrees. That is what makes a banked corner fast. `c.fan` is the fan effort from 0 to 1. Wall gas is paid while it is on above 30 m/s.
- Each venue has baked terrain under `assets/terrain/height/`, tied to the track by a hash. After any node change, run `node tools/bake-terrain.mjs <venue>`. It takes a few seconds. `loadWorld(id).baked` is `true` when the bake matches.
- `tools/turtle.mjs` generates node lists from steps (`[length, turn in degrees, end height, flags, bank]`). The existing node lists were made with it. Moving a corner means regenerating nodes with it.
- The rival AI drives a racing line computed from the track (`lineFor` in `src/sim/driver.js`). It adapts to a changed corner without edits.
- House rules, enforced in review: write no code comments; match the dense style of the file you edit; no new dependencies.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.
- The owner asked that heavy commands stay off the MacBook. Run the tests, the bench and the tools on a remote machine if the operator gave you one.

## Current state

Line numbers are from commit `9ee19cc`.

**The prototype corner.** The Airfield's hairpin into the Hangars sector, `src/sim/venues.js:40-43`. Ten nodes at 8 degrees of bank, about 12 m apart, radius about 37 m:

```js
    [299.73, 677.83, 2.12, 0, 10], [329.94, 691.91, 2.12, 0, 10], [360.15, 706, 2.12, 0, 10], [371.5, 709.96, 2.12, 8, 10],
    [383.42, 711.59, 2.12, 8, 10], [395.41, 710.8, 2.12, 8, 10], [407.01, 707.64, 2.12, 8, 10], [417.75, 702.23, 2.12, 8, 10],
    [427.19, 694.78, 2.12, 8, 10], [434.96, 685.61, 2.12, 8, 10], [440.74, 675.07, 2.12, 8, 10], [444.31, 663.58, 2.12, 8, 10],
    [445.51, 651.62, 2.12, 8, 10, { sector: 'Hangars' }],
```

**Banked corners that exist today.** The Proving Ground's sweeper ramps 8, 16, 24, 32, 40, 48 and holds 55 degrees for seven nodes (`venues.js:19-23`). The Launch Complex's bowl holds 50 degrees for 21 nodes (`venues.js:80-85`). Everything else is at 4 to 14 degrees.

**What the advisor measured on the prototype.** In a scratch copy, the ten `8`s became `45` and the terrain was re-baked (2.5 s):

| Measure | Before | After |
|---|---|---|
| Lap (AI, second lap) | 80.63 s | 77.08 s |
| Time from metre 1000 to 1250 | 8.74 s | 6.61 s |
| Slowest speed in the corner | 81 km/h | 106 km/h |
| Fan effort in the corner | 0 | 0.42 |
| Share of the lap on a wall | 0% | 2.8% |
| Gas per lap, Time Trial | 0.36 tanks | 0.47 tanks |
| Gas per lap, Grand Prix | 0.54 tanks | 0.72 tanks |
| Steepest bank change | under 0.5°/m | 0.86°/m |

What it broke:

- `tests/sim.test.js`: one test failed, `reset returns the car to the last checkpoint`. With a tapered profile (18, 32, 45 six times, 32, 18) a different one failed, `Airfield: a kerb never launches a car the road centre would keep down`, and the gain shrank (lap 79.06 s, slowest speed 97 km/h).
- `node tools/ai-bench.mjs 5 airfield`: the easy tier failed its `contacts` check. All three tiers pass at `9ee19cc`.
- The bank changes at 0.86 degrees per metre. `tests/handling.test.js:44` holds the Proving Ground to 0.5. The corner is too short and too tight for 45 degrees: a banked corner wants a longer arc, which means moving nodes.
- `node tools/exploits.mjs airfield` still passed.
- The author ghosts for the Airfield no longer match the track. That is expected and is fixed by a re-bake when a change ships. The spike does not re-bake.

**Other candidates the advisor found but did not prototype:**

| Venue | Where | Idea |
|---|---|---|
| Proving Ground | metres 3178 to 3605, 5.5 s flat out, ends in braking at 296 km/h | A kicker with a gate before the braking zone. |
| The Pad | metres 769 to 1030, the back straight, 4.7 s flat out | A second kicker, or bank the two 180 degree ends from 14 to 45 degrees. Each end is 23 nodes long, which is long enough for a ramp. |
| Airfield | the two sweepers after the Tower sector, 7 nodes each at 8 degrees, radius about 130 m | Bank to 40 degrees. They are wider and faster than the hairpin. |
| Launch Complex | the 90 degree corners at 6 degrees | Bank one pair. The bowl already shows the look. |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| Lap map (after step 1) | `node tools/lap-map.mjs [venue] [min seconds]` | tables, then one JSON line |
| Gas table (from plan 009) | `node tools/gas-econ.mjs <venue>` | a table, then one JSON line |
| Re-bake terrain | `node tools/bake-terrain.mjs <venue>` | `<venue> { ms: ..., drops: 420000 }` |
| Exploit patterns | `node tools/exploits.mjs <venue>` | last line `PASS` |
| AI bench | `node tools/ai-bench.mjs 5 <venue>` | `<tier>: PASS` per tier |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**:
- `tools/lap-map.mjs` (create; this file may merge on its own, see step 1)
- On the spike branch only: `src/sim/venues.js` (the `AIRFIELD` nodes), `assets/terrain/height/airfield*` (rewritten by the bake tool)
- `plans/011-stunt-share-proposal.md` (create; this is the deliverable)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `SIM_VERSION`, `assets/ghosts/`, `tools/medals.mjs`. Nothing ships from this spike.
- `src/sim/circuit.js`, `src/sim/drive.js`, `src/sim/driver.js`, `src/sim/line.js`. If the corner needs a rule changed, write that in the proposal.
- The test files. A failing test is a finding to report. Do not edit a test to make the prototype pass.
- The other three venues. Their changes are proposed on paper only.
- `server/`.

## Git workflow

- `tools/lap-map.mjs` goes on its own branch `advisor/011-lap-map` with one commit, `chore(tools): lap map, where a clean lap spends its time`. It reads the sim and changes nothing, so it can merge.
- The prototype goes on `spike/011-airfield-bank`, branched from that. Do NOT merge it. Do NOT push unless the operator asks.

## Steps

### Step 1: The lap map

Create `tools/lap-map.mjs`:

```js
import { loadWorld } from './load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { lineFor } from '../src/sim/driver.js';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const MIN = +(process.argv[3] || 3);

export function lapMap(id) {
  const world = loadWorld(id), race = createRace(world, { event: eventsFor(world.track, world.venue).find((e) => e.id === 'tt'), seed: 3 }), inp = createInput();
  const c = race.car, runs = [], line = lineFor(world.track);
  let n = 0, idle = 0, air = 0, wall = 0, brake = 0, turn = 0, from = -1, at = 0;
  while (race.laps.length < 2 && race.tick < 120 * 400) {
    botInput(race, inp, 1);
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing' || race.laps.length < 1) continue;
    n++;
    const state = c.mode === 0 ? 'air' : c.fan > 0.2 ? 'wall' : inp.brake > 0.1 ? 'brake' : Math.abs(line.kappa[c.hint % world.track.lap]) * c.speed * c.speed > 3.9 ? 'turn' : 'idle';
    if (state === 'air') air++; else if (state === 'wall') wall++; else if (state === 'brake') brake++; else if (state === 'turn') turn++; else idle++;
    if (state === 'idle') { if (from < 0) { from = n; at = c.hint; } }
    else if (from >= 0) { if ((n - from) / 120 >= MIN) runs.push({ fromM: at, toM: c.hint, seconds: +((n - from) / 120).toFixed(1), endKmh: Math.round(c.speed * 3.6), endsIn: state }); from = -1; }
  }
  const pct = (k) => +((100 * k) / n).toFixed(1);
  return { venue: id, lapS: +(n / 120).toFixed(1), idlePct: pct(idle), brakePct: pct(brake), turnPct: pct(turn), wallPct: pct(wall), airPct: pct(air), runs };
}

if (process.argv[1]?.endsWith('lap-map.mjs')) {
  const all = (process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : Object.keys(VENUES)).map(lapMap);
  console.table(all.map(({ runs, ...r }) => r));
  for (const v of all) { console.log(v.venue, 'flat-out stretches of', MIN, 's or more'); console.table(v.runs); }
  console.log(JSON.stringify(all.map((v) => [v.venue, v.brakePct, v.turnPct, v.idlePct, v.wallPct, v.airPct])));
}
```

It times the second lap, so the standing start does not count. A tick is `air` when the car is off the ground, `wall` when the fans are working, `brake` when the AI brakes, `turn` when the racing line asks for more than 0.4 g sideways, and `idle` otherwise.

```sh
mkdir -p /tmp/plan011
node tools/lap-map.mjs all 3 | tee /tmp/plan011/map-before.txt | tail -1
```

**Verify**: the last line is close to `[["proving",30.3,30.2,23.4,7.3,8.8],["airfield",36.2,34.7,27.3,0,1.8],["launch",37.8,28.8,24.4,6.8,2.2],["pad",22,46.3,26.3,0,5.4]]`. Earlier plans move the numbers by a point or two. The Airfield's wall share must be 0.

Commit on `advisor/011-lap-map`.

### Step 2: Baselines for the prototype

On `spike/011-airfield-bank`:

```sh
npm test > /tmp/plan011/test-before.txt 2>&1; echo "tests exit $?"
node tools/gas-econ.mjs airfield | tee /tmp/plan011/gas-before.txt | tail -1
node tools/exploits.mjs airfield | tail -1
node tools/ai-bench.mjs 5 airfield > /tmp/plan011/bench-before.txt 2>&1; grep ": PASS\|: FAIL" /tmp/plan011/bench-before.txt
```

**Verify**: tests exit 0, the exploits end in `PASS`, three `PASS` lines from the bench.

### Step 3: Bank the hairpin

In `src/sim/venues.js`, in the `AIRFIELD` node list, change the bank of the ten nodes from `[371.5, 709.96, ...]` to `[445.51, 651.62, ...]` from `8` to `45`. Change nothing else. Then:

```sh
node tools/bake-terrain.mjs airfield
node tools/lap-map.mjs airfield 3 | tee /tmp/plan011/map-bank45.txt | head -6
node tools/gas-econ.mjs airfield | tee /tmp/plan011/gas-bank45.txt | tail -1
npm test 2>&1 | grep "^✖" | sort -u > /tmp/plan011/fail-bank45.txt; cat /tmp/plan011/fail-bank45.txt
node tools/exploits.mjs airfield | tail -1
node tools/ai-bench.mjs 5 airfield 2>&1 | grep ": PASS\|: FAIL" | tee /tmp/plan011/bench-bank45.txt
```

**Verify**: the Airfield's `wallPct` is above 2 and its lap is 2 to 5 s shorter than in `map-before.txt`. The advisor saw 2.8% and 3.5 s. Tests fail: expect the Airfield ghost tests (the track changed) and one or two tests in `tests/sim.test.js`. Record every failing name. Do not fix them in this step.

### Step 4: Find out what a clean banked corner needs

The prototype has three known defects: the bank changes too fast (0.86°/m), a sim test fails, and the easy AI collides. Work through them in this order. Stop a branch of work as soon as it needs a file that is out of scope, and write the need down.

1. **Read the two failing sim tests** in `tests/sim.test.js` (`reset returns the car to the last checkpoint`, `a kerb never launches a car the road centre would keep down`) and say in one paragraph each why the banked corner trips them. Is the test protecting something a player would feel, or does it assume a flat corner?
2. **Try a longer corner.** Regenerate the hairpin with `tools/turtle.mjs` at a larger radius, so the bank can rise at 0.5°/m or less. The corner runs from the node at `[360.15, 706]` to the node at `[445.51, 621.62]`. Both ends must stay where they are, with the same headings, or the rest of the lap moves. A radius of 37 m between those points is fixed by the geometry, so a larger radius means moving the straights before and after. If that cannot be done without moving more than the six straight nodes around the corner, say so and keep the 45 degree version as the prototype.
3. **Try 35 degrees.** It is just past the 31 degrees where the fans start. Re-bake and re-measure. Record the lap, the wall share and the failing tests in `/tmp/plan011/map-bank35.txt` and `fail-bank35.txt`.
4. **Look at it.** With `npm start` running, load `http://localhost:8790/?venue=airfield&event=pr&autostart&autopilot` and watch the AI take the corner, or capture frames with the smoke tool. Check the terrain meets the outside of the banking with no gap or spike, the barriers follow the bank, and the hangar roofs after the corner still line up. Describe what is wrong, if anything.

**Verify**: `/tmp/plan011/` holds a lap map and a failing-test list for each variant tried.

### Step 5: Measure the other candidates on paper

For each row of the "Other candidates" table, without editing the track, record from `map-before.txt` and `node tools/handling-lab.mjs <venue>`:

- the corner's length in nodes and metres, its radius, its entry and apex speed (the lab's `corners` rows print `at`, `len`, `radius`, `entryKmh`, `apexKmh`);
- whether it is long enough to ramp to 45 degrees at 0.5°/m (it needs 90 m of ramp at each end);
- what sits beside it that a bank would hit (a roof, a jump, the pit straight, a gate).

### Step 6: Write the proposal

Create `plans/011-stunt-share-proposal.md`:

1. **The lap map before**, pasted.
2. **The prototype**: the three variants (45, 35, longer radius if built), each with lap, wall share, gas per lap, failing tests and bench result.
3. **What a banked corner needs** to pass the tests: the findings of step 4, including any rule in `circuit.js` or any test that has to change, with the reason.
4. **Candidates**, one row per corner or straight across all four venues: the change, the expected gain in stunt share (scale from the prototype: about 2.8 points of wall share and 3.5 s per banked hairpin), the cost (nodes to move, terrain re-bake, ghosts re-baked, medals re-timed, AI bench), and a rank.
5. **A target** for the owner to accept or change. Suggested: no circuit under 10% of the lap on a wall or in the air, and no circuit over 30% braking.
6. **What the spike did not test**: a human on the banked corner, eight cars on it at once in a Grand Prix, the look at night, and kickers.

**Verify**: every number in the proposal appears in a file under `/tmp/plan011/`.

## Test plan

- `tools/lap-map.mjs` is the measurement. It has no test of its own. It is a reporting tool like `tools/handling-lab.mjs`.
- The spike adds no tests. It reports which existing tests a banked corner breaks.

## Done criteria

- [ ] `tools/lap-map.mjs` exists on `advisor/011-lap-map`, and `npm test` exits 0 on that branch
- [ ] `spike/011-airfield-bank` holds the banked hairpin and its re-baked terrain, and is not merged
- [ ] `git diff --stat <base>..spike/011-airfield-bank -- tests src/sim/circuit.js src/sim/drive.js src/sim/driver.js src/sim/line.js rl server assets/ghosts` is empty
- [ ] `plans/011-stunt-share-proposal.md` exists with the six sections
- [ ] `plans/README.md` status row updated to `SPIKE DONE` with a link to the proposal

## STOP conditions

Stop and report back if:

- The `AIRFIELD` nodes do not match "Current state".
- A baseline gate in step 2 fails.
- After step 3 the Airfield's wall share is still 0. The fans did not engage: check `loadWorld('airfield').baked` and the bank value before anything else, and report.
- `node tools/bake-terrain.mjs airfield` fails or leaves `baked` false.
- More than five tests outside the Airfield ghost tests fail after step 3. Something other than the corner changed.

## Maintenance notes

For the owner:

- Every track change that ships needs, per venue: a terrain re-bake, a version bump, `node tools/medals.mjs all`, and a Worker redeploy. Players' best times on that venue are wiped by the version bump. Batch all the track changes you accept into one release.
- A banked corner is faster, so medal times fall with it. That is fine: they are re-timed from the author run.
- The proposal's target (10% stunt share, under 30% braking) is the advisor's suggestion. The Proving Ground is at 16% and 30% today and is the best of the four by this measure.
- Plan 010's slide and this plan pull the same way: fewer corners that are only brake, turn, wait. If only one is funded, this one changes more of the lap.
- `tools/lap-map.mjs` classifies by the AI's driving. A human brakes earlier and longer, so the real braking share is higher than the table.
