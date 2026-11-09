# Plan 003: Make speed and weight visible

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/render/camera.js src/render/car.js src/audio.js src/main.js`
> Plan 001 edits `src/main.js` and `src/audio.js` before you. That is expected. Compare the "Current state" excerpts below against the live code. On a mismatch in an excerpt, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (camera changes can cause motion sickness; every value must respect the reduced-motion setting)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`)
- **Category**: direction (game feel)
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The car tops out at 254 mph, and the screen does not show it. The chase camera's field of view runs from 40° to 46°, a telephoto range that flattens depth. As the view widens, the camera moves closer by exactly the amount that keeps the car the same size, so the one cue cancels itself. Motion blur stops growing at 168 mph and the motor's pitch stops rising at 190 mph. In captured frames, 40 mph and 150 mph look alike. The body also barely moves under braking and cornering. This plan widens the range of every speed cue so it keeps growing to top speed, lets the car pull away from the camera, and triples the visible body lean. Nothing in the simulation changes.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. three.js r169 is vendored at `rl/vendor/three-r169/build/three.module.js`. Never edit anything under `rl/`.
- `src/render/` holds rendering code. **This plan must not edit anything under `src/sim/`.**
- Units: `c.speed` is metres per second. Top speed without boost is about 114 m/s. 45 m/s is 100 mph.
- `settings.reduced` is the reduced-motion setting. The chase camera receives it as `opts.reduced`. Under reduced motion there must be no shake, no speed-driven field-of-view change and no blur.
- `docs/feel.md` records decided rules that this plan must keep: "Events spike, the baseline hums. No constant shake." and "No slow motion during play." The speed rumble in step 3 is the "hum": it must stay far below the event shake.
- House rules: no code comments at all; match the dense style of the file; no new dependencies; no wrapper function with one caller.
- Work in a fresh git worktree.

## Current state

Line numbers are from commit `9ee19cc`.

**`src/render/camera.js`** (`createChaseCamera`, the only camera used while driving). Distance and height, lines 37-42:

```js
const zoom = Math.tan(Math.PI / 9) / Math.tan(fov * Math.PI / 360);
const wantBack = (7.5 + 1.5 * hover) * zoom;
back += (wantBack - back) * (1 - Math.exp(-dt * 3));
const ahead = Math.max(9, Math.min(speed, 120) * 0.18);
const bias = grounded ? Math.max(-0.14, Math.min(0.14, c.yawRate * 0.15)) * ahead : 0;
want.copy(p).addScaledVector(dir, -back).addScaledVector(upS, (1.8 + (grounded ? 0 : 0.6) + hover) * zoom);
```

Shake, lines 66-73. `shake` is set only by events through `bump(v)`:

```js
shake = Math.max(0, shake - dt);
let s = shake * shake;
if (opts.reduced) s *= 0.15;
if (s > 0.001) {
  camera.rotateZ((Math.sin(t * 63) + Math.sin(t * 37 + 2)) * 0.5 * 0.021 * s);
  camera.rotateX((Math.sin(t * 47 + 1.3) + Math.sin(t * 29)) * 0.5 * 0.014 * s);
  camera.rotateY(Math.sin(t * 39 + 2.1) * 0.008 * s);
}
```

Field of view, lines 77-82:

```js
const sv = 1 - Math.pow(1 - Math.min(1, speed / 120), 2);
const wantFov = 40 + 6 * sv + (c.boosting ? 3 : 0) - (breath > 0 ? 1.5 : 0);
const target = opts.reduced ? 44 : wantFov;
fov += (target - fov) * (1 - Math.exp(-dt * (target > fov ? 3.3 : 2)));
kick *= Math.exp(-dt * 5);
const shown = fov + (opts.reduced ? 0 : 4 * kick);
```

The call signature is `chase.update(dt, p, c, opts)`, where `p` is a `THREE.Vector3` (the car's interpolated position), `c` is the sim car, and `opts` is `{ reduced }`. The fields of `c` that `update` reads are: `speed, mode, wrecked, ux, uy, uz, vx, vy, vz, fx, fy, fz, rx, ry, rz, yawRate, lifting, boosting`. `createChaseCamera(camera, height)` takes a `THREE.PerspectiveCamera` and a `height(x, z)` function that returns ground height.

**`src/main.js:1030-1035`** (post-process speed cues):

```js
const sp = Math.min(1, Math.max(0, (c.speed - 20) / 55));
pu.uBlur.value = settings.reduced ? 0 : sp * 0.7 + (c.boosting ? 0.25 : 0);
...
pu.uAberration.value = settings.reduced ? 0 : (c.boosting ? 0.012 : 0) + sp * 0.004;
```

**`src/audio.js`** inside `update(c, active)`, the motor pitch:

```js
const F = 220 * Math.pow(2, 2 * Math.min(1, s / 85));
```

`s` is `c.speed`. The pitch reaches its ceiling at 85 m/s (190 mph).

**`src/render/car.js:327-338`** (a render-only body lean already exists, with small gains):

```js
if (dt > 0) {
  const k = 1 - Math.exp(-dt * 5);
  aLong += (Math.max(-40, Math.min(40, (c.speed - lastSpeed) / dt)) - aLong) * k;
  aLat += ((air ? 0 : c.yawRate) * c.speed - aLat) * k;
  lastSpeed = c.speed;
  bob += dt;
  chassis.rotation.set(
    Math.max(-0.05, Math.min(0.05, -aLong * 0.0016 + c.brake * 0.02)) + Math.sin(bob * 1.7) * 0.003,
    0,
    Math.max(-0.045, Math.min(0.045, aLat * 0.0007)) + Math.sin(bob * 1.3 + 1) * 0.004,
  );
```

`aLong` and `aLat` are in m/s². At 1 g of braking the pitch is 0.9°. At 1.3 g of cornering the roll is 0.5°. `chassis` is the body without the wheels, so leaning it does not push wheels through the road.

**The node test pattern for render code.** `tests/terrain-lod.test.js:1-10` shows how a test loads three.js without a browser:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const three = new URL('../rl/vendor/three-r169/build/three.module.js', import.meta.url).href;
registerHooks({ resolve: (s, c, next) => next(s === 'three' ? three : s, c) });
const THREE = await import('three');
const { createTerrain } = await import('../src/render/terrain.js');
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| All tests | `npm test` | exit 0, 0 fail |
| One file | `node --test tests/camera.test.js` | exit 0 |
| Serve | `npm start` (second shell) | prints `http://localhost:8790/` |
| Smoke | `node tools/smoke.mjs '<query>' [flags]` | JSON, exit 0 |
| Frames | `VENUES=proving SESSIONS=golden EVENT=tt MOMENTS=1,5,12 node tools/capture.mjs /tmp/plan003/<name>` | PNG files in that folder |

`tools/capture.mjs` and `tools/smoke.mjs` need `npm install --prefix tools` once and system Chrome. Both run headless.

## Scope

**In scope**:
- `src/render/camera.js` (`createChaseCamera` only)
- `src/render/car.js` (the `chassis.rotation.set(...)` call only)
- `src/main.js` (lines 1030-1035 only)
- `src/audio.js` (the one `const F = ...` line)
- `tests/camera.test.js` (create)
- `docs/feel.md` (append one tuning-log entry)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `createBroadcastCamera` in `camera.js`: the replay camera.
- `src/render/garage.js`: the hangar camera.
- Anything under `src/sim/`.
- The `bump`, `punch` and `stall` values passed from `src/main.js`: event feedback is plan 007's.
- `src/render/post.js` shaders.

## Git workflow

- Branch: `advisor/003-speed-and-weight`.
- One commit per step, for example `feat(camera): field of view widens to top speed and the car pulls away`.
- Do NOT push.

## Steps

### Step 0: Capture the "before" frames

With `npm start` running: `VENUES=proving SESSIONS=golden EVENT=tt MOMENTS=1,5,12 node tools/capture.mjs /tmp/plan003/before`

**Verify**: `ls /tmp/plan003/before` → `proving-golden-01s.png`, `proving-golden-05s.png`, `proving-golden-12s.png`.

### Step 1: Write the camera test first

Create `tests/camera.test.js`. It builds a chase camera over flat ground and runs it at a fixed speed until it settles.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const three = new URL('../rl/vendor/three-r169/build/three.module.js', import.meta.url).href;
registerHooks({ resolve: (s, c, next) => next(s === 'three' ? three : s, c) });
const THREE = await import('three');
const { createChaseCamera } = await import('../src/render/camera.js');

function settle(speed, { reduced = false, boosting = false } = {}) {
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.3, 9000), chase = createChaseCamera(camera, () => 0);
  const c = { speed, mode: 1, wrecked: false, ux: 0, uy: 1, uz: 0, vx: 0, vy: 0, vz: speed, fx: 0, fy: 0, fz: 1, rx: -1, ry: 0, rz: 0, yawRate: 0, lifting: false, boosting };
  const p = new THREE.Vector3(0, 0.5, 0), right = new THREE.Vector3();
  let roll = 0;
  for (let k = 0; k < 600; k++) { p.z += speed / 120; chase.update(1 / 120, p, c, { reduced }); roll = Math.max(roll, Math.abs(right.set(1, 0, 0).applyQuaternion(camera.quaternion).y)); }
  return { fov: camera.fov, back: camera.position.distanceTo(p), size: 1 / (camera.position.distanceTo(p) * Math.tan(camera.fov * Math.PI / 360)), roll };
}

test('the field of view keeps widening up to top speed', () => {
  const rest = settle(0), mid = settle(68), top = settle(114);
  assert.ok(rest.fov > 45 && rest.fov < 47, `rest ${rest.fov.toFixed(1)}`);
  assert.ok(top.fov > 62 && top.fov < 66, `top ${top.fov.toFixed(1)}`);
  assert.ok(top.fov - mid.fov > 5, `top minus 60% speed is ${(top.fov - mid.fov).toFixed(1)} deg`);
});

test('the car looks smaller at top speed than at rest', () => {
  const rest = settle(0), top = settle(114);
  assert.ok(top.size / rest.size > 0.75 && top.size / rest.size < 0.9, `size ratio ${(top.size / rest.size).toFixed(2)}`);
});

test('reduced motion fixes the field of view and removes the speed rumble', () => {
  const rest = settle(0, { reduced: true }), top = settle(114, { reduced: true });
  assert.equal(Math.round(rest.fov), 44);
  assert.equal(Math.round(top.fov), 44);
  assert.ok(top.roll < 1e-6, `roll ${top.roll}`);
});

test('the speed rumble exists at top speed and stays small', () => {
  const slow = settle(40), top = settle(114);
  assert.ok(slow.roll < 1e-6, `rumble at 40 m/s: ${slow.roll}`);
  assert.ok(top.roll > 0.001 && top.roll < 0.0026, `rumble at top speed: ${top.roll.toFixed(5)} rad`);
});
```

`roll` is the sine of the camera's roll angle: the height of its right-hand axis. (`camera.rotation.z` cannot be used; it reads π for a camera that looks along +z.)

The advisor ran this test against the current camera and against the changes in steps 2 and 3. Current code: rest 40.0°, top 46.0°, size ratio 1.00, rumble 0. With steps 2 and 3: rest 46.0°, 60% speed 56.7°, top 63.9°, size ratio 0.83, reduced motion 44.0°.

**Verify**: `node --test tests/camera.test.js` → the file loads and three of the four tests FAIL (rest field of view is 40, size ratio is 1.0, no rumble). The reduced-motion test passes already. If the file throws on import, fix the test, not the camera.

### Step 2: Widen the field of view and stop cancelling it

In `src/render/camera.js` `createChaseCamera`:

1. Line 37, replace the `zoom` line. Half of the widening is now compensated, so the car shrinks as speed builds:

```js
const zoom = Math.sqrt(Math.tan(Math.PI / 9) / Math.tan(fov * Math.PI / 360));
```

2. Lines 77-78, replace `sv` and `wantFov`:

```js
const sv = Math.min(1, speed / 115);
const wantFov = 46 + 18 * sv + (c.boosting ? 5 : 0) - (breath > 0 ? 2 : 0);
```

3. Line 42, drop the camera 0.3 m at top speed so more road streams past. Change `(1.8 + (grounded ? 0 : 0.6) + hover) * zoom` to `(1.8 - 0.3 * Math.min(1, speed / 115) + (grounded ? 0 : 0.6) + hover) * zoom`.

Leave `const target = opts.reduced ? 44 : wantFov;` and the easing line alone. Leave `let fov = 70` on line 9 alone; it eases to the target in the first second.

**Verify**: `node --test tests/camera.test.js` → the first three tests pass. The rumble test still fails.

### Step 3: Add the speed rumble

In `src/render/camera.js`, replace lines 67-68 (`let s = shake * shake;` and the `if (opts.reduced) s *= 0.15;` line) with:

```js
const rush = opts.reduced || !grounded ? 0 : Math.pow(Math.max(0, (speed - 55) / 60), 2) * 0.1;
let s = shake * shake;
if (opts.reduced) s *= 0.15;
s += rush;
```

`rush` is zero below 55 m/s (123 mph), zero in the air, and reaches 0.1 at 115 m/s. That is about 0.12° of roll, or 1 to 2 pixels at the screen edge. A hard landing (`bump(0.9)`) gives `s` of 0.29, so the rumble stays about a third of a hard landing.

**Verify**: `node --test tests/camera.test.js` → all four tests pass. `npm test` → exit 0.

### Step 4: Stretch the blur and the motor pitch to top speed

1. `src/main.js:1030`: `const sp = Math.min(1, Math.max(0, (c.speed - 25) / 85));`
2. `src/audio.js`: `const F = 220 * Math.pow(2, 2 * Math.min(1, s / 115));`

**Verify**: `grep -n "(c.speed - 25) / 85" src/main.js` → one match. `grep -n "s / 115" src/audio.js` → one match.

### Step 5: Triple the body lean

`src/render/car.js:333-337`, change the gains and the clamps:

```js
chassis.rotation.set(
  Math.max(-0.085, Math.min(0.085, -aLong * 0.0045 + c.brake * 0.02)) + Math.sin(bob * 1.7) * 0.003,
  0,
  Math.max(-0.07, Math.min(0.07, aLat * 0.0026)) + Math.sin(bob * 1.3 + 1) * 0.004,
);
```

This gives about 2.5° of dive at 1 g of braking and about 1.9° of roll at 1.3 g of cornering.

**Verify**: `grep -c "aLat \* 0.0026" src/render/car.js` → `1`.

### Step 6: Check in the running game

With `npm start` running:

```sh
node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --keys 7000 --eval '(() => { const c = window.__cap.race.car, cam = window.__cap.camera; return { speed: c.speed, fov: cam.fov, err: Math.abs(cam.fov - (46 + 18 * Math.min(1, c.speed / 115) + (c.boosting ? 5 : 0))), back: Math.hypot(cam.position.x - c.x, cam.position.y - c.y, cam.position.z - c.z) }; })()'
```

**Verify**: exit 0, `"errors": []`, `value.speed` above 40, `value.err` below 3, `value.back` between 5.5 and 7.5.

Then capture the "after" frames: `VENUES=proving SESSIONS=golden EVENT=tt MOMENTS=1,5,12 node tools/capture.mjs /tmp/plan003/after`

**Verify by looking**: open `/tmp/plan003/before/proving-golden-05s.png` and `/tmp/plan003/after/proving-golden-05s.png`. In the "after" frame the car must be visibly smaller than in the "after" 01s frame, more of the road edges and barriers must be in view than in the "before" 05s frame, and the car must still sit fully inside the frame with the HUD speed plate (bottom right) not covering it. If the car is cut off or the horizon tilts, stop.

### Step 7: Log

1. Append to the "Tuning log" in `docs/feel.md` an entry `### 7. Speed reads to top speed`, in the same form as the six entries there: the change, the reason, and the measured values from step 6.
2. Append a dated entry to `progress.md` naming the before and after frame folders.

## Test plan

- New file `tests/camera.test.js` with the four tests in step 1, modelled on the import pattern of `tests/terrain-lod.test.js`.
- Verification: `npm test` → exit 0 with 4 more tests than before.
- The blur, the motor pitch and the body lean have no unit harness. Their gates are the grep checks and the frames.

## Done criteria

- [ ] `node --test tests/camera.test.js` passes 4 tests
- [ ] `npm test` exits 0
- [ ] The step 6 smoke run reports `err` below 3
- [ ] `git diff --stat 9ee19cc -- src/sim rl` is empty
- [ ] `/tmp/plan003/before` and `/tmp/plan003/after` each hold three frames, and the executor's report describes the difference seen
- [ ] `docs/feel.md`, `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- `tests/camera.test.js` cannot import `src/render/camera.js` in node (for example it gained a browser-only import).
- After step 2 the car leaves the frame, clips into the camera, or the camera goes under the road in any captured frame.
- The reduced-motion test cannot be made to pass without changing how `opts.reduced` is passed in `src/main.js`.
- You find yourself wanting to change `bump`, `punch` or `stall` values. That is another plan.

## Maintenance notes

- These numbers were chosen from formulas and three still frames, not from a person driving. The owner should drive a lap and judge two things: whether 64° at top speed is too wide on a large monitor, and whether the rumble is noticeable or annoying. Both are single constants (`18` in `wantFov`, `0.1` in `rush`). The rumble is deliberately faint. A perfect landing's shake is fainter still (`bump(0.3)` gives `s` of 0.03), so if the rumble is raised, plan 007's event feedback should be checked against it.
- `tools/shot-match.mjs` and the signature frames use a fixed camera passed in the URL, so they are not affected.
- The motor pitch change stretches the same two octaves over a longer speed range, so the car sounds lower at 100 mph than before. If that reads as sluggish, add a second whine layer instead of shortening the range again.
- Plan 010 (handling) may add visible slip angle. The camera's heading follow rate (`7` on line 35) decides how much of a slide the player sees. This plan does not touch it.
- Reviewer: confirm `rush` is zero when `opts.reduced` is true and when the car is in the air.
