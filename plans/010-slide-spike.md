# Plan 010: Design spike: a car that can slide

> **Executor instructions**: This is a spike. It ends with a playable
> prototype on a branch and a written proposal. **Nothing merges.** Follow
> the steps in order and run every verification command. If anything in the
> "STOP conditions" section occurs, stop and report. When done, update the
> status row for this plan in `plans/README.md`, unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/drive.js src/input.js tests/handling.test.js tools/handling-lab.mjs`
> `src/sim/drive.js` may have changed in `landing` and in the wreck rules (plan 002). The steering lines quoted under "Current state" must be unchanged. If they differ, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M (two sim lines, an input bit, a lab tool, a test, a proposal)
- **Risk**: LOW (prototype branch only)
- **Depends on**: `plans/002-sim-rules-batch.md`
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The car cannot slide, by design. The steering lock is clamped to the angle where the front tyres grip best, so a held key always settles at the grip limit with the body about 5 degrees off its path. A test asserts it (`tests/handling.test.js:11`, "a held key settles at the grip limit instead of sliding the car"). That choice made keyboard driving precise. It also removed the most expressive thing a car does in a corner. On the ground there is one way to take a corner: brake, turn, wait. On the Proving Ground that is 10 of 12 corners and 36% of the lap spent braking.

The advisor measured a small change that makes a controlled slide possible without touching grip: a held "slide" input that opens the steering lock. This spike builds that prototype so the owner can drive it and decide.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation. `src/sim/drive.js` is the car: four wheels, a Pacejka tyre model in `src/sim/tyre.js`, suspension, aerodynamics, thrusters.
- The player's input each tick is `{ throttle, brake, steer, pitch, roll, boost, lift, reset }`, made by `createInput()` in `src/sim/race.js`. Recorded runs store it packed into 6 bytes per tick (`packInput`, `unpackInput`). The sixth byte holds flag bits: 1 boost, 2 reset, 4 lift. Bits 8 and up are free.
- `c.slip` is the car's sideways speed in m/s. The body slip angle is `atan2(c.slip, c.vf)`. Skid marks (`src/render/decals.js:25`) fade in from 3 to 10 m/s of slip. Tyre squeal (`src/audio.js:487`) fades in from 2.5 to 9 m/s. Both exist today and almost never fire, because a held key at 50 m/s makes 4.5 m/s of slip.
- `tools/handling-lab.mjs` drives the car on an endless flat plane and prints handling numbers. `tests/handling.test.js` asserts on them.
- Rivals steer through `steerTo` in `src/sim/drive.js`, which is scaled by `steerLimit`. They never set a slide input, so they are unchanged.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.
- The owner asked that heavy commands stay off the MacBook. Run `npm test` and the lab on a remote machine if the operator gave you one.

## Current state

Line numbers are from commit `9ee19cc`.

**The clamp.** `src/sim/drive.js:78`:

```js
export const steerLimit = (v) => Math.min(0.55, (2.94 * latCap(v)) / Math.max(v * v, 1) + 0.045 * Math.min(1, 30 / Math.max(v, 1)) ** 0.3);
```

**Where it is applied.** `src/sim/drive.js:326-327`:

```js
  const lock = steerLimit(speed0) + (inp.steer * beta0 > 0 ? Math.max(0, Math.min(Math.abs(beta0) - 0.08, 0.3)) : 0);
  c.delta += Math.max(-3 * DT, Math.min(3 * DT, inp.steer * lock - c.delta));
```

The second term already opens the lock when the player steers into a slide, so a slide can be caught.

**The input.** `src/sim/race.js:27-42`:

```js
export function createInput() {
  return { throttle: 0, brake: 0, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 };
}

export function packInput(inp, out, o) {
  ...
  out[o + 5] = (inp.boost ? 1 : 0) | (inp.reset ? 2 : 0) | (inp.lift ? 4 : 0);
}

export function unpackInput(buf, o, inp) {
  ...
  inp.boost = buf[o + 5] & 1; inp.reset = (buf[o + 5] >> 1) & 1; inp.lift = (buf[o + 5] >> 2) & 1;
```

**The keys.** `src/input.js:1-17`: `ACTIONS` lists the rebindable actions, `DEFAULT_KEYS` their defaults. `KeyF`, `KeyC` and `KeyX` are unbound. On a gamepad, boost is on buttons 1 and 2 (`src/input.js:82`).

**What the advisor measured.** Baseline from `node tools/handling-lab.mjs proving` at `9ee19cc`:

| Speed | Lock | Held body angle | Held lateral g | Speed kept |
|---|---|---|---|---|
| 30 m/s | 5.0° | 5.3° | 1.26 | 100% |
| 50 m/s | 3.1° | 5.2° | 1.19 | 100% |
| 70 m/s | 2.5° | 5.2° | 1.07 | 100% |

The largest body angle anywhere in the lab is 10.2 degrees, in a left-right flick at 60 m/s.

These levers were tried in a scratch copy, each held with a full steering key for 1.2 s and then caught with counter-steer:

| Lever | Result |
|---|---|
| Rear tyre grip scaled to 0.6 or 0.75 | The car spins (body angle over 69 degrees) at every speed. A digital key cannot modulate it. |
| Rear tyre grip scaled to 0.85 | 56 to 76 degrees. Spins at 45 m/s and above. Loses more than half its speed. |
| Rear grip 0.92 plus an open lock | Holds 30 to 46 degrees, but loses about half its speed in 3 s. |
| Yaw stability torque off (`bias` at `drive.js:377`) | No measurable change. |
| **Steering lock times 2.5, grip untouched** | A steady 16 to 19 degree slide. Never spins. Caught in about 0.5 s. |

The fourth lever, held for 3 s with the key (`tools/slide-lab.mjs` from step 2):

| Speed | Path turned, grip | Path turned, slide | Body angle | Sideways speed | Speed kept | Caught in |
|---|---|---|---|---|---|---|
| 30 m/s | 68.6° | 84.7° | 16.5° | 8.0 m/s | 84% | 0.48 s |
| 45 m/s | 46.0° | 56.4° | 19.0° | 13.8 m/s | 88% | 0.54 s |
| 60 m/s | 35.2° | 42.8° | 19.4° | 18.9 m/s | 90% | 0.63 s |
| 80 m/s | 26.8° | 33.3° | 18.8° | 24.6 m/s | 90% | 1.00 s |

The slide turns the car about 22% further and costs 10% to 16% of its speed. The sideways speed is well past the 10 m/s where skid marks and squeal are at full strength.

With lock times 1.75 the slide is 14 to 15.5 degrees, turns 18% further and keeps 93% to 95% of the speed.

A left-right flick with slide held (0.6 s each way) reaches 44 degrees at lock times 2.5 and 18 degrees at times 1.75. Neither spins.

A rough corner probe (turn the path 90 degrees on flat ground, then full throttle to a line 150 m down the exit) put the sliding car 0.07 s ahead at 25 and 35 m/s with lock times 2.5, and 0.16 to 0.20 s ahead with times 1.75. So times 2.5 is close to neutral on time, and times 1.75 looks like a button the player should always hold. The probe has no braking and no track edges. Treat it as a hint.

With steps 2 and 3 applied in a scratch copy, 161 tests passed (the 157 existing ones and the 4 new ones), and `node tools/handling-lab.mjs proving` printed the same output as before. An input of zero leaves every existing run unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| Handling lab | `node tools/handling-lab.mjs proving` | the tables quoted above |
| Slide lab (after step 2) | `node tools/slide-lab.mjs [lock]` | two tables |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**, on the spike branch only:
- `src/sim/drive.js` (one constant, one line)
- `src/sim/race.js` (`createInput`, `packInput`, `unpackInput`)
- `src/input.js` (one action, one key, one pad button)
- `tools/slide-lab.mjs` (create), `tests/slide.test.js` (create)
- `plans/010-slide-proposal.md` (create; this is the deliverable)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `SIM_VERSION`, `assets/ghosts/`, `tools/medals.mjs`. The spike does not ship, so nothing is re-baked.
- `src/sim/tyre.js`, `GRIP`, the `WHEELS` table, `TUNING`. Rear grip was tried and it spins the car.
- `steerTo`, `src/sim/driver.js`, `src/sim/bot.js`. Rivals do not slide in this spike.
- `tests/handling.test.js`. Every existing handling test must stay green untouched. That is the proof that normal driving did not change.
- `server/`. A run that uses the slide input will be rejected by the deployed Worker. That is expected on a spike branch. Do not deploy.
- Gas or style rewards for sliding. The proposal recommends amounts. The spike does not add them.

## Git workflow

- Branch: `spike/010-slide` from the branch that holds plan 002.
- One commit per step, for example `spike(slide): hold-to-slide opens the steering lock`.
- Do NOT merge. Do NOT push unless the operator asks.

## Steps

### Step 1: Baseline

```sh
mkdir -p /tmp/plan010
npm test > /tmp/plan010/test-before.txt 2>&1; echo "tests exit $?"
node tools/handling-lab.mjs proving > /tmp/plan010/lab-before.txt
sed -n 2,5p /tmp/plan010/lab-before.txt
```

**Verify**: tests exit 0. The four `full-key step` lines show `heldBetaDeg` between 2 and 6.

### Step 2: The lever, the lab and the test

Create `tools/slide-lab.mjs`:

```js
import { buildCourse } from '../src/sim/course.js';
import { createCar, placeCar, stepCar, SLIDE, DT } from '../src/sim/drive.js';
import { createInput } from '../src/sim/race.js';

const world = { track: buildCourse({ start: [0, 0.62, 0], yaw: 0, w: 900, pieces: [{ len: 14000 }] }), terrain: { height: () => -50 } };
const deg = (r) => +(r * 57.3).toFixed(1);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const course = (c) => Math.atan2(c.vx, c.vz);
const angle = (c) => Math.atan2(c.slip, Math.max(c.vf, 1));
const catchIt = (c) => Math.max(-1, Math.min(1, Math.sign(angle(c)) * Math.min(1, Math.abs(angle(c)) * 8)));

function fresh(v) {
  const c = createCar(), inp = createInput();
  placeCar(c, world.track, 600, v, 0);
  const pace = () => { inp.throttle = Math.max(0, Math.min(1, (v - c.vf) * 0.6 + 0.12)); inp.brake = c.vf > v + 2 ? 0.4 : 0; };
  for (let t = 0; t < 240; t++) { pace(); stepCar(c, inp, world, t, false); }
  return { c, inp, pace };
}

export function slide(v, on, hold = 3, flick = 0) {
  const { c, inp, pace } = fresh(v), h0 = course(c);
  let k = 0, maxB = 0, spun = false, rec = -1, path = 0, kept = 0, slipMs = 0;
  for (let t = 0; t < 120 * (hold + 4); t++) {
    const held = t < 120 * hold;
    if (held) {
      const s = flick && t >= 120 * flick ? -1 : 1;
      k = Math.sign(k) === -s ? 0 : Math.max(-1, Math.min(1, k + s * 6 * DT));
      inp.steer = k; inp.slide = on ? 1 : 0;
    } else { inp.slide = 0; inp.steer = catchIt(c); }
    pace();
    stepCar(c, inp, world, t, false);
    const beta = Math.abs(angle(c));
    maxB = Math.max(maxB, beta);
    if (held) slipMs = Math.max(slipMs, Math.abs(c.slip));
    if (beta > 1.2) spun = true;
    if (t === Math.round(120 * hold) - 1) { path = Math.abs(wrap(course(c) - h0)); kept = c.speed / v; }
    if (!held && rec < 0 && beta < 0.05 && Math.abs(c.yawRate) < 0.1) rec = t * DT - hold;
  }
  return { v, slide: on, hold, flick, pathTurnDeg: deg(path), maxBetaDeg: deg(maxB), slipMs: +slipMs.toFixed(1), speedKept: +kept.toFixed(2), spun, recoveredInS: rec < 0 ? null : +rec.toFixed(2) };
}

export function corner(v, on, D = 150) {
  const { c, inp, pace } = fresh(v), h0 = course(c), x0 = c.x, z0 = c.z;
  let k = 0, side = 0, turnS = 0, exit = 0;
  for (let t = 0; t < 120 * 30; t++) {
    const d = wrap(course(c) - h0);
    if (!side && Math.abs(d) >= Math.PI / 2) { side = Math.sign(d); turnS = t * DT; exit = c.speed / v; }
    if (!side) { k = Math.min(1, k + 6 * DT); inp.steer = k; inp.slide = on ? 1 : 0; pace(); }
    else { inp.slide = 0; inp.steer = catchIt(c); inp.throttle = 1; inp.brake = 0; }
    stepCar(c, inp, world, t, false);
    const a = h0 + side * Math.PI / 2;
    if (side && (c.x - x0) * Math.sin(a) + (c.z - z0) * Math.cos(a) >= D) return { v, slide: on, turnS: +turnS.toFixed(2), exitSpeed: +exit.toFixed(2), lineS: +((t + 1) * DT).toFixed(2) };
  }
  return { v, slide: on, turnS: null, exitSpeed: null, lineS: null };
}

if (process.argv[1]?.endsWith('slide-lab.mjs')) {
  if (process.argv[2]) SLIDE.lock = +process.argv[2];
  console.log('steering lock x', SLIDE.lock);
  const rows = [];
  for (const v of [20, 30, 45, 60, 80]) for (const on of [false, true]) rows.push(slide(v, on));
  for (const v of [30, 45, 60]) rows.push(slide(v, true, 1.2, 0.6));
  console.table(rows);
  console.table([25, 35].flatMap((v) => [corner(v, false), corner(v, true)]));
}
```

Create `tests/slide.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slide } from '../tools/slide-lab.mjs';

test('holding slide sets the car at an angle, turns it tighter and costs speed', () => {
  for (const v of [30, 45, 60]) {
    const grip = slide(v, false), s = slide(v, true);
    assert.ok(s.maxBetaDeg > 10 && s.maxBetaDeg < 25, `${v} m/s slides at ${s.maxBetaDeg} deg`);
    assert.ok(s.pathTurnDeg > 1.1 * grip.pathTurnDeg, `${v} m/s turns ${s.pathTurnDeg} against ${grip.pathTurnDeg} deg`);
    assert.ok(s.speedKept > 0.8 && s.speedKept < 0.97, `${v} m/s keeps ${s.speedKept}`);
    assert.ok(!s.spun && s.recoveredInS !== null && s.recoveredInS < 1.5, JSON.stringify(s));
  }
});

test('a left-right flick with slide held is caught without a spin', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, true, 1.2, 0.6);
    assert.ok(!s.spun && s.maxBetaDeg < 50 && s.recoveredInS !== null, JSON.stringify(s));
  }
});

test('without slide the car still holds the grip limit', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, false);
    assert.ok(s.maxBetaDeg < 9 && s.speedKept > 0.98, JSON.stringify(s));
  }
});
```

**Verify**: `node --test tests/slide.test.js` → fails to load, because `SLIDE` is not exported yet.

In `src/sim/drive.js`, add above `steerLimit`:

```js
export const SLIDE = { lock: 2.5 };
```

and change the `lock` line to:

```js
  const lock = (inp.slide ? Math.min(0.55, steerLimit(speed0) * SLIDE.lock) : steerLimit(speed0)) + (inp.steer * beta0 > 0 ? Math.max(0, Math.min(Math.abs(beta0) - 0.08, 0.3)) : 0);
```

**Verify**: `node --test tests/slide.test.js` → 3 pass.

**Verify**: `node tools/slide-lab.mjs` → the first table matches the 3 s table under "Current state" to within 1 degree and 0.02. Save it: `node tools/slide-lab.mjs > /tmp/plan010/lock-2.5.txt; node tools/slide-lab.mjs 1.75 > /tmp/plan010/lock-1.75.txt; node tools/slide-lab.mjs 2 > /tmp/plan010/lock-2.txt`.

**Verify**: `npm test` → exit 0, 3 more tests than `/tmp/plan010/test-before.txt`, and `node tools/handling-lab.mjs proving | diff - /tmp/plan010/lab-before.txt` prints nothing. Normal driving is identical.

### Step 3: Carry the input through a recorded run

In `src/sim/race.js`:

- `createInput`: add `slide: 0` to the object.
- `packInput`: the flags line becomes `out[o + 5] = (inp.boost ? 1 : 0) | (inp.reset ? 2 : 0) | (inp.lift ? 4 : 0) | (inp.slide ? 8 : 0);`
- `unpackInput`: add `inp.slide = (buf[o + 5] >> 3) & 1;` to the flags line.

Add one test to `tests/slide.test.js` (extend the imports with `createInput, packInput, unpackInput` from `'../src/sim/race.js'`):

```js
test('the slide input survives packing', () => {
  const a = createInput(), b = createInput(), buf = new Int8Array(6);
  Object.assign(a, { slide: 1, boost: 1, lift: 1 });
  packInput(a, buf, 0);
  unpackInput(buf, 0, b);
  assert.deepEqual([b.slide, b.boost, b.lift, b.reset], [1, 1, 1, 0]);
  a.slide = 0;
  packInput(a, buf, 0);
  assert.equal(unpackInput(buf, 0, b).slide, 0);
});
```

**Verify**: `npm test` → exit 0. Every ghost and replay test still passes: old runs have the bit clear.

### Step 4: A key and a pad button

In `src/input.js`:

1. `ACTIONS`: add `['slide', 'Slide (hold in a corner)'],` after the `lift` row.
2. `DEFAULT_KEYS`: add `slide: ['KeyF']`.
3. The `state` object: add `slide: 0`.
4. In `poll`, next to the `boost` line: `let slide = isDown('slide') ? 1 : 0;`
5. In the gamepad block: boost keeps button 1 only, and slide takes button 2. Change `boost = Math.max(boost, b(1) > 0.5 || b(2) > 0.5 ? 1 : 0);` to `boost = Math.max(boost, b(1) > 0.5 ? 1 : 0);` and add `slide = Math.max(slide, b(2) > 0.5 ? 1 : 0);`
6. Add `slide` to the `Object.assign(state, { ... })` at the end of `poll`.

`src/main.js:48` merges `DEFAULT_KEYS` under the saved keys, so an existing player gets the new key. `tick` copies `input.state` into the sim input, so no change is needed there. If plan 005 has landed, it added a `PAD_KEYS` table of gamepad labels in `src/main.js`: add a `slide` entry in the same form as its neighbours, and leave the hints alone.

The advisor did not run this step in a browser. The sim side is verified by steps 2 and 3. With `npm start` running:

```sh
node tools/smoke.mjs '?venue=proving&event=pr&autostart' --until racing --keys 2500 --eval '(async () => { const cap = window.__cap, hold = (code, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { code, bubbles: true })); hold("KeyW", true); await new Promise((r) => setTimeout(r, 4000)); hold("KeyD", true); hold("KeyF", true); let top = 0; for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 50)); top = Math.max(top, Math.abs(cap.race.car.slip)); } return { slipMs: +top.toFixed(1), speed: Math.round(cap.race.car.speed) }; })()'
```

**Verify**: exit 0 and `"errors": []`. Run it again without the `hold("KeyF", true);` call. The `slipMs` with the slide key is at least 1.5 times the `slipMs` without it (the lab gives a ratio above 2 at every speed). If both runs read the same, the key did not reach the sim: check steps 3 and 4 before anything else. The car may reach the first corner's wall during this check. That does not matter here. Whether the skid marks and squeal read well is for the owner to judge in step 5.

### Step 5: Drive it and fill in the numbers

The owner drives the branch. The executor prepares what the owner needs:

1. Leave `npm start` running on the spike branch and give the owner the URL `http://localhost:8790/?venue=proving&event=pr&autostart`.
2. Tell the owner the key (`F`, or the left face button on a pad) and how to change the lock without a rebuild: in the browser console, `(await import('./src/sim/drive.js')).SLIDE.lock = 1.75`.
3. Ask the owner the five questions below, one at a time, with the measured numbers beside each.

| # | Question | What the numbers say |
|---|---|---|
| 1 | Is a slide worth having at all? | It adds a second way through every corner and makes the skid marks and squeal that already exist show up. |
| 2 | How deep: lock times 1.75, 2 or 2.5? | 1.75 is nearly free and reads as "always hold it". 2.5 costs 10% to 16% of the speed for 22% more turn. Recommend 2.5. |
| 3 | A dedicated key, or brake-tap-while-steering? | A key is explicit and already built. A brake tap needs no new key, but it collides with trail braking, which the handling tests protect. Recommend the key. |
| 4 | Should a slide pay gas and style? | Recommend yes: gas at the wall-ride rate per second above 15 degrees and 20 m/s, and 25 style points a second (plan 009's table). Otherwise it is a slower line with no reason to use it. |
| 5 | Should rivals slide? | Recommend no for the first version. They steer through `steerTo`, which knows nothing about it. |

### Step 6: Write the proposal

Create `plans/010-slide-proposal.md` with these sections, filled from the files in `/tmp/plan010/` and the owner's answers:

1. **What was built**: the two sim lines, the input bit, the key.
2. **Measurements**: the three lock tables and the corner probe, pasted.
3. **The owner's answers** to the five questions, quoted.
4. **Recommendation**: ship or drop. If ship: the chosen lock, the reward amounts, and the work list for a follow-up plan. That list is: raise `SIM_VERSION`, re-bake with `node tools/medals.mjs all`, add the gas source and style points, add the key to the title legend and the hints, add a first-run hint, redeploy the Worker (owner).
5. **What the spike did not test**: slides on banked road and on the fan-held walls, a slide into a jump, touch controls, and whether a human lap is faster with it.

**Verify**: the file exists, has all five sections, and every number in it appears in a file under `/tmp/plan010/` or in the smoke output.

## Test plan

- `tests/slide.test.js` (new, 4 tests): the slide's angle, turn, speed cost and recovery; the flick; unchanged grip driving; the packed bit.
- `tests/handling.test.js` untouched and green: the regression guard for normal driving.
- `node tools/handling-lab.mjs proving` byte-identical before and after.

## Done criteria

- [ ] `npm test` exits 0 on the spike branch, with 4 more tests than before
- [ ] `git diff --stat <base>..HEAD -- tests/handling.test.js src/sim/tyre.js src/sim/driver.js src/sim/bot.js rl server assets/ghosts` is empty
- [ ] `grep -n "SIM_VERSION = " src/sim/race.js` is unchanged from the base
- [ ] `plans/010-slide-proposal.md` exists with the five sections
- [ ] The branch is not merged
- [ ] `plans/README.md` status row updated to `SPIKE DONE` with a link to the proposal

## STOP conditions

Stop and report back if:

- The steering lines in `src/sim/drive.js` do not match "Current state".
- `tests/slide.test.js` fails after step 2 with `SLIDE.lock = 2.5`. An earlier plan changed the car. Report the lab table. Do not tune the test bounds.
- Any test in `tests/handling.test.js` fails, or the handling lab output changes with no slide input.
- A ghost or replay test fails after step 3.
- The owner is not available for step 5. Write the proposal with sections 1, 2 and 5, mark section 3 "not asked", and report.

## Maintenance notes

For the owner:

- The prototype is safe to keep on a branch for as long as needed. It changes nothing unless the slide input is set.
- If it ships, every run recorded with the slide bit depends on the new code. That is why shipping needs a version bump and a Worker redeploy, even though old runs replay unchanged.
- The lab holds the key at full lock. A pad stick at half lock gets half the opened lock, so a pad player can hold any angle between grip and the full slide. That is likely to feel better on a pad than on keys.
- A slide on a wall or on banking is untested. The fans pull the car onto the surface with up to 14 g, so the tyres have far more load there and the slide may be much smaller or much faster. Test it before shipping.
