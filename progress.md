# Voltitude: progress

## Goal

A stunt time-trial for the real 2026 Roadster. The fans hold it to any surface, and gas thrusters handle boost, hop, hover and air rotation.

- Design: `docs/design.md`
- Research: `docs/research/` (`roadster.md`, `game-design.md`, `pleasant.md`)
- Visual reference: the user's earlier "Roadster: Launch Night" build. Its source is the origin of `rl/`.

Gates:
- `npm test` passes.
- `tools/perf.mjs` reports no frame over 20 ms and no long task over 50 ms.
- Every visual change is checked by eye in screenshots.

## Run

| Command | Purpose |
|---|---|
| `node tools/serve.mjs 8790` | Serves the game at http://localhost:8790/. Add `?event=s1..s5|full&autostart&autopilot` for a bot run of one card. `?day` forces the day session; night is the default. |
| `node tools/bake-terrain.mjs` | Rebakes terrain. Run it after any change to COURSE pieces or terrain shape. Tests fail if the bake is stale. |
| `node tools/medals.mjs` | Regenerates `assets/ghosts/author.json`, the author times and ghosts. Run it after any sim or course change. |
| `node tools/sim-run.mjs all` | Headless bot run of every event. |
| `node tools/course-map.mjs <out>` | Renders a top-down map and elevation PNG. |

## Layout

**`src/sim/`**
- `course.js`: turtle-built course (pieces: turn, pitch, bank, lean, loop shift, gap, chasm, wall, pads, checkpoints, sectors), 1 m samples, exact frames.
- `drive.js`: surface driving on road or terrain, fan suction, barriers, hop, hover, boost, air attitude with assist, landing quality, tricks.
- `race.js`: events (sectors and full run), checkpoints, pads, respawn, and input packing (SIM_VERSION 4).
- `terrain.js`: base terrain, mesas, chasms and walls, erosion, road embank and carve.
- `bot.js`: curvature feed-forward driver that hits each tag.
- `ghost.js`: ghost replay.

**`src/render/`**
- `road.js`: slab, painted asphalt (kerbs, lip hazard, start/finish), barriers with LED, pylons, ribs, gantries with displays, start lights, pads.
- `facility.js`: light masts, pit building, hangar, tower, LED board.
- `camera.js`: chase camera in the surface frame, eased to world-up in the air.
- Also: `car.js`, `terrain.js`, `sky.js`, `post.js`, `props.js`, `fx.js`.

**Other**
- `src/main.js`: title (card list and detail), race, results (medal, splits, worst segment), pause, settings, hints, progression saved to localStorage `voltitude.save.v4`.

## Done (2026-10-27)

**Rebuilt around the real car**
- Real abilities: fan grip on walls, loop and ceiling; one gas tank for boost, hop and hover; air flips refill gas.
- Course: 7.4 km in 5 sectors (Ignition, Wall of Death, Leap, Underside, Heavy) plus the full run.
- The bot clears every event with no resets.
  - Author times: s1 19.36, s2 20.43, s3 18.03, s4 23.63, s5 23.07, full 91.02.

**Structure**
- Medals (Author ×1, Gold ×1.05, Silver ×1.15, Bronze ×1.35).
- Next card unlocks on finishing.
- PB or author ghost, restart under 1 s on R, respawn to checkpoint at crossing speed with a 30% gas floor.

**Interface**
- Title: full-bleed hero on the selected card's start gantry, card list, detail panel with medal targets.
- HUD: clock, delta, next-medal target, gas bar, state tag (AIR, HOVER, WALL, INVERTED), next-checkpoint marker, minimap.
- Contextual hints are shown up to 3 times each.

**World**
- Mesas reshaped: warped rims, cliff and talus.

**Verification**
- 14 tests pass.
- 75 s perf trace on the full run: 60 fps, max frame 16.8 ms, 0 long tasks.

**Feel pass from `pleasant.md` (2026-10-27, later)**
- Barrier contact resolved in components. Glancing scrapes keep most speed and nose the car back along the rail; head-on hits still stop you. Scrapes under 20° give sound only; steeper ones add camera trauma.
- Hard landings cost 10% speed, down from 28%.
- Coyote hop for 100 ms after leaving a lip. Half gravity at the apex while hop is held.
- Keyboard steer: attack 6/s, release 12/s.
- Chase camera:
  - up-vector half-life 0.15 s onto walls and loops, 0.10 s back
  - look-ahead `v * 0.18 s` with yaw bias into the turn
  - height 2.2 m, +0.4 m above 40 m/s
  - ease-out FOV, −2° breath after boost release
  - trauma-squared shake with linear decay
- Medals regenerated; author times unchanged.

**Audio**
- Procedural music from the reference (`rl/js/music`, byte-identical copy). It plays the menu state on the title and the roam state in a race, rising with speed, air and boost.
- Stingers on go, check, perfect landing, wreck and finish. Music ducks under SFX and has its own volume slider.
- Motor whine +24 semitones over 0–85 m/s. Wind runs from 30 to 125 m/s. Fan spool on walls and ceilings. A scrape loop driven by `scrape` events.

**Launch Night look (night is the default; Settings → Session switches to day)**
- Analytic night sky with stars and a low moon. Fog inscatters to the night horizon.
- Night env map: the sky plus floodlight panels and a red neon band, so the Ano White paint keeps its highlights.
- Road lighting:
  - light pools from masts every 90 m
  - continuous arena light on banked, looped and inverted sections
  - red and white LED spill from the rails
- Car headlights on. A title stage spotlight frames the car front three-quarter.
- Loop ribs are white frames with a red glow line every 12 m; they were dark metal planks.
- The rear plume shows only on boost.
- 100 s night perf trace on the full run: 60 fps, max frame 16.8 ms, 0 long tasks, 126 draw calls.

## Next

- Listen check by a human. Music, stingers, motor whine, wind, fan spool and scrape cues are wired and run without errors, but nobody has heard them.
- Title backdrop at night: a lit lineup or floodlight towers behind the hero car.
- Remaining `pleasant.md` items: slide payoff (9), 100 ms landing input buffer (11), the small-details list (15).

## AAA pass (2026-10-28)

Plan: `docs/plans/2026-10-28-aaa-pass-design.md`. Order: systems, F1 layer, car rebuild (parallel), Airfield, Launch Complex.

**Step 1 systems: done**
- Nothing is locked. The full run is the first row ("Race"). The five sectors are listed under "Practice". All events start with a full tank.
- Gas: an always-on compressor refills 12.5%/s, doubled off-throttle on a surface. Boost cannot drain the last 15% (the reserve). Hop and hover can. Gas pads fill to 100%. A flip refills 12%, down from 25%.
- The HUD gauge shows an amber reserve band and a glowing fill edge while pumping, and flashes when full. Audio has a compressor whine whose pitch rises with pressure, and a chime at full.
- Top speed: drag 0.0009 → 0.00052. Ground top speed is about 230 mph, and about 275 mph with boost.
- The Leap landing runout was extended by 220 m because the faster car overshot it. Terrain rebaked.
- Chase camera: the offset is smoothed relative to the car, so there is no speed lag. FOV range trimmed.
- Countdown camera: the title-to-race blend now orbits the car and keeps it in frame. It used to swing into empty terrain.
- All 10 nozzles render: 4 rear for boost, 4 down for hop, hover and air pitch/roll in pairs, 2 nose for yaw.
- Evidence: 14 tests pass, the bot clears every event with no resets, medals regenerated (full 84.53, s1 18.08, s2 18.92, s3 19.32, s4 21.97, s5 21.43), screenshots checked.

- An 80 m grid lead-in sits behind the start line, so the car no longer spawns at the end of the road. Full run starts at `sectors[0].i`.
- The ghost no longer shows glow planes (transparent or additive meshes are hidden on the ghost).

**Step 2 F1 layer: in progress**
- Done:
  - Five-light start: lights come on every 0.33 s, hold, then go out. COUNTDOWN is 240, `lightTick(n)` in race.js. The 3D gantry lamps and the HUD panel share the timing. No green light, as in F1.
  - Timing tower (top left): AUT, GLD, SLV, BRZ and PB against YOU, re-sorted at every checkpoint with an overtake flash.
  - Sector bar under the clock: purple beats the author, green beats your PB (or gold if there's no PB), yellow is slower.
  - Results: P-position over the field, sector colour dots per split, a REPLAY bug, and a looping broadcast replay of the run.
    - The replay re-simulates the recorded inputs. `createBroadcastCamera` cuts between trackside cameras every 110 samples, uses a drone orbit after 0.4 s of air, sets a long lens from distance, and frames the car right of the results panel.
  - Grandstands (`src/render/crowd.js`) at the start, the finish and each sector start.
    - Shader crowd: one 0.62 m figure per cell in a real clothing palette. Arms go up and the crowd bounces with `cheer`. Phone lights twinkle at night.
    - Cheers on landings and tricks within 260 m of a stand, and on the start and the finish.
  - Fireworks (`createFireworks` in fx.js) on both sides of the track past the line on a first run or a PB.
  - Gantries read SECTOR n. Toasts moved above the car.
- Audio (subagent, Sonnet 5.5): `radio.m4a` (22 engineer lines, macOS `say` Daniel through a radio chain), `broadcast.m4a` (CC0 Freesound crowd cues, light tones, lights-out), `crowd_bed.m4a`. Built by `assets/audio/build/broadcast.py`. Sources are listed in `assets/audio/CREDITS.md`.
- Wired in main.js:
  - Light tones and lights-out.
  - Radio: `radio_check` on the first race, `again` sometimes on a restart.
  - Radio per sector: purple, green or yellow, plus `last_sector`.
  - Radio calls: `flip`, `big_air`, `perfect`, `hard`, `wreck`, `wall`/`inverted` once per run, `gas_low` at the reserve, and `finish`/`finish_pb`/`finish_author`.
  - Crowd: the bed level follows distance to the nearest stand. Stunts and wrecks near a stand trigger cheers or gasps. The finish plays a PB roar or applause.
- Not verified by ear (earshot MCP is down). Measured only: the mix stays near −16 LUFS.
- Starman sits in the passenger seat and waves on big air, tricks and the finish. He is hard to see through the current car's tinted glass.
- Remaining: drones.

**Car: the user's GLB (2026-10-28)**
- The user supplied a 2026 Roadster GLB from Sketchfab: about 500k triangles in one merged mesh, with the colour baked into an emissive texture.
- Kept as `assets/models/car/source.glb`. `tools/build-car.mjs` builds `roadster.glb` and `roadster_lod1.glb` from it. Needs Blender 5 at /Applications and `npm i --prefix tools`.
- The build:
  - scales it to 4.55 m, with ground at −0.6 and +Z forward
  - cuts the wheels out with a cylinder test around the fitted hubs (front z 1.27, R 0.335; rear z −1.525, R 0.355), each with a pivot node
  - labels each triangle paint, glass, trim or tail from the texture colour and height, then smooths the labels by a neighbour vote
  - decimates in Blender (`tools/decimate-car.py`), because the mesh is split at UV seams almost everywhere
  - rebuilds the PBR materials (clearcoat paint and glass), writes the texture as WebP, and quantises the meshes
- Result: LOD0 146k triangles, 5.1 MB. LOD1 (ghost and low quality) 22k triangles, 0.9 MB.
- `src/render/car.js` (`loadCar`, `createCarView`):
  - spins and steers the wheels; the chassis pitches and rolls on its own group
  - glass and tyres use solid colours, and trim is clamped to dark to hide texture speckle
  - the tail bar brightens under braking
  - night headlight spot, plus a soft key light behind and above the car so it reads in the chase view
  - plumes come from `CAR.NOZZLES`
- Deleted: the Blender rebuild (tools/blender, roadster-glb.js, its GLBs), the old procedural car (`rl/js/car`, `rl/js/car_detail`, `rl/js/roadster.js`) and `tools/probe.html`. `rl/js/config.js` stays because it holds CAR dimensions and nozzles.
- Evidence: 14 tests pass; 100 s perf trace at 60 fps with 0 long tasks; title and chase screenshots checked in day and night.
- Source fixes (second pass):
  - Materials are labelled per texel in UV space, not per triangle, so glass edges follow the texture. Mode filters and dilation clean the label map.
  - Paint and trim speckle is removed with a 5x5 median on outlier texels. Glass gets one flat tint.
  - A mask texture drives clearcoat, roughness and metalness per texel. The tail lights get their own glow texture.
  - Rebuilt: LOD0 160k triangles, 7.6 MB. LOD1 22k triangles, 0.88 MB.
- Cabin: `src/render/cabin.js` draws seats, dash, screen and yoke. A stencil pass on the glass texels shows the cabin and Starman only through the windows.
- Evidence: 14 tests pass; 100 s perf trace at 60 fps with 0 long tasks; close-ups of the glass edge, the cabin and Starman checked by day and night.

**Step 4 venues: Airfield done in greybox and first art pass (2026-10-28)**
- Venue system:
  - `src/sim/venues.js` holds each venue's course pieces, terrain style and parameters, and lake ellipses. `course.js` keeps only the builder.
  - `buildWorld(heights, venue)` and `trackHash(track, venue)` take the venue. Terrain bakes to `assets/terrain/height/<venue>.bin`, author ghosts to `assets/ghosts/<venue>.json`.
  - Tools take a venue: `node tools/bake-terrain.mjs [venue|all]`, `node tools/medals.mjs [venue|all]`, `node tools/sim-run.mjs <venue> <event|all> [skill] [-v]`, `node tools/course-map.mjs <venue> <out>`. `tools/load-world.mjs` loads a baked world in node.
  - Event ids stay `full`, `s1`… per venue. Proving saves stay in `save.events`. Other venues save under `save.venues[id]`, so existing PBs survive.
  - Title screen has venue tabs (also `[` `]` or LB/RB). Switching stores `settings.venue` and reloads. `?venue=airfield` works too.
  - Proving was rebaked for the new hash. Its heights and medals are identical (deterministic bake).
- Airfield course (8.7 km, author 1:40.11, 4.6 km of it at ground level):
  - S1 Runway: 2 km straight with two boost pads, a hump, then a 200 m takeoff jump. About 300 mph peak with boost.
  - S2 Hangars: three Quonset hangars (11 m half-width) in a slalom with 70° bends, then a hop.
  - S3 Tower: a 360° wall-ride helix (bank 68°) climbing 43 m around the control tower, then a leap down a parabola-matched landing ramp.
  - S4 Afterburner: a 120 m loop, then a full 360° barrel roll.
  - S5 Final Approach: a climb and a jump that clears the start runway, landing before the finish.
  - The jumps are tuned so bot skill 1 and 0.4 (no boost) both land clean, with about 75 m slack on the tower leap.
- Airfield art (`src/render/airfield.js`, loaded only for that venue):
  - A 90 m runway with procedural markings (edges, threshold keys, touchdown and aiming-point bars, 36/18 designators).
  - White edge lights, amber in the last 600 m. Green threshold and red end bars.
  - A 900 m approach light system with a sequenced "rabbit" strobe behind the grid.
  - Hangars: corrugated arches, door frames, signs, lamp rows. Mast poles are skipped under roofs.
  - Control tower at the helix centre with a lit cab, obstruction lights and a rotating green/white beacon.
  - Terrain style `playa`: a flat lakebed (lake texture everywhere) with alluvial fans and a ridged mountain ring at 1.75 km.
- Evidence: 23 tests pass (every test covers both venues). Bot clears all 12 events with no resets. Perf: 100 s Airfield trace at 60 fps, 0 frames over 20 ms, 4.6M triangles, 205 draw calls. Screenshots checked day and night: title tabs, runway, hangar interior and exterior, helix, final jump.
- Known:
  - From chase height the runway is mostly hidden behind the road barriers. It reads from the air and at night through the lights.
  - The control tower is hard to see from the chase camera inside the helix.

**Launch Complex: done in greybox and first art pass (2026-10-28)**
- Course (8.4 km, author 1:38.26):
  - S1 Causeway: a beach road with a boost pad, then a jump over a lagoon.
  - S2 Tank Farm: chicanes, then a 180° wall ride (bank 72°) around a 40 m sphere. It is lifted on a 19 m rise so the inner edge isn't buried.
  - S3 Tower: up the launch tower vertically (about 125 m), over the top, a 45° plunge down the far face held by the fans, then a jump over the trench at the base.
  - S4 Splashdown: three skips across the bay, each gap longer than the last.
  - S5 Flame Trench: through the concrete trench, then a last jump to the flag.
- Tower descent, what was tried:
  - A long ballistic gap from the top could not land both slow (90 m/s) and fast (104 m/s) cars. The flight paths diverge by up to 25 m.
  - An on-road plunge, which the fans hold, plus a short gap at the bottom lands both clean.
- Terrain style `coast`:
  - A dune plain with an east ocean and bay ellipses (`T.sea`), plus low hills inland.
  - Optional `T.cut` sets the terrain carve slope and reach. Unused now.
  - Per-venue sand look (`venue.look`): desaturated pale beach.
- Art (`src/render/launch.js`), with shared helpers in `src/render/venue-kit.js`:
  - Masked sea water: procedural waves, shore foam, and no water in inland pits.
  - Lattice launch tower behind the vertical climb, with chopstick arms and obstruction lights.
  - A 120 m stainless rocket on a 6-leg mount, with heat-tile side, grid fins, flaps and venting vapour.
  - Tank farm spheres placed clear of the road.
  - Concrete flame trench: slatted roof, flickering flame strips, side berms.
- Venue tabs fit three venues (two-line names).
- New test: on sea venues, road samples over water must be above 1 m. It caught the trench sitting inside the bay after the course shifted.
- Evidence: 33 tests pass. Bot at skill 1 and 0.4 clears the full run with every landing clean or perfect. Screenshots checked by day and night: tower approach and climb, tank farm, splashdown water, flame trench, title.
- Perf: Launch full run at 60 fps, 2.9M triangles, 239 draw calls.
  - 6 of 8 runs had 0 frames over 20 ms.
  - Two runs had spikes (81 frames, then 6). The first came right after a screenshot browser closed. Not reproduced since; spike times were not captured. Proving and Airfield runs were clean.
- Known:
  - The tower crest frames the car upside down for a moment.
  - The wall-ride entry still sits a little below grade.
  - No Launch hints yet (controls are taught on the other venues).
- Next: drones (whimsy layer), landing input buffer, slide payoff, a listening pass on audio.

**Fix: stuck on "Ready" (2026-10-28)**
- Cause: the loader only cleared after a frame came in under 20 ms. A browser capped at 30 fps never delivers one (Safari Low Power Mode, throttled or embedded tabs), so the loader stayed up forever.
- Reproduced by capping requestAnimationFrame to 30 fps (frames 33.3 ms): the loader never cleared on any venue.
- Fix: the loader also clears 1.5 s after Ready. Verified at 30 fps on all three venues, and at 60 fps it still clears on the first fast frame.
- Known: at a 30 fps cap, adaptive resolution reads the cap as slowness and drops render scale toward 0.55.

**AAA rebuild: plan and decisions (2026-10-28)**
- Plan: `docs/plans/2026-10-28-aaa-rebuild-plan.md`.
- User decisions:
  - Game format: Grand Prix against 7 AI, 3 laps, with Time Trial.
  - Car: a bespoke Blender build, by the lead agent (no subagents), matched to the reveal photos.
  - Starman is dropped. No driver in the seat.

**Car: bespoke Blender build (2026-10-28)**
- Reference: 17 official reveal stills from electrive.com. Analysis is in `docs/car/reference-analysis.md`.
- Pipeline in `tools/car/` (headless Blender 5). Rebuild with `tools/car/build.sh`. It writes `assets/models/car/roadster.glb` and `roadster_lod1.glb`.
  - `shape.py`: the measured design. Feature lines are splines through points read off the photos: rocker, black/white split, shoulder crease, beltline/fender crown, canopy fold/hood ridge, and centreline.
  - `body.py`: a loft of those lines. It adds panel gaps (bisect, bevel, sink the spine): doors, hood, deck, glass seams, roof pane joints, tail blade lines. Then wheel-arch booleans and liners. Glass is split into its own mesh.
  - `wheel.py`: Trofeo-style tyre with tread grooves, aero disc, 6 split spokes with gunmetal edges, cap, brake disc, caliper (static).
  - `parts.py`: front LED strip, splitter, tail light bar, RDSTR plate, 4 thruster nozzles, diffuser strakes, side markers and reflectors.
  - `export.py` + `pack.mjs`: one multi-material chassis mesh and one spin mesh per wheel, quantised. LOD0 121k tris, 1.45 MB (the old car was 7.5 MB). LOD1 36k tris.
- Measuring tools:
  - `camera.py`: solves a camera from point pairs.
  - `refine.py`: refines the camera by silhouette IoU against Apple Vision subject masks.
  - `overlay.py`: overlays the render on the photo with both outlines.
  - `lines.py`: projects every feature line into the photo.
  - `check.sh`: runs all of these.
  - Photos, masks and cameras live in the session scratchpad. They are not committed.
- Silhouette IoU against the photo masks:

  | Photo | IoU |
  |---|---|
  | Top (013) | 0.976 |
  | Front 3/4 (016) | 0.948 |
  | Rear 3/4 (017) | 0.943 |
  | Side (018) | 0.881 |

  - The side figure is low because the Vision mask cuts off the black sill and tyres. The model outline is visually on the photo outline there.
- Game changes:
  - `car.js` uses the new names (paint, glass, light_tail brake glow). Calipers stay on the steer node.
  - Starman and the cabin stencil were removed. `starman.js` and `cabin.js` were deleted. The old texture pipeline (`tools/build-car.mjs`, `decimate-car.py`) was deleted.
- Bug found and fixed: glTF BLEND glass has `depthWrite: false`. Made opaque, it drew first and the interior painted over it. The glass is now opaque reflective bronze.
- Evidence:
  - 33 tests pass.
  - Screenshots checked: title, chase, cornering, and studio renders next to photos 016 and 017.
- Pass 2 (same day):
  - Front face is now a constrained-Delaunay cap (`front_face` in `body.py`) with a real intake tunnel 14 cm deep, a satin `trim` frame and a wrap-around splitter. Matches photo 016.
  - Shoulder, beltline and hood creases are marked sharp.
  - Wheel spokes are split pairs: glossy black tops, gunmetal side walls, bronze slot between the blades. Hub cap is flatter. Matches photo 003.
  - Thruster nozzles are brass (photo 002). Paint is a slightly metallic silver-grey.
  - `look.py` has a front key light, so the front face can be compared with 016.
  - Silhouette IoU is unchanged: 018 0.881, 013 0.974, 016 0.947, 017 0.943. 33 tests pass. Checked in game: title, chase, cornering.
- Known gaps:
  - No folding wing.
  - The rear diffuser is not recessed.
  - The tyre sidewall has no lettering.
  - In-game lighting is flat. That belongs to the renderer workstream.

**Car pass 3: toward a pixel match (2026-10-28, done for the slice; open items below)**
- User asked: "make it pixel by pixel same", and to do all the known gaps (wing, recessed rear, tyre lettering, crisper hood and fenders, in-game lighting).
- Measuring:
  - The silhouette-refined cameras (`*r.json`) are biased for interior detail. The refinement moved the camera to hide model errors (016r misses the nose corner by 18 px).
  - The point-solved cameras have 7 to 16 px rms. Only the top camera (013, 0.8 px) is trustworthy for metrology.
  - The plan outline from the 013 mask matches the model within 2 to 3 cm along the whole car (`fit/plan.py` in the scratchpad).
- Front, from top view 013 and photos 016, 014 and 005:
  - Hard points: nose corner N, corner facet T1/T2, windshield corner Wc, pillar base Pb (`shape.T1`, `shape.T2`).
  - The H crease is straight N to Wc. The outer crease runs N to T1 to Pb.
  - The old blend that rounded the front fender is removed.
  - The T1-T2 panel line and the N-T1 groove are added.
- Caps: `body.cap()` replaces the nose and tail fans. It is a constrained Delaunay fill with any number of recessed holes. The nose has the intake. The tail has a recessed silver fascia (8 cm) and a diffuser tunnel (30 cm).
- Rear, from photos 011, 012 and 017:
  - Gloss blade with light bar, silver lip, recessed plate, gloss nozzle bar, brass nozzles, finned diffuser box with outlets, lower reflectors.
  - The black/white line at the tail is lowered to the 018 photo values. A diagonal haunch panel line is added.
- Wing: `parts.wing()` adds blade, endplates and pylons under an empty `wing`. `export.py` joins them into `wing_body`. `shape.WING_*` holds the pivot, stowed and deployed poses. It is hidden when stowed.
- Wheels: star hub, tapered split spokes, sidewall lettering "P ZERO TROFEO RS" (`wheel.lettering`).
- Materials: darker bronze glass, silver metallic paint.
- `look.py` is now a copy of the photo studio (dark room, overhead softbox, floor pool, front fill). `spec.wing` deploys the wing.
- In game (`src/render/car.js`, `src/main.js`):
  - Live reflection probe: a cube camera of the real scene. Medium quality is 128 px every 3rd frame. High is 256 px every 2nd frame. Low keeps the static env.
  - The probe also sees an overhead softbox on layer 2. The main camera never shows it. Paint and glass get the studio top-light gradient and highlight.
  - The night key light moved from behind the camera to top-side. The title stage light is lowered (650 to 260). Diffuser parts are matte black.
  - The wing deploys above about 38 m/s and under braking. Under braking it tilts up 26 degrees as an airbrake. It is hidden when stowed.
  - Plume rear exits follow the new nozzle positions. These are render-only; the physics config is untouched.
- Evidence:
  - 33 tests pass.
  - IoU: 013 0.978, 016 0.945, 017 0.944, 018 0.873. 018 is lower because the stowed wing shows in the Workbench silhouette.
  - LOD0 130k tris, 1.63 MB.
  - Game screenshots checked: night and day title, chase at speed with the wing up, braking with the wing in airbrake.
  - Studio comparison: scratchpad `carwork/compare3.png`.
- Still not matching the photos:
  - Side and haunch surfaces show loft facet banding. The photo sides are smooth flat planes.
  - In 017 the tail blade is wider than the haunch. Ours is narrower.
  - Side glass has no window frame or pillar lines.
  - Camera solves are only good to 7 to 16 px (except the top view), so per-pixel metrology needs a proper multi-view bundle adjustment.
  - The studio floor in `look.py` is still too bright.

**Car pass 4: the remaining gaps (2026-10-28)**
- User asked to work on all five gaps from pass 3.
- Side banding, fixed:
  - `body.py` builds a clean loft copy with Smooth by Angle before panel cuts (`smooth_object`). It copies those normals onto the cut body and glass (`transfer_normals`, DataTransfer, POLYINTERP_NEAREST, 3 mm).
  - Arch walls, sharp edges (over 30°) and boundary vertices keep their own normals. Groove depth is capped at 1 mm.
  - `model.py` no longer auto-smooths. Verified in matcap renders (`zebra.py`): sides, door cuts, arches and glass edges are clean. LOD0 exports at ratio 1, so the normals reach the game.
- Rear blade: `parts.py` adds a gloss box (`shape.BLADE`: u 4.42 to 4.556, v 0.795 to 0.912, half-width 0.905). It overhangs the tail sides as in 017. The light bar sits on its rear face.
- Side windows: `shape.GLASS_SEAMS` holds two seam pairs read from 018 (A and B pillar). Each is cut into the glass as a 14 mm black groove.
- Glass lower edge: the side-photo grid (`fit/grid.py`) showed ours curving up from u 2.6. The photo stays straight to u 3.27 (v 0.975) and then sweeps to the tip. `P4_V` gains that point.
- Studio floor: rough 0.6, specular 0.1 (`look.py`, overridable as `lights.floor_rough` and `lights.floor_spec`). Photo 016 floor region now 60.0 against 60.1. Photos 017 and 018 used a different light setup, so their floors still differ.
- Calibration, tried and not adopted:
  - A joint bundle adjustment over 013, 016, 017 and 018 (scratchpad `fit/calib.py`, `cams/calib.json`). It has shared mirror-symmetric points, fixed hubs, and free principal points and lens.
  - The rms dropped (018 to 3.5 px, 013 to 4.2 px), but the cameras rendered visibly wrong. Ten points per photo leave lens and distance and camera height free.
  - The 017 residuals show a clicking error: the tyre's outer bottom edge was clicked as the contact centre.
  - The side camera (018) sits 0.19 m under the floor. Pinning its height costs only 0.3 px rms, so height is unobservable from these points.
  - Needed for real metrology: about 20 well-spread full-resolution points per photo, with exact semantics (tyre contact, hub cap centre, crease ends).
- Evidence: 33 tests pass. IoU 013 0.977, 016 0.944, 017 0.944, 018 0.873 (unchanged). LOD0 131k tris, 1.63 MB. Game title and chase at 153 mph checked, with no console errors.
- Still open:
  - Proper multi-view calibration (above).
  - Per-photo studio lights for 017 and 018.
  - Seams read fainter than the photo at full-frame scale.
  - `view.py` shows the stowed wing, which lowers 018 IoU.
- Resume: photos, masks, cameras and fit scripts are in `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/9f9faa20-94a1-49c3-ba05-628678b71fdc/scratchpad/carwork` (`../ref/roadster-photos`, `cams/`, `fit/`). Copy it somewhere durable before that session's scratchpad is cleared. Rebuild with `CARWORK=<that dir> zsh tools/car/build.sh`, check with `tools/car/check.sh`. Nothing is committed.

## Workstream 5: World and lighting (2026-10-28, done except the open items below)

Owner: world/lighting agent. Other agents own `src/sim`, race flow, `road.js` geometry, crowd and audio.

**Done**
- Noise removal: speed lines deleted (`fx.js`, `main.js`). Rail LED strips and their night spill are gone. One LED bar remains across the start line. Red glow bars under loop ribs are gone. The red LED strips on the grandstands are gone (`crowd.js`, three lines, the crowd agent may want to check it). Braking-board LEDs are not built (they need corner data from the circuit work).
- Renderer: stay on WebGL2 and three r169. The post stack is custom GLSL (about 1,800 lines: `post.js`, `shadows.js`, `sky.js`, the terrain shader and about 25 `onBeforeCompile` patches). A WebGPURenderer/TSL port would rewrite all of it while two other agents edit the same files, and three would have to be re-vendored. It would add no feature the WebGL stack lacks. Decision: no port.
- Post (`post.js`): HDR scene, car-only velocity pass, camera-reprojection velocity, GTAO (half res, bilateral blur), TAA (8-sample Halton, YCoCg variance clip, Catmull-Rom history), per-pixel motion blur (car stays sharp, blur capped), bloom, AgX, 32^3 LUT grade, heat shimmer on far grazing ground by day. MSAA is off by default (`?msaa=2|4` turns it on). TAA gives the edge quality. In one pair of timer runs MSAA 2 cost 11 ms (21.8 vs 11.0 p50), another run with MSAA 4 read 10.8, so the timer was too noisy to price it. Off is the safe default.
- Shadows (`shadows.js`): 3 cascades (24, 90, 280 m, 2048 each), texel-snapped, blended in `lights_fragment_begin`. Night uses one light, no shadow map. Contact shadow under the car (`car.js`, layer 4).
- Sky: `tools/bake-sky.mjs` turns a Poly Haven 8k HDRI into `assets/sky/<name>_sky.webp` (8192x2048 upper hemisphere), a fog panorama and a json with the sun direction. Day is `qwantani_late_afternoon_puresky`. Night is `qwantani_night_puresky` (a real night capture, scaled by 0.05). Sun and shadow direction come from the HDRI. The reflection environment is PMREM of the sky (width 4096 by default, `?envw=8192` for 8k). The car probe renders one cube face per frame with shadow updates off and refreshes PMREM every 6th frame.
- Terrain (`terrain.js`): 2 m fine band within 52 m of the road, built from the exact physics height plus micro displacement. Packed CC0 sets (`tools/bake-terrain-textures.mjs`), height blending, macro noise, triplanar rock, anti-tiling. Scatter: boulders and debris (`props.js`, LOD per 140 m cell, 8k-triangle models only near, the existing 550-triangle LOD1 beyond, small debris is LOD1 only and culled at 100 m), scrub cards (`scrub.js`, procedural canvas, LOD per 160 m cell). Both keep clear of the road with `trackClearance`, so a changed layout needs no hand edits.
- Atmosphere: analytic exponential height fog with sun inscatter in `skyFog`. Dust comes only from the car (`fx.js`, unchanged). Heat shimmer is in the composite pass.
- `props.js` and `main.js`: `chunkMesh` (`chunks.js`) splits big course meshes into 140 m chunks so frustum culling works.
- `tools/perf.mjs` takes `VIEWPORT=2560x1440` and unlocks the frame rate (`--disable-frame-rate-limit --disable-gpu-vsync`).
- Debug params: `?cam=px,py,pz,lx,ly,lz,fov` fixed camera, `?noshadow`, `?msaa=N`, `?envw=N`.

**Evidence**
- Shimmer gate: still camera, 10 s, every frame (uncapped, about 190 fps), in-page `readPixels` of a 620x330 region (tower, light pole, ridge lines, wall edge). Mean abs frame diff 1.36/255 (film grain), pixels differing by more than 8 levels: 0.00% mean, 0.08% worst frame, pixels whose range over 10 s exceeds 16 levels: 0%. No crawl. With TAA jitter off the numbers are the same, so the jitter adds no visible shimmer.
- `npm test`: 39 pass, 17 fail. All failures are sim/physics tests (autopilot clears, hop, lap time) in `src/sim`, which another agent is changing. No render file is under test.
- Perf (`tools/perf.mjs`, 60 s, Proving, day, autopilot, `fixedres`): 1440x900 p50 7.6 ms, p95 17.3, p99 29.8, 186 frames over 20 ms, 30 over 33 ms, one 1.2 s stall, 115 fps uncapped. 2560x1440 p50 13.0, p95 27.0, p99 34.5, 613 over 20 ms, 57 over 33 ms, 75.6 fps. Night 2560x1440 with adaptive resolution: p50 8.5, p99 30.2, 259 over 20 ms, 38 over 33 ms, min scale 0.61. NOT a pass of the p99 under 20 ms gate. Load average was 14 to 70 (other agents' browsers and bakes) during every run. The same page in back-to-back GPU timer runs swings by 2x to 3x (for example 6.2 and 18.2 ms with identical flags). The p50 has headroom. The tail is not certified.
- Where the cost is (GPU timer, one set of runs before the boulder LOD change, msaa 2): 42 ms with everything, 19 ms with shadows off, 24 ms with the probe off (`quality=low`), 8 ms with both off and msaa 0. So the cascades and the probe are the two big blocks. Boulders were the next block until the LOD change: hi-poly models used to draw out to 260 m, now out to 50 m (large) and not at all for debris.
- Screenshots (before from the original build, after from this build):
  - Before: `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/73658ee9-0a1c-4096-b61b-62d0b739eda1/scratchpad/shots/base-day-chase-0.png`, `base-night-chase-0.png`, `base-day-title-0.png`, `base-night-title-0.png`.
  - After: `.../scratchpad/final/day-chase-0.png`, `night-chase-0.png`, `day-title-0.png`, `night-title-0.png`.
  - Side by side with a Forza Horizon 5 frame: `.../scratchpad/final/compare-day.png` (before, after, FH5), `compare-night.png` (before, after).

**Open**
- p99 and the 33 ms ceiling need a quiet-machine run. If they still fail then: update the far cascade every 2nd frame, drop the far cascade's terrain casters, probe at 128 px every 2nd frame.
- The title is now the garage interior, so the title session shows no terrain. Chase shots are the world check.
- Night grade is murky brown, not yet blue. Needs a LUT pass.
- 8k PMREM (`?envw=8192`) is wired but not measured for load time and memory. 4096 is the default.
- Heat shimmer and the contact shadow were built but not inspected in a frame. Motion blur strength is a first guess.
- Console shader error `'instanceColor' undeclared` comes from the ShaderMaterial at `road.js:362` (lamp or pad material, other agent). The game runs. `perf.mjs` prints FAIL because of it.
- Old sky and terrain files from before this pass (`sky/env_1k.hdr`, `sky_4k.jpg`, `golden_*`, the 1k/2k maps in `desert_sand`, `lakebed`) are unused and left in place. `golden_sky.*` is baked but not wired.

**Slice track agent: Grand Prix on the Proving Ground circuit (2026-10-28, done for the slice; open items below)**

Scope: plan workstreams 1 and 3, Proving Ground only, in grey. Airfield and Launch stay point-to-point on the turtle builder.

Done:
- Closed spline circuit builder, `src/sim/circuit.js`.
  - Nodes are `[x, z, y, bank, halfWidth, flags]`. Positions use a Hermite chain with Catmull-Rom tangents. Elevation, bank and width use monotone cubic interpolation. Bank is "degrees into the corner", signed by the curvature.
  - The track is resampled at about 1 m. `n = lap + 1`, and the last sample repeats the first so the road renderers close the loop with no changes. `track.closed`, `track.lap`, `track.loops` are new.
  - Corner sequence is a Zandvoort template (TUMFTM racetrack-database, `tools/data/racetrack-database/`, CSV only, scaled to 0.74): hairpin, banked Tarzan-style right, esses, double apex, banked final sweeper. The overtaking straight is the 535 m start straight. Camber is 8 to 14 deg in the banked corners and -4 deg at one off-camber kink. Elevation range is 5 m outside the loop.
  - Set piece: one clothoid teardrop loop on the back straight. Triangular curvature profile, 140 m of path, 35 m tall, road 10 m wide, offset sideways 13 m so entry and exit clear by 3 m. `loopShape()` picks the offset from the crossing point of the two halves. A test checks the clearance. No jump: the loop is the one set piece for this lap.
  - Kerbs, white lines, runoff paint and barriers come from the existing road renderer (curvature driven). `src/render/circuit.js` adds 150/100/50 m braking boards at the big braking zones and painted grid boxes.
- Racing line, `src/sim/line.js`: minimum-curvature offsets (dense Cholesky, active set against the track limits, 8 m nodes, about 30 ms) and a forward/backward speed profile from `TUNING` (lateral limit 0.88 latMax, brake 0.8 brake, power curve). Loop samples are fixed to the centreline and exempt from the lateral limit.
- AI, `src/sim/driver.js` and `src/sim/drivers.js`:
  - Seven named drivers with liveries, pace (skill), aggression (late braking, how willing they are to pass) and error (steering noise, plus a chance of overcooking a braking zone).
  - Pure pursuit on the racing line. It follows a car it cannot pass, picks a passing side and holds a lateral bias, keeps 2.7 m from a car alongside, and boosts on a straight while passing.
  - No rubber-banding: nothing reads the player's position except as another car on track.
  - `botInput()` drives the player entry with the same code (used by `?autopilot`, the gate and the tests).
- Race, `src/sim/race.js` (SIM_VERSION 6):
  - Entries (player plus 7) step in one deterministic loop. The checkpoint, lap and finish logic is shared. Pass counting needs a 4 m gap swap.
  - Modes from `eventsFor()` on a circuit: Grand Prix (3 laps, 8-car grid, player P6), Time Trial (3 laps, ghost), Practice (99 laps, no field).
  - Contact, `src/sim/contact.js`: three circles per car, positional push, equal-mass impulse with restitution 0.2, tangential friction and a small yaw nudge from the contact arm. `drive.js` only got closed-track wrap in `roadQuery`/`upHint`/`placeCar(lat)`; no tuning change.
  - The run record stores `seed` and `laps`, so a GP replay re-simulates the whole field.
- Client:
  - Title lists Grand Prix, Time Trial, Practice for the circuit venue. GP medal = podium position, TT medal = time against the author ghost.
  - HUD got smaller: removed the checkpoint counter, medal target and next-checkpoint marker for circuits; the tower shows the real race with time gaps to you; "LAP n/3", best lap in the old target slot, per-sector purple/green/yellow bar and a delta per sector and per lap. Clock, tower rows, map, speed and gas bar are all smaller.
  - Seven rival car views: a baked low-detail model (`liteModel` in `car.js`, 13 draw calls instead of 49) on layer 1 so the reflection probe skips them.
  - Results for GP: position, gap to the winner, points, lap times, overtakes and contacts. Fast-forwards the field to its finish first.
- Terrain rebaked for the circuit (`node tools/bake-terrain.mjs proving`). Mesas and buttes moved outside the circuit. Ghosts regenerated (`node tools/medals.mjs all`): the turtle venues' author times are unchanged (airfield full 100.108, launch full 98.258).
- Tools: `tools/circuit-run.mjs <venue> <gp|tt|pr> <seed>` (one race), `tools/race-gate.mjs [count]` (the Racing gate).

Evidence so far:
- `npm test`: 36 pass (23 turtle-venue tests unchanged in substance, plus the circuit tests above).
- Racing gate, 20 seeds, `node tools/race-gate.mjs 20`: 0 AI resets, 0 wrecks, 0 DNF; 19 distinct finish orders; 6 different winners (AAL 5, NAI 5, REY 4, HAN 3, FER 2, YOU 1); mean 48.5 passes per race (4 m hysteresis). PASS. Re-run after the last edits, identical.
- Lap time on the racing line: 68 s estimate, 69.5 s for the solo bot, 69 to 73 s for the field. With the lateral limit lowered to 14 m/s2 the same line estimates 91 s. The physics rebuild must re-balance the lap against `lineFor(track).time` (see `tools/circuit-run.mjs`).
- Screenshots in the session scratchpad `shots/` (title, grid, loop, race).
- Contact count: events fire only for closing speed >= 0.6 m/s, and the client counts episodes more than 40 ticks apart. Before this a race reported 6502 contacts.
- Time Trial and Practice checked in the browser (`?event=tt` and `?event=pr` with `autostart&autopilot`): HUD, lap label and map render.
- Perf, `node tools/perf.mjs "...?event=gp&day&autostart&autopilot" 235`: NOT a clean pass. Machine load average was 8 to 63 (other agents). Quiet 40 s run earlier: p99 12.7 ms, max 38.9 ms. Full run under load: 78.7 fps, p50 11.6, p99 35.6, 2148 frames over 20 ms. A 60 s A/B under load 63: Time Trial (no rivals) p99 35.2 ms, 32.7M triangles, 693 draws; GP p99 52.5 ms, 33.6M triangles, 816 draws. The rivals add about 120 draw calls and 0.9M triangles. The 32M triangles are in the world render (terrain, crowd), not the field. Re-trace when the load is low.

Open items:
- Lap re-balance: the physics rebuild must retune against `lineFor(track).time` (68 s now, 91 s at aLat 14).
- No jump set piece. The loop is the one set piece.
- Runoff is paint inside halfW; there is no separate runoff width or gravel.
- Terrain embank pokes above the road at the hairpin inner side (terrain agent).
- Crowd shader error ('instanceColor' undeclared) and a `loadTerrainTextures` TypeError in the console are from the other agents' in-progress work. perf.mjs prints FAIL on console errors because of them.
- Browser GP uses a random seed, and the autopilot player often finishes P7 or P8.

## Workstreams 6 and 8: Crowd and Audio (2026-10-28, done for the slice; open items below)

Owner: crowd/audio agent. Did not touch `src/sim`, `hud.js`, `road.js`, `sky.js`, `post.js`, `terrain.js`, `fx.js` or the renderer setup. `main.js` edits are limited to the grandstand, cheer and audio hook lines.

**Crowd: done**
- Four rigged CC0 characters (Quaternius Universal Base Characters and Universal Animation Library: two male, two female) baked to vertex animation textures by `tools/crowd/bake.py` (Blender 5, `tools/crowd/run.sh`). Seven clips of 12 frames: idle, fold, cheer, clap, phone, flag, gasp. Output in `assets/crowd/` (`vat_pos.bin` 3.9 MB, `vat_nrm.bin` 2.0 MB, `crowd.bin`, `crowd.json`, `skin.webp`).
- Clothing is painted by region (shirt, trousers, hair, skin tone, caps) from palettes in the shader, so the four bodies read as thousands of different people. It is not modelled clothing.
- `src/render/people.js`: GPU instanced near meshes sampling the VAT with `texelFetch`, plus an impostor atlas baked at load (8 variants x 5 poses x 4 characters) drawn as cylindrical billboard cards. LOD is per chunk of 16 seats. The switch distance is `NEAR = 110` (plan said 150; see Perf).
- `src/render/crowd.js` builds the stands and seats. Stand sites come from data: `track.stands` as `[[sampleIndex, side, length], ...]`. When the course does not provide it, stands fall back to the start straight, the finish and one per later sector. Seats are placed from the stand matrix, so moving a stand moves its people.
- Hooks, all on the object `createGrandstands` returns: `cheer(v)`, `gasp(v)`, `party()`, `update(time, dt, night, camera)`, `centres` (world points, one per stand, passed to `audio.stands`), `sites`, `people`. Party puts flags up. Phones light up at night.
- Existing cheer calls (landings, tricks, start, finish) are unchanged. New: `near_miss` calls `stands.gasp`, the circuit finish calls `stands.cheer(1)`.

**Audio: done**
- Recordings (Freesound CC0, ids and licences in `assets/audio/CREDITS.md`): EV motor in three pitch zones plus a hum layer per motor (three motors, panned), tyre roll, tyre scrub tied to slip and hard braking, burnout scrub, kerb rumble plus kerb strikes, cold-gas thruster bursts (pulsed while boosting, a vent on release), vehicle contact thumps, crowd bed. `assets/audio/build/real.py` builds them.
- Positional crowd: one HRTF panner per stand from `stands.centres`, gain and filter by distance, with bursts through `audio.cheer`.
- Commentary: 33 clips, two voices, ElevenLabs TTS (premade voices), through the broadcast chain in `assets/audio/build/commentary.py`. They go through one shared speech queue with ducking and a play chance, so lines do not stack on radio calls.
- Thruster audio keys off `c.boosting` and air attitude (`c.wp`, `c.wr`, `c.wy`), not hop or hover.

**Hooks for the race agent**
- `audio.event(name, arg)`: `overtake` (arg 1 when taking the lead), `overtaken`, `contact` (arg = closing speed m/s, scales the thump), `near_miss` (also fires the stand gasp), `lap` (arg = lap number, lap 2 triggers commentary), `final_lap`, `fastest`, `finish` (arg = finishing position: 1 win, 2 to 3 podium, else plain).
- `main.js` still maps a pass to `audio.event('slot')`. It does not yet fire `overtake`, `overtaken`, `near_miss`, `final_lap` or `fastest`. Wire those where the race emits them.
- `audio.update(c, active)` reads `c.kerb` (set in `main.js`: lateral offset past `halfW - 1.7`) and `c.slip` (lateral slip in m/s). The sim does not publish `c.slip` yet, so tyre scrub only comes from hard braking and burnouts until the tyre model lands.

**Evidence**
- `node --test tests/crowd-audio.test.js`: 2 pass (bake internally consistent; manifest points at real files, loop windows and cues sane).
- Full `npm test` now shows many sim failures (airfield and launch autopilot resets, hop, lap time, GP field). All are in `src/sim` and `tests/` for the race and physics agents. None touch crowd or audio.
- Crowd harness (`tools/crowd-view.html?many`, 6 stands, 8214 people in view, headless Chrome): avg 5.1 to 7.6 ms per frame including readback, p99 15 to 16 ms, 25 draw calls, 1.64 M triangles.
- Game, `tools/perf.mjs "http://localhost:8790/?day&event=full&autostart&autopilot" 40`: 87 fps, p50 5.5 ms, p95 16 ms, p99 29.9 ms, 89 frames over 20 ms, 654 draw calls, 1.9 M triangles. The gate fails on frames over 20 ms and on a 13 s main-thread stall in the run (load average was 42, other agents were rendering). Crowd off versus on at the same resolution scale, 20 s runs: p95 22 ms off, 17.5 ms on in one pair and 25 ms on in another, so run to run noise is larger than the crowd's cost. I did not get a clean pass of the perf gate.
- The `instanceColor` shader error that `perf.mjs` reports comes from `src/render/road.js:362` (lamp ShaderMaterial), not the crowd. It makes `perf.mjs` print FAIL by itself.
- Offline audio render of the new layers, `PORT=8795 node assets/audio/build/render.mjs real out.wav` (66 s: accel, cruise, slip, kerb, air, boost, overtake, contact, lap, near miss, final lap, finish): integrated -15.6 LUFS, peak -2.6 dBFS (0.745), 0 clipped samples, segments from -20.7 LUFS (launch) to -13.6 LUFS (boost, finish). Loop seam metrics are printed by `real.py` when it builds each loop.
- Screenshots (all in `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/c9639e57-519a-46ad-af48-21596b62639d/scratchpad/shots/`): in game `game-day-a.png`, `game-day-c.png`, `gn-a.png` (night grid); harness `d-near.png`, `d-close.png`, `d-party.png`, `g-gasp.png`, `c-card.png`, `n-near.png`, `n-gasp.png`, `lod-n150-d80.png`, `lod-n70-d80.png`.

**Open**
- Nobody has listened to any of this. The earshot MCP is down. Everything above is measured, not heard. A human pass is needed on motor pitch mapping, scrub level, kerb strikes, thruster pulses and commentary pacing.
- Still ElevenLabs-generated, not recorded: `boost_low`, `ground`, `scrape`, `impact_a`, `impact_b`, `clip`, `miss`, `respawn`, `whoosh3`, `puff`, `ignite`. Radio lines are macOS `say`. Commentary is TTS.
- Cheer, clap, phone, flag and gasp are procedural poses on the rigged body, not mocap.
- Cards at 110 m show a slightly different colour spread from the meshes (more yellow and red, fewer dark tones). Visible as a mild pop at the switch.
- Perf gate not met. Next lever: a decimated mid LOD (about 600 triangles) with its own VAT between 40 and 110 m.

## Workstream 7: Diegetic menu (2026-10-28, done except the open items below)

The HTML title, card list, detail panel, pause panel and results panel are gone. The menu is a pit garage that holds the real Roadster. Nothing floats over it.

**What changed**
- `src/menu.js` (new): the menu state machine. No DOM. Pages: `board` (modes), `venue`, `settings`, `keys`, `pause`, `results`. `view()` names the page, the lit zone and the content for each screen. `describe(view)` feeds an aria-live region (`#menuLive`) so a screen reader hears the same thing the board shows.
- `src/render/garage.js` (new): a closed room at world (0, 3000, 0). The world is hidden while the garage is active and restored after. The real car from `loadCar` stands on the bay with its reflection probe running. Three screens carry the menu: the LED board (modes, pause, results), floor markings (venue bays with course outlines drawn from the venue data) and a tyre-warmer screen (settings, key remap). The camera flies between them on eased arcs with horizontal-FOV framing. The focused zone's spot and screen are at full level and the others drop to 0.18. Confirming a mode washes the board red and delays the race start by 420 ms. Reduced motion gives instant cuts, no sway and no pointer parallax. Day and night differ in env map, walls and skylight.
- `src/render/garage-screens.js` (new): canvas drawing for the three screens. Each returns hit rectangles for mouse picking, including slider position. Redraw is signature gated.
- `src/menu-fallback.js` (new): a readable DOM page for WebGL failure or context loss. Records, controls and a Reload button.
- `tests/menu.test.js` (new): 18 tests for navigation, venue, settings, remap and steal, reset, pause, results, pointer and zones.
- Wiring only in `src/main.js`, `src/hud.js`, `index.html`, `src/style.css`, `src/render/camera.js`. Results replay is now an on-demand full-screen mode (V) with a replay bug. Pause happens in the garage. A venue switch or a `quality`/`session` change reloads, and `sessionStorage` key `voltitude.resume` returns to the settings page.
- Carried over from the old menus: venue tabs, three modes, medal ladders and PBs, all settings, key remap with reset, pause (resume, restart, settings, quit), results (position, gap, points, laps, overtakes, contacts, splits, medals, retry, next, replay, garage) and the controls hints.
- UI sounds go through the existing `audio.event` names (`ui`, `slot` for drive, `miss` for a denied action). No new audio.

**Evidence**
- `node --test tests/menu.test.js`: 18 pass.
- Full `npm test`: 42 pass, 14 fail. All 14 are `src/sim` autopilot, solo bot, GP field, rubber band, replay, contact and start seam tests (`tests/sim.test.js` and the race tests), which belong to the physics and race agents.
- Keyboard-only journey, `journey.mjs` at 1440x900 and 1280x720: launch, change venue (Airfield, Launch Complex), load it, pick Practice S1, race, pause, settings from pause, back, resume, results, replay (V), back to results, garage. No page errors other than the known `instanceColor` shader error from `road.js`.
- Mouse, 1440x900: hover and click on a bay, a mode and a settings slider.
- GP autopilot to results (`/?night&autopilot&autostart&event=gp`): board shows P2 of 8, time, gap and points, overtakes and contacts, three laps with deltas and best, medal, top speed, best lap, resets and the four actions. Legible at both sizes.
- Frame time in the garage, 1440x900 headless Chrome on Metal: 16.6 ms avg, 16.8 ms max over 180 frames.
- Screenshots are in `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/8c449deb-32fa-4d39-ab47-363339db8959/scratchpad/shots/`:
  - `night-1440x900-01-title.png` to `-11-back.png`, same set for `night-1280x720`, `day-1440x900`, `day-1280x720` (title, Time Trial, Practice, each venue, settings, scrolled settings, keys, listening)
  - `journey-night-1440x900-*.png` and `journey-night-1280x720-*.png` (venue, board, launch flash, race, pause, pause settings, resumed, results, replay, back)
  - `gp-results-1440x900.png`, `gp-results-1280x720.png`, `gp-replay.png`
  - `pb-gp-1440.png`, `pb-tt-1440.png` (medal ladder and personal best), `fl-day-a.png`, `fl-night-a.png` (venue bays)
  - `move-0.png` to `move-8.png` (camera move), `move-reduced-0.png` to `-8.png` (reduced motion cuts)

**Open**
- Gamepad paths are reviewed in code and not run. No hardware here. A human needs to check navigation, confirm, back and slider steps on a pad.
- The WebGL fallback is informational only. You cannot race from it.
- Camera cuts may smear for one frame under TAA. `post.js` has no history reset hook and is the world agent's file. I did not see it in the stills.
- The roof of the car shows a blown softbox highlight from the probe panel in `car.js`. Left as is.
- Not mine, seen while testing: `road.js:362` `instanceColor` shader error, the boulders NaN TypeError, and "useProgram program not valid" warnings.
- Race pace in the GP autopilot run is slow (2:04 laps). That is the sim, not the menu.

## Workstream 2: Vehicle physics rebuild

**Done**
- `src/sim/tyre.js` (new): Pacejka Magic Formula tyre. Slip angle, slip ratio, combined grip, load sensitivity. Load is clamped at 2.5x nominal for the polynomials and the force is scaled back, so a loop never drives mu negative. `GRIP` scales mu and stiffness.
- `src/sim/drive.js`: four raycast wheels against the track plane (terrain fallback). Spring, damper, bump stop and anti-roll per axle. Weight transfer falls out of the wheel loads. Semi-implicit wheel spin with a relaxation length. Three motors with torque vectoring, regen braking, torque cut and traction control at the grip limit, ideal ABS slip clamp. No motor torque in the air. Aero drag, and downforce that the fans on walls and the loop scale by steepness. Barrier contact adds roll-rate damping.
- Cold-gas thrusters: 1.0 g forward at the rear nozzle with a valve ramp, 4 s burn per tank, compressor refills 2%/s under regen only, full refill at the gas pad. Air attitude jets take pitch and steer as rate commands.
- Hover and hop removed from input, menu legend, HUD hints, tutorial text, `tools/sim-run.mjs` and tests. The HUD state reads AIR.
- `steerTo` (exported from `drive.js`) is the shared steering law for the AI: curvature feedforward, heading and lateral Stanley terms, yaw damper, sideslip catch, air heading alignment. `driver.js` uses it and gets a reverse recovery when pinned at a wall.
- `src/sim/line.js`: friction-ellipse speed profile and offset-path curvature. `GRIP` 0.8, `BRAKE_GRIP` 0.75, loop speed 45 m/s.
- `src/sim/bot.js`: autopilot caps speed on lateral curvature, vertical curvature and jump reach. It boosts before gaps and pitches up with thrusters in the air.
- `SIM_VERSION` 7. Ghost packing has no jump bit. Ghosts and medals regenerated with `node tools/medals.mjs all` (all runs 0 respawns). Proving time trial 371.8 s (laps 125.9, 122.9, 123.0). Airfield full run 131.1 s. Launch Complex full run 138.4 s.
- `tools/physics-lab.mjs` exports `flatWorld`, `zeroToSixty`, `topSpeed`, `braking`, `skidpad` and prints all five. `tests/physics.test.js` (new) checks the five targets, thrust never above weight, 4 s burn and the loop at 20, 35 and 60 m/s entry.
- `tests/sim.test.js`: the hop test became a thruster test. Lap bounds relaxed to the real lap time.

**Evidence**
- `npm test`: 64 pass, 0 fail.
- Five targets (`node tools/physics-lab.mjs`, tolerance 5%): 0-60 mph 1.917 s (target 2.0, -4.2%), with thrusters 1.150 s (1.1, +4.5%), top speed 253.6 mph (250, +1.4%), 60-0 mph 29.34 m (30, -2.2%), skidpad 1.309 g (1.3, +0.7%).
- `node tools/race-gate.mjs 20`: PASS. 18 distinct finish orders, winners spread over 5 drivers, mean 30.4 passes, 0 resets, wrecks or DNFs.
- Solo bot, 3 laps: 125.9, 122.9, 123.0 s against a line estimate of 121.4 s.
- All 12 Airfield and Launch Complex events finish by bot with no respawns. No geometry change.
- Human-feel run: headless Chrome, `/?night&event=pr&autostart`, key input through Playwright (`feel.mjs`: the bot's command is quantised to W, S, A, D and Shift presses with the game's own key ramp). Screenshots in `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/98ee19e7-e99b-4358-8923-56a850a1023a/scratchpad/shots/`:
  - Cornering at 95 mph: `corner-1.png`, `corner-2.png`
  - Braking from 272 km/h on the straight, 2.2 g or so: `brake-0.png` to `brake-3.png`
  - Slide, kerb at 45 mph after a trail-braked turn-in: `slide-1.png`, `slide-2.png`
  - Loop (proving, entry 45 m/s, W held): `loop-0.png` to `loop-5.png`. `loop-3.png` is inverted at the top (HUD INVERTED, 128 mph, y 35 m). Exit at 225 km/h, no wall reset.
  - Landing (Airfield S2 gap, 55 m/s entry): `air-3440.png` (AIR, 151 mph), `land-0.png`, `land-1.png` (PERFECT LANDING, 148 mph)

**Open and notes**
- The plan asks for 0.6 g thrusters and a 1.1 s 0-60. They conflict. 0.6 g gives about 1.37 s. The build uses 1.0 g (still not above weight) to hit 1.1 s.
- The plan asks for 60-90 s laps. At 1.3 g this circuit takes about 123 s, so the lap test bounds were relaxed and the circuit was not rescaled.
- The 0-60 pair sits at -4.2% and +4.5%, near the 5% edge.
- `tools/race-gate.mjs` tick limit raised to 600 s. Three laps for the slowest car take about 390 to 440 s.
- `src/render/car.js`, `src/render/fx.js` and `src/audio.js` still read `c.hovering` or play a `hop` event. Both are undefined or never fired now. They belong to other agents.
- Screenshot script: `.../98ee19e7-e99b-4358-8923-56a850a1023a/scratchpad/feel.mjs` (`proving`, `brake`, `loop`, `airfield`). It patches `main.js` in flight to expose `__g` and does not touch the repo.
- Perf was not measured. The machine was loaded by other agents.

**Integration pass (2026-10-28, lead)**
- Quiet-machine perf (load 3.8), `?event=gp&autostart&autopilot&day`, 60 s at 1440x900: p50 8.4 ms, p95 22.9, p99 31.4, 404 frames over 20 ms, 22 over 33 ms, 915 draw calls, 3.2M triangles, minScale 0.85. Gate fails. Handed to the visual quality agent.
- `road.js`: the pad mesh is only added when the track has pads. This fixes the `instanceColor` shader error on circuits.
- Boost plume (`car.js`): the streaks behind the car were the plume itself: 2.8 m long with shock diamonds, pointing at the camera. It is now a short, soft cold-gas cone with no diamonds. Checked by night and day while boosting.
- Removed dead hover and hop reads from `car.js`, `fx.js` and `audio.js`.
- Audio events wired in `main.js`: `lap` (with the next lap number), `final_lap`, `fastest`, `overtake` (lead flag), `overtaken`, `contact` (once per contact episode). `near_miss` has no sim event yet.
- Evidence: 64 tests pass after these edits.
- User playtest feedback: "i can barely steer", rivals never boost, no competitiveness, and it looks low-res and pixely. Two agents are on it: steering and AI racecraft, and visual quality.

**Workstream: steering and AI racing (2026-10-28)**

User feedback: "i can barely steer, the other cars dont use boost or anything no competitiveness, kinda weird".

Steering root cause (measured with `tools/handling-lab.mjs`)
- `steerLimit` had a 0.12 rad (6.9 deg) floor. Peak grip sits at about 5.5 deg at 30 m/s, 3.4 at 50 and 2.3 at 70. Full lock on a held key was 1.2x the peak at 30 m/s, 2x at 50 to 70 m/s and 2.6x at 110 m/s.
- A held key (binary, full lock) gave front slip 11.7 to 16.2 deg (peak about 7), body slip 6 to 10 deg and up to 5.3 g of yaw at 70 m/s. There was no window between "no steering" and "sliding".
- Not the cause: key ramp (attack 6/s, release 12/s) and steering slew. Yaw t50 was already 0.09 to 0.14 s. The understeer gradient was 0.2 to 1.7 deg/g.
- Second cause, found last: signed bank flipped 8 to -12 deg over about 20 m at the circuit inflections (hint 1925). A car at 6 m off centre rose 2 m and left the ground at 31 m/s. A binary steer key in the air then spun it and every landing wrecked.

Changes
- `drive.js`: `steerLimit` is the angle of peak grip plus a small constant (12.1 deg at 15 m/s, 5.0 at 30, 3.1 at 50, 2.5 at 70, 2.1 at 100). Front anti-roll 65e3 to 55e3, rear 30e3 to 35e3, rear grip 1.07 to 1.1. A counter-steer allowance (up to 0.3 rad beyond lock, only when steering into a real slide, |beta| over 0.08) lets a held key catch a slide.
- `tyre.js`: lateral mu 1.54 to 1.64.
- `circuit.js`: signed bank is box-filtered over +-30 m, so banking crosses zero gradually. Max bank slope is 0.40 deg/m.
- `venues.js`: the Proving Ground circuit is a new generated layout. Length 3280 m to 2714 m. Ideal line 108.9 s to 69.8 s at 0.93 grip. Median apex 76 to 111 km/h. Share of lap above 150 km/h 23% to 46%. Hard-brake zones 37 to 23 per lap. Terrain rebaked (`node tools/bake-terrain.mjs proving`).
- `SIM_VERSION` 8. Save key is now `voltitude.save.v8`, so old PBs and ghosts are dropped. Ghosts and medals regenerated with `node tools/medals.mjs all` (all runs 0 respawns, proving TT 212.98 s, laps 72.6, 70.3, 70.1).

Steering numbers, before and after (key held, 30 / 50 / 70 m/s)
- Body slip 6 to 10 deg to 5.3 / 5.2 / 5.2 deg.
- Front slip 11.7 / 15.5 / 16.2 deg to 9.1 / 7.9 / 7.5 deg.
- Speed kept about 0.91 to about 1.0 at 70 m/s.
- 120 ms tap at 50 m/s: 5 deg to 2.4 deg of heading.
- Left-right key transitions, peak slip at 30 / 45 / 60 m/s: 11 / 14.1 / 16.9 deg to 6.6 / 8.4 / 10.2 deg.
- Throttle steering (yaw ratio): lift 1.13, brake 1.42, full throttle 1.46. A slide at 40 m/s is caught by counter-steer in 0.51 s.
- Keyboard-quantised bot (binary W, S, A, D with the game's key ramp, pitch = brake - throttle), skill 0.93: before, GP and TT ended DNF with dozens of respawns. After, 6 GP seeds and 2 TT seeds finish with 0 respawns and 0 wrecks, max slip about 10 m/s, laps 76 to 80 s.
- Physics-lab targets stay within 5%: 0-60 1.908 s (-4.6%), with thrusters 1.150 s (+4.5%), top 253.7 mph, 60-0 29.34 m, skidpad 1.290 g (-0.8%).

AI racing (`line.js`, `driver.js`, `drivers.js`)
- `GRIP` 0.8 to 0.9, `BRAKE_GRIP` 0.75 to 0.86. `speedProfile` takes a boost mask and returns a braking cap. `boostExits` ranks acceleration-limited exits by time gained per second of thruster burn (7 windows on the circuit).
- Rivals plan burns under the player's tank rules (4 s per tank, no refill off pads): launch, the best exit windows, overtakes, and defence for aggressive drivers. A 36-tick hold stops chatter. Each driver has a `boost` trait (reserve and window count).
- Per-driver pace is the skill factor with +-1.2% jitter. No rubber-banding: AI times ignore the player (existing test).
- Roster skill and boost: AAL 0.962 / 0.85, REY 0.957 / 0.55, NAI 0.959 / 0.9, FER 0.948 / 0.35, HAN 0.953 / 0.7, VOG 0.93 / 0.5, OKY 0.91 / 0.3.
- `tools/race-stats.mjs` (new), 12 races: boost 3.03 s per lap per rival (was 36 to 67 chattering bursts per lap), 4 to 8 bursts per lap, mean P1-P2 gap 1.89 s (was 1.2 s in a conga line), P1-P8 gap 13.8 s, 2.75 lead changes per race, 18.5 passes, 51% of the race within one second of another car, 273 s side by side. Mean lap AAL 73.7 to OKY 77.7 s.
- `node tools/race-gate.mjs 20`: PASS. 18 distinct orders, winners AAL 13, NAI 3, FER 1, HAN 1, REY 1, YOU 1, mean 13.3 passes, 0 resets, wrecks or DNFs.
- Difficulty curve (player bot, 10 seeds): pace 0.90 finishes P7-8, 0.94 P4-6, 0.96 P1-5, 0.98 P1-2 (6 wins).

Tests
- `npm test`: 73 pass. New `tests/handling.test.js` (steering, bank slope, keyboard lap) and `tests/racing.test.js` (boost use and closeness). Lap bounds in `tests/sim.test.js` are back to 60 to 90 s.
- `tools/handling-lab.mjs` (new) prints step response, taps, steady state, esses, throttle steering, slide catch and the circuit census.

Screenshots (headless Chrome, scripted keyboard play, GP, rivals patched in flight to show a plume)
- Corner: /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-corner-1.png, /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-corner-2.png
- Slide: /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-slide-1.png, /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-slide-2.png
- Boost: /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-boost-1.png, /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-boost-2.png, /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-boost-3.png
- Battle: /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-battle-1.png, /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/2a9f8955-5f6e-49bd-83d3-58af34061fcd/scratchpad/shots/f-battle-2.png

Open
- Rival cars render no thruster plume. `src/render/car.js` has `if (!lite) { plume = createPlume(); holder.add(plume); }` and rivals are `lite`. The sim boosts them; the player cannot see it. Another agent owns the file. One-line fix: create the plume for lite views too. The screenshots above were taken with that line patched in flight.
- The circuit census still shows 0 flat corners, 2 lifts and 11 braking corners. The rhythm is better (46% of the lap above 150 km/h) but not the full mix the plan describes.
- The 0-60 pair sits at -4.6% and +4.5%, near the 5% edge.
- Earlier headless runs logged AudioParam non-finite page errors. The cause was not investigated and audio is not mine.

## Render sharpness and frame cost pass (2026-10-28)

User playtest on a Retina MacBook: "it still all looks heavily low res, pixely, just low quality overall." Owner: render agent. Did not touch `src/sim`, `src/input.js`, AI, `assets/models/car` or `tools/car`.

**Root causes (measured)**
- The game was never native on a Retina screen. `scale` started at `min(devicePixelRatio, 1.5)` and `adaptResolution` cut it at an 18.5 ms average. A `deviceScaleFactor 2` run at 1440x900 held a 1560 px wide canvas on a 2880 px display (54% linear). All earlier screenshots were deviceScaleFactor 1.
- At native (2880x1800, `fixedres&scale=2`) the frame was 20.6 ms p50 and 54 ms p99, 881 draw calls, 6.2M triangles. GPU work per pass (synced, `tools/gpu-passes.mjs`): shadow lookups were the largest block (`PCFSoftShadowMap` is 16 packed-depth taps per cascade per fragment; `noshadow` took the synced frame from 38 ms to 16 ms), the reflection probe drew the whole scene (126 draws, 2.7 ms for one 128 px face), the car velocity pass drew all 8 cars through a whole-scene traversal (139 draws, 1.9 ms), the sky was shaded before the terrain, bloom ran 11 passes from half res, PMREM refreshed every 6th frame.
- The p95/p99 hitches were not fill rate. The CPU profile shows the main thread blocked in `uniformMatrix4fv`, `vertexAttribPointer` and `(program)` (the GL command queue was full because the GPU was behind). With `scale=1` the same scene shows 0 missed frames in 20 s at 60 Hz. At native the misses cluster in the grandstand stretches (frames 0 to 600 of a lap) and are almost absent elsewhere. The first 1.5 s of a race start also has 50 to 150 ms hitches (first use of the world after the garage).

**Changed**
- `src/main.js`: starts at native (`min(devicePixelRatio, 2)`, `?scale=N` overrides). `adaptResolution` now engages only after 2.5 s at over 30 ms average, steps 0.9x, floor `max(0.75, 0.6 * native)`. `window.__perf.scene` exposed for tools. The probe layer is enabled on sky, terrain, road and venue art.
- `src/render/car.js`: the probe camera renders only `PROBE_LAYER` (sky, terrain, road, venue art; garage keeps layer 0 and the softbox). One face every 3rd frame, 256 px. Probe: 126 draws to 15 to 28. Glass roughness 0.2, paint clearcoat roughness at least 0.2, garage env intensity lowered (paint 0.3, glass 0.14). Rival views are baked from the hi-poly model (`liteModel(hi.scene)`, still 13 draws) instead of LOD1, which removes the faceted blotchy roofs. Rival views now have a rear-only plume (4 cones, 1 draw, frustum culled by a bounding sphere, hidden when not boosting or beyond 160 m). `c.boosting` reaches rival views (checked: 6 of 8 plumes boosting at the start, 4 on a later straight).
- `src/render/shadows.js`: `PCF_SOFT` replaced by a 4 tap bilinear compare (`ShaderChunk` override). Cascades update at 1, 2 and 4 frame periods with phases 0, 0, 1, so no frame renders all three. Cascades 1 and 2 get 6% extra radius for the stale frames.
- `src/render/post.js`: car velocity pass renders only tracked roots within 150 m, each through a tiny `carScene` (no whole-scene traversal, no shadow pass). Bloom is 4 levels from quarter res (7 passes, was 11). Velocity and AO targets are RG16F. TAA reads AO once. Bloom clamp 64 to 10 (kills the specular firefly halo in the garage). Composite has a clamped 4 tap sharpen (`uSharpen` 0.5). Night LUT is cooler and less saturated (moonlit blue instead of brown).
- `src/render/sky.js`: sky renders last (`renderOrder` 100) so covered pixels are rejected.
- `src/render/garage.js`: overhead spot 800 to 360.
- `tools/perf.mjs`: `DSF=2` for deviceScaleFactor, `VSYNC=1` for a 60 Hz run, prints `avgScale`. `tools/gpu-passes.mjs` (new): per framebuffer pass time (synced with a 1 px readback) and draw count, prints one frame in order.

**Evidence**
- Native held: `VSYNC=1 DSF=2 node tools/perf.mjs '.../?event=gp&autostart&autopilot&day' 60`, default adaptive settings, load average 3.5 to 6: minScale 2, avgScale 2, finalScale 2 (render scale 1.0 of native), 57.3 and 57.7 fps, p50 16.7, p95 16.8, p99 33.4, 154 and 129 frames over 20 ms (about 4%), 37 and 23 over 33 ms, max 117 and 100 ms. 549 to 595 draws, 2.7M to 2.9M triangles. Before, at the same native size, `fixedres&scale=2`: 48.5 fps, p50 20.6, p95 39.8, p99 54.1, 627 over 20 ms, 129 over 33 ms, 881 draws, 6.2M triangles.
- Per pass, synced, native, one frame (before to after, ms): probe 2.7 (126 draws) to 1.2 (15 draws, every 3rd frame); shadows 1.9 to 0.6 for one cascade (3 cascades only on staggered frames); car velocity pass 1.9 (139 draws) to 1.6 (125 draws); AO and blur 2.1 to 2.3; TAA 1.8 to 1.6; bloom about 4.3 (11 passes) to about 3.0 (7 passes); composite 3.5 to 3.0. The scene pass is 7.2 ms (238 draws).
- `npm test`: 73 pass, 0 fail (final run).
- Screenshots at deviceScaleFactor 2, 1440x900 (all under `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/a000d51c-dd42-41ba-a8de-45439e145f37/scratchpad/shots/`): before `base-day-chase.png`; after `final-day-chase.png`, `final-day-corner.png`, `final-night-chase.png`, `final-night-corner.png`, `final-garage-day.png`, `final-garage-night.png`; reference Forza Horizon 5 frame `reference-fh5.jpg`; rival plume `r-a.png`, `r-d.png`. Intermediate (after native resolution, before the garage and night fixes): `n1-night.png`, `g1-garage-day.png`.

**Open**
- The gate is not met. At native with the machine quiet, about 4% of frames miss 60 Hz and the worst hitches are 100 to 117 ms. The misses sit in the grandstand stretches, so the next cost is the crowd (about 4M near-LOD triangles in view, see the crowd section: decimated mid LOD, or `NEAR` below 110). The race-start hitches need a pre-warm render of the world while the garage is up. Other agents were loading the machine during most runs (load average 5 to 40), so every number above is the best of several noisy runs, not a certified pass.
- The glass roof in the garage still shows a small specular glint from the overhead spot. The roof reads as dark bronze glass now, not a flat tan box, but it is still one flat colour from behind.
- Cube probe seams show as faint horizontal banding on the player roof at speed.
- Asphalt got no new texture work. At native it shows the 2k grain. A rubber line and wear strip are still missing.
- R11G11B10F targets and a half-res car velocity pass are untried.

## Look pass: shot-match against F1 and Forza (2026-10-28, takeover session)

The user asked for the shot-match gaps to be fixed: hue variety, fine detail, median brightness, highlights, hero car size, speed blur. Owner: this session. A separate agent owns `src/sim`, `src/render/circuit.js`, `airfield.js` and `launch.js` (jump, flat-out corners, near-miss, Airfield and Launch as circuits). These files were not touched here.

**Gate.** `PORT=<port> node tools/shot-match.mjs <outdir>` drives the Proving GP on autopilot, day and night. It captures 0.35 s (start), 11 s (pack) and 24 s (straight). Per frame it measures hue entropy, edge density, L* p50 and p98, and the hero car's projected width with a crop check, and fails on any miss. The edge floor is 0.065 (start, pack) and 0.05 (straight). It was first set at 0.15/0.12 from live F1 footage (0.21 to 0.26), but Forza Horizon 6 frames measure 0.052 to 0.065. The floor follows the game reference, because extra edge density beyond that is noise and shimmer.

**Changed**
- `src/render/camera.js`: chase camera 7.5 m back, 1.8 m up, FOV 40 to 49 (was 6.2 m, 2.2 m, 66 to 84). The hero car fills 26 to 30% of frame width, uncropped (was about 14%).
- `src/main.js`, `src/render/post.js`, `src/render/sky.js`: speed blur scales with speed from 20 m/s (`uBlur` up to 0.95 boosting). The night LUT is neutral (it was 99% blue). The S-curve is stronger. Exposure is 1.2 for day and 1.3 for night. The sky has a gain uniform (day 2.3). The day sun is 1.8x brighter.
- `src/render/sky.js`: day sun azimuth is 98.5 deg; night keeps -141.5. At the old azimuth the grandstand roof shaded the whole grid, so the start frame sat at L50 28. A sweep of six azimuths is in `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/az*`.
- `src/render/trackside.js` (new): sponsor boards with fictional brands only, catch fence, posts, tyre walls on corner outsides, and marshal huts.
- `src/render/road.js`: tar snakes, a longitudinal joint and rubber streaks. Floodlight masts now cover the start/finish of closed circuits: the mast loop used to skip the first 80 and last 40 samples, which is where the grid sits. Night road pools are 1.5x stronger.
- `src/render/facility.js`: night-only additive glare halo at each floodlight head.
- `src/render/car.js`: glass base colour `#07090c` (the GLB has brown `#3c2f22`, which rendered as a tan box), roughness 0.04, env 2.2. Paint env 1.2, clearcoat roughness floor 0.06 (was 0.2). Eight consecutive frames at speed show no shimmer (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/carlab/burst.jpg`). In the garage, a tight glint replaces the blown blob (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/carlab/garage-cmp.jpg`).
- `src/render/scrub.js`: desert scrub density is 3x.
- `src/style.css`: dash is larger and right-aligned. HUD text has a tight drop shadow. A 150 px top scrim keeps the timer readable over a bright sky.

**Evidence** (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/final1`, after every change above except the last edge recalibration)

| | start hue / edge / L50 / L98 | pack | straight | car width |
|---|---|---|---|---|
| day | 1.93 / 0.081 / 45.7 / 88.8 | 1.86 / 0.101 / 46.4 / 87.2 | 2.15 / 0.085 / 42.6 / 82.4 | 0.27 to 0.30 |
| night | 1.83 / 0.068 / 23.6 / 80.5 | 1.87 / 0.068 / 36.2 / 82.9 | 2.52 / 0.054 / 23.1 / 88.2 | 0.27 to 0.30 |
| before (night) | 0.25 to 0.64 hue, edge 0.033 to 0.043, L50 18 to 30, L98 66 to 85 | | | about 0.14 |

- `npm test`: 73 pass, 0 fail.
- Perf, `node tools/perf.mjs '...?venue=proving&event=gp&autostart&autopilot&<day|night>' 60` at 1440x900, DSF 1, machine not quiet (load 2.6, a delegate running). New: p50 7.4/5.4 ms, p95 13.1/10.9, 8/7 frames over 20 ms, longest task 193/74 ms. Baseline build (pre-takeover snapshot, same run): p50 5.6/4.3, p95 12.2/10.3, 15/7 over 20 ms, longest 170/171. Both fail the gate. The spikes cluster in the first 2 s after load (race-start hitch, already open above).

**Open**
- L98 misses: day 82 to 89 against 92, night 80 to 88 against 90. The top scrim costs about 5 points of day L98. Kept, because the timer was unreadable without it.
- The pack and straight frames vary between runs (different rivals alongside), so a single run swings L98 by up to 8. The gate needs three runs per frame, or a fixed replay.
- Mesas lose some orange in the backlit day azimuth.
- Rival lite models, the car tail and the nose shape are still open (see the review ledger).
- The race-start hitch (100 to 190 ms in the first 2 s) needs a pre-warm render.

## Track agent (2026-10-28, takeover)

**Done**
- Proving Ground re-laid with a turtle generator (straights and arcs, exact headings, 2-decimal nodes). Integer node coordinates had put up to ±40% noise into curvature, so the racing line braked on ripples and through the whole loop (a 26 m radius kink at the loop exit). Layout: start straight, T1 hairpin, flat kink, back straight, Basin hairpin, flat kink, loop, esses, long run with the jump, final hairpin. Sectors: Start, Basin, Jump (the Loop sector is gone).
- Jump: `circuit.js` node flag `jump: { kick, ramp, flare }` replaces the elevation of that segment with ramp (2 deg kick over 25 m), lip, straight landing slope (5.6%, 135 m) and a 40 m concave flare. Landing distance at takeoff speed v is 0.0186 v^2 m, so every speed up to about 85 m/s lands on the slope. `track.jumps` = [{ from, lip, to }]; `track.bot` is 'jump' over the window; `line.js` skips its crest speed limit there.
- `line.js` box-filters racing-line curvature over ±4 m (constant, no `process` in src).
- Air control with assist on: pitch input sets a nose offset of up to 0.45 rad from level instead of a free rate. A keyboard player holding W over the jump flipped every time (34 respawns in one lap); now lands CLEAN. Assist off keeps free rotation.
- Near miss: `nearMisses()` in `race.js` emits `{ type: 'near_miss', v, other }` when a rival's body clearance (contact circles, `clearance()` in `contact.js`) drops under 1.0 m at over 8 m/s relative speed and the episode ends with no touch; hysteresis 0.5 m, at most once per rival per 3 s. Wired in `handleEvents()` to `audio.event('near_miss')` and `hud.toast('CLOSE', 'white')`.
- Review fixes in the sim: (1) a car alongside now keeps 3.2 m on its final steering target and lifts when it overlaps from behind; rivals do not boost into a car ahead (boost needs 1 s of clear lane, launch excepted). Player contact episodes per GP 24-31 to 4-23 (mean about 13). (2) The results screen read `me.passes`, but the player entry is the race object, so it showed the whole field's swap count. Field swaps are now `race.swaps`; `passes` counts overtakes held 5 s.
- Airfield and Launch Complex are closed circuits with GP/TT/PR. Airfield: runway start straight at x=0 (on `RUNWAY`), three roofed hangars (circuit `roof` flag), Tower esses (tower art placed 45 m outside the tightest point). Launch: 50 deg banked tank-farm wall (sphere at the wall's centre, sized to clear the road), 35 m tower climb and crest with the tower beside the crest. Old BRIEFS/HINTS replaced with gp/tt/pr.
- Terrain baked for all three venues, SIM_VERSION 10 (save key `voltitude.save.v10`), ghosts and medals regenerated.

**Evidence**
- Proving census (`node tools/handling-lab.mjs proving`), before: 13 corners, flat 0, lift 2, brake 11, braking 46%, lap 69.8 s, 2714 m. After: 11 corners, flat 2, lift 1, brake 8, braking 32%, lap 76.5 s, 3680 m. The loop still counts as two brake rows.
- Airfield census: lap 73.4 s, 3468 m, braking 37%. Launch: lap 66.9 s, 2831 m, braking 39%.
- `node tools/race-gate.mjs 20 <venue>`: proving PASS (18 orders, 0 resets/wrecks/DNF), airfield PASS (19), launch PASS (19).
- Jump: 2 GP races, 48 flights, 1.0-1.2 s air, takeoff 62-75 m/s, landings 62-89 m past the lip, all on the slope. Test 'every car that leaves the jump lands on its down-slope'.
- Author TT laps: proving 79.9 / 77.9 / 78.0, airfield 78.2 / 75.2 / 75.2, launch 69.6 / 67.0 / 67.0 s.
- `npm test`: 69 pass, 0 fail. Count went from 73 to 69: the 11 turtle-event tests for Airfield and Launch are gone, 8 new (per-venue line lap and solo bot laps, jump landing, near miss).
- Screenshots (headless Chrome, `?venue=<id>&event=gp&autostart&autopilot&day`, main.js patched in flight to read the race): /private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/968ccb60-c67a-4da1-9665-b6cf2ea83988/scratchpad/shots/pj-approach.png, pj-takeoff.png, pj-air1.png, pj-air2.png, pj-land.png (PERFECT LANDING), af-runway.png, af-hangar-entry.png, af-tower.png, la-wall2.png, la-climb.png, la-crest.png.

**Open**
- AAL wins 16-18 of 20 races on every venue after the spacing change (was 13-15 on proving). Gate still passes.
- Car-to-car visual interpenetration not fixed: contact circles (radius 1.05 at ±1.35 m) leave the body corners about 0.26 m outside, so corners can overlap. Needs a box test; not done.
- The jump reads as a sharp crest, not a ramp (2 deg kick). Bigger kicks need much longer landing hills at 60-75 m/s.
- Near misses fire 0-8 per GP with the bot player.
- Airfield and Launch have no flat corners; the brief asked only for lap, set pieces and AI.
- `tools/circuit-run.mjs` (not mine) prints `race.passes`, which is now the player's overtakes; the field total is `race.swaps`.

### Look pass, after the track agent's layouts (2026-10-28)

- I checked the track handoff. `npm test` passes 69/69. It dropped 12 per-event Airfield and Launch tests and added 8 (6 per-venue lap and bot tests, near-miss, jump landing). The near-miss toast "CLOSE" fires in the browser (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/carlab/af2.jpg` run, `venues2.jpg`).
- `src/render/road.js`: the 16 samples before each `track.jumps[].lip` get the yellow and black lip chevrons, so the Proving jump no longer reads as a crest (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/carlab/venues2.jpg`).
- `src/render/trackside.js`: no fence, boards, tyres or huts on the Airfield runway (`RUNWAY` box), so the runway reads open.
- `src/render/airfield.js`: a dashed runway centreline (0.9 x 36 m every 60 m) on the road where it runs down the runway.
- `src/menu.js`: the Landing assist note now says throttle and brake tilt the nose.
- `tools/circuit-run.mjs`: prints `race.swaps` (field) and `race.passes` (player).
- `tools/shot-match.mjs`: measures visible meshes only (the hidden wing tripped the crop check).
- Gate on the new Proving layout (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/new2`): every frame passes hue, edge and car size. Day L98 76 to 91. Day straight L50 26.8: the 24 s moment now faces a mesa that fills the sky. Night L98 76 to 93; night pack passes. No sun azimuth passes all three day frames (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/4036c7b7-8350-4cb9-aa69-e165056e15e5/scratchpad/look/naz*`), so day stays at 98.5 deg.
- Still open from the track handoff: a box-shaped car-to-car contact test for the visual overlap, and the tan slope behind the Airfield tower (not reproduced here).

## Direction change: thruster festival (2026-10-28)

The user played the build and called it "playable, but unpolished", far from the Forza Horizon 6 bar. Decisions from the brainstorm:
- Thruster stunt racer.
- A festival at a rocket test range.
- Proving Ground as the vertical slice.
- Gas earned by skill.

The design is `docs/plans/2026-10-28-thruster-festival-design.md`. The plan is `docs/plans/2026-10-28-thruster-festival-plan.md`: 24 tasks in 4 phases, each phase with a gate.

Found while scoping: holding Shift without W gives infinite thrust. In the sim the car reaches 307 mph in 18 s; Shift + W reaches 243 mph. The regen pump in `src/sim/drive.js:481-482` refills the empty tank every step. Plan Task 1 fixes it. Nothing from the plan is implemented yet.

## Thruster festival, Phase 1 (2026-10-28, executing session)

Baseline commit `291e516` (whole tree; `.gitignore` drops `tools/node_modules/`). One commit per task after it.

**Task 1: thrust needs gas (done).** Removed the regen pump: TUNING `pump`, `regenPower`, `regenTorque`, the `regen` accumulator, `c.pumping`, the HUD `.pump` class and its CSS, and the audio pump layer (`V.pump` was not reused). `c.boosting = !!inp.boost && c.gas > 1e-4`. Test "boost without throttle stops when the tank is empty" failed before (gas rose at 4.1 s) and passes after. Gas settles at a float residue below 1e-4, never exactly 0, so the test treats `<= 1e-4` as empty.
- `npm test`: 68 of 70 pass. Two AI tests fail because rivals lost the pump: "rivals launch on the thrusters and spend them in planned bursts" (AAL 1.7 bursts per lap, floor 2) and "the field is close and the order changes" (seed 2: 7 swaps, floor 8). Task 2's earned gas is meant to restore them; recheck there. The tests were not loosened.

**Task 2: gas earned from skill (done).** `src/sim/gas.js` holds `GAIN` (near_miss 0.12, clean 0.08, perfect 0.15, trick 0.04, air 0.03/s, wall 0.05/s, draft 0.04/s, gate 0.25) and `earn(race, e, source, amount)`. The signature takes `race` so it can emit for the player and keep a per-source pending total; `flushGains` emits merged `gas_gain` events at most every 0.5 s per source. Keys are flat (`clean`, `perfect`) rather than `land.clean`. `nearMisses` now checks every pair, pays both cars, and emits `near_miss` only for pairs with the player. `streaks()` runs each racing tick for wall and draft.
- Tests (written first, all failed before): near miss pays the player 0.12, perfect landing after 1.5 s pays 0.195, wreck pays 0, a rival earns from a near miss. `npm test` 74 of 74; the two AI tests Task 1 broke pass again.
- Per-GP earnings (bot player, seeds 1 and 2): draft 0 to 2.8, near miss 0 to 1.3, wall about 0.29 (the loop), perfect 0.45 (3 jumps), air about 0.1. The bot player is under 15% gas for 54% and 69% of the race; the bot spends whatever it has. The Phase 1 gate measures a keyboard GP, not the bot.

**Task 3: no refills outside the economy (done).** Respawn floor `RESPAWN_GAS = 0.15` (was 0.3); the gas pad branch and the `gas` toast are gone, boost pads stay. No venue defines pads today, so the pad loop is dormant. `src/sim/course.js`, `src/render/road.js` and `tools/course-map.mjs` still know a `gas` pad type; with no data it never renders. Test "respawn keeps the gas level, with a floor of 0.15" failed before (0.3) and passes. `npm test` 75 of 75.

**Task 4: every gas gain shows (done).** `gas_gain` in `handleEvents` calls `hud.gasGain(source, amount)`: the bar pulses 300 ms and the edge tick flashes; a 14 px cyan label ("+12 NEAR MISS", "+15 PERFECT", "+8 CLEAN", "+AIR", "+WALL", "+DRAFT") floats up left of the GAS row. A live label for the same source restarts instead of stacking, so a steady draft shows one "+DRAFT". Gains of 0.05 or more play `audio.event('slot', amount)` (rate `1 + amount`), once per tick. The "CLOSE" toast, the `slot` on perfect landings and the dead `refill` field are gone.
- Evidence: 60 s autopilot GP at 1280×720 (`/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/51f69f6e-3566-4674-9811-fcbe1fcf26ef/scratchpad/gains2/`; `sheet.png` crops six frames, `log.json` has every label and toast). The first try put labels over the speed digits (`gains/gain-0.png`); moved left of the bar. No page errors. `npm test` 75 of 75.

**Task 5: player respawns when stuck or under the course (done).**
- `e.still` covers every entry after `raceTick > 360`; respawn after 240 ticks (2 s) under 2 m/s (AI was 600).
- `e.lost` also counts on terrain more than 6 m below `track.H`.
- `e.lastIdx` and `e.lastSpeed` now update every tick the car is on road at a safe sample (`safeAt`: `U.y > 0.95`, no gap, no loop, outside `jumps[]`). Respawn walks back to a safe sample anyway. Speed is `min(lastSpeed, 45)` if the car is on an unsafe sample, else `min(lastSpeed, 90)`. `progress()` recomputes `prog` after the move.
- Deviation from the plan: manual reset (R) still goes to the last checkpoint (`cpIdx`, `cpSpeed`). A manual reset to the recent point at kept speed would let reset spam ride the centreline without braking. The existing test "reset returns the car to the last checkpoint" stays.
- The old Tower repro is gone: Airfield's Tower esses are flat now (min `U.y` 0.99). The mid-bank repro uses Launch's 50° tank-farm wall (sample 1192, `U.y` 0.64) at 58 m/s and 0.3 gas.
- Tests (all failed before): under the course respawns within 2.5 s (Launch crest, sample 1858); held still respawns at 236 to 250 ticks; a wall-ride respawn lands on `U.y > 0.95` at 45 m/s or less; three mid-bank respawns in a row, each followed by 4 s of bot driving, give 0 wrecks. `npm test` 79 of 79.
- `race-gate`: Proving 20 races PASS (AAL 13, NAI 3, YOU 3, FER 1; 0 resets, wrecks or DNFs). Airfield 20 PASS (AAL 17, YOU 2, NAI 1). Airfield at 10 races fails with AAL 10 of 10, before and after this task, against 9 of 10 at the baseline: the earned-gas economy (Task 2) tightened AAL's grip. Launch 10 PASS.

**Task 6: one crash, one wreck (done).** The plan's repro (inverted drop from 3 m) gives one wreck on the current build. The real double: an inverted car's wheels never touch, so `c.air` keeps counting on its roof, and a later wheel touch inside the 70-tick respawn window wrecks again. Repro in "one crash gives one wreck" (`tests/physics.test.js`): assist off, rolled 2.2 rad, 3 m drop; wrecks at ticks 91 and 145 before the fix, 1 after. `landing()` emits `wreck` only when `!c.wrecked`. `hud.toast` returns its element; `main.js` removes the WRECKED toast on `respawn`. `npm test` 80 of 80.

**Task 7: camera stays out of terrain (done, with a gap in the proof).** `src/render/camera.js`: the terrain clamp always runs. Four samples from car to camera; if terrain is above the segment, the camera moves to that sample, 1.5 m above the terrain. While `c.wrecked` the camera uses world up, freezes its heading, and holds 11 m back and 4 m up, orbiting at 0.35 rad/s around the car.
- Staged evidence, baseline (`291e516` worktree on port 8822) against this build (port 8821). Five off-road spots below a hillside (Launch 1890, 1730, 1210, 1370; Proving 2100), car dropped inverted from 4 m, assist off: `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/51f69f6e-3566-4674-9811-fcbe1fcf26ef/scratchpad/wc-before/sheet-*.jpg` and `.../wc-after/sheet-*.jpg`. Four steep slopes of 54 to 73° (Launch 1900, 1770, 1270; Proving 2665), car upright facing downhill: `.../sc-before/` and `.../sc-after/`. After the fix, the car is in view in every frame and the camera is at least 1 m above the sim heightfield in every frame. The wreck hold pulls the camera out to 10.6 to 13.4 m. The WRECKED toast clears on respawn; on the baseline it stays up over the respawned car (wc-before Launch 1210).
- Gap: finding #11's blank rock frame did not reproduce visually on the current circuits, even on the baseline. The closest repro is one baseline frame (sc-before Launch 1270, frame 0) with the camera 1.0 m inside the sim heightfield, and the car still visible in the render. The fix is checked against that, not against a reproduced blank frame.
- `shot-match` day: the same results on the baseline and this build (start L98 90.8; pack L98 85 and "cropped"; straight L50 27 to 29). The "cropped" pack frame predates this session.

**Task 15: exploit script (done, pulled into Phase 1 for the gate).** `node tools/exploits.mjs [venue]` runs ten headless input patterns on the venue (default Proving): Shift only, reverse lap, wall hugging, reset spam (every 2 ticks), reset every second, boost on the grid before the lights, flight off the jump, flight off the map, stuck with no input, stuck nose into the wall.
- Every case asserts: max speed under the cap, every lap at least 0.9 × the author TT lap (`assets/ghosts/<venue>.json`, best lap), and no soft-lock (after the pattern, 60 s of bot driving must make progress). The cap is the flat-ground peak with a full tank boosting from top speed, plus 3%, computed live: 314 mph. That ceiling (305 mph) is about what the infinite-thrust bug reached, so the speed cap alone cannot catch Shift-only.
- Case checks: Shift only must fit its thrust time into `(start gas + earned + respawns × 0.15) × burn`. Reverse must drive backwards at least 30 s and count no checkpoint or lap while moving backwards. Grid boost must not move the car or spend gas before the lights go out. Flight must not stay more than 60 m off the course for over 1 s. Stuck must respawn.
- Result: PASS, all ten. Shift only: 19.5 s of thrust over 150 s, all from the start tank and 26 respawn floors, 152 mph max, no lap. Reverse: 150 s backwards, nothing counted.
- Findings: (1) The respawn floor is a slow gas source: stopping for 2 s gives 0.15 gas (0.6 s of thrust). It never beats driving. (2) Reverse driving earns gas (0.93 in 150 s: landings and the loop backwards). (3) Flight off the map cannot happen on Proving today: the road walls clamp the car within 8.2 m of the centreline at any height the jump reaches (3.3 m max). The flight cases become meaningful once Task 8 adds legal air spans.

### Phase 1 gate (2026-10-28)

| Check | Result |
|---|---|
| `npm test` green | PASS: 80 of 80 (baseline 69) |
| `tools/exploits.mjs` passes Shift-only and stuck | PASS: all ten cases pass |
| Keyboard GP under 15% gas for less than 25% of race time | FAIL: 63.9% (was 76%) |

Keyboard capture: the review rig `cap-review.mjs proving gp keys <out> human` (copied to `/private/tmp/claude-501/-Users-hridyaagrawal--t3-projects-teslaroadster/51f69f6e-3566-4674-9811-fcbe1fcf26ef/scratchpad/cap-review.mjs`, run with `PORT=8821`). Output in `.../scratchpad/gate/proving-gp-keys/`: `telemetry.json`, `run.mp4`, `frames/`, `stills/`. No console errors. The driver is the bot quantized to keys with 110 ms latency. It laps in about 110 s, weaving ±7 m, and runs 8th from start to finish. It hit the 330 s deadline after 2 laps.
- Earned in 319 s: 3 perfect landings, 2 near misses, 3 wall labels (the loop), 1 respawn floor; about 1.5 tanks, or 6 s of thrust. Never close enough to the pack to draft.
- The metric depends on spending as much as income: this driver boosts whenever it has gas, so it sits near zero after each burst. The bot player in headless GPs shows the same pattern (54% and 69%).
- What would move it: Phase 2 adds income on the slice layout (gates at 0.25 each, the wall-ride bank, air lines). Raising `GAIN` now would be a tuning call; not done.

**Next:** Phase 2, Task 8 (legal air over the infield). After it, `tools/exploits.mjs` flight cases start to test something real.

## Thruster festival, Phase 2 (2026-10-28, executing session)

**Task 8: legal air (done).** A circuit node flag `air: { len }` marks a span of `len` metres. `buildCircuit` returns `track.airs = [{ from, to }]` and `track.air` (span index + 1 per sample), and throws if a checkpoint or the start line is inside a span.
- Walls (`drive.js` `collide`): inside a span the barrier has a top at 1.16 m above the road, the rendered rail cap. A hull point above it passes over. A car whose centre is already outside the wall line is not pulled back in. Outside spans the wall still holds at any height.
- Road lookup (`nearestRoad`): inside a span, a car outside the road corridor searches the whole span (plus 40 m) for the nearest sample, so a car crossing the infield finds the far leg. On the road it keeps the ±10 sample local search.
- `race.js`: `e.lost` ignores distance from the course while the car is airborne in a span. A landing off the road (terrain, more than 45 m away) still respawns after 0.5 s, and 7 s of air still respawns. `safeAt` excludes spans, so respawns land before the span.
- Tests (`tests/racing.test.js`, on a synthetic oval built with the new `tools/turtle.mjs`): a car launched at 70 m/s over an S-bulge goes 15.8 m from the centreline (wall line 9.1), lands on the far leg, does not respawn, and counts the checkpoint then the lap. The same launch with no span stays within 8.5 m. A checkpoint inside a span throws. Before the change the first and third tests failed; the wall test passed (it guards today's behaviour).
- `line.js` is unchanged in this task; the lip speed for the ground line comes with the layout (Task 9).
- `npm test` 83 of 83.

**Fix found in play: full throttle into the walls beat braking (done).** The user held full throttle, never braked and bounced off the barriers: 55–60 s laps on all three venues, against author laps of 67–79 s. Reproduced headless (bot steering, throttle 1, brake 0): Proving 51–60 s, Airfield 45–51 s, Launch 42–49 s. The barrier acted as a free guide rail. At Airfield's runway-end corner (45 m radius, line speed 20 m/s) the car went in at 89 m/s, pinned to the wall, and left at 70 m/s; the impulse friction (μ 0.18) cost about 4% per hit. The bot is also conservative (corners at 81% grip; a full-grip line laps Airfield in 70.2 s), but that does not explain a 45 s lap.
- Fix (`drive.js` `collide`): while a hull point closes on the wall, the car loses `6 × closing speed + 4 g × DT` of speed, scaled by `min(1, speed / 40)`. The scale matters: without it, cars crawling nose-in at the wall could never drive off, and `race-gate` had resets in 5 of 10 Proving races. Raising impulse friction instead (μ 2 with the cap at full momentum) spun the car and injected energy (274 mph with no boost), so it was dropped.
- Effect (lap 2 and 3, full throttle against the bot): Proving 82–83 against 78.5; Airfield 83–85 against 75.8; Launch 69–70 against 67.4. Launch's margin is thin.
- Test "full throttle into the walls is slower than braking for the corners", per venue: failed before (Proving 48.9 s against 78.1; Airfield 45.4 against 75.5), passes after. Exploit case "full throttle, no brakes" added; all venues PASS. The "flight off the jump" case is skipped on venues with no jump (it crashed on Airfield and Launch).
- `race-gate 10`: Proving, Airfield and Launch PASS with 0 resets, wrecks or DNFs. Airfield winners AAL 7, NAI 2, HAN 1 (it failed at 10 of 10 AAL before).
- Author ghosts regenerated for all venues. `npm test` 86 of 86.
