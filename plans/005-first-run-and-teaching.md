# Plan 005: Put a new player in the car and teach every verb

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/main.js src/hud.js src/menu.js src/style.css src/hints.js tests/menu.test.js`
> Plan 001 edits `src/main.js` and `src/menu.js` before you. Plans 002 and 004 may have too. That is expected. `src/hints.js` must not exist yet. Compare the "Current state" excerpts against the live code. On a mismatch in the excerpts themselves, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (one new module with tests, five small edits)
- **Risk**: LOW (no simulation change; saved runs and ghosts stay valid)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`). Works with or without plan 002. See step 2.
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

A new player boots into the Proving Ground with the Daily card selected, and the first press reloads the page onto another venue. If they pick the Time Trial and hold the throttle, the car reaches 148 mph and hits a tyre wall 7 seconds after GO. Nothing warned them, and nothing tells them what to do next. The game has ten verbs and teaches three: one hint at one place on the Proving Ground, one on the Airfield, and one for hover. The Pad and the Launch Complex have none. After this plan a first-time player starts on The Lineup, the shortest and most direct event. The speed turns red and says BRAKE three seconds before a corner that needs it. Hints fire from what the car is doing, on every venue. The garage legend lists every control.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic simulation. **Do not edit anything under `src/sim/` in this plan.** You only read from it.
- Units: metres, seconds, `c.speed` in m/s, one tick is 1/120 s. `c.mode` is 0 in the air, 1 on road, 2 on terrain. `c.air` counts ticks since leaving the ground. `c.uy` is the up component of the car's up vector, so `c.uy < 0.3` means the car is on a wall or ceiling.
- `race.raceTick` is negative in the countdown and 0 at GO. `race.phase` is `countdown`, `racing` or `finished`. `race.dare` exists only for The Lineup and The Ramp.
- `lineFor(track)` (`src/sim/driver.js:15`) returns the rival AI's racing line for a closed circuit. Its `cap` array holds, for each metre of the lap, the highest speed from which a car can still brake for what is ahead. The AI brakes when its speed exceeds `cap`.
- Venues: `proving`, `airfield`, `launch`, `pad`. Events on a venue: its dares first, then `gp`, `tt`, `pr`. `EVENTS[0]` on The Pad is The Lineup.
- Local storage: settings under `voltitude.settings.v2`, the save under `voltitude.save.v<SIM_VERSION>`. `save.hints` counts how often each hint was shown.
- `hud.hint(html)` shows a hint box for 4.5 s. `key(action)` in `src/main.js` returns the bound key as `<kbd>W</kbd>`.
- `input.state.device` is `'keyboard'` or `'gamepad'`, whichever was used last (`src/input.js`).
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. The owner's main checkout had vendored files deleted at planning time.

## Current state

Line numbers are from commit `9ee19cc`. Earlier plans shift them by a few lines.

**Venue choice at boot.** `src/main.js:46-48` and `:57`:

```js
const defaults = { tier: 'pro', assist: true, invertPitch: false, ghost: true, units: 'mph', quality: 'medium', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, rumble: true, session: 'golden', volume: 0.7, music: 0.7, keys: structuredClone(DEFAULT_KEYS) };
const settings = Object.assign(structuredClone(defaults), load(STORE, {}));
settings.keys = Object.assign(structuredClone(DEFAULT_KEYS), settings.keys);
...
const venue = venueOf(params.get('venue') || settings.venue);
```

`settings.venue` is unset until the player switches venue, and `venueOf` falls back to `proving`. Plan 002 may have changed `tier: 'pro'` to another value. Leave that as you find it.

**The board at boot.** `toTitle()` (`src/main.js:329-337`) calls `menu.open('board')`, which leaves the selection on row 0, the Daily card. Row `k` (for `k >= 1`) is `EVENTS[k - 1]`. The boot block (`src/main.js:873-875`):

```js
progress(0.75, 'Compiling shaders…');
toTitle();
pose(carView.root, prev, race.car, 1, interp);
```

`book` (`src/main.js:222`) holds this venue's records. It is an empty object for a player who has finished nothing here.

**Key labels.** `src/main.js:249`:

```js
const key = (a) => `<kbd>${keyLabel((settings.keys[a] || [])[0])}</kbd>`;
```

It always prints the keyboard key. The gamepad mapping is in `src/input.js:72-84`: right trigger throttle, left trigger brake, left stick steer and air pitch, B or X boost, A lift, LB and RB roll, Y reset, Back restart.

**The hints.** `src/main.js:630-653`:

```js
const HINTS = {
  proving: ['gp', 'tt', 'pr'].map((ev) => ({ ev, at: 2150, use: 'air', html: () => `In the air: ${key('throttle')}${key('brake')} tilt the nose. Land on your wheels` })),
  airfield: ['gp', 'tt', 'pr'].map((ev) => ({ ev, at: 150, use: 'boost', html: () => `Hold ${key('boost')} to fire the rear thrusters` })),
}[venue.id] || [];
let hintAt = 0, hoverHint = false;
function hints() {
  if (!race || race.phase !== 'racing') return;
  if (!hoverHint && race.car.mode === 0 && race.car.air > 36 && (save.hints.lift || 0) < 3) {
    ...
  }
  for (const h of HINTS) {
    ...
  }
}
```

`startRace` ends with `hintAt = 0;`. `draw` calls `hints()` every frame while `mode === 'race'`. `touch` (`src/main.js:182`) is the touch-control object or `null`, and `touch.on` is true while its controls are shown. The stylesheet hides the hint box on touch (`src/style.css:251`).

**The state label.** `src/hud.js:39`, `:66-68` and `:184-186`:

```js
  let deltaTimer = 0, hintTimer = 0, lastGas = 1;
...
    begin(event, targetText) {
      track = event.spur ? world.track.spurs[event.spur] : world.track;
      buildMap(event);
...
      const st = c.mode === 0 ? `AIR${altText}` : c.uy < 0.3 ? (c.uy < -0.5 ? 'INVERTED' : 'WALL') : '';
      setText(els.state, st);
      toggle(els.state, 'on', !!st && race.phase === 'racing');
```

`els.state` is a small label above the speed plate. `els.speed` is the speed number. `src/style.css:109` and `:122-124`:

```css
.hint { transform: translateY(8px); margin-bottom: 6px; font: 500 15px/1.3 var(--ui); ...
...
.state { position: absolute; right: 18px; bottom: calc(100% + 10px); font: 600 14px/1 var(--ui); letter-spacing: 0.3em; color: var(--cyan); ...
.state.on { transform: none; }
.state.on { opacity: 1; }
```

The hint box and the state label occupy the same spot. Today they overlap whenever both show.

**Settings rows and the legend.** `src/menu.js:5-7` and `:222`:

```js
export const SETTINGS = [
  { key: 'assist', label: 'Landing assist', note: 'Levels the car in the air. Throttle and brake tilt the nose', type: 'toggle' },
  { key: 'invertPitch', label: 'Invert air pitch', note: 'Pull back to nose down', type: 'toggle' },
...
      const legend = [[[lk('throttle'), lk('brake')], 'drive'], [[lk('left'), lk('right')], 'steer'], [[lk('boost')], 'boost'], [[lk('rollLeft'), lk('rollRight')], 'air roll'], [[lk('restart')], 'restart']];
```

Plan 002 may have reworded the `assist` note. Leave it.

**Trackside braking boards already exist** (`src/render/circuit.js:32-70`): 150, 100 and 50 m boards, each 1.7 m wide, outside the wall. A new player does not see them at 148 mph. This plan does not change them.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| All tests | `npm test` | exit 0, 0 fail |
| One test file | `node --test tests/hints.test.js` | exit 0 |
| Dev server | `npm start` | serves http://localhost:8790/ |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

`tools/smoke.mjs` comes from plan 001. It runs headless Chrome with empty storage, so every run is a first-time player. `--eval` takes a JavaScript expression, awaits it, and prints the result as `"value"`.

## Scope

**In scope**:
- `src/hints.js` (create), `tests/hints.test.js` (create)
- `src/main.js` (the `defaults` line, one line after it, `key`, the hints block, one line in `startRace`, one line in the boot block)
- `src/hud.js` (two imports, one `let`, `begin`, the state label lines in `update`)
- `src/style.css` (two rules)
- `src/menu.js` (one settings row, the legend line)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- Everything under `src/sim/`.
- `src/render/garage-screens.js`. Its hard-coded `ENTER`, `ESC` and `S` labels stay keyboard-only. Making the garage follow the device needs a redraw on device change, which is a separate piece of work.
- `src/touch.js` and hints on touch. Touch controls need a real phone before they are specified.
- `src/render/circuit.js`, the trackside braking boards.

## Git workflow

- Branch: `advisor/005-first-run-and-teaching` from the branch that holds plan 001.
- One commit per step, for example `feat(hints): teach verbs from what the car is doing`.
- Do NOT push.

## Steps

### Step 1: Write the test for the hint rules and the brake cue

Create `tests/hints.test.js` with exactly this content:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';
import { createHints, brakeCue } from '../src/hints.js';

const world = loadWorld('proving');
const TT = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
const airfield = loadWorld('airfield');
const RUNWAY = eventsFor(airfield.track, airfield.venue).find((e) => e.id === 'tt');

function play(script, secs, seen = {}, w = world, event = TT) {
  const race = createRace(w, { event }), inp = createInput(), next = createHints(), out = [];
  for (let t = 0; t < 120 * secs; t++) {
    script(race, inp);
    stepRace(race, inp);
    race.events.length = 0;
    const id = next(race, seen);
    if (id) { seen[id] = (seen[id] || 0) + 1; out.push([id, race.raceTick]); }
  }
  return out;
}

test('on a long straight a player who never boosts is told about boost three seconds in', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 8, {}, airfield, RUNWAY);
  assert.equal(out[0][0], 'boost');
  assert.ok(out[0][1] > 360 && out[0][1] < 480, `boost hint at tick ${out[0][1]}`);
});

test('the boost hint waits when a corner is close, and a stopped car is told about reset', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 30);
  assert.equal(out[0][0], 'reset');
  assert.ok(out[0][1] > 700 && out[0][1] < 1100, `reset hint at tick ${out[0][1]}`);
  assert.ok(out.some(([id]) => id === 'boost'), `hints: ${out.map((h) => h[0])}`);
});

test('hints keep six seconds apart and never repeat within a race', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 60);
  for (let k = 1; k < out.length; k++) assert.ok(out[k][1] - out[k - 1][1] >= 720, `${out[k - 1]} then ${out[k]}`);
  assert.equal(new Set(out.map((h) => h[0])).size, out.length);
});

test('a hint shown three times is never shown again', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 30, { boost: 3, reset: 3, gas: 3 });
  assert.deepEqual(out.filter(([id]) => id === 'boost' || id === 'reset'), []);
});

test('the bot is taught the air verbs in order across its jumps', () => {
  const out = play((race, inp) => botInput(race, inp, 1), 100).map((h) => h[0]).filter((id) => ['air', 'lift', 'flip'].includes(id));
  assert.deepEqual(out.slice(0, 2), ['air', 'lift']);
});

test('the brake cue warns a flat-out driver two seconds before the first corner and stays quiet on the straight', () => {
  const race = createRace(world, { event: TT }), inp = createInput(), line = lineFor(world.track), N = world.track.lap;
  let on = false, first = -1, trouble = -1;
  for (let t = 0; t < 120 * 20 && trouble < 0; t++) {
    inp.throttle = 1;
    stepRace(race, inp);
    if (race.phase === 'racing') {
      on = brakeCue(line, N, race.car, on);
      if (on && first < 0) first = race.raceTick;
      if (race.events.some((e) => e.type === 'scrape' || e.type === 'impact' || e.type === 'wreck')) trouble = race.raceTick;
    }
    race.events.length = 0;
  }
  assert.ok(first > 240, `cue lit on the start straight at tick ${first}`);
  assert.ok(trouble - first > 240, `cue at ${first}, wall at ${trouble}`);
});

test('a driver who brakes only on the cue laps within 8% of the bot', () => {
  const lap = (obey) => {
    const race = createRace(world, { event: TT }), inp = createInput(), line = lineFor(world.track), N = world.track.lap;
    let on = false;
    for (let t = 0; t < 120 * 200 && race.laps.length < 1; t++) {
      botInput(race, inp, 1);
      if (obey) { on = race.phase === 'racing' && brakeCue(line, N, race.car, on); inp.throttle = on ? 0 : 1; inp.brake = on ? 1 : 0; inp.boost = 0; }
      stepRace(race, inp);
      race.events.length = 0;
    }
    return race.laps[0];
  };
  const bot = lap(false), cued = lap(true);
  assert.ok(cued && cued < bot * 1.08, `bot ${bot}, cue driver ${cued}`);
});
```

**Verify**: `node --test tests/hints.test.js` → fails with `Cannot find module` for `src/hints.js`.

### Step 2: Create `src/hints.js`

Create the file with exactly this content:

```js
import { lineFor } from './sim/driver.js';

const GAP = 720, LIMIT = 3;
const RULES = [
  ['reset', (r, c, s) => !r.dare && r.raceTick - s.movedAt > 45],
  ['gas', (r, c) => c.gas < 0.02],
  ['air', (r, c) => c.mode === 0 && c.air > 24],
  ['lift', (r, c, s, seen) => c.mode === 0 && c.air > 36 && seen.air > 0],
  ['flip', (r, c, s, seen) => c.mode === 0 && c.air > 60 && seen.lift > 0],
  ['boost', (r, c, s) => c.mode !== 0 && r.raceTick > 360 && c.speed > 25 && c.gas > 0.5 && !s.boosted && (!s.line || c.speed + 8 < s.line.cap[(c.hint + Math.round(c.speed * 3)) % r.world.track.lap])],
  ['hop', (r, c, s) => c.mode !== 0 && c.gas > 0.3 && !s.hopped && r.entries.some((e) => e !== r && e.prog - r.prog > 4 && e.prog - r.prog < 25 && Math.abs(e.car.lat - c.lat) < 1.6 && c.speed - e.car.speed > 5)],
];

export function createHints() {
  let race = null, s = null;
  return (r, seen) => {
    if (r !== race) { race = r; s = { movedAt: 0, boosted: false, hopped: false, last: -GAP, shown: new Set(), line: r.world.track.closed && !r.dare ? lineFor(r.world.track) : null }; }
    if (r.phase !== 'racing') return null;
    const c = r.car;
    if (c.mode === 0 || c.speed >= 2 || r.raceTick < 360) s.movedAt = r.raceTick;
    s.boosted ||= c.boosting;
    s.hopped ||= c.hopT > 0;
    if (r.raceTick - s.last < GAP) return null;
    for (const [id, when] of RULES) {
      if (s.shown.has(id) || (seen[id] || 0) >= LIMIT || !when(r, c, s, seen)) continue;
      s.shown.add(id);
      s.last = r.raceTick;
      return id;
    }
    return null;
  };
}

export const brakeCue = (line, lap, c, on) => c.mode === 1 && c.uy >= 0.3 && c.speed > line.cap[(c.hint + Math.round(c.speed * 0.5)) % lap] + (on ? 0 : 3);
```

What the rules say, in order of priority:

| Hint | Fires when |
|---|---|
| `reset` | The car has stood still on the ground for 45 ticks, at least 3 s into a race that is not a dare |
| `gas` | The tank is empty |
| `air` | The car has been airborne for 0.2 s |
| `lift` | Airborne for 0.3 s, and the `air` hint has been seen before |
| `flip` | Airborne for 0.5 s, and the `lift` hint has been seen before |
| `boost` | 3 s in, on the ground above 56 mph, tank over half, the player has not boosted this race, and no corner needs braking within 3 s |
| `hop` | A slower rival is 4 to 25 m ahead in the same lane |

A hint shows at most once per race, at most three times ever, and never within 6 s of another.

`brakeCue` is true when the car, on the road and upright, is faster than the AI's braking limit for the point half a second ahead. It turns on at 3 m/s over and stays on until the car is back under.

**The flip rule depends on plan 002.** Run `grep -c "flip" src/input.js`. If it prints 0, plan 002 has not landed and the default settings cannot flip. In that case delete the `['flip', ...]` line from `RULES`. The tests still pass without it.

The advisor ran this module and this test against commit `9ee19cc`: 7 of 7 passed. Measured on the Proving Ground Time Trial with the throttle held: brake cue at tick 506 (4.2 s), wall at tick 855 (7.1 s), reset hint at 7.7 s.

**Verify**: `node --test tests/hints.test.js` → 7 pass. If plan 002 has landed, a pinned car resets sooner and the wall tick moves. The test bounds allow for that. If `the boost hint waits...` still fails, read the tick in the message and report it. Do not widen the bound past 1300.

### Step 3: Start a first-time player on The Pad, with The Lineup selected

In `src/main.js`, add one line right after `settings.keys = Object.assign(...)`:

```js
if (!settings.venue) { settings.venue = load(SAVE, null) ? 'proving' : 'pad'; store(STORE, settings); }
```

A player with no stored venue and no save is new, and gets The Pad. A player with a save but no stored venue has been playing the Proving Ground, and stays there. The choice is stored, so it does not flip on the next visit.

In the boot block, add one line right after the `toTitle();` call that follows `progress(0.75, 'Compiling shaders…');`:

```js
if (!Object.keys(book).length) { menu.open('board', { index: 1 }); current = EVENTS[0]; }
```

A player with no result at this venue starts on its first event, not on the Daily card. The Daily card is one press up.

**Verify**: with `npm start` running:

```sh
node tools/smoke.mjs '' --until boot --eval '({ venue: JSON.parse(localStorage.getItem("voltitude.settings.v2")).venue, event: window.__cap.current.id, index: window.__cap.menu.view().board.index })'
```

→ `"venue": "pad"`, `"event": "lineup"`, `"index": 1`.

```sh
node tools/smoke.mjs '?venue=proving' --until boot --eval '({ event: window.__cap.current.id, index: window.__cap.menu.view().board.index })'
```

→ `"event": "gp"`, `"index": 1`.

```sh
node tools/smoke.mjs '?venue=pad&daily&day=2026-11-09' --until racing --timeout 60 --eval 'window.__cap.dailyRun'
```

→ exit 0 and `"value": true`. This is plan 001's daily check. It proves the new boot line does not override a daily start.

### Step 4: Key labels follow the device

In `src/main.js`, replace the `key` line:

```js
const PAD_KEYS = { throttle: 'RT', brake: 'LT', boost: 'B', lift: 'A', rollLeft: 'LB', rollRight: 'RB', reset: 'Y', restart: 'BACK' };
const onPad = () => input.state.device === 'gamepad';
const key = (a) => `<kbd>${onPad() ? PAD_KEYS[a] : keyLabel((settings.keys[a] || [])[0])}</kbd>`;
```

`input` is declared earlier in the file (`const input = createInput(settings);`). `key` is only called while a race runs.

**Verify**: `grep -c "PAD_KEYS\[a\]" src/main.js` → 1. `npm test` → exit 0.

### Step 5: Replace the position hints with the rule-driven ones

In `src/main.js`:

1. Add `import { createHints } from './hints.js';` below the `./hud.js` import.
2. Replace the whole block from `const HINTS = {` through the closing brace of `function hints()` with:

```js
const HINT_HTML = {
  boost: () => `Hold ${key('boost')} to fire the rear thrusters`,
  air: () => `In the air: ${onPad() ? '<kbd>LS</kbd>' : key('throttle') + key('brake')} tilt the nose. Land on your wheels`,
  lift: () => `Hold ${key('lift')} in the air to hover`,
  flip: () => `${onPad() ? 'Push <kbd>LS</kbd> all the way' : `Hold ${key('brake')} alone`} to flip. ${key('rollLeft')}${key('rollRight')} roll`,
  hop: () => `Tap ${key('lift')} on the ground to hop over a rival`,
  reset: () => `${key('reset')} puts you back on the road`,
  gas: () => 'Tank empty. Near misses, clean landings and drafting refill it',
};
const nextHint = createHints();
function hints() {
  const id = touch?.on ? null : nextHint(race, save.hints);
  if (!id) return;
  save.hints[id] = (save.hints[id] || 0) + 1;
  persist();
  hud.hint(HINT_HTML[id]());
}
```

3. Delete the line `hintAt = 0;` at the end of `startRace`.

If you removed the `flip` rule in step 2, remove the `flip` entry here too.

The hint counters `air`, `boost` and `lift` keep their old names in the save, so a player who has seen those three times is not shown them again.

**Verify**: `grep -n "hintAt\|hoverHint\|const HINTS" src/main.js` → no match. `npm test` → exit 0.

### Step 6: The brake cue

In `src/hud.js`:

1. Add two imports below the existing ones:

```js
import { lineFor } from './sim/driver.js';
import { brakeCue } from './hints.js';
```

2. Extend the `let` line: `let deltaTimer = 0, hintTimer = 0, lastGas = 1, line = null, brake = false;`
3. In `begin`, right after `buildMap(event);`:

```js
      line = track.closed && event.kind !== 'dare' ? lineFor(track) : null;
      brake = false;
```

4. In `update`, replace the `const st = ...` and `setText(els.state, st);` lines:

```js
      brake = !!line && settings.cue && race.phase === 'racing' && brakeCue(line, track.lap, c, brake);
      const st = c.mode === 0 ? `AIR${altText}` : c.uy < 0.3 ? (c.uy < -0.5 ? 'INVERTED' : 'WALL') : brake ? 'BRAKE' : '';
      setText(els.state, st);
      toggle(els.state, 'warn', brake);
      toggle(els.speed, 'warn', brake);
```

The cue is off in the dares. The Lineup wants top speed at the kicker, and the AI line slows there.

In `src/style.css`:

1. In the `.hint` rule, change `margin-bottom: 6px` to `margin-bottom: 34px`. This lifts the hint box clear of the state label.
2. Add after the two `.state.on` rules: `.state.warn, .speed span.warn { color: var(--red-hot); }`

In `src/main.js`, add `cue: true` to the `defaults` object, after `assist: true`.

In `src/menu.js`, add a row to `SETTINGS` right after the `assist` row:

```js
  { key: 'cue', label: 'Brake cue', note: 'Shows BRAKE above the speed when you are too fast for the next corner', type: 'toggle' },
```

**Verify**: `npm test` → exit 0 (the menu tests find rows by key, so the new row does not break them). Then, with `npm start` running, hold the throttle on the Proving Ground and log the HUD:

```sh
node tools/smoke.mjs '?venue=proving&event=tt&autostart' --until racing --timeout 60 --eval '(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" })); const log = []; let last = ""; const t0 = performance.now(); while (performance.now() - t0 < 14000) { const c = window.__cap, st = document.getElementById("state"), h = document.getElementById("hint"); const now = `state=[${st.classList.contains("on") ? st.textContent : ""}${st.classList.contains("warn") ? "!" : ""}] hint=[${h.classList.contains("on") ? h.textContent : ""}]`; if (now !== last) { log.push(`${(c.race.raceTick / 120).toFixed(1)}s ${now}`); last = now; } await w(30); } return log; })()'
```

The advisor's output on `9ee19cc` with these changes:

```
"0.0s state=[] hint=[]",
"4.3s state=[BRAKE!] hint=[]",
"7.2s state=[] hint=[]",
"7.8s state=[] hint=[Backspace puts you back on the road]",
"12.3s state=[] hint=[]"
```

Required:
- One entry with `state=[BRAKE!]` at a time between 3.5 s and 5.5 s.
- A later entry whose hint contains `puts you back on the road`.
- No entry before the `BRAKE!` entry has a hint that contains `thrusters`.

With plans 002 and 004 landed, a `RESET` toast and an earlier auto-reset change the times after the wall. The three requirements still hold.

### Step 7: The legend lists every control

In `src/menu.js`, replace the `legend` line:

```js
      const legend = [[[lk('throttle'), lk('brake')], 'drive'], [[lk('left'), lk('right')], 'steer'], [[lk('boost')], 'boost'], [[lk('lift')], 'hop · hover'], [[lk('rollLeft'), lk('rollRight')], 'air roll'], [[lk('reset')], 'reset'], [[lk('restart')], 'restart']];
```

The advisor rendered this at 1280x720: the line ends at about 82% of the board's width.

**Verify**:

```sh
node tools/smoke.mjs '' --until boot --eval 'window.__cap.menu.view().board.legend.map((l) => l[0].join(" ") + " " + l[1]).join(" | ")'
```

→ `"W S drive | A D steer | Shift boost | Space hop · hover | Q E air roll | Backspace reset | R restart"`.

### Step 8: Look at it

Take three screenshots with `tools/capture.mjs` or any headless browser you have, at 1280x720, and open each one:

1. The garage right after boot. The legend line sits fully inside the board, on one row.
2. `?venue=proving&event=tt&autostart` with the throttle held, 5 s after GO. `BRAKE` is above the speed plate in red, and the speed number is red.
3. `?venue=pad&event=lineup&autostart` with the throttle held, 3.5 s after GO. The hint box `Hold Shift to fire the rear thrusters` sits above the speed plate and does not touch the plate or any label.

If you cannot take screenshots, say so in the report. Do not claim the visual check passed.

### Step 9: Log

Append to `progress.md` a section `## Session <date>: first run and teaching (plan 005)`. Give the smoke outputs from steps 3, 6 and 7, the test count, and whether the `flip` rule is in.

## Test plan

- `tests/hints.test.js` (new, 7 tests): the boost hint on a straight; the boost hint held back near a corner, and the reset hint; spacing and no repeats; the three-times limit; the order of the air hints; the brake cue's lead over the first wall; a cue-only driver's lap time.
- Written before the module, seen failing on the missing import.
- The `main.js`, `hud.js` and CSS edits are covered by the smoke commands in steps 3, 6 and 7 and by the screenshots in step 8. The repo has no DOM test harness.

## Done criteria

- [ ] `npm test` exits 0, with 7 more tests than before this plan
- [ ] `node tools/smoke.mjs '' --until boot --eval ...` from step 3 prints `pad`, `lineup`, `1`
- [ ] The step 6 smoke log meets its three requirements
- [ ] The step 7 smoke prints the seven-part legend
- [ ] `grep -n "hintAt\|hoverHint\|const HINTS" src/main.js` returns no match
- [ ] `git diff --stat -- src/sim rl server` is empty
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- `src/hints.js` already exists.
- `lineFor(track).cap` is missing or is not an array of one speed per metre of lap (`src/sim/line.js`, `speedProfile`).
- `race.entries`, `e.prog`, `c.lat`, `c.hopT` or `c.air` no longer exist under those names. The rules read them.
- The cue-only driver test fails. That means the cue no longer tracks the AI's braking, and a red BRAKE label would mislead the player.
- A step seems to need an edit under `src/sim/`.
- The step 3 daily check prints `false` or times out. The boot line is fighting plan 001's daily autostart.

## Maintenance notes

For the owner, after this lands:

- **The default venue for a new player is now The Pad.** If that is not what you want, change `'pad'` in the one line from step 3.
- The brake cue is on by default and has a toggle in Settings. It follows the AI's braking limit, so it is late for a beginner and exact for an expert. `0.5` (seconds of lead) and `3` (m/s of margin) in `brakeCue` are the two knobs.
- The cue lights about 30% of a clean lap, because a corner's limit holds through the corner. It reads as "too fast for here", not only "brake now".
- Hint wording is the owner's call. Every string is in `HINT_HTML` in `src/main.js`.
- Not done here: hints on touch (the hint box is hidden there), a gamepad legend in the garage, and the garage's `ENTER` and `ESC` labels on a gamepad.
- Seen while testing: on The Lineup, a player who holds the throttle and does not steer drifts onto the grass by the left fence within 4 s. Plan 006 looks at the Lineup's start.
- If a later plan changes how `cap` is built in `src/sim/line.js`, re-run `tests/hints.test.js`.
- Reviewer: check that `hints()` no longer runs on touch, and that `save.hints` is only written when a hint is shown.
