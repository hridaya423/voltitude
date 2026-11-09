# Plan 002: Fix the sim rules that fight the player (one version bump)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim src/input.js src/touch.js src/main.js src/menu.js tests tools/ai-bench.mjs assets/ghosts`
> Plan 001 edits `src/main.js`, `src/menu.js` and `src/input.js` before you. That is expected. For every other file, compare the "Current state" excerpts against the live code. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (ten rule changes, each small, plus re-baked ghosts)
- **Risk**: MED (every change alters the deterministic sim; the rival AI runs on the same code)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`)
- **Category**: bug
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

Ten rules in the simulation work against the person holding the controller. Flips cannot be done with the default settings, yet the game asks for them. An empty tank switches off all air control. A car that stops against a wall sits for two seconds. The HUD announces a speed penalty that the sim does not apply. A manual reset hands out free gas, which the daily board will rank. One track-limit breach throws away a four-minute Time Trial. All ten are in sim code, and any sim change invalidates recorded runs, so they land together under one `SIM_VERSION` bump.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation. The browser, the node tests and the Cloudflare Worker in `server/` all run the same files. A recorded run stores inputs only and is replayed through the sim, so **any behaviour change breaks every stored run**. That is what `SIM_VERSION` (`src/sim/race.js:9`, currently `14`) is for.
- Units: metres, seconds, `c.speed` in m/s. One tick is 1/120 s. `c.mode` is 0 in the air, 1 on road, 2 on terrain.
- A car has basis vectors `f` (forward), `u` (up), `r` (right), stored as `c.fx, c.fy, c.fz` and so on.
- Rivals run through the same `stepCar` as the player. A change that looks player-only can change AI lap times.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No wrapper function with a single caller. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. The owner's main checkout had vendored files deleted at planning time.

## Current state

Line numbers are from commit `9ee19cc`.

**The input record.** `src/sim/race.js:21-40`:

```js
const IDLE = { throttle: 0, brake: 0.3, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 };
...
export function createInput() {
  return { throttle: 0, brake: 0, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 };
}

export function packInput(inp, out, o) {
  out[o] = quantize(inp.throttle); out[o + 1] = quantize(inp.brake); out[o + 2] = quantize(inp.steer);
  out[o + 3] = quantize(inp.pitch); out[o + 4] = Math.sign(inp.roll) | 0;
  out[o + 5] = (inp.boost ? 1 : 0) | (inp.reset ? 2 : 0) | (inp.lift ? 4 : 0);
}

export function unpackInput(buf, o, inp) {
  inp.throttle = buf[o] / 127; inp.brake = buf[o + 1] / 127; inp.steer = buf[o + 2] / 127;
  inp.pitch = buf[o + 3] / 127; inp.roll = buf[o + 4];
  inp.boost = buf[o + 5] & 1; inp.reset = (buf[o + 5] >> 1) & 1; inp.lift = (buf[o + 5] >> 2) & 1;
```

**Air control.** `src/sim/drive.js:480-497`:

```js
if (airborne) {
  let tp = inp.pitch * T.pitchRate, ty = c.lifting ? 0 : inp.steer * T.yawRate, tr = inp.roll * T.rollRate;
  if (assist && inp.roll === 0) {
    const [hx, hy, hz] = upHint(c, track);
    const ex = c.uy * hz - c.uz * hy, ey = c.uz * hx - c.ux * hz, ez = c.ux * hy - c.uy * hx;
    tp = Math.max(-2.2, Math.min(2.2, ((ex * c.rx + ey * c.ry + ez * c.rz) + inp.pitch * 0.45) * 3));
    if (c.air > 8 || c.lifting) tr = Math.max(-2.2, Math.min(2.2, (ex * c.fx + ey * c.fy + ez * c.fz) * 3));
  }
  ...
  for (let a = 0; a < 3 && c.gas > 0; a++) {
    const acc = Math.max(-T.attitude[a], Math.min(T.attitude[a], (want[a] - rates[a]) * 14));
```

With `assist` on (the default, `src/main.js:46`), held pitch settles at 27° of rotation. Measured on a 2.2 s fall: 0.47 rad with assist, 7.5 rad without. The assist exists because the throttle key is also "nose down" (`src/input.js:68`, `pitch = brake - throttle`), and a racer holds throttle through every jump. The `c.gas > 0` condition on the loop removes all rotation, including the assist's levelling, when the tank is empty.

**Hop.** `src/sim/drive.js:455-467`:

```js
const tap = !!inp.lift && !c.liftHeld;
c.liftHeld = !!inp.lift;
c.hopT = Math.max(0, c.hopT - DT);
c.lifting = false;
if (tap && !airborne && c.hopT === 0 && c.gas >= T.hopGas) {
  c.vx += c.ux * T.hopDv; c.vy += c.uy * T.hopDv; c.vz += c.uz * T.hopDv;
  c.gas -= T.hopGas; c.hopT = T.hopCool; c.lifting = true; c.hopped = true;
} else if (inp.lift && airborne && c.gas > 1e-4) {
```

`airborne` is `hits === 0` on this tick (`drive.js:362`). A tap one tick after the wheels leave becomes a hover. A tap during the 0.6 s cooldown is lost.

**Landing.** `src/sim/drive.js:556-558` inside `landing()`:

```js
const quality = align > 0.95 && vn < 16 ? 'perfect' : align > 0.8 && vn < 24 ? 'clean' : 'hard';
if (quality === 'hard') tricks.length = 0;
if (quality === 'hard' || tricks.length || !c.hopped) c.ev.push({ type: 'land', quality, air: airS, tricks, v: vn, hop: c.hopped });
```

`src/main.js:725` shows `hud.toast('HARD LANDING', 'red', '−10% SPEED')`. Nothing scales the speed.

**Walls.** `src/sim/drive.js:152` has `const WALL_HIT = 1, WALL_DRAG = 4 * G, WALL_GRACE = 30, WALL_RAMP = 36, WALL_WRECK = 25;`. In `collide()`, line 584 calls `impulse(...)`, which already removes the velocity into the wall, and line 593 then subtracts `WALL_HIT * press` from the total speed again. Measured at 60 m/s: a 20° hit leaves 32 m/s.

**Spin.** `src/sim/drive.js:34` has `yawRate: 2.4`. `drive.js:540` is `export const turns = (acc) => Math.floor((Math.abs(acc) + 0.9) / TAU);`, so one spin needs 5.38 rad. A 2.2 s flight with yaw held gives 4.9 rad.

**Stuck timer.** `src/sim/race.js:20` has `const STILL = 240, SINK = 6, AIR_RUNUP = 100;`. `race.js:205` and `:212`:

```js
e.still = race.raceTick > 360 && c.speed < 2 ? e.still + 1 : 0;
...
else if (e.lost > 60 || e.still > STILL) respawn(race, e);
```

`c.wallT` counts consecutive ticks pressed against a wall or tyre barrier (`drive.js:589`). A car that hits a tyre wall below `TYRE_WRECK = 45` m/s of closing speed stops dead and waits the full 240 ticks.

**Respawn gas.** `src/sim/race.js:132-145`:

```js
function respawn(race, e, from = e.lastIdx, fromSpeed = e.lastSpeed) {
  ...
  placeCar(c, track, i, speed, e.driver ? lineFor(track).off[i] : 0);
  c.gas = Math.max(c.gas, RESPAWN_GAS);
```

and the manual reset at `race.js:450-451`: `if (race.event.dare !== 'ramp') respawn(race, race, race.cpIdx, race.cpSpeed);`. `RESPAWN_GAS` is 0.15. Pressing reset just after a checkpoint with an empty tank costs about 2 m and gives 0.6 s of boost. Measured: 1.2 free tanks over an Airfield race, more than the 1.08 the race pays out.

**Track limits.** `src/sim/race.js:216-224`:

```js
if (breach?.gain >= MIN_GAIN) {
  const gp = race.event.kind === 'gp';
  if (gp) e.penalty += breach.gain;
  else if (!e.invalid.includes(e.laps.length)) e.invalid.push(e.laps.length);
  if (e === race) emit(race, 'track_limits', { gain: breach.gain, penalty: gp });
}
```

`src/main.js:546-556` in `finishCircuit` then refuses the record and the medal for a Time Trial with any invalid lap:

```js
const invalid = !gp && me.invalid.length > 0;
const score = gp ? me.pos : race.total;
const record = !invalid && (!prevBest || score < prevBest);
if (record) { book[ev.id] = gp ? { best: score } : { best: score, run: lastRun }; persist(); }
const m = invalid ? null : gp ? PODIUM[me.pos - 1] || null : medalFor(race.total, authorTime(ev.id));
...
} else if (invalid) {
  delta = { text: `Track limits · ${me.invalid.length === 1 ? 'one lap' : `${me.invalid.length} laps`} invalid, time not counted`, tone: 'bad' };
```

`finishEntry` (`race.js:156-162`) already adds `e.penalty` to the total: `e.total = race.raceTick + Math.round(e.penalty * 120);`.

**Difficulty.** `src/sim/race.js:10`: `export const TIERS = Object.freeze({ easy: 0.94, pro: 0.98, elite: 1 });`. `src/main.js:46` defaults to `tier: 'pro'`. `src/menu.js:9` lists the options `[['easy', 'EASY'], ['pro', 'PRO'], ['elite', 'ELITE']]`. `tools/ai-bench.mjs:6` has `const BEHIND = { easy: [1.025, 1.08], pro: [1.003, 1.04] };` and iterates `Object.keys(TIERS)`, so a new tier needs a band there. Measured: a bot at skill 0.88 with perfect steering and no wrecks finished P5 and P7 on Easy at Proving Ground.

**Bots and pitch.** Only two places in the AI set `inp.pitch`: `src/sim/driver.js:302` (`inp.pitch = air.miss ? 1 : 0;`) and `src/sim/bot.js:49`. Neither will set the new `flip` input, so step 2 does not change how they fly. Both bots clear the input record at the top of each call, and the browser reuses one record for the player and the autopilot (`src/main.js:772-774`), so each reset line needs `flip` added:

- `src/sim/driver.js:151`: `inp.pitch = 0; inp.roll = 0; inp.reset = 0; inp.boost = 0; inp.lift = 0;`
- `src/sim/bot.js:27`: `inp.pitch = 0; inp.roll = 0; inp.reset = 0; inp.lift = 0;`

**Test patterns to copy.** `tests/physics.test.js` builds a flat test world with `const lab = flatWorld();` and drives a bare car:

```js
test('a full tank gives 2.3 to 2.7 s of hover', () => {
  const c = createCar();
  placeCar(c, lab.track, 600, 0, 0);
  c.y += 40;
  let ticks = 0;
  const inp = createInput();
  inp.lift = 1;
  for (let t = 0; t < 120 * 5; t++) { stepCar(c, inp, lab, t, true); if (c.lifting) ticks++; }
  assert.ok(ticks / 120 > 2.3 && ticks / 120 < 2.7, `${(ticks / 120).toFixed(2)} s`);
});
```

The last argument of `stepCar` is `assist`. Car events arrive in `c.ev` (an array you clear yourself). `tools/physics-lab.mjs` exports `wallScrape(deg, v, secs)` returning `{ speed, wrecked }`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| One test file | `node --test tests/physics.test.js` | exit 0 |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Exploit patterns | `node tools/exploits.mjs <venue>` for `proving`, `airfield`, `launch`, `pad` | prints PASS |
| AI bench | `node tools/ai-bench.mjs 5 <venue>` | a JSON block per tier with `pass` flags |
| Re-bake author ghosts | `node tools/medals.mjs all` | one line per event, no throw |
| Browser smoke | `node tools/smoke.mjs '<query>' --until results` (needs `npm start` running) | exit 0 |

## Scope

**In scope**:
- `src/sim/drive.js`, `src/sim/race.js`
- `src/input.js`, `src/touch.js` (the new `flip` input only)
- `src/main.js` (`finishCircuit`, the `track_limits` toast, the `defaults` line)
- `src/menu.js` (the `tier` options and the `assist` note text)
- `tools/ai-bench.mjs` (the `BEHIND` table only)
- `tests/physics.test.js`, `tests/sim.test.js`, `tests/limits.test.js`
- `assets/ghosts/*.json` (rewritten by `tools/medals.mjs`, never by hand)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `src/sim/driver.js`, `src/sim/bot.js`, `src/sim/line.js`: the rival AI. The single exception is the `inp.flip = 0;` reset in step 2. If a gate fails because of AI behaviour, stop.
- `src/sim/lineup.js` and the dare rules in `race.js` (`dareStep`, `rampStep`, `clip`): plan 006 owns them.
- `src/sim/gas.js` amounts and the `NEAR`/`DRAFT` constants in `race.js`: plan 009 owns them.
- `server/`: the Worker imports the sim and needs a redeploy after this plan. The owner does that.
- `docs/launch/ghost-links.md`: its three links carry version-14 runs and will stop loading. Report it. Do not regenerate them.

## Git workflow

- Branch: `advisor/002-sim-rules-batch` from the branch that holds plan 001.
- One commit per step, for example `fix(sim): air control works on an empty tank`. The ghost re-bake is its own commit: `chore(ghosts): re-bake author runs for sim 15`.
- Do NOT push. Do NOT run `wrangler`.

## Steps

### Step 0: Record the baseline

Before any edit, save the gate outputs so you can tell a regression from a known failure:

```sh
mkdir -p /tmp/plan002 && npm test > /tmp/plan002/test-before.txt 2>&1; echo "tests exit $?"
for v in proving airfield launch pad; do node tools/exploits.mjs $v > /tmp/plan002/exploits-$v-before.txt 2>&1; echo "$v exploits exit $?"; done
for v in proving launch; do node tools/ai-bench.mjs 5 $v > /tmp/plan002/bench-$v-before.txt 2>&1; echo "$v bench exit $?"; done
```

**Verify**: tests exit 0. Exploits print PASS for all four venues. The Proving bench passes on every tier. The Launch bench is known to fail one check, `air`, on every tier at this commit (logged in `progress.md`, launch gate 4c). Any other baseline failure is a STOP condition.

### Step 1: Bump the version first

`src/sim/race.js:9`: `export const SIM_VERSION = 15;`

Author ghosts are now stale, and some tests replay them. Expect ghost-replay tests to fail until step 12. Run `npm test 2>&1 | grep "^not ok\|✖" > /tmp/plan002/after-bump.txt` and keep the list: these are the tests the re-bake must turn green again.

**Verify**: `grep -n "SIM_VERSION = 15" src/sim/race.js` → one match.

### Step 2: A flip input that the assist respects

Add a `flip` flag to the input record. When it is set, the landing assist steps aside and pitch runs at the full rate. The keyboard sets it from the brake key, because nobody brakes in the air. A gamepad sets it from a full stick push.

1. `src/sim/race.js`: add `flip: 0` to the `IDLE` object and to the object returned by `createInput()`.
2. `packInput`: `out[o + 5] = (inp.boost ? 1 : 0) | (inp.reset ? 2 : 0) | (inp.lift ? 4 : 0) | (inp.flip ? 8 : 0);`
3. `unpackInput`: append `inp.flip = (buf[o + 5] >> 3) & 1;` to the last line.
4. `src/sim/drive.js:482`: change the condition to `if (assist && inp.roll === 0 && !inp.flip) {`. Leave the block body alone. With `flip` set, `tp` keeps its initial value `inp.pitch * T.pitchRate`.
5. `src/input.js` in `poll()`:
   - Add `flip: 0` to the initial `state` object on line 31.
   - After line 70 (`let boost = ...`), add `let flip = brake && !throttle ? 1 : 0;`
   - Inside `if (pad) {`, after the line that sets `pitch` from `ay`, add `if (Math.abs(ay) > 0.85) flip = 1;`
   - Add `flip` to the `Object.assign(state, { ... })` call.
6. `src/touch.js:63`, the dare branch: after `inp.pitch = airborne ? sy : 0;` add `inp.flip = airborne && Math.abs(sy) > 0.85 ? 1 : 0;`. In the circuit branch after `inp.pitch = inp.brake - inp.throttle;` add `inp.flip = inp.brake && !inp.throttle ? 1 : 0;`.
7. `src/menu.js:6`: change the assist note to `'Levels the car in the air. Hold brake in the air to flip'`.
8. `src/sim/driver.js:151` and `src/sim/bot.js:27`: append `inp.flip = 0;` to each reset line. This is the only edit allowed in those two files.

Add to `tests/physics.test.js`:

```js
function fall(inp, assist, gas = 1) {
  const c = createCar();
  placeCar(c, lab.track, 600, 30, 0);
  c.y += 30; c.gas = gas;
  let most = 0, rate = 0;
  for (let t = 0; t < 120 * 2; t++) { stepCar(c, inp, lab, t, assist); if (c.air === 0 && t > 12) break; most = Math.max(most, Math.abs(c.flip)); rate = Math.max(rate, Math.abs(c.wp)); }
  return { most, rate };
}

test('with landing assist on, held pitch tilts and the flip input flips', () => {
  const tilt = fall({ ...createInput(), pitch: 1 }, true).most;
  const flip = fall({ ...createInput(), pitch: 1, flip: 1 }, true).most;
  assert.ok(tilt < 1, `tilt ${tilt.toFixed(2)} rad`);
  assert.ok(flip > 5, `flip ${flip.toFixed(2)} rad`);
});

test('the flip input survives packing', () => {
  const a = { ...createInput(), flip: 1, lift: 1 }, b = createInput(), q = new Int8Array(6);
  packInput(a, q, 0); unpackInput(q, 0, b);
  assert.equal(b.flip, 1);
  assert.equal(b.lift, 1);
  assert.equal(b.boost, 0);
});
```

Add `packInput, unpackInput` to that file's import from `../src/sim/race.js`.

**Verify**: `node --test tests/physics.test.js` → the two new tests pass. `grep -c "flip" src/input.js` → at least `4`.

### Step 3: Air control works on an empty tank

`src/sim/drive.js:492`: change `for (let a = 0; a < 3 && c.gas > 0; a++) {` to `for (let a = 0; a < 3; a++) {`. Line 497 already clamps the burn at zero with `Math.max(0, ...)`.

Add to `tests/physics.test.js`, reusing `fall` from step 2:

```js
test('an empty tank still rotates the car in the air', () => {
  const { rate } = fall({ ...createInput(), pitch: 1 }, false, 0);
  assert.ok(rate > 2.5, `pitch rate ${rate.toFixed(2)} rad/s`);
});
```

**Verify**: `node --test tests/physics.test.js` → pass, including the existing `an empty tank gives no lift`.

### Step 4: Hop gets a buffer and coyote time

In `src/sim/drive.js`:
1. Next to `const AIR_PAD = 40;` (line 151) add `const HOP_BUFFER = 12, HOP_COYOTE = 8;`.
2. Add `hopBuf: 0` to the object in `createCar()` (line 121 holds the other hop fields), and `c.hopBuf = 0;` to `placeCar()` on the line that resets `c.hopT` (line 144).
3. Replace lines 455-462 (from `const tap` through the `} else if (inp.lift && airborne ...` line) with:

```js
const tap = !!inp.lift && !c.liftHeld;
c.liftHeld = !!inp.lift;
c.hopT = Math.max(0, c.hopT - DT);
c.hopBuf = tap ? HOP_BUFFER : Math.max(0, c.hopBuf - 1);
c.lifting = false;
if (c.hopBuf > 0 && (!airborne || (c.air <= HOP_COYOTE && !c.hopped)) && c.hopT === 0 && c.gas >= T.hopGas) {
  c.vx += c.ux * T.hopDv; c.vy += c.uy * T.hopDv; c.vz += c.uz * T.hopDv;
  c.gas -= T.hopGas; c.hopT = T.hopCool; c.lifting = true; c.hopped = true; c.hopBuf = 0;
} else if (inp.lift && airborne && c.gas > 1e-4) {
```

Keep the body of the hover branch as it is.

Add to `tests/physics.test.js`:

```js
test('a hop pressed just before touchdown fires on touchdown', () => {
  const c = createCar(), inp = createInput();
  placeCar(c, lab.track, 600, 0, 0);
  c.y += 1.5;
  let landed = -1, peak = -Infinity;
  for (let t = 0; t < 360; t++) {
    const low = c.y - lab.track.H[600 * 3 + 1] < 0.35;
    inp.lift = landed < 0 && low && c.air > 0 ? 1 : 0;
    stepCar(c, inp, lab, t, true);
    if (landed < 0 && c.air === 0 && t > 6) landed = t;
    if (landed >= 0) peak = Math.max(peak, c.y);
  }
  assert.ok(peak - lab.track.H[600 * 3 + 1] > 3, `peak ${(peak - lab.track.H[600 * 3 + 1]).toFixed(2)} m after touchdown`);
});
```

If this test fails on the unmodified code for the wrong reason (for example the press never happens because `low` is never true while airborne), adjust the 0.35 m threshold until the test fails before your change and passes after. State the value you used in the commit message.

**Verify**: `node --test tests/physics.test.js` → pass, including the four existing hop and hover tests.

### Step 5: A hard landing costs the 10% the HUD announces

`src/sim/drive.js` in `landing()`, replace the line `if (quality === 'hard') tricks.length = 0;` with:

```js
if (quality === 'hard') { tricks.length = 0; c.vx *= 0.9; c.vy *= 0.9; c.vz *= 0.9; }
```

Add a test to `tests/physics.test.js` that drops a car moving at 40 m/s from 25 m with `assist` false and no input, and compares its speed half a second after touchdown against the same drop from 3 m. Assert the high drop produced a `land` event with `quality === 'hard'` in `c.ev`, and that its speed is at most 0.93 of the low drop's speed. Write the test first and confirm it fails before the change.

**Verify**: `node --test tests/physics.test.js` → pass.

### Step 6: One charge for a wall hit

`src/sim/drive.js:152`: lower `WALL_HIT` from `1` to `0.5`.

Add to the existing test `a scrape along the wall costs speed in proportion to its angle, and a hard hit stops the car` in `tests/physics.test.js`:

```js
const graze = wallScrape(20, 60, 0.5).speed / 60;
assert.ok(graze > 0.62, `a 20 deg hit at 60 m/s keeps ${(100 * graze).toFixed(0)}%`);
```

If `graze` is below 0.62 at `WALL_HIT = 0.5`, try `0.4`, then `0.3`. Every other assertion in that test must still pass, in particular `12 deg at 131 mph keeps` between 55% and 90%, and `a head-on hit at 30 m/s wrecks`. If no value in `[0.3, 0.5]` satisfies all of them, stop.

**Verify**: `node --test tests/physics.test.js` → pass.

### Step 7: A spin the air time allows

`src/sim/drive.js:34`: `yawRate: 3.4,`

Add a test: a car dropped from 30 m at 30 m/s with `inp.steer = 1`, `assist` true, records `Math.abs(c.spin)` each tick until landing. Assert the maximum is above 5.4.

**Verify**: `node --test tests/physics.test.js tests/handling.test.js` → pass.

### Step 8: A pinned car resets in half a second

`src/sim/race.js`:
1. Line 20: `const STILL = 240, PINNED = 60, SINK = 6, AIR_RUNUP = 100;`
2. Line 212: `else if (e.lost > 60 || e.still > (e === race && c.wallT > 0 ? PINNED : STILL)) respawn(race, e);`

The `e === race` test limits this to the player. Rivals have their own reverse-out behaviour in `driver.js` and must keep the old timer.

Add to `tests/sim.test.js` a test that creates a Time Trial race on the test world that file already loads, runs the bot until `race.raceTick > 400`, then feeds `{ throttle: 1, steer: 1 }` until the first `scrape` or `impact` event, keeps feeding it, and asserts a `respawn` event arrives within 180 ticks of `race.car.speed` first dropping below 2. If the car never stops (it scrapes along instead), steer at a tyre barrier instead: pick an index `i` where `world.track.runoff.tyreL[i]` or `tyreR[i]` is truthy, `placeCar` the player there facing the barrier at 30 m/s, and run the same assertion.

**Verify**: `node --test tests/sim.test.js` → pass. `tests/handling.test.js` `keyboard presses alone drive a full lap without a respawn or wreck` still passes.

### Step 9: A manual reset gives no gas

`src/sim/race.js`:
1. Line 132: `function respawn(race, e, from = e.lastIdx, fromSpeed = e.lastSpeed, floor = RESPAWN_GAS) {`
2. Line 140: `c.gas = Math.max(c.gas, floor);`
3. Line 451: `if (race.event.dare !== 'ramp') respawn(race, race, race.cpIdx, race.cpSpeed, 0);`

Extend the existing `reset returns the car to the last checkpoint` test in `tests/sim.test.js`: set `race.car.gas = 0;` directly before `inp.reset = 1;`, and after the step assert `race.car.gas === 0`.

**Verify**: `node --test tests/sim.test.js` → pass.

### Step 10: A Time Trial breach costs time, not the run

`src/sim/race.js:218-221`, replace the two lines that branch on `gp` with:

```js
e.penalty += breach.gain;
if (!gp && !e.invalid.includes(e.laps.length)) e.invalid.push(e.laps.length);
if (e === race) emit(race, 'track_limits', { gain: breach.gain, penalty: true });
```

Keep `const gp = race.event.kind === 'gp';`. `e.invalid` stays, and now means only "this lap cannot be the best lap".

`src/main.js` `finishCircuit`:
1. Delete the line `const invalid = !gp && me.invalid.length > 0;`.
2. `const record = !prevBest || score < prevBest;`
3. `const m = gp ? PODIUM[me.pos - 1] || null : medalFor(race.total, authorTime(ev.id));`
4. Delete the whole `else if (invalid) { delta = ... }` branch.
5. Change `const penalty = gp && me.penalty >= 0.05 ? ...` to `const penalty = me.penalty >= 0.05 ? \` · ${me.penalty.toFixed(1)} s track limits\` : '';` and make the `note:` for a Time Trial include it: in the `note:` expression, replace the final `''` (the Time Trial, no linked ghost case) with `penalty.slice(3)`.

`src/main.js:700` (the `track_limits` toast): `e.penalty` is now always true. Simplify to `hud.toast('TRACK LIMITS', 'orange', \`+${e.gain.toFixed(1)} S PENALTY\`); audio.event('miss'); break;`.

`tests/limits.test.js:65-78`: rename the test to `track limits: a race and a time trial both add the time gained to the finish`, and replace its last three lines with:

```js
const tt = run('tt', cutter).race;
assert.ok(tt.invalid.includes(0), 'time trial lap 1 cannot be the best lap');
assert.ok(tt.penalty > 1, `time trial penalty ${tt.penalty.toFixed(2)} s`);
```

**Verify**: `node --test tests/limits.test.js` → pass. `grep -c "time not counted" src/main.js` → `0`.

### Step 11: A Rookie tier, and it is the default

1. `src/sim/race.js:10`: `export const TIERS = Object.freeze({ rookie: 0.88, easy: 0.94, pro: 0.98, elite: 1 });`
2. `src/menu.js:9`: options become `[['rookie', 'ROOKIE'], ['easy', 'EASY'], ['pro', 'PRO'], ['elite', 'ELITE']]`.
3. `src/main.js:46`: `tier: 'rookie'` in `defaults`. Players with saved settings keep their choice.
4. `tools/ai-bench.mjs:6`: run `node tools/ai-bench.mjs 5 proving` once. It will throw or print `undefined` for the rookie band. Read the rookie tier's measured lap ratio from the output (the value compared against the band for `easy` and `pro`), call it `r`, and add `rookie: [r - 0.03, r + 0.03]` rounded to three decimals to `BEHIND`. Record `r` in `progress.md`.

**Verify**: `node tools/ai-bench.mjs 5 proving` → every tier, including rookie, passes every check. `r` must be greater than the `easy` tier's measured ratio. If it is not, stop.

### Step 12: Re-bake the author ghosts and run every gate

1. `node tools/medals.mjs all` → prints one line per event with a time and `respawns 0`. It rewrites `assets/ghosts/*.json`.
2. `npm test` → exit 0. Every test from `/tmp/plan002/after-bump.txt` is green again.
3. `npm run test:server` → exit 0.
4. `for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -3; done` → PASS for all four.
5. `node tools/ai-bench.mjs 5 proving` → all pass. `node tools/ai-bench.mjs 5 launch` → no check fails that passed in `/tmp/plan002/bench-launch-before.txt`.
6. With `npm start` running: `node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until results --timeout 400` → exit 0, and `state.live` contains a time. `node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until results --timeout 400` → exit 0.
7. Compare the author times printed in step 12.1 against the old ones (`git show 9ee19cc:assets/ghosts/proving.json | head -c 120` shows `"total":28603` for Proving Time Trial, in ticks). Report every event whose time moved by more than 2%.

### Step 13: Log

Append to `progress.md` a section `## Session <date>: sim rules batch (plan 002), SIM_VERSION 15`. For each step give the rule in one line and the test that proves it. List the old and new author times. End with the open items for the owner, copied from "Maintenance notes" below.

## Test plan

New tests, all in existing files and all modelled on the excerpts above:
- `tests/physics.test.js`: flip input under assist; flip survives packing; rotation on an empty tank; buffered hop; hard-landing speed loss; 20° wall graze; spin reaches one turn.
- `tests/sim.test.js`: pinned reset within 180 ticks; manual reset leaves gas at 0.
- `tests/limits.test.js`: Time Trial breach adds a penalty.

For steps 4, 5 and 8, write the test first and watch it fail on the old code. A test that passes before the change proves nothing.

## Done criteria

- [ ] `npm test` exits 0, with at least 9 more tests than the 157 at `9ee19cc`
- [ ] `npm run test:server` exits 0
- [ ] `node tools/exploits.mjs` prints PASS for `proving`, `airfield`, `launch`, `pad`
- [ ] `node tools/ai-bench.mjs 5 proving` passes every check on all four tiers
- [ ] `grep -n "SIM_VERSION = 15" src/sim/race.js` matches
- [ ] `git diff --stat 9ee19cc -- src/sim/line.js src/sim/lineup.js src/sim/gas.js rl server` is empty, and `git diff 9ee19cc -- src/sim/driver.js src/sim/bot.js` shows only the two `inp.flip = 0;` additions
- [ ] `assets/ghosts/*.json` each contain `"v":15` and no `"v":14`
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- The step 0 baseline shows a failure other than the known Launch `air` check.
- After a step, `node tools/ai-bench.mjs 5 proving` fails a check that passed in the baseline, and reverting that one step fixes it. Report which step. Do not retune the AI.
- `node tools/medals.mjs all` throws `author run failed`. The bot can no longer finish an event under the new rules.
- An exploit pattern that passed in the baseline now fails.
- Step 6 cannot find a `WALL_HIT` value that satisfies every assertion.
- A fix seems to need a change in `driver.js`, `bot.js` or `line.js` beyond the `inp.flip = 0;` reset.

If one step is blocked, the others can still land. Revert the blocked step, finish the rest, and mark the plan BLOCKED with the step number in `plans/README.md`.

## Maintenance notes

For the owner, after this lands:

- **Redeploy the Worker.** `server/src/index.js:41` rejects any run whose version is not the Worker's `SIM_VERSION` with a 422. Until `npx wrangler deploy` runs in `server/`, every daily submission from the new build fails, and the game shows "Daily board offline".
- **Old board rows stay.** Runs stored on version 14 remain in D1 with times the new physics cannot reproduce, and their ghosts will not load (`src/sim/ghost.js:38` returns null on a version mismatch). Decide whether to clear them.
- **Local records reset.** The save key is `voltitude.save.v${SIM_VERSION}` (`src/main.js:37`). Every player starts with an empty board after the bump.
- **`docs/launch/ghost-links.md` is stale.** Its three links carry version-14 runs.
- The flip input is new and not yet taught. Plan 005 adds the hint. Until then only the settings note mentions it.
- Plan 004 shortens other timers in `race.js` and adds a toast for the pinned reset from step 8. Plan 009 tunes gas amounts. Both expect this plan's line changes to be in place.
- Reviewer: read step 2 closely. The assist must still level the car when `flip` is 0, and no AI file may set `flip`.
