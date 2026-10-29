# Thruster Festival Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement task-by-task.

**Goal:** Make the Proving Ground slice a thruster stunt racer at a festival. It must pass the blind clip test, the cold playtest and the hard gates in `docs/plans/2026-10-28-thruster-festival-design.md`.

**Architecture:**
- **Sim.** Gas comes from events that `src/sim/race.js` emits, so the player and the AI use one economy.
- **Layout.** Air lines are track data in `src/sim/venues.js` and `src/sim/circuit.js`. The racing line, the AI and the respawn code read them from `track`.
- **Render.** Rendering stays in `src/render/*`, one module per concern. The festival gets a new module, `festival.js`.

**Tech Stack:**
- three.js r169 (WebGL2), plain ES modules, served by `tools/serve.mjs`.
- `node --test` for sim tests.
- Playwright (`tools/node_modules/playwright-core`) and system Chrome for captures.
- Blender 4 for the car (`tools/car/build.sh`).

## Rules for the executor

- Do sim work test-first (`test-driven-development` skill). Run `npm test` after each task. The baseline is 69 pass.
- Verify render work by looking. Capture frames with `tools/shot-match.mjs`, or with a capture script that drives the game to the moment, and inspect the frames. Green tests do not prove a visual change.
- No code comments (AGENTS.md). Keep diffs small. Use the existing patterns: `skyFog` for materials, `extrude`/`runs` for track meshes, `instanced` for repeats.
- Commits: everything in the repo except `ad57c18` is untracked. Before Task 1, ask the user once to approve a baseline commit of the current tree. After that, commit after each task.
- Keep `progress.md` current after each task.

## Phase 1: Core loop (sim)

### Task 1: Thrust needs gas in the tank

**Files:**
- Modify `src/sim/drive.js:31-33` (TUNING `pump`) and `src/sim/drive.js:408-414,479-482`.
- Modify `src/hud.js:158`, `src/audio.js:516-520`, `src/style.css:121,127` (they read `c.pumping`).
- Test: `tests/physics.test.js`.

**Step 1: Write the failing test.** Name it "boost without throttle stops when the tank is empty". Place the car with `placeCar(c, lab.track, 600, 40, 0)`. Hold `boost = 1`, `throttle = 0` for 18 s (`120 * 18` steps). Assert:
- `c.gas` never increases while `inp.boost` is held.
- `c.thr < 0.05` from 1 s after `c.gas` first reaches 0.
- The final speed is lower than the final speed of the same run with `throttle = 1`.

Today the boost-only run reaches 307 mph and the Shift + W run reaches 243 mph (the repro is in the design doc).

**Step 2: Run it.** `node --test --test-name-pattern="tank is empty" tests/physics.test.js`. Expected: FAIL. `c.thr` stays near 1.

**Step 3: Minimal implementation.**
- Remove the regen pump: TUNING `pump`, the `share` block at `drive.js:479-482`, and the `pumping` field (lines 113 and 136).
- Set `c.boosting = !!inp.boost && c.gas > 1e-4`.
- Remove the `.pump` class toggle in `hud.js:158` and its CSS rules.
- Remove the pump layer drive in `audio.js:516-520`. Keep `V.pump` only if Task 4 reuses it for the gas-gain sound; otherwise remove it too.

**Step 4: Run it.** Same command, expected PASS. Then `npm test`, expected 70 pass. If "thrusters burn about 4 s of gas per tank" changes, check that it still passes. Do not loosen it.

**Step 5: Commit.** `fix(sim): thrusters stop when the tank is empty; remove regen gas pump`.

### Task 2: Earn gas from skill

**Files:**
- Create `src/sim/gas.js` (the gain table and the gain function).
- Modify `src/sim/race.js` (`stepEntry`, `nearMisses`).
- Test: `tests/racing.test.js`.

**Data shape.** `GAIN` is a frozen table in `gas.js`:

| Source | Gain |
|---|---|
| `near_miss` | 0.12 |
| `land.clean` | 0.08 |
| `land.perfect` | 0.15 |
| each trick | 0.04 |
| `air` | 0.03 per airborne second, paid on a clean or perfect landing only |
| `wall` | 0.05 per second while `c.fan > 0.2` and `c.speed > 30` |
| `draft` | 0.04 per second, as defined below |
| `gate` | 0.25 (Task 11) |

A draft: a rival is 4–14 m ahead on the track tangent, less than 1.6 m lateral, and the car's speed is above 40 m/s. A hard landing or a wreck pays nothing.

The function is `earn(e, source, amount)`. It adds to `e.car.gas`, clamps the result to 1, and adds `amount` to `e.earned[source]`. For the player only, it emits `{type: 'gas_gain', source, amount}`. To keep the HUD readable, merge per-second gains: emit at most once per 0.5 s per source.

**Step 1: Write failing tests.** These are table-driven, on `createRace(loadWorld('proving'), {event: gp, seed: 1})`:
- (a) A scripted near miss: reuse the setup of the existing near-miss test. Player gas goes up by 0.12.
- (b) A perfect landing after 1.5 s airborne gives 0.15 + 0.045 = 0.195.
- (c) A wreck gives 0.
- (d) An AI entry earns gas from a near miss too (`e.earned.near_miss > 0`).

**Step 2: Run them.** `node --test --test-name-pattern="gas" tests/racing.test.js`. Expected: FAIL, because `earn` is not defined.

**Step 3: Minimal implementation.**
- Call `earn` where `stepEntry` loops over `c.ev` for `land`.
- Call it in `nearMisses` for both cars in the pair.
- Call it in a new per-tick block for `wall` and `draft`. Draft needs the other entries' positions, which `race.entries` already has.

**Step 4: Run.** Expected PASS, then `npm test`.

**Step 5: Commit.** `feat(sim): gas is earned from near misses, air, landings, wall-rides and drafting`.

### Task 3: Remove refills that skip the economy

**Files:**
- Modify `src/sim/race.js:101-107` (respawn `c.gas = Math.max(c.gas, 0.3)`).
- Modify `src/sim/race.js` pad loop (the `else c.gas = 1` branch).
- Modify `src/main.js:557` (the `gas` toast).

**Steps:**
- Write a failing test: "respawn keeps the gas level". A respawn after the tank is empty leaves 0.15, a floor so the player can launch, not 0.3.
- Make it pass.
- Delete the gas pad branch. Keep boost pads.
- Run `npm test`.
- Commit: `fix(sim): respawn floor 0.15, no gas pads`.

### Task 4: Show every gas gain

**Files:** Modify `src/main.js` (`handleEvents`, new `case 'gas_gain'`), `src/hud.js` (gas bar), `src/style.css`.

**Approach:**
- The gas bar pulses cyan for 300 ms on each gain.
- A small label floats up from the bar: "+12 NEAR MISS", "+15 PERFECT", "+AIR", "+WALL", "+DRAFT".
- Use `audio.event('slot')` with pitch rising by `amount`.
- The "CLOSE" near-miss toast moves to this channel, so only one message shows per near miss.
- Text is 14 px minimum and uses the existing tight text-shadow.

**Verify:**
- Capture a GP on autopilot at 1280×720.
- Grep the captured toasts for `gas_gain`.
- Inspect 3 frames with a label.

**Commit:** `feat(hud): gas gains show on the bar`.

### Task 5: Respawn the player when stuck, at a safe point

**Files:**
- Modify `src/sim/race.js:101-107` (`respawn`) and `src/sim/race.js:160-165` (the `lost` and `still` rules).
- Test: `tests/racing.test.js`.

**Decisions:**
- **Stuck rule.** `e.still` applies to all entries, including the player, after `raceTick > 360`. The threshold is 240 ticks (2 s) below 2 m/s.
- **Lost rule.** `e.lost` also counts when the car is on terrain (`c.mode === 2`) and more than 6 m below `track.H` at `hint`. This catches the Launch pit trap, where the car is 30 m under the course but inside `CP_RADIUS` 45.
- **Safe respawn index.** Walk back from `e.lastIdx` to the first sample with `U.y > 0.95`, `!gap`, not inside a `jumps[]` span, and not inside a loop. Respawn speed is `min(lastSpeed, 45)` on a banked or air section and `min(lastSpeed, 90)` elsewhere.

**Tests:**
- Place the player 20 m below the track at a Launch sample: it respawns within 2.5 s.
- Hold the player still on the road: it respawns at 2 s.
- Respawn from a wall-ride sample: it lands on a sample with `U.y > 0.95`.
- No respawn loop: on the old Tower repro, 3 respawns in a row do not wreck.

**Commit:** `fix(sim): player respawns when stuck or under the course; safe respawn point`.

### Task 6: One crash gives one wreck

**Files:**
- Modify `src/sim/drive.js:497-500` (emit only when `!c.wrecked`).
- Modify `src/main.js:571` and `src/hud.js` (clear the WRECKED toast on `respawn`).

**Steps:**
- Write the failing test: drop the car upside down from 3 m. Count `wreck` events over 240 ticks. Expect 1; today it is 2.
- Fix it.
- `npm test`.
- Commit: `fix(sim): one wreck event per crash`.

### Task 7: Camera stays out of terrain

**Files:** Modify `src/render/camera.js:49-52`.

**Approach:**
- The terrain clamp runs only when `upS.y > 0.6`. Make it run always.
- March 4 samples from the car to the camera with `height(x, z)`. If a sample is above the segment, pull the camera in to that sample plus 1.5 m up.
- While `c.wrecked`, hold a wide orbit (back 11 m, up 4 m) that looks at the car.

**Verify:**
- Capture the wreck repros: `?venue=launch&event=gp&autostart` and a keyboard script that drives off at the Tower.
- Inspect: the car must be visible in every frame after the wreck.

**Commit:** `fix(camera): never inside terrain; wide hold during wreck`.

**Phase 1 gate:**
- `npm test` is green.
- The exploit script `tools/exploits.mjs` passes the Shift-only and stuck cases. Write Task 15 before this gate.
- One keyboard GP capture shows less than 25% of race time under 15% gas. It is 76% today.

## Phase 2: The slice layout and the AI

### Task 8: Legal air over the infield

**Files:** Modify `src/sim/circuit.js` (new node flag `air`), `src/sim/race.js` (the `lost` rule), and `src/sim/line.js`.

**Decision.** An `air: { len }` flag on a node marks a span where flight off the road is legal for `len` metres of track:
- In that span, `e.lost` does not count while `c.mode === 0`.
- Progress uses `hint` as today. `progress()` already handles large jumps.
- Checkpoints must not sit inside an air span. Assert this in `buildCircuit`.

**Test:** a car launched over the span at 70 m/s lands back on the track with no respawn, and its checkpoints count in order.

### Task 9: Hairpin shortcut and basin high line

**Files:** Modify `src/sim/venues.js` (Proving `CIRCUIT.nodes`). Run `tools/handling-lab.mjs proving`, `tools/bake-terrain.mjs proving` and `tools/medals.mjs`.

**Approach:**
- **Hairpin.** Add a `jump` ramp (`kick`, `ramp`, `flare` as on the existing Jump node) before the hairpin at about node 36 (`[-741.4, 159.52]`). Add an `air` span that covers the hairpin. The ground line stays.
- **Basin.** Add a crest on the back straight before the Basin sector, with an `air` span over the basin.
- **Timing targets** from `handling-lab`: the air line is 0.6–1.2 s faster with a clean landing. A hard landing (−10% speed) makes it 0.5 s slower than the ground line.

**Test:**
- Extend "every car that leaves the jump lands on its down-slope" to all jumps.
- `the racing line laps in 60 to 90 seconds` stays green.

### Task 10: Wall-ride bank

**Files:** Modify `src/sim/venues.js` (one banked node run, `bank` ≥ 50° like the Launch tank-farm wall).

**Approach:**
- Place the bank on the outside of a fast corner, where the fan system (`drive.js` `fanG`) holds the car.
- It earns `wall` gas (Task 2).

**Test:** a bot holds the wall at more than 40 m/s for 3 s with no reset.

### Task 11: Flight gates

**Files:**
- Create the `gates` list in `src/sim/circuit.js`, from a node flag `gate: { h, r }`.
- Modify `src/sim/race.js` to detect gate passes.
- Create `src/render/gates.js` for the rings.

**Data shape:** `track.gates = [{ i, h, r }]`. The ring centre is `H[i] + U[i] * h`. A pass happens when the segment from the previous position to the current position crosses the ring plane inside `r`.

**Steps:**
- Test: a car flown through the centre earns 0.25 once. A car that misses by `r + 1` earns 0.
- Render: an emissive ring with 8 chevron lights. The ring pulses when passed. It is visible from 300 m (check by capture).

### Task 12: AI driver profiles

**Files:** Modify `src/sim/drivers.js` (ROSTER fields) and `src/sim/driver.js`.

**Data shape.** Add `nerve` (0–1) and `craft` (0–1) to each ROSTER entry. Keep `skill`, `aggr`, `error` and `boost`. Characters:

| Driver | nerve | craft | error | Character |
|---|---|---|---|---|
| AAL | 0.7 | 0.9 | 0.05 | Clean champion |
| FER | 0.95 | 0.4 | 0.3 | Chaotic flier |

Fill in the other drivers to give a spread.

**Behaviour:**
- **Air lines.** A driver takes an air line when `rand() < nerve` at the decision node, 60 m before the ramp. A driver misses a landing with probability `error * (1 - craft)`. A miss is a hard landing, not a wreck, unless `error > 0.25`.
- **Racecraft:**
  - Pass under braking when the rival's braking point is later than its own.
  - Defend the inside for 1 s when a car is within 0.6 s behind.
  - Give `SPACE` (3.2 m) side by side.
  - Draft (Task 2) on straights.
- **Difficulty tiers.** `Easy`, `Pro` and `Elite` scale `pace` by 0.94, 0.98 and 1.0. There is no rubber-banding: keep the existing test "AI times ignore the player".

### Task 13: AI benchmark

**Files:**
- Create `tools/ai-bench.mjs`. It runs N seeded GPs per tier headless, reusing `tools/race-stats.mjs`.
- Add one fast case to `tests/racing.test.js`.

**Output:** one JSON per tier with lap time against the line reference, passes held for 5 s per race, player-contact episodes per race (with the autopilot as the player), stuck cars, and air lines taken per driver.

**Pass:**
- Lap time is inside the tier band.
- 4 or more held passes per race.
- 3 or fewer contacts per race.
- 0 stuck cars.
- Each driver takes 1 or more air lines.

**Command:** `node tools/ai-bench.mjs 20 proving`, expected `PASS` per tier.

### Task 14: Regenerate the dependent data

Run these after the layout settles:
- `tools/bake-terrain.mjs proving`
- `tools/medals.mjs`
- the ghost bake that `progress.md` names for the track agent's section
- bump `SIM_VERSION`
- `npm test` and `node tools/race-gate.mjs 20 proving`

**Phase 2 gate:** green tests, `ai-bench` PASS, and `race-gate` with 0 resets, wrecks or DNFs on autopilot.

## Phase 2b: Run-off areas and flight control

The user added these on 2026-10-29: "like in f1, theres extra grass around corners … so u dont just get wrecked by the sides" and "more control in the air … hover … like in the real roadster".

### Task 25: Run-off data per track sample

**Files:**
- Modify `src/sim/circuit.js` (new arrays `track.wallL`, `track.wallR`, `track.runoff`).
- Modify `src/sim/drive.js` (barrier collision reads the arrays instead of `halfW` and `RAIL`).
- Test: `tests/sim.test.js`.

**Decisions:**
- **Outside of a corner.** Where `|curv| > 0.006`, the side opposite the turn gets run-off, scaled by the racing-line speed at the corner entry. The run-off is 6 m below 40 m/s and 14 m above 70 m/s, linear between. It ramps in and out over 30 m.
- **Inside of a corner:** 3 m of run-off.
- **Straights:** 3 m.
- **Not on special sections.** Loops, banks with `U.y < 0.95`, jumps and air spans keep today's walls.
- **The barrier moves out.** `wallL[i]` and `wallR[i]` equal `halfW[i] + runoff`.

**Test:** at the hairpin apex index the outside wall is 14 m or more from the road edge. On loop samples it equals today's value.

### Task 26: Run-off surfaces

**Files:**
- Modify `src/sim/drive.js` (`surface`, and the grip and drag per surface).
- Modify `src/sim/circuit.js` (a per-sample run-off kind).
- Test: `tests/physics.test.js`.

**Surfaces, from the white line out:**

| Surface | Width | Grip | Drag |
|---|---|---|---|
| Kerb (existing) | | | |
| Paved run-off | 2 m | 0.9 | none |
| Grass | rest of the run-off | 0.55 | 0.15 g extra |
| Gravel trap (slow corners, entry under 45 m/s) | rest of the run-off | 0.45 | 0.6 g extra |

Expose the kind on the surface result as `s.kind`: `road`, `kerb`, `paved`, `grass`, `gravel` or `terrain`.

**Tests:**
- A car that runs wide at 60 m/s onto grass stays below the wreck threshold and loses 8–20 m/s before the barrier.
- Gravel stops a 40 m/s car within its trap.
- **Track limits pay for themselves.** For each corner, a bot that cuts the run-off line laps slower than the racing line.

### Task 27: Run-off look and props

**Files:**
- `src/render/road.js`: a paved run-off band with painted chevrons on the paved part. Grass and gravel come from the terrain textures.
- `src/render/trackside.js`: barrier, fence, boards and tyre walls move to `wallL`/`wallR`, with tyre walls at the gravel's outer edge.
- `tools/bake-terrain.mjs`: flatten the terrain under the run-off.

**Verify:**
- Run `tools/shot-match.mjs`.
- Capture three corners from the chase camera and from a high broadcast angle, and inspect them.
- Compare against a real F1 corner reference, for example a gravel trap with a tyre wall behind it.

### Task 28: Lift thrusters: hop and hover

**Files:**
- Modify `src/input.js`: new action `lift` ("Lift (down thrusters)"), key `Space`, gamepad A (`b(0)`). This makes the old "A hop" footnote true.
- Modify `src/sim/drive.js`: lift force, gas drain, the `c.lifting` state.
- Modify `src/sim/race.js`: input plumbing.
- Test: `tests/physics.test.js`.

**Physics.** The values come from `rl/js/config.js` `CAR.NOZZLES.down`, `JUMP_DV` and `HOVER_DRAIN`, rescaled to the race sim:
- **Hop.** A tap on the ground gives +9.2 m/s along the car's up vector. It costs 0.11 gas and has a 0.6 s cooldown.
- **Hover.** Holding the key in the air applies up to 1.15 g along the car's up vector at the four corner nozzles. A level car can hold its altitude and climb slowly. The drain is 0.4 gas per second, so a full tank gives 2.5 s of hover.
- **Assist.** With assist on, hover auto-levels the car.
- **Empty tank.** No gas means no lift; this is the same rule as Task 1.

**Tests:**
- A hop from rest peaks at 4–5 m.
- Hover at full gas holds altitude within ±0.5 m for 2 s.
- A full tank gives 2.3–2.7 s of hover.
- An empty tank gives no lift.
- Hop spam cannot lap faster than 0.9× the author time. Add this as a case in `tools/exploits.mjs`.

### Task 29: Air control

**Files:** Modify `src/sim/drive.js` (the airborne block at `drive.js:440-457`). Test in `tests/physics.test.js`.

**Approach.** The two front lateral nozzles (`CAR.NOZZLES.lateral`) give real yaw authority in the air:
- In the air, steering yaws at a rate up to `AIR_YAW`.
- While lifting, steering also strafes at 0.3 g, so the player can line up a landing.
- W/S pitch and Q/E roll stay as they are.
- Air control drains `attitudeBurn` as today. Strafing drains 0.15 gas per second.

**Tests:**
- From a jump, full steer changes the landing point by 6 m or more sideways.
- Without input, the landing point is unchanged against today's value.

### Task 30: Flight feel, AI and HUD

**Files:**
- `src/render/car.js`: down-nozzle plumes fire from `c.lifting`. The `NOZ` list already includes the down and lateral nozzles.
- `src/audio.js`: a lift hiss layer.
- `src/render/camera.js`: while hovering, the camera rises 1 m and pulls back 1.5 m.
- `src/hud.js`: a lift glyph on the gas bar while it is in use, and an altitude readout above 3 m.
- `src/sim/driver.js`: AI drivers hop over a wrecked car in their path, and hover on air lines by `nerve`.
- `src/menu.js` and the controls page: add the `lift` row.
- `src/main.js`: a hint the first time the player is airborne: "Space: hover".

**Verify:**
- Capture a hop, a 2 s hover and a strafe landing in the browser, and inspect the frames.
- Re-run `tools/ai-bench.mjs`, `tools/exploits.mjs` and `npm test`.

**Phase 2b gate:**
- `npm test` passes.
- `exploits` passes, including hop spam and hover off the map.
- `ai-bench` and `race-gate` pass.
- The keyboard gas check is re-measured after lift exists.
- Wall wrecks per keyboard GP fall by 50% or more against the Phase 2 gate number.

## Phase 3: The slice look

### Task 31: Track limits, ghosts and the hover hint (added 2026-10-29)

**Track limits, Forza style (user decision).** A breach is all four wheels past the white line at a corner while the car gains time against the racing line through that corner.
- **Races:** each breach shows a "TRACK LIMITS" toast. The time gained is added to the finish time as a penalty.
- **Time trials:** the lap is invalid. An invalid lap does not count for medals or ghosts.
- **Test:** a bot that cuts each corner gets a penalty equal to its gain within 0.1 s. A bot that runs wide and loses time gets none.
- **Exploits:** add a corner-cutting case to `tools/exploits.mjs`.

**Ghosts and medals.** Regenerate the author ghosts and medals, because the rivals' bot now flares its landings with lift. Bump `SIM_VERSION`.

**Hover hint.** Move "Hold Space to hover" and the other hints off the car. Place them above the gas bar, or in the lower third, clear of the car's projected box.

### Task 15: Exploit script

**Files:** Create `tools/exploits.mjs`. It runs headless sim input patterns against Proving:
- Shift only
- reverse lap
- wall hugging
- reset spam
- boost on the grid before lights
- flight off the map

It asserts no speed above the published top speed plus thruster margin, no lap faster than 0.9× the author time, and no soft-lock. Run it in Phase 1 gate and again in every phase gate.

### Task 16: Car rear rebuild

**Files:** `tools/car/parts.py`, `tools/car/body.py`, `tools/car/model.py` (Blender scripts), then `tools/car/build.sh`.

**Approach:** load the `blender` skill, then rebuild from Tesla's 2026 reveal stills. Collect them into `docs/car/` with source URLs.
- A full-width light bar.
- A floating tail blade with a gap under it.
- 5 diffuser strakes.
- 4 recessed nozzles with dark throats. The brass rings and the grid of boxes go.

Rivals use the hi model with livery colours in `src/render/car.js` `createCarView`. Use the lite model only beyond 60 m.

**Verify:**
- Run `review/build/tools/turntable.mjs`. It is in the session scratchpad; copy it to `tools/turntable.mjs`.
- Compare against the reveal stills at 8 angles. Inspect the rear and the rear 3/4 views side by side.

### Task 17: Festival world

**Files:** Create `src/render/festival.js`. Modify `src/main.js` to add it to the scene, and `src/render/crowd.js` for density.

**Approach:**
- **Place by screen time.** Sample the chase camera along the racing line every 10 m. Score candidate sites by how long each is in view. Place props at the top sites.
- **Props:**
  - a paddock with team trucks, tents and camper vans
  - flag lines and banners with fictional brands only (see `trackside.js` `SPONSORS`)
  - a stage with two screens near the start
  - one helicopter on a slow orbit
  - a drone swarm at night
  - spectators along the fences at each air line
  - fireworks on `finish`
- **Crowd.** Fill every stand. Animate cheaply: a wave on `near_miss` near a stand, flags, phone lights at night.

**Verify:**
- Run `tools/shot-match.mjs` (day and night).
- Inspect the six frames and three frames at each air line.
- Run `tools/perf.mjs` on a quiet machine: no regression over 1.5 ms at p50.

### Task 18: Light in real units

**Files:** `src/render/sky.js`, `src/render/facility.js`, `src/render/road.js` (night pools), `src/render/post.js` (exposure).

**Approach:**
- Day: read Hillaire (EGSR 2020) and use the approach that fits WebGL2: sky-view LUT plus aerial perspective.
- Set exposure in EV. The day sun-to-sky ratio comes from the sky HDR (`assets/sky/day_sky.json` `maxLuminance`), not from gains.
- Night:
  - Floodlight heads become LED panel arrays (emissive grid geometry).
  - Add light shafts as additive cones with depth fade in the haze.
  - Road pools come from fixture lumens and mounting height (22 m) with an inverse-square falloff.
  - Remove the glare halo points in `facility.js` (`haloTexture`, `glare`).

**Verify:**
- Inspect shot-match frames.
- The L98 gate in `tools/shot-match.mjs` must pass without the top HUD scrim penalty. Measure with the HUD hidden (`hud.hidden = true`) and with it shown.

### Task 19: Terrain show-through at Airfield and Launch

**Files:** `tests/sim.test.js` (extend "terrain never pokes through the drivable surface") and the terrain bake.

**Steps:**
- Reproduce first: capture both venues at 0.5 s steps and find the frames.
- Extend the test to sample barrier tops and the runoff band (`halfW` to `halfW + 6`).
- Fix it in the bake (`tools/bake-terrain.mjs` flattening radius) or in the layout.

### Task 20: Garage hangar

**Files:** `src/render/garage.js` and `src/render/garage-screens.js`.

**Approach:**
- The car stands on a turntable under three studio lights: key, rim and a softbox (the probe already supports a softbox on layer 2).
- Engineers come from `src/render/people.js`.
- Telemetry walls get a canvas texture with live data from the save.
- An open hangar door shows the track at golden hour (`assets/sky/golden_*`).
- The camera dollies between menu pages, with a 1.2 s eased blend. `camera.js` `from()` exists.

**Verify:**
- Capture every menu page in day and night.
- Inspect against the "stock garage" complaint: each page needs one focal subject and one moving element.

### Task 21: UI pass

**Files:** `src/style.css`, `src/hud.js`, `index.html`.

**Requirements:**
- No text under 14 px at 1280×720.
- Contrast is 4.5:1 or more. Measure it with `review/build/tools/a11y-probe.mjs`, copied to `tools/`.
- One toast style.
- A sector bar with a glyph as well as colour (finding #21).
- Boot to driving in less than 10 s. Measure it with `tools/perf.mjs` `bootMs`.

### Task 22: Game-feel audit

**Approach:**
- For steer, boost, fly and land, write a table in `docs/feel.md`. It has the six parts from Swink (input, response, context, polish, metaphor, rules) and the current value for camera, shake, sound, rumble and time scale.
- Read the four talks named in the design doc first.
- Tune one action at a time. Record each change with a before-and-after 3 s clip.

**Phase 3 gate:**
- `tools/shot-match.mjs` passes day and night.
- `tools/exploits.mjs` passes.
- `tools/perf.mjs` passes on a quiet machine.
- `npm test` and `ai-bench` are green.

## Phase 4: External proof

### Task 23: Blind clip test kit

**Approach:**
- Record a 30 s clip of the slice (day GP lap 1) with the review capture rig.
- The user supplies a Forza Horizon 6 clip and a mid-tier racer clip. We do not download copyrighted gameplay.
- Build a rating page as an Artifact with a shared database. Load `artifact-capabilities`. The page shows the three clips in a random order with no labels. It asks "looks AAA" and "want to play" from 1 to 10.
- The user sends the link to the raters. That send is a one-way door, so it is the user's step.

**Pass:** our "want to play" score is within 2 points of Forza Horizon 6, and both our scores are clearly above the mid-tier racer.

### Task 24: Cold playtest

**Approach:**
- Update `review/playtest-protocol.md` from the session scratchpad for the new pillars. Copy it to `docs/playtest-protocol.md`.
- The user runs it with 3–5 strangers for 15 minutes with no instructions.

**Pass:**
- Each player uses flight within 2 minutes without a prompt.
- Three or more name flight as the best part.
- Nobody finds an exploit or a soft-lock.
- Most players rate the AI as fair.

**Report:** each gate result in `progress.md`, including the gates that fail.
