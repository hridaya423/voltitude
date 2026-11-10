# Plan 007: Give rewards a ladder and the HUD its missing calls

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/main.js src/hud.js src/hints.js src/time.js src/audio.js src/style.css`
> Earlier plans edit `src/main.js`, `src/hud.js` and `src/style.css`, and plan 005 creates `src/hints.js`. That is expected. `src/time.js` must be unchanged. Compare the "Current state" excerpts against the live code. A line an earlier plan changed is fine if the part this plan edits is still there. Otherwise treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M (six small features, one new pure function with tests)
- **Risk**: LOW (no simulation change; saved runs and ghosts stay valid)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`), `plans/005-first-run-and-teaching.md` (creates `src/hints.js` and the red state label this plan reuses)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

Every reward in the game looks the same. A triple flip, a clean landing and a lap count all arrive as the same 19 px toast, and the gold toast style in the stylesheet is never used. In a Grand Prix on autopilot the longest stretch with no toast at all was 44 seconds. The game also stays silent at moments where every racing game speaks: the last lap starts with a sound and no words, losing a place shows nothing, a penalty shows its size and never the total, and a car facing the wrong way is not told. The results screen for a circuit lists lap times and does not say where the time went. Two recorded voice lines are never played. This plan gives big moments a bigger toast, adds the four missing calls, adds an ideal lap to the results, and wires the two lines.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- **Do not edit anything under `src/sim/` in this plan.**
- `hud.toast(text, color, sub)` (`src/hud.js:80-87`) creates `<div class="toast ${color}">`. `color` goes straight into the class list, so `'gold big'` sets two classes. Toasts last 1.6 s and at most three show at once.
- Toast colours in `src/style.css:103-107`: `cyan`, `orange`, `good`, `red`, `gold`. Nothing in `src/` uses `gold` today.
- `race` is both the race and the player's entry. `race.pos` is the player's position, `race.penalty` the player's penalty in seconds, `race.splits` the tick of every checkpoint crossing, `race.laps` the lap times in ticks. One tick is 1/120 s.
- A circuit event has `perLap` checkpoints per lap, the lap line included. `fmt(ticks)` (`src/time.js`) formats a time.
- `handleEvents` in `src/main.js` turns sim events into toasts, sounds and rumble. `finishCircuit` builds the circuit results.
- Voice: `audio.radio(id)` plays a race-engineer line, `audio.event(type, v)` plays effects and may call `commentary(id)` inside `src/audio.js`. `sayOnce(id)` in `src/main.js` plays a radio line at most once per race, using the set `said`.
- The lines are listed in `assets/audio/manifest.json` under `radio.lines` and `commentary.lines`. Two are recorded and never played: radio `gas_full` and commentary `leading`.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.

## Current state

Line numbers are from commit `9ee19cc`. Earlier plans shift them, and plan 001 changed some `audio.event(...)` arguments on these lines. Only change the parts this plan names.

**Toast styles.** `src/style.css:101-102`:

```css
.toast { font: 800 expanded 19px/1 var(--display); letter-spacing: 0.14em; text-align: center; padding: 12px 20px; animation: toast 1600ms var(--ease) both; }
.toast small { display: block; margin-top: 8px; font: 600 14px/1 var(--ui); letter-spacing: 0.16em; color: var(--ink-2); }
```

**The handlers.** `src/main.js`, in `handleEvents`:

```js
      case 'lap': {
        ...
        hud.toast(`LAP ${e.lap}`, e.invalid ? 'red' : improved && !first ? 'good' : 'white', e.invalid ? `${fmt(e.t)} · INVALID` : fmt(e.t));
        if (e.lap < current.laps) { audio.event('lap', e.lap + 1); if (e.lap + 1 === current.laps) audio.event('final_lap'); }
        if (improved && !first) audio.event('fastest');
...
      case 'pass': if (e.gained) { hud.toast(`P${race.pos}`, 'good'); audio.event('overtake', race.pos === 1 ? 1 : 0); } else audio.event('overtaken'); updateTower(); break;
...
      case 'track_limits': hud.toast('TRACK LIMITS', e.penalty ? 'orange' : 'red', e.penalty ? `+${e.gain.toFixed(1)} S PENALTY` : 'LAP INVALID'); audio.event('miss'); break;
      case 'clear': {
        ...
        hud.toast(`+${e.count * e.mult} CLEARED${e.mult > 1 ? ` ×${e.mult}` : ''}`, e.hard ? 'white' : 'good', `LINE ${race.dare.count} NEXT`);
...
      case 'land': {
        const names = e.tricks.length ? [...new Set(e.tricks)].map(...).join(' + ') : '';
        ...
        if (e.quality === 'perfect') { hud.toast(names || 'PERFECT LANDING', 'good'); ...
        else if (e.quality === 'clean') { hud.toast(names || 'CLEAN', 'white'); ...
```

Plan 002 may have reworded the `track_limits` toast so that a Time Trial also shows a penalty.

**The per-frame block.** `src/main.js:152` and `:1013-1020`, in `draw`:

```js
let said = new Set(), raceCount = 0, gasLowAt = -1e9, boostWas = false, armedWas = false, liftWas = false, kerbAt = -1;
...
  if (mode === 'race') {
    hints();
    if (race.phase === 'racing') {
      if (c.mode === 1 && c.uy < -0.5) sayOnce('inverted');
      else if (c.mode === 1 && c.uy < 0.3) sayOnce('wall');
      if (c.boosting && c.gas < 0.2 && time - gasLowAt > 20) { gasLowAt = time; audio.radio('gas_low'); }
    }
  }
```

`startRace` resets `said = new Set();`.

**The state label**, after plan 005, in `update` in `src/hud.js`:

```js
      brake = !!line && settings.cue && race.phase === 'racing' && brakeCue(line, track.lap, c, brake);
      const st = c.mode === 0 ? `AIR${altText}` : c.uy < 0.3 ? (c.uy < -0.5 ? 'INVERTED' : 'WALL') : brake ? 'BRAKE' : '';
      setText(els.state, st);
      toggle(els.state, 'warn', brake);
      toggle(els.speed, 'warn', brake);
```

`track` in `src/hud.js` is the track of the running event. `const k = c.hint * 3` is computed two lines above. `track.T` holds the track's forward direction per metre.

**Circuit results.** `src/main.js:568-574`, at the end of `finishCircuit`:

```js
  showResults({
    card: `${venue.name} · ${ev.name}`, pos: gp ? me.pos : 0, field: race.entries.length, medal: medalLine(m, before),
    time: fmt(race.total), delta, note: gp ? `${me.passes || 0} overtakes · ${contactCount} contacts${penalty}` : linked?.run.event === ev.id ? `Linked ghost ${fmt(linked.run.total)} · you ${fmtDelta(race.total - linked.run.total)}` : '',
    title: 'LAPS', rows: race.laps.map(lapRow),
    stats: [{ label: 'Top speed', value: ... }, { label: 'Best lap', value: bestLapT ? fmt(bestLapT) : '—' }, { label: 'Resets', value: `${race.respawns}` }],
```

The results screen spreads any number of stats across its width (`src/render/garage-screens.js:194`).

**Commentary dispatch.** `src/audio.js:596-597`, in the `event` switch:

```js
      case 'final_lap': commentary('final_lap'); break;
      case 'fastest': commentary('fastest_lap'); break;
```

**`src/time.js`** exports `fmt` and `fmtDelta` and nothing else.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| All tests | `npm test` | exit 0, 0 fail |
| One test file | `node --test tests/time.test.js` | exit 0 |
| Dev server | `npm start` | serves http://localhost:8790/ |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**:
- `src/style.css` (one rule)
- `src/main.js` (`handleEvents`, the per-frame block in `draw`, one `let` line, `finishCircuit`)
- `src/hud.js` (the state label lines in `update`, one `let`)
- `src/hints.js` (one exported function)
- `src/time.js` (one exported function)
- `src/audio.js` (one `case` line)
- `tests/time.test.js` (create), `tests/hints.test.js`
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- Everything under `src/sim/`.
- The `+WALL` and `+AIR` gas chips. The owner removed them on 2026-11-02 because the state label already says WALL or AIR (`progress.md`). Do not bring them back.
- Sparks, tyre smoke and landing dust on tarmac. They need art direction with a visual review and are listed in `plans/README.md` under "Findings without a plan".
- A live time delta between checkpoints. See "Maintenance notes".
- Grand Prix ranking. Penalties already count: `rank` in `src/sim/race.js` orders finished cars by `total`, which includes the penalty.

## Git workflow

- Branch: `advisor/007-reward-ladder-and-hud-calls` from the branch that holds plans 001 and 005.
- One commit per step, for example `feat(hud): FINAL LAP and lost-place toasts`.
- Do NOT push.

## Steps

### Step 1: A bigger toast for bigger moments

In `src/style.css`, after the `.toast small` rule:

```css
.toast.big { font-size: 26px; padding: 16px 28px; }
```

In `handleEvents` in `src/main.js`, change only the colour argument of four toasts:

| Event | Today | After |
|---|---|---|
| `land`, quality `perfect` | `'good'` | `e.tricks.length >= 2 ? 'gold big' : 'good'` |
| `clear` | `e.hard ? 'white' : 'good'` | `e.hard ? 'white' : e.mult >= 3 ? 'gold big' : 'good'` |
| `pass`, gained | `` hud.toast(`P${race.pos}`, 'good') `` | `` hud.toast(`P${race.pos}`, race.pos === 1 ? 'gold big' : 'good', race.pos === 1 ? 'LEADING' : '') `` |
| `lap` | `e.invalid ? 'red' : improved && !first ? 'good' : 'white'` | `e.invalid ? 'red' : improved && !first ? 'gold' : 'white'` |

For the `lap` toast also change the sub text for an improved lap: `` e.invalid ? `${fmt(e.t)} · INVALID` : improved && !first ? `${fmt(e.t)} · BEST LAP` : fmt(e.t) ``.

**Verify**: `grep -c "gold big" src/main.js` → 3. `grep -c "BEST LAP" src/main.js` → 1. `npm test` → exit 0.

### Step 2: FINAL LAP, and a toast for a lost place

In the `lap` case:

```js
        if (e.lap < current.laps) { audio.event('lap', e.lap + 1); if (e.lap + 1 === current.laps) { audio.event('final_lap'); hud.toast('FINAL LAP', 'white'); } }
```

In the `pass` case, replace `else audio.event('overtaken');` with:

```js
else { hud.toast(`P${race.pos}`, 'red'); audio.event('overtaken'); }
```

**Verify**: with `npm start` running, collect every toast of a Pad Grand Prix on autopilot (about two minutes):

```sh
node tools/smoke.mjs '?venue=pad&event=gp&autostart&autopilot' --until racing --timeout 60 --eval '(async () => { const seen = new Set(), t0 = performance.now(); while (window.__cap.mode === "race" && performance.now() - t0 < 200000) { for (const t of document.querySelectorAll("#toasts .toast")) seen.add(t.firstChild.textContent + (t.classList.contains("big") ? " [big]" : "")); await new Promise((r) => setTimeout(r, 60)); } return [...seen]; })()'
```

→ the list contains `FINAL LAP`, `LAP 1`, `LAP 2`, and at least one `P<n>` entry. If the autopilot takes the lead it also contains `P1 [big]`.

### Step 3: The penalty toast shows the running total

In the `track_limits` case, wherever the sub text is `` `+${e.gain.toFixed(1)} S PENALTY` ``, replace it with:

```js
`+${e.gain.toFixed(1)} S · TOTAL ${race.penalty.toFixed(1)} S`
```

The sim adds the penalty before it emits the event, so `race.penalty` already includes this breach.

**Verify**: `grep -c "TOTAL \${race.penalty.toFixed(1)} S" src/main.js` → 1.

### Step 4: WRONG WAY

In `src/hints.js`, add at the end:

```js
export const wrongWay = (track, c) => c.mode !== 0 && c.speed > 5 && c.fx * track.T[c.hint * 3] + c.fy * track.T[c.hint * 3 + 1] + c.fz * track.T[c.hint * 3 + 2] < -0.5;
```

Add to `tests/hints.test.js` (it already has `world` and imports `createRace`; add `wrongWay` to its `../src/hints.js` import and add `import { placeCar } from '../src/sim/drive.js';`):

```js
test('a car driving against the track is flagged, and one driving with it is not', () => {
  const c = createRace(world, { event: TT }).car;
  placeCar(c, world.track, 200, 30);
  assert.equal(wrongWay(world.track, c), false);
  c.fx = -c.fx; c.fy = -c.fy; c.fz = -c.fz;
  assert.equal(wrongWay(world.track, c), true);
  c.speed = 2;
  assert.equal(wrongWay(world.track, c), false);
});
```

In `src/hud.js`: extend the import from `./hints.js` with `wrongWay`, add `wrong = 0` to the `let` line that holds `brake`, set `wrong = 0;` in `begin` next to `brake = false;`, and change the state label lines in `update` to:

```js
      brake = !!line && settings.cue && race.phase === 'racing' && brakeCue(line, track.lap, c, brake);
      wrong = track.closed && race.phase === 'racing' && wrongWay(track, c) ? wrong + dt : 0;
      const st = c.mode === 0 ? `AIR${altText}` : c.uy < 0.3 ? (c.uy < -0.5 ? 'INVERTED' : 'WALL') : wrong > 1 ? 'WRONG WAY' : brake ? 'BRAKE' : '';
      setText(els.state, st);
      toggle(els.state, 'warn', st === 'WRONG WAY' || st === 'BRAKE');
      toggle(els.speed, 'warn', st === 'BRAKE');
```

The label appears after one second of driving against the track, so a spin does not flash it.

**Verify**: `node --test tests/hints.test.js` → all pass, one more test than before. `npm test` → exit 0.

### Step 5: The ideal lap and where the time went

Write the test first. Create `tests/time.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lapReview } from '../src/time.js';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

test('the ideal lap adds the best of each sector, and the worst sector is named', () => {
  const splits = [1000, 2000, 3000, 3900, 5000, 6000, 6950, 7900, 8800];
  const r = lapReview(splits, 3);
  assert.equal(r.ideal, 900 + 950 + 900);
  assert.deepEqual(r.worst, { lap: 2, sector: 2, loss: 150 });
});

test('the standing-start sector never sets the ideal and is never the worst', () => {
  const r = lapReview([5000, 6000, 7000, 7900, 8900, 9900], 3);
  assert.equal(r.ideal, 900 + 1000 + 1000);
  assert.notDeepEqual([r.worst.lap, r.worst.sector], [1, 1]);
});

test('one lap gives no review', () => {
  assert.deepEqual(lapReview([1000, 2000, 3000], 3), { ideal: 0, worst: null });
});

test('a bot time trial has an ideal lap no slower than its best flying lap', () => {
  const world = loadWorld('pad'), ev = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
  const race = createRace(world, { event: ev }), inp = createInput();
  while (race.phase !== 'finished' && race.tick < 120 * 200) { botInput(race, inp, 1); stepRace(race, inp); race.events.length = 0; }
  const r = lapReview(race.splits, ev.perLap);
  assert.ok(r.ideal > 0 && r.ideal <= Math.min(...race.laps.slice(1)), `ideal ${r.ideal}, laps ${race.laps}`);
  assert.ok(r.worst.loss >= 0);
});
```

**Verify**: `node --test tests/time.test.js` → fails, `lapReview` is not exported.

Then add to the end of `src/time.js`:

```js
export function lapReview(splits, per) {
  const laps = Math.floor(splits.length / per), best = new Array(per).fill(Infinity);
  const at = (l, j) => splits[l * per + j] - (l * per + j ? splits[l * per + j - 1] : 0);
  for (let l = 0; l < laps; l++) for (let j = l ? 0 : 1; j < per; j++) best[j] = Math.min(best[j], at(l, j));
  if (laps < 2) return { ideal: 0, worst: null };
  let worst = null;
  for (let l = 0; l < laps; l++) for (let j = l ? 0 : 1; j < per; j++) if (!worst || at(l, j) - best[j] > worst.loss) worst = { lap: l + 1, sector: j + 1, loss: at(l, j) - best[j] };
  return { ideal: best.reduce((a, b) => a + b, 0), worst };
}
```

`ideal` is the sum of the best time through each sector. `worst` is the sector, on any lap, that lost the most against the player's own best through it. The first sector of lap 1 is a standing start and is left out of both.

**Verify**: `node --test tests/time.test.js` → 4 pass. The advisor ran this function and this test against `9ee19cc`: 4 of 4.

Then in `src/main.js`, extend the `./time.js` import with `lapReview`, and in `finishCircuit`, before `showResults(`:

```js
  const review = lapReview(race.splits, ev.perLap);
```

Change the last branch of `note` from `''` to:

```js
review.worst && review.worst.loss > 12 ? `Most time lost in sector ${review.worst.sector} of lap ${review.worst.lap}: ${(review.worst.loss / 120).toFixed(2)} s off your own best.` : ''
```

and add the stat after `Best lap`:

```js
...(review.ideal ? [{ label: 'Ideal lap', value: fmt(review.ideal) }] : []),
```

**Verify**: with `npm start` running:

```sh
node tools/smoke.mjs '?venue=pad&event=tt&autostart&autopilot' --until results --timeout 200 --eval '({ stats: window.__cap.menu.view().board.stats.map((s) => s.label + " " + s.value), note: window.__cap.menu.view().board.note })'
```

→ exit 0, and `stats` has four entries, the third starting `Ideal lap 0:3`. On `9ee19cc` the autopilot's ideal lap on The Pad is 0:37.925 and its worst sector loses 0.11 s. After plan 002 the numbers move a little. `note` is either empty or starts `Most time lost in sector`.

### Step 6: Play the two recorded lines that are never played

In `src/audio.js`, add to the `event` switch next to `final_lap`:

```js
      case 'leading': commentary('leading'); break;
```

In `src/main.js`, add `gasWas = 1, leadAt = 0` to the `let` line that starts `let said = new Set()`. Then change the per-frame block in `draw`:

```js
  if (mode === 'race') {
    hints();
    if (race.phase === 'racing') {
      if (c.mode === 1 && c.uy < -0.5) sayOnce('inverted');
      else if (c.mode === 1 && c.uy < 0.3) sayOnce('wall');
      if (c.boosting && c.gas < 0.2 && time - gasLowAt > 20) { gasLowAt = time; audio.radio('gas_low'); }
      if (c.gas >= 1 && gasWas < 1) sayOnce('gas_full');
      if (race.entries.length > 1 && race.pos === 1) { if (!leadAt) leadAt = time; else if (time - leadAt > 15 && !said.has('leading')) { said.add('leading'); audio.event('leading'); } } else leadAt = 0;
    }
    gasWas = c.gas;
  }
```

`gas_full` plays the first time in a race that the tank climbs back to full. `leading` plays once, after the player has held first place for 15 seconds.

**Verify**: `grep -c "'gas_full'" src/main.js` → 1, `grep -c "'leading'" src/audio.js` → 1. Run the step 2 smoke again → exit 0, `"errors": []`.

### Step 7: Look at it

Capture or watch three moments at 1280x720 and open the frames:

1. A `P1` toast in a Grand Prix: larger than a normal toast, gold, with `LEADING` under it, and inside the screen.
2. `FINAL LAP` right after `LAP 2`: both visible, stacked, not overlapping.
3. The circuit results: four stats in one row, none clipped.

If you cannot capture frames, say so in the report. Do not claim the visual check passed.

### Step 8: Log

Append to `progress.md` a section `## Session <date>: reward ladder and HUD calls (plan 007)`. List the six changes in one line each, with the toast list from step 2 and the stats from step 5.

## Test plan

- `tests/time.test.js` (new, 4 tests): the ideal lap on hand-made splits; the standing-start sector excluded; one lap gives no review; a real bot run.
- `tests/hints.test.js`: one new test for `wrongWay`.
- Steps 1, 2, 3 and 6 are covered by `grep` counts and by the smoke run in step 2, which reads the real toasts off the page. The repo has no DOM test harness.

## Done criteria

- [ ] `npm test` exits 0, with 5 more tests than before this plan
- [ ] The step 2 smoke list contains `FINAL LAP`
- [ ] The step 5 smoke shows a fourth stat starting `Ideal lap`
- [ ] `grep -c "gold big" src/main.js` prints 3
- [ ] `git diff --stat -- src/sim rl server` is empty
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- `src/hints.js` does not exist or `src/hud.js` has no `brake` variable. Plan 005 has not landed.
- `race.splits`, `race.penalty` or `ev.perLap` are missing or mean something else than "Repo facts" says.
- `assets/audio/manifest.json` no longer lists `gas_full` under `radio.lines` or `leading` under `commentary.lines`. Check with `grep -c '"gas_full"\|"leading"' assets/audio/manifest.json` → at least 2.
- The bot test in `tests/time.test.js` fails with an ideal lap slower than the best flying lap. The split layout is not what this plan assumes.

## Maintenance notes

For the owner, after this lands:

- The gold toast is deliberately rare: two or more tricks landed perfectly, a triple-multiplier clear, a best lap, and taking the lead. If it shows too often it stops meaning anything.
- The two voice lines were wired by id. The advisor could not listen to them. If `leading` or `gas_full` says something that does not fit the moment, remove the trigger. It is one line each.
- **Not done: a live delta between checkpoints.** It needs a reference time for every metre of the lap, built from the ghost's run, and a design call on where it sits in the HUD. The data exists: `ghost.race.car.hint` advances with the ghost.
- **Not done: sparks and landing dust on tarmac.** `createDust` in `src/render/fx.js` only emits on terrain and under the thrusters.
- Plan 009 adds a style score. It should reuse the `big` toast class for its own milestones.
- Reviewer: check in the step 2 toast list and in play that a lost place does not spam when two cars run side by side. `pass` events come from `rank` in `src/sim/race.js`. If they repeat within a second, give the red toast a 2 s minimum gap.
