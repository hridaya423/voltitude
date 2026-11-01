# Voltitude "Shook" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement task-by-task.

**Goal:** Turn Voltitude from a competent circuit racer into the game of the Roadster reveal: a stunt range whose every run ends in a shareable clip, at a look that passes a blind clip test against Forza Horizon 6.

**Architecture:** The deterministic 120 Hz sim in `src/sim/` stays the single source of truth for play, replay, clips and server validation. Dares are events on their own venue with scripted obstacles in `race.js`. Clips re-simulate recorded inputs off-screen and encode with WebCodecs. The art pass adds authored systems (sky, car reflections, plumes, decals, flora, a range kit) to the existing post pipeline instead of more post.

**Tech Stack:** three.js r169 (WebGL2), plain ES modules, no build step, `node --test`, Playwright on system Chrome for captures, Blender for assets, WebCodecs plus a vendored `mp4-muxer`, one Cloudflare Worker with D1.

Design and decisions: `docs/plans/2026-11-01-shook-design.md`.

## Rules for the executor

- Sim work is test-first. Run `npm test` after each task. The baseline is 122 pass.
- Render work is verified by looking. Capture with `tools/shot-match.mjs`, `tools/menu-shots.mjs`, or a script that drives the game to the moment. Inspect the frames. Green tests do not prove a visual change.
- No code comments (AGENTS.md). Smallest diff that works. Use the existing patterns: `skyFog` for materials, `instanced` for repeats, `festivalSites` for placement, `createRecorder` and `encodeRun` for runs.
- Tooling: `npm install --prefix tools` fails on this machine with an npm cache rename error. Install with `npm install --prefix tools --cache <fresh dir>`. The `sharp` binding fails to load under node 26, so `shot-match` metrics fail until `sharp` is rebuilt (`npm rebuild --prefix tools sharp`) or the metrics move to a PNG decoder in node. Fix this in Task 0.2 before any gate.
- Commit after each task. Keep `progress.md` current after each task.
- Phases 1 and 2 are fully broken down. Phases 3 to 7 list tasks, files and gates. Each of those phases gets its own step breakdown when it starts, the way Phase 5 of the festival plan did.
- Every phase ends with the hard gates: `npm test`, `node tools/exploits.mjs <venue>` for touched venues, `node tools/perf.mjs` on a quiet machine with no frame over 20 ms and no long task over 50 ms.

## Phase 0: Baseline and tooling

### Task 0.1: Record the baseline

Done this session. `docs/sheets/2026-11-01-baseline-race.jpg` (25 autopilot frames, three venues, day and night, from a plain capture script), `docs/sheets/2026-11-01-baseline-menu.jpg`, `docs/sheets/2026-11-01-polyfork.jpg`. Scores in the design doc, section 1.

### Task 0.2: Repair the capture tooling

**Files:** Modify `tools/shot-match.mjs`, `tools/menu-shots.mjs`, `tools/package.json`. Create `tools/capture.mjs`.

**Steps:**
1. `npm rebuild --prefix tools sharp`. If `node -e "require('/path/tools/node_modules/sharp')"` still throws, replace the `sharp` use in `shot-match.mjs` `metrics()` with `pngjs` (add to `tools/package.json`) and drop the resize, since captures are already 1280x720.
2. Move the capture loop that was written this session (venue, session, five moments at 1, 9, 18, 30 and 45 s) into `tools/capture.mjs`. It takes `VENUES`, `SESSIONS`, `MOMENTS` and an output directory. It is the plain capture; `shot-match.mjs` keeps the gate.
3. Run `PORT=8790 node tools/capture.mjs /tmp/cap` and `PORT=8790 VENUE=proving node tools/shot-match.mjs /tmp/sm`. Expected: 25 PNGs, and the shot-match table prints without a stack trace.

### Task 0.3: Record the Roadster model licence

**Files:** Modify `assets/CREDITS.md`, `docs/car/SOURCES.md`.

Find the Sketchfab page for `assets/models/car/source.glb` from `docs/car/SOURCES.md`. Record the author, the licence and the URL in both files. If the licence does not allow redistribution in a public repo or in launch material, stop and report before Phase 7.

## Phase 1: The Pad and The Lineup

The viral slice. One oval, one kicker, a line of vehicles that grows, a score, a restart in under a second.

### Task 1.1: The Pad venue

**Files:** Modify `src/sim/venues.js`, `src/sim/world.js` (`trackHash` handles the new flag), `tests/sim.test.js`. Run `node tools/bake-terrain.mjs pad`.

**Data shape.** A new circuit `PAD` in `venues.js`:
- Two straights of 450 m along z, two 180° turns of radius 80 m, bank 30° in the turns. Width 11. About 1,400 m.
- One kicker node on the front straight at z 120: `{ jump: { kick: 10, ramp: 25, flare: 10 }, air: { len: 220 }, lineup: { at: 18, pitch: 7.5 } }`. `lineup.at` is the distance in metres from the lip to the first vehicle; `pitch` is the spacing.
- A sector node 60 m after the kicker, so the lineup span is inside one sector.
- `VENUES.pad = { id: 'pad', name: 'The Pad', place: 'Test range', circuit: PAD, terrain: { style: 'playa', cx: 0, cz: 0, size: 2400, res: 400, ring: 900, mesas: [], buttes: [], pad: [0, 0, 600] }, lakes: [], dares: ['lineup'] }`.

**Step 1: Write the failing test.** In `tests/sim.test.js`, "the pad builds, bakes and laps": `loadWorld('pad')` returns a closed track between 1,300 and 1,500 m, `track.lineup` is `{ i0, pitch }` with `i0` 18 m past the jump lip, and the bot (`tools/sim-run.mjs` logic, skill 1) laps in 24 to 40 s with no reset.

**Step 2: Run it.** `node --test --test-name-pattern="pad builds" tests/sim.test.js`. Expected: FAIL, "pad" is not a venue.

**Step 3: Minimal implementation.** Add `PAD` and the venue. In `src/sim/circuit.js`, read the `lineup` flag the way `gate` is read: `track.lineup = { i0: lipIndex + Math.round(at), pitch }`. Add `lineup.at` and `lineup.pitch` to `trackHash` so a layout change invalidates the bake. Bake: `node tools/bake-terrain.mjs pad`.

**Step 4: Run it.** Expected: PASS. Then `npm test`: all venue-wide tests must pass on four venues.

**Step 5: Commit.** `feat(venues): The Pad, an oval with a kicker and a lineup span`.

### Task 1.2: Dare events

**Files:** Modify `src/sim/race.js` (`eventsFor`, `createRace`, `initEntry`), `src/main.js:153` (`eventsFor(track)` call), `tools/sim-run.mjs`, `tests/racing.test.js`.

**Data shape.** `eventsFor(track, venue)` appends, for each id in `venue.dares`, `{ id: 'lineup', card: 1, name: 'The Lineup', kind: 'dare', laps: 99, from: 0, to: track.lap, gas: 1, circuit: true, perLap, cps }`. On The Pad the dare is card 1 and Grand Prix moves to card 2. A dare race has no rivals. `race.dare = { count: 1, cleared: 0, score: 0, mult: 1, best: 0, over: false }`.

**Step 1: Write the failing test.** "a dare race has one entry and a dare state": `createRace(loadWorld('pad'), { event: eventsFor(track, venue)[0] })` has `race.entries.length === 1`, `race.dare.count === 1`, and the player starts from the grid slot with a full tank.

**Step 2: Run it.** Expected: FAIL, `eventsFor` ignores the second argument.

**Step 3: Minimal implementation.** Add the `venue` parameter with a default of `null`. Skip the `ROSTER` loop in `createRace` when `event.kind === 'dare'`. Initialise `race.dare`. In `main.js`, pass `venue`. In `sim-run.mjs`, pass `world.venue`.

**Step 4: Run it.** Expected: PASS. `npm test` green.

**Step 5: Commit.** `feat(race): dare events with a score state`.

### Task 1.3: The lineup, collisions and clears

**Files:** Create `src/sim/lineup.js`. Modify `src/sim/race.js` (`stepEntry`, the `land` event handler), `src/sim/gas.js`. Test `tests/dare.test.js`.

**Data shape.** `LINEUP` in `lineup.js` is a frozen list of vehicle kinds, in the order they appear: `[{ kind: 'hatch', len: 4.4, h: 1.5 }, { kind: 'robotaxi', len: 4.2, h: 1.5 }, { kind: 'pickup', len: 5.6, h: 1.9 }, { kind: 'van', len: 5.4, h: 2.3 }, { kind: 'semi', len: 7.2, h: 4.0 }]`, repeating with the semi every fifth slot. Vehicle `k` occupies track indices `[i0 + k * pitch, i0 + k * pitch + len]`, lateral `[-1.1, 1.1]`, height `[0, h]` above the road frame.

Functions:
- `vehicles(track, count)` returns the placed boxes for the current count.
- `test(car, track, boxes)` returns `{ clip: k }` when any of the car's three hull points (`OFFSETS` from `contact.js`, radius 1.05) is inside a box, `{ near: k, clearance }` when the car passes over a box roof with clearance under 0.6 m, else `null`. Height is the car's position along `track.U` minus the road height at `car.hint`.

Race rules in `stepEntry` for the player when `race.dare` exists and `c.hint` is inside the lineup span plus 30 m:
- `clip`: push `{ type: 'clip', k }`, set `c.wrecked = true`, `race.dare.over = true`. The race finishes 2 s later (`race.phase = 'finished'`, `race.total = race.raceTick`).
- `near`: `earn(race, race, 'near_miss', GAIN.near_miss)` once per vehicle per pass (`race.dare.nearSeen` is a Set reset at each lip crossing).
- `land` with `quality` clean or perfect after the last vehicle: `cleared += count`, `mult = Math.min(3, 1 + tricks.length)`, `score += count * mult`, `count += 1`, push `{ type: 'clear', count, mult }`.
- `land` with `quality` hard after the last vehicle: `score += count`, `mult = 1`, `count += 1`, push `{ type: 'clear', count, mult: 1, hard: true }`.
- Any landing before the last vehicle's far edge counts as a `clip` of that vehicle.

**Step 1: Write the failing tests.** Table-driven on `loadWorld('pad')`:
- (a) A car placed 2 m before the lip at 62 m/s with a full tank clears a 3-vehicle line and emits one `clear` with `count: 3`, after which `race.dare.count === 4`.
- (b) The same car at 34 m/s emits `clip` with `k: 0`, `c.wrecked` is true, and the race finishes within 240 ticks.
- (c) A car scripted to fly 0.4 m over the semi's roof earns `near_miss` gas exactly once.
- (d) A car that completes one barrel roll over a 2-vehicle line (hold roll input for the first 0.7 s of flight) lands and emits `clear` with `mult: 2`.
- (e) A hard landing after the line emits `clear` with `hard: true` and `mult: 1`.

**Step 2: Run them.** `node --test tests/dare.test.js`. Expected: FAIL, `lineup.js` does not exist.

**Step 3: Minimal implementation.** As above. Reuse `landing()` output from `drive.js`; do not add a second landing grader.

**Step 4: Run them.** Expected: PASS. `npm test` green. Also run `node tools/sim-run.mjs pad lineup 1 -v` and confirm the bot clears at least the first three lines.

**Step 5: Commit.** `feat(sim): the lineup, with clips, near misses and multiplied clears`.

### Task 1.4: Lineup rendering, greybox

**Files:** Create `src/render/lineup.js`. Modify `src/main.js` (load for `venue.dares`, update on `clear`).

**Approach.** One `InstancedMesh` of a 1x1x1 box with a `skyFog` material, scaled per vehicle to `len x h x 2.2` and placed in the track frame at the box centre. Colour by kind (hatch white, robotaxi silver, pickup red, van blue, semi grey). Rebuild the instance matrices on every `clear` event. Vehicles cast and receive shadows. A clipped vehicle flashes red for 0.5 s.

**Verify.** `PORT=8790 node tools/capture.mjs /tmp/pad` with `VENUES=pad`. Inspect frames at 9 and 18 s: the line reads from the run-up at 200 m, and the semi's height is visibly different from the hatch.

**Commit.** `feat(render): greybox lineup vehicles`.

### Task 1.5: Dare HUD and results

**Files:** Modify `src/hud.js`, `src/main.js`, `src/menu.js`, `src/style.css`, `index.html`. Test `tests/menu.test.js`.

**Approach.**
- The clock plate shows `LINE 7` and the score in the clock face when `race.dare` exists. The timing tower is hidden. The sector bar shows the multiplier (`x2`, `x3`) while a clear is pending.
- Toasts: `clear` shows `+3 CLEARED` or `+6 CLEARED x2`; `clip` shows `CLIPPED` in red, the same channel as `WRECKED`.
- Results for a dare: score, best, the line reached, and a `SHARE CLIP` button that Phase 2 wires. A `menu.test.js` case: the results page for a dare lists `score`, `best`, `line` and no sector dots.
- Restart on `R` from the moment of the clip, under one second, as today.

**Verify.** Capture a run with `?venue=pad&event=lineup&autostart&autopilot`. Inspect three frames: the lip, the line, the results. Run `tools/a11y-probe.mjs` on the dare HUD: zero failures.

**Commit.** `feat(hud): dare score, clears and results`.

### Task 1.6: Dare feel

**Files:** Modify `src/main.js` (event handling), `src/render/camera.js`, `src/audio.js`. Document in `docs/feel.md`.

Apply the `feel.md` method, one change at a time, each with a clip from the same seeded run:
1. `clear`: a 60 ms camera punch (`chase.punch`) scaled by the multiplier, the `perfect` stinger pitched up one semitone per multiplier step, crowd cheer within 260 m of the pad stand, rumble (0.4, 0.6, 180 ms).
2. `clip`: the wreck treatment, plus a 0.5 s low-pass dip on the music.
3. The lip: FOV punch of 2° and the `burst_long` sample, so leaving the lip reads as a launch.

**Commit.** `feat(feel): clears, clips and the lip`.

### Phase 1 gate

- `npm test` green. `node tools/exploits.mjs pad` passes (add The Pad to the exploit matrix: the hover-over-the-line case must not out-score flying).
- The bot reaches line 8 or further on `node tools/sim-run.mjs pad lineup 1`.
- Cold test, three people, five minutes each, no instructions: everyone clears line 1 inside two minutes, and at least two say the moment they want to show someone. Record the quotes in `progress.md`.
- Perf gate on The Pad, day and night.

## Phase 2: The clip and the ghost link

### Task 2.1: WebCodecs probe and encoder

**Files:** Create `src/clip/encode.js`. Vendor `mp4-muxer` under `rl/vendor/mp4-muxer/` with its MIT licence file. Create `tools/clip-test.mjs`.

**Data shape.** `createClipEncoder({ width, height, fps, audio })` returns `{ addFrame(canvas, timestampUs), addAudio(audioData), finish(): Promise<Blob> }`. Codec order: `avc1.640028` (H.264 High), then `avc1.42E01E`, then `vp09.00.31.08` in WebM. `probe()` reports which one `VideoEncoder.isConfigSupported` accepts.

**Step 1: Write the failing check.** `tools/clip-test.mjs` opens the game in Playwright, calls `window.__clip.probe()` and `window.__clip.encodeTest(90)` (90 frames of the title canvas), writes the Blob to `/tmp/clip-test.mp4`, then loads it in a `<video>` and reads `duration`. Expected now: the hook does not exist.

**Step 2: Minimal implementation.** `encode.js` as above, muxing with `mp4-muxer`'s `Muxer` and `ArrayBufferTarget`. Key frame every 60 frames. Bitrate 12 Mbit/s at 1080p.

**Step 3: Run it.** `PORT=8790 node tools/clip-test.mjs`. Expected: `duration 1.5` within 0.05 s, file under 3 MB, and `ffprobe` (if present) reports `h264`.

**Step 4: Commit.** `feat(clip): WebCodecs encoder with MP4 muxing`.

### Task 2.2: Off-screen replay render

**Files:** Create `src/clip/render.js`. Modify `src/render/camera.js` (`createBroadcastCamera` takes `portrait`), `src/render/post.js` (`createPost` accepts a fixed size and a render target output), `src/main.js`.

**Approach.** `renderClip(run, { seconds: 10, portrait: true, onProgress })`:
- `createGhost(world, run)` replays the inputs. Step the replay to `run.total - 10 s`, then advance two sim ticks per rendered frame at 60 fps.
- Render into a 1080x1920 target through a second `createPost` instance, with the broadcast director in portrait mode (tighter framing, drone shots preferred while airborne).
- Each frame: `new VideoFrame(renderer.domElement, { timestamp })` after drawing the post output to a hidden canvas of the clip size, then `encoder.addFrame`.
- The last 1.2 s burn in the mark, the score or time, and the ghost link, drawn on a 2D canvas layer.
- Audio is silent in this task.

**Verify.** Extend `tools/clip-test.mjs`: export a 6 s clip of an autopilot Lineup run; the file plays, duration 6 s, and three extracted frames (via Playwright `<video>` seeks drawn to a canvas) show the car above the line in at least one.

**Commit.** `feat(clip): portrait replay render with burn-in`.

### Task 2.3: Offline audio mix

**Files:** Create `src/clip/audio.js`. Modify `src/audio.js` (export the stinger buffers and the event-to-sample map). Add `assets/audio/bed.m4a` (a licensed music bed, source recorded in `assets/audio/CREDITS.md`).

**Approach.** The replay emits the same events as play. Collect `(time, sample)` pairs for `go`, `clear`, `clip`, `perfect`, `check`, `wreck`, `finish`. Build an `OfflineAudioContext` of the clip length at 48 kHz: the bed at -14 LUFS, stingers at their times, a wind layer whose gain follows the replayed speed. Render, then feed `AudioData` chunks to `AudioEncoder` with `mp4a.40.2` at 128 kbit/s and add the track to the muxer. If `AudioEncoder` is unsupported, the clip ships silent.

**Verify.** `earshot` `measure` on the exported file: integrated loudness between -16 and -12 LUFS, true peak under -1 dBTP. `earshot` `timeline` shows a stinger within 50 ms of the clear.

**Commit.** `feat(clip): offline music bed and stingers`.

### Task 2.4: Share button and export flow

**Files:** Modify `src/menu.js`, `src/main.js`, `src/style.css`, `index.html`.

**Approach.** On results, `SHARE CLIP` opens a small sheet: portrait or landscape, a progress bar, then `navigator.share({ files })` when `navigator.canShare` accepts the file, else a download named `voltitude-<event>-<score>.mp4`. Export must finish inside 20 s for a 10 s clip on the user's machine; print the time in the sheet while developing. Reduced motion: the sheet has no animation.

**Verify.** By hand on desktop Chrome and on one phone over the LAN (`tools/serve.mjs` binds all interfaces; print the LAN URL). Record the export times in `progress.md`.

**Commit.** `feat(share): export and share a clip from results`.

### Task 2.5: Ghost links

**Files:** Create `src/share.js`. Modify `src/main.js` (parse `#g=` on load, offer the ghost, countdown), `src/sim/ghost.js` (nothing; reuse `encodeRun`/`decodeInputs`). Test `tests/share.test.js`.

**Data shape.** `encodeLink(run)`: a header `{ v, event, venue, assist, seed, tier, total }` as JSON, then the inputs delta-coded per channel (six Int8 streams, each stored as the difference from the previous tick), deflated with `CompressionStream('deflate-raw')`, base64url. `decodeLink(fragment)` reverses it and returns a `run` that `createGhost` accepts. Node 26 has `CompressionStream`, so the test runs headless.

**Step 1: Write the failing tests.** Round trip of a 60 s bot run on The Pad: identical `inputs` after decode; the link is under 8,000 characters; a corrupt fragment returns `null`.

**Step 2: Run.** Expected: FAIL, `share.js` missing.

**Step 3: Minimal implementation.** As above.

**Step 4: Run.** PASS. Then by hand: open `index.html#g=<link>`; the ghost drives, the countdown starts, the results compare against it.

**Commit.** `feat(share): ghost links in the URL fragment`.

### Phase 2 gate

- Three people export a clip on their own phone; it plays in the native gallery and uploads to one social app.
- A 10 s clip exports in under 20 s on the user's laptop.
- A ghost link from one machine races on another with the same result to the tick.
- `npm test` green; perf gate unchanged (the clip path is off during play).

## Phase 3: The look, to the bar

Build the signature frames 1, 2 and 4 on The Pad and the Proving Ground. Each task ends with a before-and-after sheet in `docs/sheets/`.

### Task 3.1: Golden hour session

**Files:** `src/render/sky.js`, `src/render/post.js` (`EV100.golden`, `AUTO_EV.golden`, a golden LUT), `src/main.js`, `src/menu.js` (session: golden, day, night), `assets/sky/golden_*` (already present), `tools/bake-sky.mjs`.

The sun sits at 10° elevation. Bake the golden environment. Golden is the default for dares and time trials, night for Grand Prix. `NIGHT` becomes `SESSION` in `main.js`.

### Task 3.2: Sky LUT and aerial perspective

**Files:** Create `src/render/atmosphere.js` from the `threejs` atmosphere reference example (`threejs-atmosphere-aerial-perspective/examples/lut-aerial-perspective/`). Modify `src/render/sky.js` (`skyFog` reads transmittance and inscatter from the LUT instead of a density fog), `src/render/terrain.js`, `src/render/road.js`.

One sun direction, one set of coefficients, a Mie term for dust tuned so a 1 km plane sits at about 30% haze at golden hour. Verify with the `threejs-visual-validation` checklist: fixed camera, three sun elevations, the horizon haze matches the HDRI within a visible margin.

### Task 3.3: The car at close range

**Files:** `tools/build-car.mjs`, `tools/decimate-car.py`, `src/render/car.js`.

- Decimate with seam-aware weights and recompute smooth normals. Target LOD0 220k triangles, and a garage LOD at 400k loaded only in the hangar.
- A `CubeCamera` at 128 px that follows the hero car, updating one face per frame, feeding the paint's `envMap`. Rivals keep the static bake.
- A flake normal map in the clearcoat. A dust mask that grows with off-road and air time and clears on restart.
- Verify on a turntable sheet (`tools/turntable.mjs`) at eight angles by golden hour and night, and in a chase frame at 150 mph: no facet visible on the hero or on a rival within 40 m.

### Task 3.4: Cold-gas plumes and downwash

**Files:** `src/render/fx.js`, `src/render/post.js` (reuse the `uHeat` distortion for refraction), `src/render/car.js`.

A plume is three layers: a refracting cone that bends the scene behind it, a soft white vapour billboard chain that fades in 0.4 s, and sparse ice sparkle points lit by the sun. Boost fires the four rear plumes; hop and hover fire the four down plumes and raise a dust ring on the ground within 1.5 m. Verify with the clip pipeline: a 4 s portrait clip of a hop and a boost.

### Task 3.5: Ground

**Files:** `src/render/road.js`, `src/sim/line.js` (export the racing line as a polyline), new `src/render/decals.js`.

4K asphalt with a macro variation mask, a rubber line darkening along the racing line, kerb wear at the apexes, oil at the grid slots, tyre marks written into a persistent decal target on scrubs and hard landings. Verify on signature frame 4.

### Task 3.6: Flora

**Files:** Create `src/render/flora.js`. Add the Poly Haven desert set under `assets/models/flora/` with credits.

Instanced scrub and boulders scattered by the terrain style with slope and road-clearance rules, LOD by distance, wind sway in the vertex shader. Joshua trees from the vegetation reference, instanced. Budget: 1.5 ms at 1080p. Verify on the perf gate and on frames at 30 and 45 s.

### Task 3.7: Sun shafts, cloud shadows, heat shimmer

**Files:** `src/render/post.js`, `src/render/terrain.js`.

Screen-space radial shafts when the sun is on screen at golden hour, a scrolling cloud shadow texture on terrain and road, and a heat shimmer band above the asphalt within 300 m by day. Each one is a single uniform that can be turned off, and the no-post baseline must still read.

### Task 3.8: Signature frames and the blind clip test

**Files:** `tools/shot-match.mjs` (fixed cameras for frames 1, 2 and 4), `docs/sheets/`.

Capture the three frames by golden hour. Run the blind clip test from the design doc with 30 s clips. Record the scores. Pass: within 2 points of Forza Horizon 6 on "want to play".

## Phase 4: The range

### Task 4.1: The range kit in Blender

**Files:** Create `tools/range/` (Blender scripts, one per landmark, the pattern of `tools/car/`). Output to `assets/models/range/*.glb` with LODs, KTX2 or WebP textures.

Landmarks: vertical test stand with a flame bucket, horizontal engine stand with a flame trench, tank-farm module (horizontal tank, vertical tank, pipe run, valve skid), water tower, propellant tanker, light mast (replaces the current one), gantry, container stack, antenna mast, the rocket on a transporter, the lineup vehicles (five kinds), the reveal ramp. Each ships with a collision proxy and a triangle count in `assets/manifest.json`.

### Task 4.2: Placement

**Files:** Create `src/render/range.js`. Modify `src/render/festival.js` (shared `festivalSites`), `src/sim/venues.js` (landmark anchors per venue).

Landmarks are placed by hand per venue as anchors. Mid-ground props are placed by the screen-time scorer with a 200 m no-repeat rule. The rocket is visible from the grid of every venue. Collision proxies feed `limits.js` so a car cannot drive through a tank.

### Task 4.3: Re-dress the three circuits

Replace the fence and flag rhythm with the kit on Proving Ground, Airfield and Launch Complex. The Launch Complex gets the trench. Record before-and-after sheets.

### Phase 4 gate

- Every chase frame at 1, 9, 18, 30 and 45 s on all four venues holds at least one landmark in the mid-ground (check by eye on the capture sheet).
- `shot-match` edge density passes on all frames.
- Perf gate on all four venues, day and night, with draw calls under 700.

## Phase 5: More dares, the daily, the Worker

### Task 5.1: The Ramp

**Files:** `src/sim/venues.js` (a `ramp` node kind: quarter pipe to a ceiling of 40 m length on The Pad's back straight), `src/sim/circuit.js`, `src/sim/race.js` (scoring: alignment, speed kept, rolls), `src/render/road.js`, `tests/dare.test.js`.

### Task 5.2: The Trench

**Files:** `src/sim/venues.js` (Launch Complex gets a trench spur with two inverted gates), `src/sim/race.js`, `tests/dare.test.js`.

### Task 5.3: The Worker

**Files:** Create `server/` (`wrangler.toml`, `src/index.js`, `schema.sql`). Import `src/sim/*` and `tools/load-world.mjs` logic; the terrain bakes are static assets of the Worker.

Endpoints: `POST /runs` (validate by re-simulation, store), `GET /board/:event/:day`, `GET /runs/:id`, `GET /og/:id.jpg`. Validation: the Worker's simulation must reproduce `total` within one tick and the score exactly, else 422. Test with `node --test server/test/*.test.js` using a forged run and a real one.

### Task 5.4: The daily

**Files:** `src/main.js`, `src/menu.js`, `src/share.js` (`#g=<id>` short links), `index.html`.

A daily card at 00:00 UTC seeded by the date, the board on results, the top twenty ghosts as translucent cars. Offline fallback: the card plays, the board shows "offline".

### Task 5.5: The OG image

The client uploads a 1200x630 JPEG of frame 1 from the clip renderer with the run. The Worker serves it for the run's link. Verify with the X and iMessage unfurl preview.

### Phase 5 gate

The Worker rejects a forged run and a replayed run. The board survives 1,000 submissions in a load test. `npm test` green.

## Phase 6: Phone

### Task 6.1: Phone tier

**Files:** `src/main.js` (tier detection by `navigator.gpu` absence, `devicePixelRatio`, and a 1 s render benchmark at boot), `src/render/post.js` (a `lite` path: exposure, LUT, bloom only), `src/render/car.js` (LOD1 only), `src/render/crowd.js` (cards), `src/render/terrain.js` (tiles 4, one cascade).

### Task 6.2: Touch

**Files:** Create `src/touch.js`. Modify `src/input.js`, `src/hud.js`, `index.html`.

Dares: tap to hop, hold to hover, drag or tilt to steer, boost on a second finger. Circuits: two thumbs. Touch targets 56 px or larger. Verify on an iPhone and an Android over the LAN; record frame times from `tools/perf.mjs` driven through the phone's Chrome via remote debugging where possible, else from the in-game frame counter.

### Task 6.3: Boot

**Files:** `src/main.js`, `assets/manifest.json`, `tools/bake-terrain.mjs` (compressed bakes), `index.html` (preload order).

LOD1 car first and the hero swaps in, the terrain bake gzipped, textures as KTX2 or WebP, the loading screen replaced by the hangar fading in. Target under 3 s desktop, under 5 s phone, measured by `tools/perf.mjs` `bootMs`.

### Phase 6 gate

30 fps on an iPhone 13 and a Pixel 6 in The Lineup for 60 s. Boot targets met. The cold playtest from the design doc on two phones and two laptops.

## Phase 7: Identity and launch

### Task 7.1: The mark and the type

Use the `logo-design` skill for the mark. Pick one display face and one mono face, replace Michroma and Saira, update `src/style.css` and the HUD. Run `typography-audit`.

### Task 7.2: HUD and hangar motion pass

Use `design-engineering` for the overlay and the hangar. Everything slides, nothing cuts. Reduced motion respected. `a11y-probe` passes.

### Task 7.3: Trailer and launch page

Use `hyperframes` for a 30 s trailer cut from exported clips. The game page gets the OG image, a 16:9 hero clip, the disclaimer and the share links. Score with `jury`.

### Task 7.4: Launch

Author the first seven dailies. Write the Show HN post and the X thread. Seed three ghost links. Run the launch gate from the design doc, section 12. Report every gate result, including the failures.
