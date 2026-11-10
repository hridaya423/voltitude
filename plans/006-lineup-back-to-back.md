# Plan 006: Turn The Lineup into back-to-back jumps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/race.js src/sim/lineup.js src/sim/bot.js src/main.js src/menu.js tests/dare.test.js tests/menu.test.js`
> Plans 001, 002 and 004 edit `src/sim/race.js`, `src/main.js` and `src/menu.js` before you. That is expected. `src/sim/lineup.js` and `src/sim/bot.js` must be unchanged apart from plan 002's one-line `inp.flip = 0;` in `bot.js`. Compare the "Current state" excerpts against the live code. A line an earlier plan changed in the way this plan describes is fine. Any other mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (one sim function reworked, a start position, medal targets for two dares)
- **Risk**: MED (changes the deterministic sim, so the version bumps and the author ghosts are re-baked)
- **Depends on**: `plans/001-truth-and-bug-sweep.md`, `plans/002-sim-rules-batch.md`, `plans/004-fail-and-retry-flow.md` (004 adds `bankDare`, which step 6 uses)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The Lineup is the headline dare: jump a growing row of vehicles. Each jump lasts about 3 seconds. After it, the player drives a full lap of an empty oval to get back to the kicker. The autopilot's clears came at 11, 48, 84 and 120 s, and its run of four clears took 158 s. Ninety percent of the event is the lap. The start also sits on the last corner, so a first-time player who only holds the throttle slides down the banking and hits the row. And a jump flown beside the row counts as a clear, because only the landing distance is checked. After this plan each clear puts the car back on the run-up, the same four clears take 47 s, every attempt starts from the same place at the same speed, and a jump that leaves the kicker beside the row scores nothing. The Lineup and The Ramp also get the medal ladder every other event already has.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation shared by the browser, the node tests and the Cloudflare Worker in `server/`. A recorded run stores inputs only and is replayed through the sim. **Any behaviour change breaks every stored run**, which is why `SIM_VERSION` in `src/sim/race.js` exists.
- One tick is 1/120 s. `c.speed` is m/s. `c.mode` is 0 in the air. `c.hint` is the car's position along the track in metres (an index into the track arrays). `c.lat` is its distance from the centre line in metres.
- The Pad is a 1535 m oval. `track.lineup` is `{ lip: 256, i0: 376, pitch: 11 }`: the kicker's lip is at metre 256, the first vehicle starts 120 m after it, and each further vehicle adds 11 m. The straight before the lip starts at metre 6, and its banking has faded to zero by metre 40.
- The Lineup's state is `race.dare`: `count` is the number of vehicles in the next line, `score` the total, `armed` is true while the car is in the air over the line.
- A Lineup run ends on a clip. The score is the sum, over each clear, of the line length times a multiplier (1, or up to 3 for tricks).
- The owner tuned the line by hand on 2026-11-02 (logged in `progress.md`): line 1 needs flat-out throttle, lines 2 to 4 need lift on the way down, line 5 and beyond need gas earned from near misses, landings and tricks. This plan must not change that.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No wrapper function with a single caller. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. The owner's main checkout had vendored files deleted at planning time.

## Current state

Line numbers are from commit `9ee19cc`. Earlier plans shift them.

**Where a race starts.** `src/sim/race.js:75-81`:

```js
function initEntry(e, world, event, slot) {
  const { track } = world;
  const car = createCar();
  const g = track.closed ? gridSlot(track, slot) : { i: event.from + 1, lat: 0 };
  placeCar(car, track, g.i, 0, g.lat);
  car.gas = event.gas;
```

For The Lineup that is grid slot 0: metre 1523, 3.2 m left of centre, on the last corner, where the road is banked 8.6°.

**The dare state.** `src/sim/race.js:117-118`:

```js
  if (event.dare === 'ramp') race.dare = { count: 0, score: 0, tries: [], phase: 'run', entry: 0, still: 0, until: 0, flown: false, armed: false, over: false, endAt: 0 };
  else if (event.kind === 'dare') race.dare = { count: 1, score: 0, mult: 1, cleared: 0, armed: false, over: false, endAt: 0, near: [] };
```

The Ramp runs on its own spur track, which has no `lineup`. So `event.kind === 'dare' && track.lineup` is true only for The Lineup.

**The Lineup rules.** `src/sim/race.js:248-272`:

```js
function dareStep(race, c, touch) {
  const d = race.dare, { track } = race.world;
  if (d.over) { if (race.tick >= d.endAt) finishEntry(race, race); return; }
  const boxes = lineupBoxes(track, d.count), end = boxes[boxes.length - 1].s1;
  if (c.mode === 0 && c.hint >= track.lineup.lip && c.hint < end) d.armed = true;
  if (c.hint >= track.lineup.lip - 30 && c.hint <= end + 5) {
    const hit = lineupHit(c, track, boxes);
    if (hit?.clip !== undefined) return clip(race, c, hit.clip);
    if (hit && !d.near.includes(hit.near)) {
      d.near.push(hit.near);
      earn(race, race, 'near_miss', GAIN.near_miss);
      emit(race, 'near_miss', { v: c.speed, vehicle: hit.near, gap: hit.gap });
    }
  }
  if (!d.armed || c.mode === 0) return;
  if (touch?.type === 'wreck' || c.hint < end) return clip(race, c, (boxes.find((b) => b.s1 >= c.hint) || boxes[boxes.length - 1]).k);
  const hard = touch?.quality === 'hard', count = d.count;
  d.mult = hard ? 1 : Math.min(3, 1 + (touch?.tricks.length || 0));
  d.score += count * d.mult;
  d.cleared += count;
  d.count++;
  d.armed = false;
  d.near = [];
  emit(race, 'clear', { count, mult: d.mult, hard, score: d.score });
}
```

`lineupHit` (`src/sim/lineup.js:24-39`) ignores any point of the car more than 1.1 m from the centre line. So a car 2.2 m to the side touches nothing, and the landing-distance test alone decides the clear.

**GO.** `src/sim/race.js:441-443`, in `stepRace`:

```js
  if (race.phase === 'countdown') {
    if (race.raceTick === 0) { race.phase = 'racing'; emit(race, 'go'); }
    else {
```

Cars are not stepped during the countdown.

**The Ramp already re-places the car between tries.** `src/sim/race.js:313-320`, `nextTry`, calls `placeCar` and emits `retry`. `src/main.js` handles it:

```js
      case 'retry': wreckToast?.remove(); chase.snap(); snapshot(race.car, prev); break;
```

Plan 004 added a screen flash to that line. This plan reuses the `retry` event, so the browser needs no new camera code.

**Medals.** `src/main.js:225-226`:

```js
const PODIUM = [{ id: 'gold', name: 'Gold' }, { id: 'silver', name: 'Silver' }, { id: 'bronze', name: 'Bronze' }];
const medalOf = (ev) => { const b = book[ev.id]?.best; if (!b || ev.kind === 'pr' || ev.kind === 'dare') return null; return ev.kind === 'gp' ? PODIUM[b - 1] || null : medalFor(b, authorTime(ev.id)); };
```

`eventRows` (`src/main.js:252-268`) builds the garage ladder:

```js
    const b = book[ev.id]?.best, gp = ev.kind === 'gp', dare = ev.kind === 'dare';
    const ladder = gp ? PODIUM.map((m, j) => ({ ...m, time: `P${j + 1}`, t: j + 1 })) : ev.kind === 'pr' || dare ? [] : medalTimes(authorTime(ev.id)).map((m) => ({ ...m, time: fmt(m.t) }));
...
      ladder: ladder.map((m) => ({ id: m.id, name: m.name, time: m.time, got: !!b && b <= m.t })),
```

`startRace` sets the HUD target (`src/main.js:457`). Plan 001 may have reworded the part after the dare branch:

```js
  if (ev.circuit) hud.els.target.textContent = ev.kind === 'dare' ? (book[ev.id]?.best ? `BEST ${book[ev.id].best}` : '') : ref ? `BEST ${fmt(ref.t)}` : '';
```

`finishDare` after plan 004:

```js
function finishDare(ev) {
  const d = race.dare, best = bankDare(ev);
  lastRun = encodeRun(race, recorder.bytes());
  ...
  showResults(result, null, null);
}
```

`dareResults` and `rampResults` (`src/menu.js:232-258`) return a results object with `medal: null`. The results screen draws `medal` when it is set (`src/render/garage-screens.js:175`). The garage draws any ladder it is given (`src/render/garage-screens.js:118-124`).

**The autopilot.** `src/sim/bot.js:57-59` drives the Lineup: full throttle from 200 m before the lip, lift while falling. It needs no change.

**Tests.** `tests/dare.test.js:19-24` asserts the exact shape of `race.dare`. Its helpers `dareAt(i, speed, count)` and `run(race, script)` place a car near the lip and step until a clear.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| One test file | `node --test tests/dare.test.js` | exit 0 |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Exploit patterns | `node tools/exploits.mjs pad` | prints PASS |
| Re-bake author ghosts | `node tools/medals.mjs all` | one line per event, no throw |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**:
- `src/sim/race.js` (`SIM_VERSION`, two constants, `initEntry`, the dare state, `dareStep`, the GO branch of `stepRace`)
- `src/menu.js` (`DARE_MEDALS`, `dareMedal`)
- `src/main.js` (`medalOf`, `eventRows`, the HUD target line in `startRace`, `finishDare`, one `wide` case in `handleEvents`)
- `tests/dare.test.js`, `tests/menu.test.js`
- `assets/ghosts/*.json` (rewritten by `tools/medals.mjs`, never by hand)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `src/sim/lineup.js`: the vehicle sizes, `HALF_W` and the hit test stay.
- `src/sim/venues.js`: the line's position (`at: 120, pitch: 11`) is the owner's tuning.
- `src/sim/bot.js`: the autopilot must keep scoring 10 with no change.
- `clip` in `race.js` (plan 004 owns it) and `rampStep`, `endTry`, `nextTry`. The Ramp's scoring formula does not change.
- The Lineup brief in `BRIEFS`. The garage shows three lines of it and the current text fills them.
- `server/`. The Worker needs a redeploy after this plan. The owner does that.

## Git workflow

- Branch: `advisor/006-lineup-back-to-back` from the branch that holds plans 001, 002 and 004.
- One commit per step, for example `feat(lineup): each clear returns the car to the run-up`. The ghost re-bake is its own commit: `chore(ghosts): re-bake author runs for sim <N>`.
- Do NOT push. Do NOT run `wrangler`.

## Steps

### Step 0: Record the baseline

```sh
mkdir -p /tmp/plan006 && npm test > /tmp/plan006/test-before.txt 2>&1; echo "tests exit $?"
node tools/exploits.mjs pad > /tmp/plan006/exploits-before.txt 2>&1; tail -1 /tmp/plan006/exploits-before.txt
grep -n "SIM_VERSION = " src/sim/race.js
grep -o '"total":[0-9]*' assets/ghosts/*.json > /tmp/plan006/totals-before.txt
```

**Verify**: tests exit 0, the exploit run ends with `PASS`, and you know the current `SIM_VERSION`. Call it `N`.

### Step 1: Bump the version

Raise `SIM_VERSION` in `src/sim/race.js` to `N + 1`. Run `npm test 2>&1 | grep "✖" > /tmp/plan006/after-bump.txt` and keep the list of tests that now fail on stale ghosts.

**Verify**: `grep -n "SIM_VERSION = " src/sim/race.js` → shows `N + 1`.

### Step 2: Write the tests for the new flow

In `tests/dare.test.js`:

1. Extend the imports at the top:

```js
import { placeCar, steerTo } from '../src/sim/drive.js';
import { autopilot } from '../src/sim/bot.js';
```

The file already imports `placeCar` from `drive.js`. Replace that line, do not add a second one. One later test does `const { autopilot } = await import('../src/sim/bot.js');` inside its body. Leave it. It shadows the import locally.

2. Update the shape assertion in `'a dare race has one entry and a dare state'`:

```js
  assert.deepEqual(race.dare, { count: 1, score: 0, mult: 1, cleared: 0, armed: false, wide: false, resetAt: 0, over: false, endAt: 0, near: [] });
```

3. Add this block right above `const RAMP = EVENTS.find((e) => e.id === 'ramp');`:

```js
function lineupRun(script, secs) {
  const race = createRace(pad, { event: LINEUP }), inp = createInput(), events = [];
  for (let t = 0; t < 120 * secs && race.phase !== 'finished'; t++) {
    if (race.phase === 'racing') script(inp, race.car, race);
    stepRace(race, inp);
    for (const e of race.events) events.push({ ...e, at: race.raceTick, hint: race.car.hint, speed: race.car.speed });
    race.events.length = 0;
  }
  return { race, events };
}

test('the Lineup starts centred on the straight, and throttle alone with no steering clears line one', () => {
  const start = createRace(pad, { event: LINEUP }).car;
  assert.equal(start.hint, (lip - 250 + pad.track.lap) % pad.track.lap);
  assert.equal(start.lat, 0);
  assert.equal(start.speed, 0);
  const { events } = lineupRun((inp) => { inp.throttle = 1; }, 12);
  const clear = events.find((e) => e.type === 'clear');
  assert.equal(clear?.count, 1);
  assert.ok(clear.at < 120 * 8, `first clear at tick ${clear.at}`);
});

test('after a clear the car is back on the run-up within 150 ticks, rolling at 30 m/s', () => {
  const { events } = lineupRun((inp) => { inp.throttle = 1; }, 12);
  const clear = events.find((e) => e.type === 'clear'), retry = events.find((e) => e.type === 'retry');
  assert.ok(retry && retry.at - clear.at <= 150, `retry ${retry?.at}, clear ${clear.at}`);
  assert.equal(retry.hint, (lip - 250 + pad.track.lap) % pad.track.lap);
  assert.equal(retry.speed, 30);
});

test('the autopilot clears four lines in under a minute', () => {
  const { race } = lineupRun((inp, c, r) => autopilot(r, inp, 1), 90);
  assert.equal(race.phase, 'finished');
  assert.ok(race.dare.score >= 10, `score ${race.dare.score}`);
  assert.ok(race.raceTick < 120 * 60, `ended at ${(race.raceTick / 120).toFixed(1)} s`);
});

test('a jump that leaves the lip beside the row scores nothing and goes back to the run-up', () => {
  const { race, events } = lineupRun((inp, c) => { inp.throttle = 1; inp.steer = steerTo(c, pad.track, 4, 0, 0); }, 12);
  assert.ok(events.some((e) => e.type === 'wide'), `events: ${[...new Set(events.map((e) => e.type))]}`);
  assert.equal(events.filter((e) => e.type === 'clear' || e.type === 'clip').length, 0);
  assert.equal(race.dare.score, 0);
  assert.equal(race.dare.count, 1);
});
```

**Verify**: `node --test tests/dare.test.js 2>&1 | grep "✖"` → the shape test and the four new tests fail. The other dare tests still pass.

### Step 3: The run-up start, the return after a clear, and the lane rule

All in `src/sim/race.js`.

1. Below the `RAMP` constant:

```js
const LINE_RUN = { back: 250, speed: 30, hold: 150, lane: 2 };
const runUp = (track) => (track.lineup.lip - LINE_RUN.back + track.lap) % track.lap;
```

2. In `initEntry`:

```js
  const g = event.kind === 'dare' && track.lineup ? { i: runUp(track), lat: 0 } : track.closed ? gridSlot(track, slot) : { i: event.from + 1, lat: 0 };
```

3. The Lineup dare state gains two fields:

```js
  else if (event.kind === 'dare') race.dare = { count: 1, score: 0, mult: 1, cleared: 0, armed: false, wide: false, resetAt: 0, over: false, endAt: 0, near: [] };
```

4. Replace `dareStep` with:

```js
function dareStep(race, c, touch) {
  const d = race.dare, { track } = race.world;
  if (d.over) { if (race.tick >= d.endAt) finishEntry(race, race); return; }
  if (d.resetAt) {
    if (race.tick < d.resetAt) return;
    d.resetAt = 0;
    placeCar(c, track, runUp(track), LINE_RUN.speed);
    race.lost = 0; race.still = 0; race.lastIdx = c.hint;
    progress(race, race);
    emit(race, 'retry', { n: d.count });
    return;
  }
  const boxes = lineupBoxes(track, d.count), end = boxes[boxes.length - 1].s1;
  if (c.mode === 0 && !d.armed && c.hint >= track.lineup.lip && c.hint < end) { d.armed = true; d.wide = Math.abs(c.lat) > LINE_RUN.lane; }
  if (c.hint >= track.lineup.lip - 30 && c.hint <= end + 5) {
    const hit = lineupHit(c, track, boxes);
    if (hit?.clip !== undefined) return clip(race, c, hit.clip);
    if (hit && !d.near.includes(hit.near)) {
      d.near.push(hit.near);
      earn(race, race, 'near_miss', GAIN.near_miss);
      emit(race, 'near_miss', { v: c.speed, vehicle: hit.near, gap: hit.gap });
    }
  }
  if (!d.armed || c.mode === 0) return;
  if (touch?.type === 'wreck' || (c.hint < end && !d.wide)) return clip(race, c, (boxes.find((b) => b.s1 >= c.hint) || boxes[boxes.length - 1]).k);
  d.resetAt = race.tick + LINE_RUN.hold;
  d.armed = false;
  d.near = [];
  if (d.wide) { d.wide = false; emit(race, 'wide'); return; }
  const hard = touch?.quality === 'hard', count = d.count;
  d.mult = hard ? 1 : Math.min(3, 1 + (touch?.tricks.length || 0));
  d.score += count * d.mult;
  d.cleared += count;
  d.count++;
  emit(race, 'clear', { count, mult: d.mult, hard, score: d.score });
}
```

If an earlier plan changed a line inside the old `dareStep` (plan 002 does not, plan 004 does not), carry that change into the new body and say so in your report.

5. In `stepRace`, the GO branch:

```js
    if (race.raceTick === 0) {
      race.phase = 'racing';
      if (race.dare && race.world.track.lineup) placeCar(c, race.world.track, c.hint, LINE_RUN.speed);
      emit(race, 'go');
    }
```

What this does:
- **Start**: the car waits at metre 6, on the centre line, at rest through the countdown. At GO it is rolling at 30 m/s.
- **After a landing that clears the line**: 150 ticks (1.25 s) later the car is placed back at metre 6 at 30 m/s. The tank is untouched, so gas still has to be earned.
- **Lane**: the lateral position is read once, on the first airborne tick past the lip. More than 2 m from centre means the jump is `wide`: no score, the line does not grow, no clip for landing short, and the car goes back to the run-up. Drift during the flight does not count. A barrel roll with lift moves the car up to 3.7 m sideways, and that must stay a legal clear.
- `placeCar` does not touch `c.gas`.

Why 250 m and 30 m/s: the advisor measured the speed at the lip.

| Start | Lip speed |
|---|---|
| Today, standing start from the grid (first jump) | 65.2 m/s |
| Today, flying lap (every later jump) | 66.7 m/s |
| New, metre 6 at 30 m/s (every jump) | 66.3 m/s |
| Metre 6 from rest | 63.8 m/s (line 1 clips without lift) |

At 66.3 m/s throttle alone clears line 1 and falls short of line 2, which is the owner's tuning.

**Verify**: `node --test tests/dare.test.js` → all pass, 4 more tests than before. The advisor ran this exact code against `9ee19cc`: 23 of 23 in `tests/dare.test.js` and `tests/pad.test.js`.

**Verify**: `node tools/exploits.mjs pad | tail -1` → `PASS`.

### Step 4: Tell the player about a wide jump

In `handleEvents` in `src/main.js`, add a case next to `clip`:

```js
      case 'wide': hud.toast('WIDE', 'white', 'TAKE OFF OVER THE ROW'); audio.event('miss'); break;
```

`audio.event('miss')` is the sound the track-limits toast already uses.

**Verify**: `grep -c "case 'wide'" src/main.js` → 1.

### Step 5: Medal targets for the dares

In `src/menu.js`, above `dareResults`:

```js
export const DARE_MEDALS = {
  lineup: [['author', 'Author', 36], ['gold', 'Gold', 21], ['silver', 'Silver', 10], ['bronze', 'Bronze', 3]],
  ramp: [['author', 'Author', 1000], ['gold', 'Gold', 700], ['silver', 'Silver', 500], ['bronze', 'Bronze', 300]],
};

export function dareMedal(id, score) {
  const m = (DARE_MEDALS[id] || []).find((x) => score >= x[2]);
  return m ? { id: m[0], name: m[1] } : null;
}
```

Where the numbers come from:
- Lineup: 3 is lines 1 and 2. 10 is lines 1 to 4, which is what the autopilot scores. 21 is lines 1 to 6, which needs earned gas. 36 is lines 1 to 8, or fewer lines with trick multipliers.
- Ramp: a clean try without a roll scores up to 200, and each extra roll adds 150. The autopilot scores 585 with no roll. 300 is two decent tries. 500 is three good ones. 700 needs at least one roll. 1000 needs a roll on every try.

Add to `tests/menu.test.js` (extend its import from `../src/menu.js` with `dareMedal, DARE_MEDALS`):

```js
test('dare medals step up with the score and stop below bronze', () => {
  assert.equal(dareMedal('lineup', 2), null);
  assert.deepEqual(dareMedal('lineup', 3), { id: 'bronze', name: 'Bronze' });
  assert.deepEqual(dareMedal('lineup', 10), { id: 'silver', name: 'Silver' });
  assert.deepEqual(dareMedal('lineup', 35), { id: 'gold', name: 'Gold' });
  assert.deepEqual(dareMedal('lineup', 36), { id: 'author', name: 'Author' });
  assert.deepEqual(dareMedal('ramp', 585), { id: 'silver', name: 'Silver' });
  assert.equal(dareMedal('trench', 999), null);
  for (const rows of Object.values(DARE_MEDALS)) assert.deepEqual(rows.map((r) => r[2]), rows.map((r) => r[2]).slice().sort((a, b) => b - a));
});
```

**Verify**: `node --test tests/menu.test.js` → all pass, one more test than before.

### Step 6: Show the medals in the garage, the HUD and the results

In `src/main.js`, extend the import from `./menu.js` with `dareMedal, DARE_MEDALS`. Then:

1. `medalOf`:

```js
const medalOf = (ev) => { const b = book[ev.id]?.best; if (!b || ev.kind === 'pr') return null; if (ev.kind === 'dare') return dareMedal(ev.id, b); return ev.kind === 'gp' ? PODIUM[b - 1] || null : medalFor(b, authorTime(ev.id)); };
```

2. In `eventRows`, the ladder and its `got` flag:

```js
    const ladder = gp ? PODIUM.map((m, j) => ({ ...m, time: `P${j + 1}`, t: j + 1 })) : ev.kind === 'pr' ? [] : dare ? (DARE_MEDALS[ev.id] || []).map(([id, name, t]) => ({ id, name, time: `${t}`, t })) : medalTimes(authorTime(ev.id)).map((m) => ({ ...m, time: fmt(m.t) }));
...
      ladder: ladder.map((m) => ({ id: m.id, name: m.name, time: m.time, got: !!b && (dare ? b >= m.t : b <= m.t) })),
```

3. In `startRace`, the HUD target. Put the dare branch first and leave the circuit branch as you find it:

```js
  if (ev.kind === 'dare') {
    const b = book[ev.id]?.best || 0, next = (DARE_MEDALS[ev.id] || []).slice().reverse().find((m) => b < m[2]);
    hud.els.target.textContent = [b ? `BEST ${b}` : '', next ? `${next[1].toUpperCase()} ${next[2]}` : ''].filter(Boolean).join(' · ');
  } else if (ev.circuit) hud.els.target.textContent = <the existing non-dare expression>;
```

The existing line is `if (ev.circuit) hud.els.target.textContent = ev.kind === 'dare' ? (...) : <rest>`. Keep `<rest>` exactly as it is in your tree.

4. In `finishDare`, read the medal before the score is banked, and pass it on:

```js
function finishDare(ev) {
  const before = medalOf(ev), d = race.dare, best = bankDare(ev), m = dareMedal(ev.id, d.score);
```

and at the end:

```js
  result.medal = medalLine(m, before);
  showResults(result, m, before);
```

`medalLine` and `showResults` already take these arguments for circuit events.

The advisor ran the sim changes of step 3 and the tests of step 2. The `main.js` edits in steps 4 and 6 were written from a reading of the code and were not run in a browser. The smoke commands below are their first real test, so read a failure there as a possible mistake in this plan and report it.

**Verify**: `npm test` → no new failure. With `npm start` running:

```sh
node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until results --timeout 120 --eval '({ medal: window.__cap.menu.view().board.medal, score: window.__cap.menu.view().board.time, target: document.getElementById("target").textContent, ladder: window.__cap.menu.view().board.kind })'
```

→ exit 0, `"score": "10"`, `"medal": { "id": "silver", "name": "Silver", "fresh": true }`. The run reaches results in under 60 s. Before this plan it took about 165 s.

```sh
node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until racing --timeout 60 --eval 'document.getElementById("target").textContent'
```

→ `"value": "BRONZE 3"` (headless Chrome starts with an empty save).

```sh
node tools/smoke.mjs '?venue=pad' --until boot --eval 'window.__cap.menu.view().board.rows.filter((r) => r.id === "lineup" || r.id === "ramp").map((r) => r.ladder.map((m) => m.name + " " + m.time).join(", "))'
```

→ `["Author 36, Gold 21, Silver 10, Bronze 3", "Author 1000, Gold 700, Silver 500, Bronze 300"]`.

### Step 7: Re-bake the author ghosts and run every gate

1. `node tools/medals.mjs all` → one line per event, no throw.
2. `grep -o '"total":[0-9]*' assets/ghosts/*.json | diff - /tmp/plan006/totals-before.txt` → no difference. This plan does not touch circuit driving or The Trench. A changed total is a STOP condition.
3. `npm test` → exit 0. Every test from `/tmp/plan006/after-bump.txt` is green again.
4. `npm run test:server` → exit 0.
5. `for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -1; done` → `PASS` four times.
6. With `npm start` running: `node tools/smoke.mjs '?venue=pad&event=ramp&autostart&autopilot' --until results --timeout 120 --eval 'window.__cap.menu.view().board.medal'` → exit 0, `"id": "silver"` (the autopilot's 585).

### Step 8: Look at it

Watch one Lineup run in a browser, or capture frames with `tools/capture.mjs`, and check three things:

1. At GO the car moves off cleanly. The camera does not lurch.
2. After a clear, the toast reads `+1 CLEARED` with `LINE 2 NEXT`, and about a second later the view cuts to the run-up with the car already moving.
3. The new vehicle is in the row when the car comes back.

If you cannot watch or capture it, say so in the report. Do not claim the visual check passed.

### Step 9: Log

Append to `progress.md` a section `## Session <date>: Lineup back to back (plan 006), SIM_VERSION <N + 1>`. Give the autopilot's score and run length before and after, the lip-speed table from step 3, the medal thresholds, and the smoke outputs from step 6.

## Test plan

- `tests/dare.test.js`: four new tests (the start, the return to the run-up, the autopilot's score and run length, the wide jump) and one updated shape assertion. Written first, seen failing.
- `tests/menu.test.js`: one new test for `dareMedal`.
- Existing dare tests must still pass unchanged. Two of them guard the owner's tuning: `'at 66 m/s, flat out, throttle alone clears a line of one and the line grows'` and `'throttle alone falls short of a line of two, so the thrusters have to work'`. A third, `'a barrel roll over the line doubles the clear'`, guards the lane rule against flagging tricks.
- Browser: the three smoke commands in step 6 and the one in step 7.

## Done criteria

- [ ] `npm test` exits 0, with 5 more tests than before this plan
- [ ] `npm run test:server` exits 0
- [ ] `node tools/exploits.mjs pad | tail -1` prints `PASS`
- [ ] The step 6 smoke reaches results with score 10 and a Silver medal in under 60 s
- [ ] `git diff --stat -- src/sim/lineup.js src/sim/venues.js src/sim/bot.js` is empty
- [ ] The ghost totals are unchanged (step 7.2), and `assets/ghosts/*.json` carry the new version number
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- The step 0 baseline has a failing test or the Pad exploits do not print `PASS`.
- After step 3, `'at 66 m/s, flat out, throttle alone clears a line of one...'`, `'throttle alone falls short of a line of two...'` or `'a barrel roll over the line doubles the clear'` fails. The change has moved the owner's tuning or broken tricks.
- The autopilot test scores under 10. Do not edit `src/sim/bot.js` to fix it.
- `track.lineup.lip - 250` is not on the straight any more. Check with `node -e "import('./tools/load-world.mjs').then(({loadWorld})=>{const t=loadWorld('pad').track;console.log(t.lineup, t.lap)})"`: expect `{ lip: 256, i0: 376, pitch: 11 }` and `1535`. If the owner moved the kicker, the run-up constants need re-measuring.
- A ghost total changes in step 7.2.
- `bankDare` does not exist in `src/main.js`. Plan 004 has not landed.

## Maintenance notes

For the owner, after this lands:

- **Redeploy the Worker** (`npx wrangler deploy` in `server/`), once, after the last sim plan. Until then daily Lineup runs are rejected with 422.
- **The start is a rolling start.** The car stands still through the countdown and is doing 67 mph at GO. That keeps every attempt identical. If it looks abrupt, the alternative is a standing first attempt, but from rest the lip speed is 63.8 m/s and line 1 clips without lift.
- **Four taste constants** in `LINE_RUN` (`src/sim/race.js`): `back` and `speed` set the lip speed, `hold` is the pause between landing and the cut, `lane` is how far off centre a take-off may be.
- **Medal thresholds** are in `DARE_MEDALS` (`src/menu.js`). They are the advisor's first guess from the autopilot's scores. Adjust after people play.
- The Ramp's formula is unchanged. A clean drop with no input still scores about 195 of 200. The ladder now makes rolls the way to Gold. If the Ramp should reward something else, that is a design change for a later plan.
- A jump can still be bent around a tall vehicle by rolling with lift. That is deliberate: it costs gas and takes skill.
- The lap of the oval is no longer part of The Lineup. The Pad's Grand Prix and Time Trial still use it.
- Plan 009 tunes gas income. The Lineup's later lines depend on it, so re-run the autopilot test after 009.
- Reviewer: check that the tank is not refilled on the return to the run-up, and that `d.wide` is only set on the first airborne tick.
