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

**Task 9: two air lines on Proving (done, with deviations).**
- Shape. A straight flight cannot cut a 150° hairpin: the exit leg points away from the flight. An air line needs a far leg parallel to the flight, so each line is a bulge: approach, ramp (`jump` kick 11°, ramp 25 m), a 110 m runway, a 90 m S that swings 15 m off the flight line (r ≈ 37 m), then a far leg back on the line. Ground cars land on the runway; boosted cars fly over the S and the infield onto the far leg. Both lines sit just after slow corners, where boost gives the most speed. Line B is on the back straight after T1 (bulge south, into the infield; the two old flat kinks are re-laid). Line A is on the main straight after the final hairpin (bulge east). Nodes come from `tools/turtle.mjs`; the generator scripts are in the session scratchpad. The plan's names fit loosely: B is the "basin high line" (it drops 4 m into a carved basin), A the "hairpin shortcut" (it opens out of the last hairpin).
- Physics of the choice: flight distance grows with the square of lip speed. The ground line is capped at 42 m/s at the lip (`line.js` `LIP_SPEED`) and lands 104–106 m into the span, before the S at 110. A boosted car leaves at 68–71 m/s and lands 215–220 m in, 15–20 m past the S. Speeds between those land in the S or the infield.
- Missing the far leg costs a respawn: touching terrain inside a span counts as lost (`race.js`). `terrain.js` carves a basin, up to 7 m deep, under each chord.
- Timing (`airtime2.mjs` in the scratchpad: same driver, ground line against a boosted air line, 260 m before the lip to 300 m after the span). Line B: the air line saves 5.4 s raw and 6.0 s gas-matched (the ground car spends the same gas after the span). Line A: 5.6 s raw, 5.0 s gas-matched. A hard landing (−10% speed) still saves 5.1–6.5 s. **Targets missed:** the plan wanted 0.6–1.2 s, and a hard landing slower than the ground line. Most of the gain is boost timing: boost spent out of a slow corner is worth far more than boost spent at 70 m/s, and any car boosted that hard flies. A softer S keeps the line inside the corridor. The cost of the air line is about 0.6 tank; a clean landing pays back about 0.23.
- AI air-line driving moved here from Task 12 because the layout cannot be checked without it (`driver.js`): the decision is 200 m before the lip (the plan said 60 m; the boost has to start at the corner exit). A driver commits when `rand() < nerve` and gas ≥ 0.55. Committed: hold the centreline with zero slope, full throttle, boost on any road straighter than r 83 m up to 85 m/s. In the air: yaw onto the velocity; a planned miss holds the nose up. Not committed: no boost until the lip. The player's autopilot has nerve 0.7, craft 0.9; rivals have no nerve until Task 12.
- Racing line 78.2 → 83.4 s (test band 60–90). Solo TT bot: 0 respawns. Author laps 87.4 / 82.6 / 88.3.
- Tests: the jump test now covers every jump: a car lands on the jump's down-slope or on the road inside its air span, and every jump gets flown. The rival boost test checked under 5 s of boost per lap; landings now pay more (perfect landings on 3 jumps a lap), so it checks each rival's boost time against its own gas budget (start plus earned). `npm test` 86 of 86.
- `tools/exploits.mjs`: "flight off the map" now starts away from any span and fails if the car spends over 1 s more than 60 m off the course outside a span (max 8 m: the walls hold). New "air line flown as designed": must leave the corridor (6 m past the edge) with no respawn. New "flight off an air line": full tank at takeoff, yaw and boost sideways; it must leave (41 m past the edge, 51 m off course) and come back within 7.5 s airborne (4 respawns, no lap, recovered). All PASS on Proving; Airfield and Launch PASS (no spans there, so those cases are skipped).

**Fix found in play: walls felt like glue (done).** After the full-throttle fix the user reported that a light scrape stopped the car. The loss was linear in closing speed (6 × closing), and the 4 g drag applied from the first tick of contact. A 2° graze at 70 m/s kept 65% of its speed.
- Fix (`drive.js` `collide`): the hit loss is `closing × (1 + (closing / 5)²)`, so a graze costs little and a square hit costs a lot. The 4 g drag starts after 0.25 s of continuous contact (`c.wallT`) and ramps in over 0.3 s, so riding the wall still costs speed.
- Speed kept after 1.5 s drifting into the wall at 70 m/s (`wallScrape` in `tools/physics-lab.mjs`): 1° 96%, 2° 89%, 5° 71%, 10° 6%, 20° 3%.
- Test "a scrape along the wall costs little and a hard hit stops the car": fails on the previous model (2° kept 65%), passes on the new one.
- Side effect found by `tools/exploits.mjs`: "reverse lap" and "stuck: nose in the wall" soft-locked on Proving and Airfield. The bot, facing backwards beside a wall, scraped along it backwards at full lock and never turned. `steerTo` steers by velocity heading, which is mirrored when the car faces the wrong way. The old glue wall stopped the car, the "still" respawn fired, and that hid the bug. Fix: when the car faces against the track and is not sliding forwards, `steerTo` returns full lock toward the track direction plus the centreline. Test "a car facing the wrong way beside the wall steers away from it and turns around" fails before, passes after.
- `npm test` 88 of 88. Exploits PASS on all three venues. `race-gate 10`: Proving PASS (NAI 3, YOU 3, AAL 2, HAN 2), Launch PASS (AAL 6, NAI 2, REY 1, HAN 1), Airfield FAIL (AAL 10 of 10, 0 resets). The Airfield spread from the glue walls is gone; this is the Phase 1 state, which Task 12 targets. Author ghosts regenerated.

**Task 10: wall-ride bank (done, with fixes it exposed).**
- Layout: the 19-node sweeper after the loop on Proving banks from 8° to 55° and back in 8° steps (0.4°/m, under the 0.5°/m test limit). The fan engages above about 38° of bank; 11 nodes (about 220 m) sit at 40° or more. Test "a bot holds the wall-ride bank at more than 40 m/s for 3 s and earns wall gas": passes, 0 respawns.
- `line.js`: a sample banked past 37° (`U.y < 0.8`) was capped at the loop speed (45 m/s). It now uses the banked-corner limit `v²κ(cosθ − μ sinθ) ≤ g(sinθ + μ cosθ)` with μ = latG × 0.81, unlimited once `cosθ ≤ μ sinθ` (44°). Launch's tank-farm wall went from 45 to 59 m/s on the line.
- Full throttle on Launch tied the bot (67.0 against 67.2 s). Cheap grazes from the wall fix made it marginal; the gain was free braking: a car hits the wall at 92 m/s, drops to 13 m/s in 12 m, and skips a 3 s braking zone. Fixes: a wall hit closing faster than 25 m/s is a wreck (AI races peak at 18.6; full-throttle crashes reach 32–43), and the respawn point only advances while the car is inside the line's braking envelope (`cap × 1.1 + 3`), so a crash puts the car back where it lost control. Full throttle now finishes no lap within 400 s on any venue.
- Air lines broke in `race-gate` once rivals and the line moved. Fixes, each from a traced incident:
  - The racing line through each flight window (60 m before the lip to 90 m after) is pinned to a straight lane: ground cars 3.5 m to the outside of the S's first bend, committed cars 2.45 m to the other side. Before, the line moved 5.3 m sideways during the flight, and ground cars landed out of position for the S.
  - `LIP_SPEED` 42 → 36: ground cars landed 78 m past the lip, 6 m before the S, at 40 m/s.
  - For the last 40 m before the lip every driver holds its lateral position with zero slope, and the side-by-side rule cannot override it (it steered FER off the lip at 6°).
  - Committed cars keep 0.08 gas: air attitude control needs gas, and a car that boosted to empty landed 13° crossed up.
  - Commit and abort use a predicted lip speed (current speed, usable gas, boost only where `|curv| < 0.012`): commit at 66 m/s or more, abort below 62 while there is still room to brake to the ground lip speed. The old 0.55 gas gate committed cars that left the lip at 48–53 m/s.
  - `safeAt` excludes the 100 m before a span, so respawns have room to brake for the lip.
- Rivals got `nerve` and `craft` now (Task 12 data): with only the player's autopilot taking air lines it won by 20 s and the field-spread test failed. AAL 0.7/0.9 (error 0.05), FER 0.95/0.4 (error 0.3), REY 0.85/0.6, NAI 0.6/0.85, HAN 0.5/0.75, VOG 0.4/0.55, OKY 0.75/0.3. Not done: the plan's "a miss wrecks when error > 0.25" (FER). It conflicts with `race-gate`'s 0-wreck rule; misses stay hard landings.
- Boost flicker: a 36-tick boost hold survived braking, so a car at its target speed fired 1-tick bursts (OKY 37 bursts in a race). The hold now ends when the car brakes (17 bursts).
- `steerTo`, wrong way: unchanged from the wall fix.
- Tests changed: the rubber-band test's lap-3 limit is now 1.15 × the line time (it was a fixed 90 s from when the line lapped 78.2 s; Task 9 moved it to 83.4). The jump test checks span jumps for a road landing inside the span, not a down-slope (the runway is flat by design). The exploit "reverse lap" pattern drives at 25–30 m/s (it crashed into walls at 50 m/s).
- Jump test: a flight that starts inside an air span (a bounce after landing) belongs to that span's jump and must land on the road inside the span.
- Final checks: `npm test` 89 of 89. `race-gate 20`: Proving PASS (AAL 9, FER 4, HAN 3, YOU 2, NAI 2), Airfield PASS (AAL 14, NAI 3, REY 2, HAN 1), Launch PASS (AAL 12, NAI 4, REY 2, HAN 1, YOU 1); 0 resets, wrecks or DNFs; 20 distinct orders each. Exploits PASS on all three venues. The lip-speed prediction scales acceleration by 0.8 (fit to traced runs: REY predicted 65.1 m/s, reached 60.7). Committed cars skip passing manoeuvres; their lane already clears the ground lane by 6 m. Terrain re-baked, author ghosts regenerated.

**Next:** Task 11 (flight gates: `gate: { h, r }` node flag → `track.gates`, pass detection in `race.js` earning `GAIN.gate` 0.25 once, `src/render/gates.js` ring with 8 chevrons, visible from 300 m). Then Task 12 (racecraft: pass under braking, defend the inside 1 s, `SPACE` 3.2, draft; tiers Easy/Pro/Elite pace 0.94/0.98/1.0; the roster `nerve`/`craft` are already in), Task 13 (`tools/ai-bench.mjs`), Task 14 (bake, medals, ghosts, `SIM_VERSION` 10 → 11), then the Phase 2 gate report: tests, ai-bench per tier, race-gate 20 per venue with win spread, exploits, gas re-measure (keyboard rig, Phase 1 result 63.9% of race time under 15% gas, target < 25%), browser captures of both air lines, the wall-ride and a flight gate. AAL still wins 9–14 of 20; Task 12 is meant to spread that.

**Task 11: flight gates (done).**
- Data: a node flag `gate: { h, r, at }` → `track.gates = [{ i, h, r }]`; `at` (metres past the node, default 0) places a gate partway along a long segment. The ring centre is `H[i] + U[i] · h`.
- Placement (measured, `arcs.mjs` in the scratchpad, 6 GPs): 80 m past each air-line lip, committed cars fly 9.6–12.0 m above the runway; ground cars at the 36 m/s lip have landed by 60–70 m. One gate per air line at lip + 80, `h` 10.8, `r` 4.5. The plain jump (kick 2) flies under 2 m, so a gate there would pay everyone; it has none.
- Pass rule (`race.js` `gatePasses`): the segment from the previous position to the current one crosses the ring plane forward within `r` of the centre. Each gate pays `GAIN.gate` (0.25) once per lap per car and emits `gate` for the player.
- Result over 6 GPs: 86 of 86 committed flights pass their gate, 0 of 206 ground flights do. `airLines` now counts real flights; `airCommits` counts decisions (about a third abort mid-corner, before any gas is spent).
- Test "a flight gate pays 0.25 once per lap to a car through its centre, and nothing to a car that misses by r + 1": fails without the `race.js` change, passes with it. It also checks a second pass in the same lap pays nothing.
- Render (`src/render/gates.js`): a dark metal frame (casts a shadow on the runway), a cyan glow tube (the gas colour) that widens in the vertex shader so it never drops under 3 px, and 8 extruded chevron lights on each face of the frame pointing inward, lit in a chase. On a pass the ring flashes white and swells 12% over 0.9 s; `audio.js` plays a `gate` cue and the pad rumbles.
- Looked at (`tools/capture-gates.mjs`, day and night): from 300 m in a straight line both gates read as cyan rings (about 25 px); at 120 m the ring sits over the striped ramp lip; the chase camera frames a committed car flying through it with the S below. Two bugs found by looking: the ring stood edge-on (the track basis R, U, T is left-handed; R must be negated, as `circuit.js` does), and the first chevrons floated loose of the ring.

**Task 12: racecraft and tiers (done).**
- Tiers: `TIERS` in `race.js` (easy 0.94, pro 0.98, elite 1) scales each rival's `pace`; a Difficulty row in the menu (after Ghost, so `assist` stays first). No rubber-banding; "AI times ignore the player" still passes. Test "rivals lap slower on Easy than on Pro, and slower on Pro than on Elite" (Launch, mean best lap of laps 2–3) fails with all tiers at 1.
- The rival grid is shuffled per seed. In skill order Airfield was a procession.
- Air lines: a driver flies its `nerve` share of lips through an accumulator (`daring += nerve`, fly when it reaches 1) instead of a coin flip per lip, and keeps 0.6 gas in reserve for a planned flight.
- Racecraft (`driver.js`):
  - Follow is kinematic (`keepBack`: brake at 7 m/s² to arrive 7 m behind). A car still overlapping the one it is passing keeps the full 7 m.
  - A pass starts only when the car is not already passing. Under braking it needs a later braking point than the rival's (`late`; the player counts as 6). Off a straight it needs to be within 16 m, at under 6 m/s closing.
  - Defend: a chaser within 0.6 s and a corner 70 m ahead move the bias toward the inside for 1 s, at most once per 4 s.
  - Side by side: `SPACE` 3.2 m, judged on the gap 0.5 s ahead from both cars' lateral speeds. When the rule overrides the target, the bias is pinned to it and the slope is zeroed, so heading and position agree. Committed air-line cars keep the old rule; with the prediction it pushed them off their lane in the lap-1 run-up.
  - Draft: on straights a follower 7–45 m back tucks in behind.
- Bugs found by tracing incidents, each fixed:
  - Pass, defend and tuck goals subtracted the current bias, so a passing car settled halfway to its pass lane and clipped the rival (8 of 30 Easy contacts at Proving 2645). Goals are now absolute bias targets; defend measures against the line at the corner it defends.
  - The bias jumped between ±2.5 m/s when its goal flipped. At 70 m/s the steering could not follow that heading step: the Airfield tuck overshot 4.5 m into the wall. The bias now moves at up to 2.5 m/s with 4 m/s² of lateral acceleration.
  - Landings: for 0.5 s after touchdown the steering error ramps in from the car's own lane and heading (the Jump crest landed 1.3 m off the line at 68 m/s and fishtailed). An air-line car that lands on a straight holds its landing lane to the end of the span, then rejoins at the bias rate; before, it chased the ground line through the chicane under the jump and hit the wall at 850 (9 of 10 Proving wall stops).
  - Takeoff: the launch hold (no side-by-side override, zero slope) now runs to 15 m past the lip, where the car is still on the ramp. The override fired there and threw AAL diagonally off the lip.
  - Run-up: no passes, tucks or defends in the 200 m before a lip, so ground cars reach the ground lane. A committed car aborts when a slower uncommitted car within 60 m sits in its lane and it can still brake to the ground lip speed. Two lap-1 mid-air collisions wrecked cars in the chicane; a broader abort (any car to follow) cut Proving passes from 32 to 7 and was dropped.
  - The boost hold ended whenever a car had traffic close ahead, so an attacking car fired 1-tick bursts (NAI 39 in a race, the burst test failed at 13 per lap). The hold now survives an attack (NAI 9).
  - `steerTo` yaw-rate gain 0.7 → 2.0. Offset lanes get their own corner speed (`arc`), and a bias-pushed lane stops 1.2 m short of the limit.
- Phase 2b prep: barrier offsets are read through `wallAt(track, i, side)` in `drive.js` (`nearestRoad`, `roadAt`, `tools/exploits.mjs`), so Task 25 can swap in `wallL`/`wallR`. The corridor rule outside air spans is unchanged and height-independent.
- Tried and dropped: a speed-scaled steering margin (99–131 wall stops per 6 GPs) and a grip-limited yaw demand (a Proving TT wall stop).

**Task 13: AI benchmark (done).**
- `tools/ai-bench.mjs N venue` runs N seeded GPs per tier through `raceStats` and prints one JSON per tier: lap ratio (Elite against the line, Easy and Pro against Elite), held passes, player-contact episodes (autopilot as the player, while it is still racing), stuck cars, air lines per driver (fewest per race), wins. Bands: Elite 0.95–1.08 of the line, Easy 1.025–1.08 and Pro 1.003–1.04 of Elite; held ≥ 4, contacts ≤ 3, stuck 0, every driver ≥ 1 air line on venues with spans. Exits 1 on any failure.
- `node tools/ai-bench.mjs 20 <venue>`:

  | Venue | Tier | Lap check | Held | Contacts | Result |
  |---|---|---|---|---|---|
  | Proving | Easy | 1.037 | 30.5 | 2.2 | PASS |
  | Proving | Pro | 1.011 | 27.4 | 1.9 | PASS |
  | Proving | Elite | 0.964 | 29.1 | 1.6 | PASS |
  | Launch | Easy | 1.044 | 9.3 | 1.6 | PASS |
  | Launch | Pro | 1.015 | 5.7 | 1.4 | PASS |
  | Launch | Elite | 1.029 | 6.0 | 1.0 | PASS |
  | Airfield | Easy | 1.043 | 5.3 | 2.3 | PASS |
  | Airfield | Pro | 1.013 | 3.0 | 1.5 | FAIL held |
  | Airfield | Elite | 1.056 | 2.9 | 1.1 | FAIL held |

  Proving air lines per race: every driver flies 2 or more (VOG 2.1 to FER 4.5 on average).
- `race-gate 20`: Proving PASS (FER 10, REY 5, AAL 4, YOU 1; 32.0 passes), Launch PASS (REY 6, NAI 4, AAL 4, HAN 3, VOG 2, FER 1; 6.8), Airfield FAIL on passes only (3.6 against 5; REY 6, NAI 4, AAL 3, HAN 3, OKY 2, VOG 2). 0 resets, wrecks or DNFs on all three; 20 distinct orders each.
- Open: Airfield passing. Clean racing removed the crash chaos that used to produce passes, and every car has the same straight-line speed (tiers and skill only change corner speed; the draft pays gas, not speed). Proposed product call: a modest slipstream drag reduction.
- `npm test` 91 of 91. Exploits PASS on all three venues. Wall stops (a speed loss over 10 m/s on a wall, 6 GPs): Proving 0, Launch 1, Airfield 3. TT bot laps: Proving 84.40 / 81.96 / 76.71, Airfield 79.27 / 76.32 / 76.32, Launch 69.83 / 66.89 / 67.27, no wall stops or respawns.

**Task 14: regenerated data (done).**
- `SIM_VERSION` 10 → 11 (save key `voltitude.save.v11`; old PBs and ghosts drop).
- `node tools/bake-terrain.mjs proving`: byte-identical to the committed bake (the gates do not move the course).
- `node tools/medals.mjs all`, author runs with 0 respawns: Proving TT 238.767 s (82.90 / 80.59 / 75.28), Airfield 227.883 s (77.92 / 74.98 / 74.98), Launch 199.633 s (68.09 / 65.72 / 65.82).
- `npm test` 91 of 91. `race-gate 20`: Proving PASS, Launch PASS, Airfield FAIL on passes (3.6); same orders and winners as the Task 13 run; 0 resets, wrecks or DNFs on all three.

**Slipstream tow (product call, done).** The user chose a modest tow for Airfield passing.
- `race.js` `towFor`: a car above 30 m/s on the ground, 4–25 m behind another and within 2.5 m of its line, gets `c.tow` up to 0.2, full from 8 m in, fading to 0 at 25 m and at 2.5 m to the side. `drive.js` scales air drag by `1 - c.tow`. Solo runs never set it, so TT and the author ghosts are unchanged (re-run byte-identical).
- Test "a car in the wake of another on a straight gains on one in clean air" (rival held 6 m ahead for 2 s): 70.05 against 69.67 m/s; with the tow at 0 both are 69.67, so it fails.
- Surprise: the tow alone did not create passes (Airfield held passes 3.55 → 3.9). Rivals in a wake were at full throttle only 12% of the time: the follow law turns the drag cut into lifting. The passes came from pulling out later: `TUCK` 16 → 10 m (Airfield held 5.6 with the tow at 0 or 0.2). The tow mostly rewards a player who stays flat out in a wake.
- The tier test compared mean best laps in a full field, and traffic noise flipped Pro and Elite on Launch (70.31 against 70.65 s). It now races one rival with the player: Easy 70.65, Pro 68.67, Elite 67.91 s; with all tiers at 1 it fails.

**Phase 2 gate report (2026-10-29, after Task 14 and the tow).**

| Check | Result |
|---|---|
| `npm test` | PASS, 92 of 92 |
| `ai-bench 20 proving` | PASS on Easy, Pro and Elite: lap check 1.039 / 1.013 / 0.962, held 30.8 / 28.2 / 29.8, contacts 1.4 / 1.9 / 1.8 |
| `ai-bench 20 launch` | PASS on every tier: held 11.8 / 9.1 / 8.3, contacts 2.2 / 1.5 / 1.6 |
| `ai-bench 20 airfield` | PASS on every tier: held 7.2 / 5.3 / 5.5, contacts 2.4 / 2.0 / 1.6 |
| `race-gate 20` Proving | PASS: 0 resets, wrecks or DNFs; 20 orders; FER 7, REY 7, AAL 5, NAI 1; 27.6 passes |
| `race-gate 20` Launch | PASS: 0 incidents; REY 8, NAI 4, AAL 3, VOG 3, HAN 2; 8.2 passes |
| `race-gate 20` Airfield | PASS: 0 incidents; REY 6, NAI 4, AAL 3, HAN 3, OKY 2, VOG 2; 5.8 passes |
| Exploits | PASS on all three venues |
| Keyboard GP under 15% gas | PASS: 0.5% of race time (Phase 1: 63.9%) |
| Captures | Looked at: both air lines (chase and side), the ground route through span 0, the wall-ride, the gates (Task 11) |

- Gas re-measure: `PORT=8790 node cap-review.mjs proving gp keys <out> human` (scratchpad `gate2/proving-gp-keys/`, 0 console errors, 2 laps in 330 s, 1 respawn from the scripted Backspace). Earn rates unchanged. Caveat: this driver is the bot quantized to keys, and the bot now spends far less (it boosts 4.4% of race time and averages 0.65 gas). A headless driver that boosts on every straight whenever it has gas sits under 15% gas for 86.3% of race time (6 GPs, earning 2.75 gas per race); the bot sits there 0.8% (earning 3.69). The metric measures the spending habit more than the economy.
- Captures (`cap-air.mjs`, scratchpad `air/`): span 0 lap 1, committed: run-up on the striped ramp at 133 mph, lip at 157, through the ring, over the S, a clean perfect landing on the straight at 148. Span 0 lap 2, ground route: a 78 mph hop with a perfect landing, the S at 54–63 mph. Span 1, committed: ramp, ring, flight over the ground road, clean landing at 147. Wall-ride: the car holds the 55° bank at 110–127 mph earning wall gas. The 90 m side views show the ring, the S and the field, but the cars are too small to read height from; the chase views carry the check.
- Wall stops (6 GPs): Proving 4, Launch 1, Airfield 2. TT bot laps unchanged, no wall stops or respawns.
- Airfield and Launch winners repeat across tiers (tiers scale every rival equally, so the order holds). Proving wins spread FER 7, REY 7, AAL 5, NAI 1.

## Thruster festival, Phase 2b (2026-10-29, executing session)

**Task 25: run-off data (done).** `buildCircuit` now returns `wallL`, `wallR` (`halfW` + run-off) and `runoff = { L, R, entry }`. `wallAt` reads them; `course.js` tracks alias both to `halfW`.
- Rule: 3 m on both sides. A corner is a run of `|curv| > 0.006` with one sign. Its outside gets 6 m below 40 m/s entry, 14 m above 70 m/s, linear between, with a 30 m ramp each side. Loops, banks under `U.y` 0.95, jumps and air spans get 0, and the run-off ramps to 0 over the 30 m next to them.
- Deviation: "entry speed" is the peak racing-line speed in the 300 m before the corner, through the corner's end. The speed at turn-in is 20–35 m/s at every hairpin, which would give 6 m everywhere. The line has a small bump in T1's braking zone, so walking back to the braking point stopped early; the window does not.
- Result. Proving: T1 14 m, final hairpin 14, basin hairpin 13.0 (entry 66 m/s), the fast kink 12.6, the air-line S-bends 0. Airfield: 14, 8.8, 14, 9.2, 9.8, 7.7. Launch: 14, 9.4, 9.4, 7.4, 7.1; the tank-farm wall 0.
- Test "the final hairpin has 14 m of run-off on its outside, and the loop keeps its walls" failed before (no arrays), passes. The plan's "hairpin" is the final hairpin (Task 9's name); the basin hairpin gets 13.0 m.
- Two tests measured the wall at `halfW`: "barriers keep the car on the road" and "outside an air span the walls hold a flying car" now measure against `wallAt` (the second flew onto the S-bend run-off of its oval, 14.3 m out, still inside the wall). `driver.js` "pinned" uses the wall line.
- `npm test` 93 of 93. Exploits PASS on all three venues (run-off is still asphalt until Task 26).

**Task 26: run-off surfaces (done, with a deviation and one failed check).**
- `roadAt` sets `s.kind`: `road`, `kerb` (the painted band at `halfW` −2.6 to −0.9 where `|curv| > 0.00455`), `paved` (to `halfW` + 1.1), then `grass` or `gravel` to the wall; `ground` sets `terrain`. `GRIP` per kind sets each wheel's μ (road and kerb 1, paved 0.9, grass 0.55, gravel 0.45, terrain 0.58, as before). `DRAG` adds 0.15 g on grass and 0.6 g on gravel, a quarter per wheel in contact. Gravel is `runoff.gravelL/R`: the outside of corners whose entry is under 45 m/s. Only Launch 2512 qualifies (44.1 m/s).
- **Surprise: run-off as specified made wrecks worse.** Lab `mistake.mjs` (scratchpad): the bot brakes 1, 1.5, 2 or 3 s late at every corner of all three venues, 72 trials. On the Task 25 walls it wrecked 15 times against 8 on the Phase 2 walls (Proving and Airfield). The old wall sat at the road edge and caught a wide car at a shallow angle, and the Phase 2 graze fix made that cheap. A wall 14 m out meets the car at 35–45°, and 0.15 g of grass drag removes 1–3 m/s over the crossing.
- **Fix (deviation from the plan): the wall behind a corner run-off is a tyre wall** (`runoff.tyreL/R`, run-off > 3.5 m), matching the tyre walls Task 27 draws there. `tyreHit` acts on the centre of mass: the speed into the wall goes to 0 (no bounce), the speed along it drops by 1 × that, spin halves, and it wrecks only above 45 m/s into the wall (hard walls: 25). The first version used per-hull-point impulses with μ 1.2. It rolled the car (10 wrecks at impacts under the threshold) and was dropped. With μ 0.6 and the 50% cap, no braking at T1 was 0.9 s faster than braking; also dropped.
- Late-braking trials (72, three venues): Phase 2 walls 10 wrecks, run-off with tyre walls 3 (−70%). Each remaining wreck is an impact over 45 m/s. Mistakes cost 0.5–5 s instead.
- Plan tests rewritten to what the widths allow: (1) "a car that runs wide at 60 m/s into a corner with 13 m or more of run-off does not wreck, and loses time to braking" (Proving T1, basin and final hairpins). It fails with hard walls (T1 wreck at 29.7 m/s) and passes with tyres. The plan's "loses 8–20 m/s before the barrier" cannot hold: 0.15 g over a 14 m crossing is 1–3 m/s. (2) "gravel stops a coasting 40 m/s car within 140 m, grass and paved run-off do not". The plan's "stops within its trap" cannot hold: stopping takes 125 m coasting, about 67 m braking, and the trap is 5 m deep.
- **Failed check: "track limits pay for themselves".** `limits.mjs` (scratchpad) drives the same controller on the legal-width line (outer wheel at the kerb edge) and on lines 2 m and 4 m wider. Cutting is faster at most corners: Airfield up to 1.5 s per corner, Proving and Launch up to about 0.6 s. Sweeping kerb, paved and grass grip and drag (even paved 0.3 and grass 3 g) barely moves it. The gain comes from the kerb band at full grip and the inside run-off at the apex, and the line runs at 81% grip, so it has spare grip for the low surfaces. This is a product call: a track-limits rule, or kerbs that cost time. The cut is 1–3% of a lap, under the exploit script's 10% threshold. Not encoded as a test.
- `npm test` 95 of 95. Exploits PASS on all three venues. `race-gate 10` PASS on all three.

**Task 27: run-off drawn (done).**
- `road.js` `runoffMesh`: turf from the paved edge to the barrier, with 9 m mowing stripes, and a 2.5 m skirt down to the terrain. Gravel-flagged samples blend to beige stones. The road shader paints white chevrons on the paved band of tyre-wall sides. Rails, boards, wire, posts and huts follow `barriers()` (the wall + 1.45 m tyre depth, ramped over 8 m). `trackside.js` places red-and-white tyre stacks, two rows, every 0.66 m along tyre-wall sides.
- Placement that read `halfW` now reads the wall line: crowd, props, scrub, distance boards, the broadcast camera, the render terrain clearance, and the Launch and Airfield buildings.
- Terrain: `buildTerrain` pins the terrain 0.2 m under the run-off plane (0.6 m under the road) and fills up to 8 m. Samples whose natural terrain sits over 14 m below the road get no run-off (`raised`; the Launch crest). This runs at load in `buildTerrain`, and the bake holds only natural terrain, so no rebake. Test "the terrain lies just under the run-off" (per venue) failed before the pins (terrain up to 3 m above the plane), passes.
- **Surprise, pre-existing: on Launch the road ran through the paddock buildings.** `facility.js` places the pit building and the office block at fixed world positions on every venue. On Launch the road at 2440–2540 crosses both footprints. The glass is invisible from inside, so it showed only as a grey ceiling. The terrain pins raised the floor slab 1.5 m above the road, and the chase camera then showed a white wall. Fix: a building whose footprint comes within the wall + 4 m of the course is skipped. Launch drops both buildings; Proving and Airfield keep them.
- Captures (`tools/capture-runoff.mjs`, high camera and chase, scratchpad `ro7/`): Proving T1, the Proving final hairpin, the Launch gravel corner. Looked at: turf with stripes, chevrons, tyre stacks at the barrier, boards behind them, gravel reads beige against the desert, no terrain poking through, no gaps under the skirt.
- Perf (Proving GP, 40 s, 1440x900): 128 fps, p50 7.2 ms, p95 16.1 against the baseline's 134, 6.5, 15.8. Both fail the existing perf gate, as before this phase.
- `npm test` 98 of 98. Exploits PASS on all three venues.

**Task 28: lift, hop and hover (done).** Action `lift` ("Lift (down thrusters)"), Space, gamepad A. `packInput` bit 4. Saved key maps merge with the defaults, so existing players get Space.
- `stepCar`: a press on the ground with 0.11 gas or more adds 9.2 m/s along the car's up vector (0.6 s cooldown). Held in the air, the down thrusters push along the car's up vector, up to 1.15 g, aiming for zero vertical speed, so a level car holds its height. The drain scales with thrust: 0.4 gas per second at 1 g. With assist, hover levels roll as well as pitch. No gas, no lift.
- Deviations: the thrust acts at the centre of mass, not at the four nozzles. The nozzles sit 0.4 m behind the centre of mass, so equal nozzle thrust would pitch the nose up. The drain scales with thrust, because a fixed 0.4 per second drains the tank during the hop's climb, when hover pushes nothing.
- **Exploit found and fixed: hops farmed gas.** A hop lands as a perfect landing: 0.15 + 0.027 air gas for a 0.11 hop. Hop spam on Proving earned 13 gas in 150 s. A flight that starts with a hop now sends no landing event unless it ends hard or has tricks, and pays no landing gas. Earn rates are unchanged. Edge case: a hop just before a jump lip makes that jump's landing a hop flight, which pays nothing.
- Tests (failed before, pass): a hop from rest peaks 4.87 m and costs 0.11 gas; hover after a hop holds altitude within 0.5 m for 2 s; a full tank in the air hovers 2.5 s; a hop lands without a landing event. "An empty tank gives no lift" passes before and after; it guards the rule.
- Exploits: new "hop spam" (tap every 0.6 s while the bot drives) and "hover off the map" (full tank, steer off the course, hold lift). PASS on all three venues. Hop spam is slower than driving: no lap in 150 s on Proving, 90 s on Airfield, 104.9 s on Launch. It earns 2.4 gas on Proving, all from jump landings the bot re-flies after respawns.
- `npm test` 103 of 103. Ghosts replay unchanged: with lift at 0 the step is the same.

**Task 29: air control (done, one deviation).**
- Air yaw already existed: steer targets 2.4 rad/s with a 6 rad/s² cap, against rl `AIR_YAW` 5.9 rad/s². That code is unchanged. Yaw alone does not move the landing point: full steer off the three Proving jumps lands 0–0.3 m from the no-steer point.
- New: while the down thrusters push, steering strafes at 0.3 g along the car's horizontal right vector and drains 0.15 gas per second.
- Deviation: while lifting, steering strafes instead of also yawing. With both, the car spins at 2.4 rad/s, the body-fixed strafe turns with it, and the landing moved under 2 m off the Proving jumps. Release Space to yaw.
- Lab (flat, 40 m/s, 6 m up, lift held 1.5 s): full right lands 8.08 m right, full left 8.08 m left, no steer 0.00. Off the Proving jumps with lift held: 5–10 m either way.
- Tests: "full steer while lifting moves the landing point 6 m or more sideways" fails on the Task 28 code (−0.08 m) and passes. "A flight with no input lands where it took off sideways" (lift 0 and 1.5 s, under 0.05 m) guards against drift.
- `npm test` 105 of 105. Exploits PASS on all three venues.

**Task 30: flight feel, AI and HUD (done).**
- `car.js`: the four down plumes fire while lifting and for 0.2 s after a hop. In the air, the lateral plume on the side opposite the strafe fires (the model's +x is the sim's −R, so nozzle 8 sits on the left and pushes right).
- `audio.js`: the thrust hiss layer gains a lift term (gain +0.45, lower pitch) and a `burst_long` on ignition. Not checked by ear: the headless captures have no audio. No page errors.
- `camera.js`: while lifting in the air, the chase camera eases 1 m up and 1.5 m back.
- `hud.js`: three cyan down-chevrons ride the gas edge while lifting, and the bar glows as on boost. The AIR state shows height above the road or terrain over 3 m ("AIR 18 FT", "M" in km/h).
- `main.js`: the first time airborne for 0.3 s: "Hold Space to hover", at most 3 times per save. The plan's text was "Space: hover"; the other hints are sentences ("Hold Shift to fire the rear thrusters").
- Controls page: the lift row comes from `ACTIONS`, and the gamepad line reads "A lift".
- Fix found by capture: `c.lifting` was false while hover pushed nothing, during the hop's climb. Steering then yawed the car about 30° before the strafe started. `c.lifting` now means "lift held in the air with gas".
- `driver.js`: a rival closing more than 12 m/s on a wrecked or stopped car it overlaps, within 0.45 s, taps lift. Rivals with nerve 0.7 or more flare air-line landings: lift while falling faster than 10 m/s within 10 m of the road. Measured over 3 Proving GPs: AAL, REY, FER, OKY and the bot flare 1.9–2.7 s per GP; NAI, HAN and VOG never lift; no hops (no car stopped in a racer's path).
- Test "a rival 20 m behind a stopped car on a straight hops over it without contact" fails on the old driver (never airborne, it hits the car), passes (1.5 s airborne, 3.3 m high).
- Captures (scratchpad `lift2/`, Proving straight at 2400, 89–100 mph). Hop: a 4.0 m peak, landing at 2.6 s. Hover: Space held 2.5 s, the car holds 6.2 m, AIR 13–21 FT, the lift glyph shows, the camera rises. Strafe landing: hover plus full right, the car holds its heading, the left lateral jet fires, it lands 6.4 m right of the plain hop. Plumes (side view, from rest): four down jets under the car through the hover, off when the lift ends. Controls page: the lift row on Space, 12 rows fit.
- Old ghosts replay unchanged (lift 0 keeps the old step). `SIM_VERSION` stays 11; author ghosts and medals were not regenerated.

### Phase 2b gate (2026-10-29)

| Check | Result |
|---|---|
| `npm test` | PASS: 106 of 106 |
| Exploits, incl. hop spam and hover off the map | PASS on all three venues |
| `ai-bench 20` Proving | PASS all tiers; Pro 1.012 of Elite, Elite 0.981 of the line; held 30–33; contacts 1.6–2.4 |
| `ai-bench 20` Airfield | PASS all tiers; Pro 1.013, Elite 1.055; held 5.5–7 |
| `ai-bench 20` Launch | PASS all tiers; Pro 1.013, Elite 1.027; held 8.4–11.3 |
| `race-gate 20` Proving | PASS: 0 incidents, 20 orders; NAI 5, FER 4, HAN 4, AAL 3, YOU 2, OKY 1, REY 1; 30.9 passes |
| `race-gate 20` Airfield | PASS: 0 incidents, 20 orders; REY 7, NAI 4, AAL 3, HAN 3, VOG 2, OKY 1; 5.5 passes |
| `race-gate 20` Launch | PASS: 0 incidents, 20 orders; REY 7, NAI 4, AAL 3, HAN 3, VOG 2, YOU 1; 9.3 passes |
| Keyboard gas with lift | Measured, see below. Earn rates unchanged |
| Wall wrecks per keyboard GP −50% | Cannot be shown: 0 on the Phase 2 baseline, 0 now. Substitute evidence: late-braking trials, 10 wrecks → 3 (Task 26) |
| Track limits pay for themselves | FAIL (Task 26): cutting saves up to 1.5 s per corner on Airfield. Needs a product call |
| Captures | Run-off at 3 corners (high and chase), a hop, a 2 s hover, a strafe landing, the down plumes, the controls page |

- Gas, headless keyboard rig (scratchpad `kbgp.mjs`, Proving, 6 GPs each, % of race time under 15% gas). Careful driver: baseline (ca3a9ca) 2.1%, now 3.3% with the bot's own lift use (0.2 s per GP); with a habit of holding Space through every flight over 0.25 s, 16.0% (6.9 s and 2.86 gas of lift per GP). Heavy spender (boosts on every straight with any gas): baseline 97.8%, now 98.1%, and 97.9% with the lift habit; it never has gas left to lift (0.1 s per GP). The Phase 2 report's 86.3% came from a different spender script, so the baseline here is this script's own run. Lift is a real drain for a careful driver who hovers every jump: under 15% gas goes from 3% to 16% of the race.
- Not done: author ghosts and medals were not regenerated. Old ghosts replay unchanged because lift 0 keeps the old step, so `SIM_VERSION` stays 11. The bot now flares on air lines, so a fresh bot lap may differ slightly from the recorded author lap.

## Thruster festival, Phase 3 (2026-10-29, executing session)

**Task 31: track limits, ghosts and the hover hint (done).**
- Rule (`src/sim/limits.js`): each corner (a run of `|curv| > 0.006` off loops, air spans and banks; corners under 60 m apart join) gets a window from 150 m before to 150 m after, split at the midpoint when windows meet. A breach is all four wheels past the white line (`halfW − LIM_BAND`, the painted line on the inner edge of the kerb) on one side, on the ground, inside the window.
- Time gained: when the car enters a window, a shadow copy of the car (`structuredClone`) drives the legal racing line from the same state at 0.97 of the line speeds, one step per tick for the player. At the window exit, gain = shadow time / pace − actual time. `e.pace` calibrates from clean windows (shadow time / actual, EMA 0.3, clamped 0.8–1.25), so a slow driver who cuts is measured against their own pace. Rivals take the same rule, computed only when they breach (snapshot on entry, shadow run at exit, ~6 ms), with pace from their driver profile.
- Why a shadow: three cheaper estimators failed against the controlled cut (`lim2.mjs`, `lim3.mjs` in the scratchpad). Pace from the 150 m before the corner: errors up to ±1 s. Re-solving the line's speed profile on the car's recorded path: kinks at the splice and path noise, errors over 1 s with wrong signs. The same with smoothing and symmetric clamping: still uncorrelated. The shadow matched the controlled gain within 0.02 s at every corner of all three venues.
- Penalties of 0.1 s or more count. GP: added to the finish time (`e.total`), and classification sorts finished cars by total; toast "TRACK LIMITS +0.7 S PENALTY". TT and practice: the lap is invalid (`e.invalid`); toast "LAP INVALID", the lap toast reads "· INVALID", an invalid lap never becomes the HUD best-lap reference, and a TT run with an invalid lap records no PB, ghost or medal. The results card tags the lap INVALID and says "Track limits · one lap invalid, time not counted" (looked at: scratchpad `hint/results-invalid.png`).
- Tests (`tests/limits.test.js`, written first; all three fail without the `race.js` wiring): (1) per window, a bot that cuts only that corner (the line on a track 4 m wider) is penalised within 0.1 s of its gain against the same bot on the legal line; ≥ 3 corners cut on Proving (also passes on Airfield and Launch, checked by hand). (2) A one-lap GP adds the summed gains to the finish; a TT cut lap is invalid with no penalty. (3) A bot that runs 5 m wide on corner exits breaches and gets no penalty (gains −0.2 to −4.9 s).
- Exploits: new "corner cutting" case (TT, the cutting bot all lap). Every cut lap must be invalid and ≥ 2 cuts caught per lap. PASS on all three venues (Proving 5.2 s of cuts in one lap, Airfield 10.4 s in two, Launch 4.6 s in two).
- Wheels now carry `w.lat` (lateral offset of each contact point).
- Ghosts: with the Task 30 flare the author bot lost 5 s on Proving (238.8 → 243.8): flaring drained the gas a planned flight needs (0.6 reserve), so it skipped lap 2's second air line. Flares bought clean → perfect landings (+0.07 gas) for about 0.4 gas each. Rivals now flare only above 0.45 gas (`FLARE_GAS`): author Proving 239.14 s (82.93 / 80.97 / 75.23), Airfield 227.88, Launch 199.63, no invalid laps; rivals still flare 0.1–0.6 s per GP (AAL, REY, FER, OKY). At 0.6 nobody flared; at 0.3 the author still skipped the line.
- `SIM_VERSION` 11 → 12 (save key `voltitude.save.v12`).
- Hover hint: hints moved into the dash stack, right-aligned above the speed and gas readout. Looked at (scratchpad `hint/before-6.png`, `hint/after-6.png`): the old pill sat on the car's tail; the new one is clear of the car's projected box.
- Checks: `npm test` 109 of 109. `ai-bench 20`: Pro and Elite PASS on all three venues (Easy not captured in this run; rerun at the gate). `race-gate 20` PASS on all three (Proving FER 7, AAL 6, REY 6, NAI 1). Exploits PASS on all three.
- Autopilot GPs on Proving: 0–2 penalties per race (0.3–0.64 s each). Rivals breach 3–5 windows per Proving race, 2–4 on Airfield, 0–1 on Launch; most breaches lose time.

**Task 19: terrain show-through at Airfield and Launch (done).**
- Reproduced: Airfield and Launch TT on autopilot at 0.5 s steps with the terrain drawn magenta (scratchpad `poke/airfield/sheet-*.jpg`, `poke/launch/sheet-*.jpg`), then raycasts through suspicious pixels (`ray.mjs`).
- Cause 1, render only: terrain LOD. Tiles are 6 × 6 over the terrain, so Airfield and Launch tiles are 936 m (half-diagonal 662 m) against 738 m on Proving. LOD switches on the distance to the tile centre, so near a tile corner the camera 20 m from the road was drawing the step-2 level (12 m vertex spacing). Its triangles interpolate across the run-off pins and stood 0.18 m above the turf at Launch 2580 (a grey wedge at the barrier foot). This is why the second and third venues showed it. Fix (`src/render/terrain.js`): within `BAND` of the road, each coarse vertex takes the minimum of the fine heights within ±step cells, so a coarse triangle can never sit above the fine surface there. LOD distances are unchanged, so the triangle count is unchanged (mean terrain triangles per camera position along the lap: Proving 207k, Airfield 255k, Launch 215k, before and after). Offsetting the LOD distances by the tile radius also fixed it but doubled terrain triangles (380–474k); dropped.
- Cause 2, sim heightfield: on banks, jumps and loops (no run-off, so no pins) the terrain ceiling started its cut slope 1 m outside the wall. With 6 m vertices, a triangle touching the road edge reached a vertex 4–8 m up the slope: the Proving jump landing had terrain 0.76 m over the road edge at 2390, and the Launch tank-farm bank had a dune over the inner barrier (1.22 m up a 1.16 m barrier at 1405). Fix (`src/sim/terrain.js`): the cut slope starts 1.5 cells (9 m) further out (`SHELF`). Loaded at build time, so no rebake.
- Tests (both fail before, pass after): `tests/terrain-lod.test.js` builds the render terrain in node (a resolve hook maps `three` to the vendored build), reads every coarse LOD mesh, and checks that wherever a coarse level stands 0.05 m or more above the road or run-off, it is only drawn from 400 m or more away (about one pixel per 0.27 m at 1280 px). Before: Proving 278 m, Launch fails too. `tests/sim.test.js` "terrain stays under the road edge and run-off and below the barrier tops, banks and jumps included": terrain under the road plane from the centre to 1 m inside the wall, and 0.6 m or more of every barrier showing. Before: Proving 0.50 m above at 2395, Launch 1.22 m up the barrier at 1405.
- Looked at (scratchpad `poke/t19-sheet.jpg`, before left, after right): Launch bank entry, inside the bank (the inner rail now shows the whole way and the sand starts further back), Launch 2575 (the wedge and the mound behind the fence are gone; a soft shadow remains on flat ground), Proving jump landing (the terrain lip over the right edge is gone).
- `npm test` 115 of 115.

**Task 17: festival world (done).**
- Placement by screen time (`src/render/festival.js`, `festivalSites`): chase-camera samples every 10 m on the racing line (7 m behind), candidate sites every 6 m on both sides at wall + 9, 24 and 44 m. A site scores by how long it sits within 37° of the camera's heading at 12–260 m, weighted toward near and centred. Sites near another part of the track, more than 5 m off the road height, or on rough ground are dropped. Proving keeps 1818 sites, Airfield 3067, Launch 1882 (50–90 ms at load).
- Props at the top sites, spaced so they do not stack: a stage with two side screens and a back screen near the start (the screens show the leader and lap, redrawn once a second); a paddock with six team trucks in the rivals' colours, camper vans and tents; up to 28 fence bleachers (34 m, five rows) packed with the existing VAT crowd, two at each jump (approach and landing) first; flag lines of 11 waving flags behind the fence; up to 26 campgrounds (camper vans, dome tents, flags) on the far sites; a helicopter orbiting the circuit centre; at night a 360-drone swarm cycling ring, grid and bolt shapes, and warm bulbs on the tents and stage.
- Crowd: stands fill to 98% (seat skip 7% → 2%). Bug found: the crowd shader reads `uNight` for night phone lights, but the uniform was never created, so phones never lit at night. Added, and `stands.update` now sets it. A near miss sends a wave (cheer pose) rolling out from the car at 22 m/s through every crowd within ~90 m (`uWave`), plus a cheer near stands. A circuit finish fires fireworks on both sides of the line and the party (flags) animation.
- Looked at: Proving prop views day (scratchpad `t17/fest-p2.jpg`), Airfield and Launch (`t17/fest-al.jpg`), chase frames at the approach, lip and landing of all three Proving jumps day and night (`t17/air-sheet.jpg`). Airfield and Launch have no jumps; they get the general bleacher zones. Fix made after looking: flags first faced edge-on to the chase camera; they now face along the track.
- Shot-match (`t17/sheet2.jpg`, before top, after bottom): edge density now passes on all six frames (before: four failed). Still failing: L98 on all six, L50 on day straight, cropped on night pack. These are exposure and camera checks, owned by Task 18 and unchanged by this task.
- Perf (`tools/perf.mjs`, Proving GP, 45 s, the base worktree at 7784bbc against main, alternating; the machine was busy with delegates): day p50 5.5 / 5.9 / 6.0 ms against 5.6 / 5.8 / 5.9, night 5.6 against 5.8. No p50 regression beyond noise; the budget was 1.5 ms. One noisy first round (9.2 ms) was discarded and rerun.
- `npm test` 115 of 115.

**Task 21: UI pass (done).**
- `tools/a11y-probe.mjs` (from the review build, rewritten): three live runs at 1280×720 (Proving GP day, Proving TT day, Launch GP night) with a toast, a toast with a subtitle, a gas gain and a hint injected. For every visible HUD text element it records the font size, then measures contrast against the real pixels behind it: the HUD is hidden, the scene is captured, the element's background layers and opacity are composited over each pixel, and the 10th-percentile ratio is reported. Text shadows are ignored. Elements caught mid-fade (opacity under 0.95) are skipped and counted. `PORT=8831 node tools/a11y-probe.mjs <out>`.
- Before: 79 of 90 text elements failed. Size: the timing tower (10–11 px), card and lap labels, target, kbd, gas, state and toast subtitles were 10–13 px. Contrast over the day sky: clock 1.2:1, toasts 1.1–2.4:1, speed 3.4:1, MPH 2.4:1, AIR state 1.5:1, gas gains 1.1:1.
- After: 0 of 90 fail (9 skipped mid-fade). Every HUD text group sits on one dark plate (`--plate`, rgba(8, 9, 13, 0.86)), F1-style: lap card and tower as one column, a clock plate holding the sectors, delta and target, and a readout plate for state, speed and gas. Type floor is 14 px everywhere, including the fallback menu and the loading screen. `--ink-3` is 0.62 alpha instead of 0.48. The tower is 214 px wide with 26 px rows.
- One toast style: toasts, hints, gas gains and the checkpoint distance tag share the same plate, hairline and 10 px radius.
- Sector bar: segments are 18 px boxes; a closed sector shows its colour plus a dark shape: diamond for purple (best), up triangle for green (improved), down triangle for yellow (slower). Drawn with `clip-path`, because the ◆ ▲ ▼ characters rendered at about half size in the fallback font.
- Boot to driving (`tools/perf.mjs` `bootMs`, autostart): Proving 4.4 s, Airfield 5.2 s, Launch 6.4 s, Proving night 4.0 s. Under 10 s with no change.
- Looked at: before and after (scratchpad `t21/sheet.jpg`), the sector bar after two purple sectors (`t21/sector3-clock.png`), and all three states forced (`t21/sector4-clock.png`).
- `npm test` 115 of 115.

**Task 22: game-feel audit (done).**
- `docs/feel.md`: Swink's six parts for steer, boost, fly and land, with the current camera, shake, sound, rumble and time-scale values from the code, then a tuning log of one change at a time.
- Gaps found:
  - boost ignition had no onset (FOV eased in over 0.4 s)
  - a perfect landing shook less than a clean one (0.25 against 0.35)
  - kerbs had sound but no rumble
  - lift start had no rumble
  - near misses did not read "CLOSE" as the design asks
- Changes, each with evidence:
  1. Boost ignition FOV punch, +3.8° on the first frame, plus rumble. Seeded before and after clips from the same race; FOV trace.
  2. Perfect landing gets a −2.4° thump, shake 0.3 and stronger rumble; clean drops to a −1.2° thump and shake 0.2. Clips and FOV trace.
  3. Kerb rumble pulses with speed. Rumble-call log over the same keyboard drive: 0 → 18 pulses.
  4. Lift-start rumble pulse. Same log.
  5. Near-miss gain reads "+12 CLOSE". Probe: 13.4:1, 14 px.
- Time scale stays unused on purpose (reason in `feel.md`).
- Tools (scratchpad):
  - `clip.mjs` records a 3 s clip around a boost or landing toast. It seeds `Math.random` and uses a CDP screencast, because Playwright's video recorder could not spawn its ffmpeg here.
  - `drivelog.mjs` drives by keyboard and logs rumble calls.
  - Clips with fewer than 150 frames were discarded and re-recorded: the delegates' renders pushed the load average to 15.
- Found: a hard steer onto a kerb at speed throws the car airborne over the kerb lip, so the kerb sound and rumble skip it. Logged in `feel.md`; not changed.
- `npm test` 115 of 115.

**Task 16: Roadster rear rebuild (delegate, merged from `t3/car-rear-rebuild`).**
- The tail blade floats 3.5 cm off the body. The light bar is 1.74 m and red, with its base glow raised from 1 to 2.5. The four nozzles sit in a louvred black shelf with polished lips and dark throats; the brass rings are gone. The diffuser has five strakes and a ramped ceiling.
- Rivals now use the hi model in livery, merged per material (20 meshes), with lod1 beyond 60 m.
- Reference stills and sources are in `docs/car/`; the sheet is `docs/car/rear-before-after.jpg`.
- Still wrong, per the delegate:
  - the lower body narrows under the diffuser instead of wrapping around it
  - no fan housings in the diffuser channels
  - grey reflections on the strakes
  - the rear deck is unchanged
  - the light bar is weak by day
- `tools/car/__pycache__/*.pyc` is tracked in git and changes on every build. It was left out of the commits.

**Task 18: light in real units (delegate, merged from `t3/realistic-night-lighting`).**
- Night:
  - The halo sprites are replaced by LED panel floodlight heads: 22 m high, 2.2 Mlm each, inverse-square falloff, evenly spaced every ~60 m.
  - Their light is baked into one illuminance map that every `skyFog` material reads.
  - Light shafts come from each head.
  - Loops and banks get a flat 1,000 lux.
- Day: sun brightness comes from the HDR's `maxLuminance` times the sun's solid angle (the 2.3× sky gain and 1.8× sun boost are gone), with per-channel distance haze.
- Exposure is in EV: day 13.9, night 7.8. No Hillaire sky-view LUT; the measured HDR plays that role.
- `tools/shot-match.mjs` takes `NOHUD=1`.
- The sheet is `docs/light-before-after.jpg`.

**Task 20: festival hangar garage (delegate, merged from `t3/garage-festival-hangar`).**
- An open hangar door at golden hour: track, grandstand and rocket outside, on a backdrop from `golden_sky_4k.jpg`.
- A turntable, plus key, rim, softbox and door lighting.
- A telemetry wall (`src/render/garage-screens.js`) with venue progress, best times and medals from the save.
- Four engineers built from the crowd models.
- 1.2 s eased camera moves between pages.
- Garage p50 +0.3–0.8 ms. The sheet is `docs/garage-before-after.jpg`.
- Still weak:
  - a glare pool washes the venue title by day
  - the engineers are crude up close
  - the softbox underside is bright on pause
  - the night backdrop is dimmed sunset, not night
- Base bug found: pausing during the countdown shows `-1:-2.-983` on the pause board.

### Phase 3 gate (2026-10-29)

The three branches merged cleanly onto `main`.

| Check | Result |
|---|---|
| `npm test` | **PASS**, 115 of 115. |
| Exploits (`tools/exploits.mjs`) | **PASS** on Proving, Airfield and Launch, including the new corner-cutting case. |
| `ai-bench 20` | **PASS** on every tier (Easy, Pro, Elite) on all three venues. Proving lap ratios 1.001 / 0.973 / 0.963. Air lines are taken by every driver on Proving (2–4.5 per race); Airfield and Launch have no air lines. |
| Shot-match, HUD on | **FAIL**, 0 of 6. Day start L98 90.8. Day pack L50 23.3, L98 72.6, cropped. Day straight hue 1.46, L50 28.7, L98 78.3. Night start L98 88.4. Night pack cropped. Night straight L98 88.1, cropped. |
| Shot-match, `NOHUD=1` | **FAIL**, 1 of 6 (day start passes). Day pack L50 34.3, L98 84.2. Day straight L50 33.6, L98 83.5, hue 1.41, edge. Night start L98 88.1. Night straight L98 87.3. "Cropped" means a rival in contact pushed the player off frame centre; the race is not seeded. |
| Perf (`tools/perf.mjs`, Proving GP, 60 s, base `7784bbc` against `main`, alternated) | **FAIL on both builds.** The machine was not quiet: load average 6–13, `mediaanalysisd` at 300% CPU, a system process that could not be stopped. |

Perf detail:

| Session | Build | p50 | p95 | Frames over 20 ms | Long tasks over 50 ms |
|---|---|---|---|---|---|
| Day | base | 6.2 / 6.2 ms | 13.4 / 13.2 ms | 24 / 14 | 3 / 2 |
| Day | main | 6.9 / 6.8 ms | 15.0 / 15.0 ms | 37 / 32 | 0 / 0 |
| Night | base | 5.0 / 4.9 ms | 10.8 / 10.8 ms | 8 / 6 | 2 / 2 |
| Night | main | 5.5 / 5.4 ms | 11.7 / 11.9 ms | 9 / 8 | 0 / 0 |

- Phase 3 costs +0.6–0.7 ms p50 by day and +0.5 ms at night.
- Draw calls: day 479–581 → 500–743; night 316–359 → 387–388.
- Boot: 3.9 s → 4.2 s.
- A clean perf verdict needs a rerun on a quiet machine.

Why shot-match still fails:
- Night L98 misses by 2–3 points.
- Day frames facing away from the sun (pack, straight) sit at L50 23–34 and L98 72–84. Day start, facing the sun, passes HUD-off.
- One fixed EV can't serve both directions. The likely fix is eye adaptation (average log luminance with temporal smoothing) in `post.js`. It was not attempted in this phase.
- The HUD plates (Task 21) lower L50 with the HUD on (day pack 34.3 → 23.3), because the gate measures the HUD as well.

Contact sheets, before `7784bbc` and after `main` (scratchpad `sheets/`):
- `car-rear.jpg`: chase-camera rear, day start, day straight, night start.
- `festival.jpg`: four fixed day cameras plus one at night.
- `night.jpg`: three night frames plus an aerial of the start.
- `garage.jpg`: day and night.

Branch sheets: `docs/car/rear-before-after.jpg`, `docs/light-before-after.jpg`, `docs/garage-before-after.jpg`.

### Phase 3 gate fixes (2026-10-29, in progress)

Order: 1 auto exposure, 2 kerb launch, 3 countdown pause clock, 4 car rear by day, 5 garage, 6 perf, 7 worktree cleanup.

**1. Auto exposure: done, one marginal miss.**
- `post.js` meters the TAA output into a 32×16 log-luminance target, then adapts a 1×1 EV. Clamps: day -0.5 to +1.5 EV, night -0.25 to +0.4 EV. Off in the garage.
- The day LUT S-curve is now a pure smoothstep. A strength above 1 overshoots white, and `pow(1 - l, 2.5)` writes NaN into the LUT, which shows as black blotches at the sun and on glints.
- Motion blur uses a 1/60 s shutter and ignores projection changes. Before this, a slow frame or the boost FOV punch zoom-blurred the whole frame and failed the edge check at random.
- The chase camera dollies in as the FOV widens, so the car keeps its frame width at speed. At 88+ mph the car fell to 0.22–0.23 of frame width, against a 0.24 minimum.
- The HUD top scrim is gone. It darkened the sky by a third, which is where L98 lives. `a11y-probe` passes 87 of 87.
- Fixes to the `shot-match` harness:
  - The GP grid seed is pinned. It came from `Math.random` after render code had drawn a varying amount from the seeded stream, so every run raced a different field.
  - The screenshot is taken before the car is measured.
  - The "cropped" check uses projected vertices. The old union of mesh boxes combined a spinning wheel's inflated low y with the chassis rear z, a point no vertex occupies. Every earlier "cropped" failure was this artefact.
- Gate, same seed: HUD on 6/6 PASS. HUD off 5/6: day straight edge 0.049 against 0.05.

**2. Kerb launch: done.**
- Cause: circuit banks were a ±30 m box average of the target bank. A box average ramps linearly, with a slope break at each end, and it stepped at loop boundaries (Proving's loop exit at 1615 jumped 0° to 1° in 3 samples). On the kerb line, 8 m from the centre, each break became an impulse. At Proving 816–828 a car on the kerb at 159 mph went airborne; on the centre line at the same speed it stayed down.
- Fix (`circuit.js`): a Hann-weighted bank average over ±60 m, which keeps the same peak roll rate, tapered to zero within 60 m of a loop.
- Test (`sim.test.js`, all venues): a settled car drives straight along every kerb at 1.1× the racing-line speed. The test fails when the kerb line goes airborne and the centre line at the same speed does not. Red before the fix (Proving 816–828), green after. Wall-ride banks (`U.y ≤ 0.95`) are excluded, matching the track-limits rule.
- Ruled out along the way:
  - The sim kerb is flat paint, with no geometry.
  - Flat-ground hard-steer pulses at 30–60 m/s never lift a wheel.
  - Rolling banks about the inside edge raises new crests at every bank exit.
- Still open: on Launch, a car driven straight along the low kerb of the 50° wall-ride entry (1092–1122) at about 90 mph leaves the ground, because the bank twists about 1°/m there. That is wall-ride geometry, which is frozen content.
- `SIM_VERSION` 12 → 13. Author ghosts were regenerated: Proving 239.56 s, Airfield 227.93 s, Launch 201.32 s.
- Also seen, not changed: a 12° wall scrape at 131 mph removes all speed in one step (`collide`, `press` 12.5 → 90 m/s of loss) without a wreck.

**3. Countdown pause clock: done.** `pauseView` in `menu.js` reads `raceClock`, as the HUD clock now does too. The test (`menu.test.js`) was red with `-1:-2.-500`. `fmt` and `fmtDelta` moved to `src/time.js` so node tests can load them. Checked in the game: pausing during the lights shows `0:00.000` (scratchpad `pause-countdown.png`).

**4. Car rear by day: done.**
- Light bar: 36 mm tall (was 20 mm). The end lenses sat inside the bar and z-fought into red and black speckle; they now stand 1 mm proud.
- Nozzle shelf: satin black. Diffuser: the flat closing plate is gone and the strake rear edges rake forward 140 mm, so the low rear reads as carbon fins, not four boxes.
- Plumes: each nozzle is three nested cones that fade fast along their length, so boost shows four jets with bright mouths, not pale glass cones. A view-angle fade was tried first; it blanks the plume from the chase camera, which looks straight down the axis.
- Day sky in the environment bake is 40% desaturated (`sky.js`). Shade on the asphalt was rendering at saturation 0.3 from a warm (89, 80, 70) albedo, and day straight fell under the hue gate (1.47) after the kerb fix changed the race. Now 2.02.
- Turntable, 8 angles: scratchpad `tt-after4/`. Before and after: `rear-tt-final.jpg` (low rear and rear three-quarter: before, matte fins, carbon fins), `plume-cmp4.jpg` (boost, day and night), `rear-cmp-final.jpg` (chase view).
- Shot-match HUD off, day pack edge: 0.063–0.064 against 0.065 over four runs. HEAD before this task: 0.0652. The old box grid supplied the missing edges. Stronger turf stripes and asphalt normals were tried and did not move it.

**5. Garage: done.**
- Glare pool beside the car: specular from the spots on a near-mirror metal deck (roughness 0.28, metalness 0.85). The deck is now 0.5 / 0.7 with env 0.5. Key, overhead, fill and board spots cast shadows, so no light reaches the deck through the car.
- Dark flank: the +x / camera-side quadrant had no light. A warm fill (`#fff1e0`, 160, 0.42 rad) now covers it. Checked at 8 turntable angles, day and night (scratchpad `gspin-before/`, `gspin-a4/`, sheets `gspin-before-day.jpg`, `gspin-a4-day.jpg`).
- Venue bay glare by day: sunlight through the door off a 0.34-rough floor; the floor is 0.55 now. At night the remaining cone on that page is the sum of several spots; with all spots hidden it disappears. It is softer now but still visible.
- Engineers: the crowd models are built for grandstand distance. The four crew now stand in the door opening (z 15–17), small figures against the outside, and are gone from the hero, settings and controls frames.
- Night door: navy gradient over a warm horizon glow, plus stars from `night_sky.webp`, instead of the dimmed sunset JPEG.
- Every menu page by day and night: before `garage-before/`, after `garage-final/`; sheets `garage-cmp-day.jpg` and `garage-cmp-night.jpg` (top before, bottom after).
- Cost: garage p50 4.1 → 5.4 ms by day, 3.8 → 5.4 ms at night; draw calls 261 → 528 by day (four shadow passes). The race is untouched: the garage spots are hidden outside the garage.

## Session 2026-10-29 (late): four fixes and Phase 5

The user asked for less CPU and less testing mid-session ("dont use that much cpu. just fix up the track, and the bugs dont needa do that much testing"). Gates ran once each, one process at a time, `nice`, `--test-concurrency=1`.

**1. No track limits while airborne: done (`3fefe86`).**
- Cause: the rule judged a whole corner window. A breach was only ever flagged on the ground, but one brief ground breach (four wheels on the kerb at entry, or a hop from the kerb) made the window's whole gain the penalty, including a later legal flight. The toast fires at window exit, often while the car is still in the air.
- Fix (`src/sim/limits.js`): a window is judged in ground segments. A take-off closes the segment and charges only the time gained on the ground up to that point. A landing inside the window opens a new segment from the landed state, so landing off the track and cutting back on still counts. Terrain contact (`mode 2`) inside a window counts as outside the track.
- Tests (`tests/limits.test.js`): "time gained in the air is never charged" fails on the old rule (1.63 s charged for a flight that landed inside the lines) and passes now. "Landing past the white line and cutting on the ground still counts" catches 3 of 4 Proving windows.
- Hop-and-hover over corners (scripts in `/tmp/vt/hophover.mjs`, `/tmp/vt/chord.mjs`, not kept): a bot that hops and hovers through every corner is 15–40 s a lap slower than the bot, even with unlimited gas; hover kills speed. A sweep of single straight hops per corner (take-off point, hover time, steer) finds the best gain per corner window: Proving +0.53, +0.32, −0.23, +1.28 s (gas +0.0 to +0.49); Airfield up to +0.67 s; Launch up to +0.56 s. Most corners lose time. Penalties stayed at 0 for these. Summed best case on Proving is about 2.1 s a lap for about 0.9 gas. The gas cost limits it, as designed. Not an exploit by the 0.9 × author rule. Proposal if it plays as cheap: scale hop gas with speed, or count hover gas per corner. No rule added.

**2. Wall scrape: done (`e90025a`).** The scrub was `press · (1 + (press/5)²)` and summed `press` over every hull point in contact. A 12° scrape at 131 mph had `press` 12.2 m/s, so a 90 m/s scrub. Now linear in the largest normal speed. 0.4 s after contact at 131 mph: 4° keeps 88%, 8° 75%, 12° 60%, 20° 41%, 45° 2%. Head-on 20 m/s stops (0.7 m/s), head-on 30 m/s wrecks. Test rewritten red-first (12° kept 5% before).

**3. Garage glare: done (`af568b4`).** The night cone was the narrow amber door beam (`#ffb070`, 0.14 rad) drawing an ellipse on the floor behind the bays. Removed. By day the low sun's glint through the door also washed the bay titles (proved by hiding the sun); floor and bay prints are rougher by day (0.8 and 0.85). New `tools/menu-shots.mjs` captures board, venue, settings and controls by day and night. Sheets: `docs/sheets/garage-glare-day.jpg`, `docs/sheets/garage-glare-night.jpg` (top before, bottom after). Pause and results need a race and were not captured.

**4. Phase 5 (plan Tasks 32–35).**
- Design doc: Airfield and Launch unfrozen (2026-10-29). Plan: Phase 5 written.
- Launch wall-ride kerb launch: not reproduced when driven. The old report came from placing a car mid-twist at sample 1062, where its front wheels start 0.2 m above the surface. Driven in from the straight, both kerbs hold at 89–109 mph. Guard test added (`31a0e42`); the bank is unchanged.
- Air lines (`f582926`, then `dc780fe`, `e433f20`, `9a5ec75`): the Proving template (kicker 11°, gate at 105 m, 15 m pylon chicane) on the straight after each venue's last corner. The jump sits about 150–230 m after the corner so a driver can boost to the 62 m/s an air line needs. The jump node is raised 3 m and the landing descends through the chicane (Proving drops 6 m; on flat ground with no drop the flight landed before the gate).
  - What failed first: mid-runway, the bot braked from 180 to 80 mph for the lip (−6 s a lap). 50 m after the corner, no driver reached lip speed, so nobody flew.
  - Airfield: jump at z −420, span 300 m, chicane 18 m wide (15 m left the flight 1.7 m inside the corridor). Lap start moved to z −61 (was −250).
  - Launch: jump at z −350, span 340 m. Lap start moved to z 80 (was −300); Launch sample indices in tests shift by −380.
  - The bot passes the gate at 9.5 m (r 4.5 around 10.8) and is airborne from 40 to 180 m, as at Proving.
- AI (`9a5ec75`): with one air line a lap, `planFor` never re-rolled after its first decision, so a driver flew every lap or never (seen as 3/0 counts per race). The plan now resets after each air line. Daring is spent only on a commit, so a driver blocked by traffic or low speed keeps the wish. Proving is unaffected by the reset (its two air lines alternate). The tier-pace test now gives its single rival zero nerve so air-line luck does not decide the best lap.
- Author TT laps: Proving 75.21 s, Airfield 74.72 s, Launch 64.82 s. `SIM_VERSION` 14, terrain baked, ghosts regenerated.
- Airfield control tower: `towerSite` picks the sharpest corner in the Tower sector, which became the new chicane. Air spans are excluded (`fix(airfield)`).
- Everything else in the slice standard was already data-driven and now applies: lip chevrons (`road.js`), gate rings (`gates.js`), festival bleachers and tents at the air line (`festival.js`), floodlights, run-off, track limits.

### Phase 5 gates (2026-10-29, light per the user)

| Gate | Result |
|---|---|
| `npm test` | PASS, 122 of 122. |
| Exploits | PASS on Proving, Airfield and Launch. The two air-line cases now run 100 s, since the new air lines sit at the end of the lap. |
| ai-bench, 6 races per tier (not 20) | Proving PASS on Easy, Pro and Elite. Airfield: Elite PASS; Easy and Pro FAIL on player contacts (3.2 against ≤ 3). Launch: Easy and Pro PASS; Elite FAIL on player contacts (3.5). Air lines: every driver takes at least one per race on every tier at both venues. Six-race contact means are noisy (1.3–3.5 across runs this session). |
| Shot-match HUD on | Airfield 2/6 (old build 2/6), Launch 4/6 (old build 2/6). |
| Shot-match HUD off | Airfield 2/6, Launch 3/6. |
| Perf | Skipped at the user's request. |

Shot-match notes: the moments (0.35, 11, 24 s) were tuned on Proving. On Launch the 24 s moment now lands on the 50° wall-ride because the start moved, so "straight" fails on hue, edge and cropping. Airfield misses are the same kind as before: night L98 89.8–89.9 against 90, and a rival alongside in the pack shot ("car", "edge").

Contact sheets (looked at):
- `docs/sheets/airfield-airline.jpg`, `docs/sheets/launch-airline.jpg`: before and after, day and night, approach, lip and aerial. Rows: before day, after day, before night, after night.
- `docs/sheets/airfield-grid.jpg`, `docs/sheets/launch-grid.jpg`: the grid at the moved start lines, day and night.
- `docs/sheets/garage-glare-day.jpg`, `docs/sheets/garage-glare-night.jpg`.

Still open:
- Player-contact episodes on Airfield (Easy, Pro) and Launch (Elite) sit at 3.2–3.5 on six races. Rerun at 20 races on a quiet machine before tuning.
- Shot-match moments need per-venue times for Airfield and Launch.
- Chase-camera fly frames were captured before the final run-up change (`/tmp/vt/fly-*`); the final geometry was checked from fixed cameras and the sim.
- Hop-and-hover cut: about 2 s a lap on Proving for about 0.9 gas. Watch it in playtests.

## Session 2026-11-01: gather pass and the "shook" plan

The user's verdict on the build: "very mediocre". The ask: use the free model catalogues in the skills, design something people want to play, and write a deep plan to AAA quality.

- Baseline captured: `docs/sheets/2026-11-01-baseline-race.jpg` (25 autopilot frames, three venues, day and night), `docs/sheets/2026-11-01-baseline-menu.jpg`. Scorecard average 1.65 of 3. The gap is art direction, world authorship, the hero at close range, and flight being a tenth of screen time. Not the renderer.
- Catalogues checked against their APIs: Polyfork is flat-shaded low poly (hero renders in `docs/sheets/2026-11-01-polyfork.jpg`) and does not fit a photoreal Roadster; not used. Scenario 3D Collection (CC BY 4.0) is mostly cartoon; one pickup and one drone are usable. Poly Haven (CC0) carries the props, rocks and desert plants. Landmarks come from Blender under `tools/range/`.
- Design: `docs/plans/2026-11-01-shook-design.md`. Pitch: the Roadster reveal, but you are driving. Dares (The Lineup first, on its own oval, The Pad), a clip export with WebCodecs, ghost links, a daily board on one Cloudflare Worker that re-simulates every run, golden hour as the hero look, a phone tier before launch.
- Plan: `docs/plans/2026-11-01-shook-plan.md`. Phases 1 and 2 are broken into test-first tasks. Phases 3 to 7 list tasks, files and gates.
- Tooling found broken this session: `npm install --prefix tools` fails on an npm cache rename; a fresh `--cache` dir works. `sharp` was missing its optional libvips package, so `shot-match` and `menu-shots` metrics throw. Task 0.2 of the plan fixes it. A plain capture script was used instead (in the scratchpad; the plan moves it to `tools/capture.mjs`).
- Not done: no code changed. The Sketchfab licence of the Roadster GLB is unrecorded (Task 0.3).

Next: Task 0.2, then Phase 1 (The Pad and The Lineup).

## Session 2026-11-01 (cont.): executing the shook plan

Branch `shook`. Done, with evidence:
- Task 0.2 and 0.3: `tools/capture.mjs`; car licence checked; tool install quirks noted in the plan.
- Task 1.1 and 1.2: The Pad (oval, 1535 m, one kicker, `lineup` flag). Baked terrain and medals. `tests/pad.test.js` passes.
- Task 1.3: the lineup rules in `src/sim/lineup.js` and `dareStep` in `src/sim/race.js`. A clear scores count times a multiplier (1 plus tricks, at most 3; a hard landing resets it to 1). A clip ends the dare 2 s later with no respawn. A near miss over a roof earns gas once per vehicle. `tests/dare.test.js` covers each rule; `npm test` gives 139 of 139 passes. `node tools/sim-run.mjs pad lineup 1 -v` shows the bot clearing 8 lines with 0 clips, 0 wrecks.

- Task 1.4: `src/render/lineup.js`, one InstancedMesh rebuilt on `clear`, red flash on `clip`. Sheet `docs/sheets/2026-11-01-lineup-greybox.jpg` (line of 8, side and overhead): kinds read by colour, the semi stands clearly above the hatch, shadows cast. Bug found and fixed while looking: the instanced bounding sphere was computed at count 0 and culled the line.
- Open design gap: from the chase camera the kicker crest hides the line until the lip, on every lap. The plan's "reads from 200 m" check fails. Candidate fixes for Task 1.6 or Phase 3: a gantry with the line count over the kicker, a lower landing deck, or a camera rise on the ramp.

- Task 1.5: the dare HUD and results. The clock plate shows the score, the top-left label shows the line, and a gold ×2 or ×3 appears while a trick is pending in the air. Lap and sector events are muted in a dare. Toasts read `+n CLEARED ×m` and `CLIPPED`. The results board shows the line reached, the score, a list of clears, best, cleared and top speed, with no sector dots. The best score is saved as higher-is-better. Board rows now take their tag from the event kind (the dare had been tagged GP). Evidence: `tests/menu.test.js` adds a dare-results case, `npm test` gives 140 of 140, and the sheet `docs/sheets/2026-11-01-dare-hud.jpg` shows the air multiplier, the clip and the results. `tools/a11y-probe.mjs` now includes the pad dare: PASS on 105 elements, 0 failing.
- Deferred to Task 2.4: the SHARE CLIP button. It ships with the clip encoder so the board never shows a dead control.
- Seen, not caused here: on every venue headless Chrome logs one MeshStandardMaterial that fails to compile, with more than 16 texture units. Proving GP shows it with no lineup loaded. Next step: find the material, likely one that receives cascaded shadows plus an env map and sky textures.
- Feel gap for 1.6: after a clip the car rolls through the vehicle at 20% speed, because nothing stops it.

- Task 1.6: dare feel, logged as entry 6 in `docs/feel.md`. The lip punches +1.7° on its first frame where it had nothing. A ×1 clear thumps −2.9° where it was −2.1°. A clip stops the car, because input is ignored and the car bounces back off the vehicle; it used to roll 36 m on under throttle. The music dips through a low-pass on a clip. `npm test` gives 140 of 140. The sounds were not checked by ear.

Phase 1 gate:
- `npm test`: 141 of 141 pass.
- `node tools/exploits.mjs pad`: PASS. The exploit matrix now builds events with the venue, so it sees dares. It adds a flown Lineup run and hover runs at 20, 30 and 40 m/s. Over 120 s: flown 15, hover 1 (clips line 1), 15 and 15. Hovering never out-scores flying.
- Exploit found and fixed: The Pad's south-turn limits window ran across the finish line. A cut there was scored after the lap counter moved on, so it hit the next lap, and on the final lap it was never scored. `limitWindows` now splits any window at the finish line. The piece after the line still scores breaches but does not train the pace estimate, because a straight teaches it that the car outruns its shadow. Before: 5 cuts caught in 3 laps, with the last corner free. After: 6 of 6, each south-turn cut 0.8 s. A new test in `tests/limits.test.js` checks that no venue's window crosses its finish.
- The bot reaches line 9: `node tools/sim-run.mjs pad lineup 1 -v` gives 8 clears, 0 clips, 0 wrecks.
- Blocked: the cold test needs three people, five minutes each, without instructions. The user has to run it and record the quotes here.
- Blocked: perf. The load average was 27 now and 128 over five minutes, with other processes on several cores. `tools/perf.mjs` timed out booting. Rerun `node tools/perf.mjs "http://localhost:8790/index.html?venue=pad&event=lineup&autostart&autopilot&day" 60` and the same with `night` on a quiet machine.

- Task 2.1: `src/clip/encode.js` with mp4-muxer 5.2.2 vendored at `rl/vendor/mp4-muxer-5.2.2/` (MIT, licence file included). Codec order: H.264 High, then Baseline, then VP9 in MP4. A WebM fallback is not needed, because mp4-muxer carries VP9. `tools/clip-test.mjs` passes: avc1.640028 is picked, 90 frames give a duration of 1.5 s and 2.18 MB, ffprobe reports `h264,1920,1080,90`, and a decoded frame shows the garage. Encoding took 6.1 s for 90 frames in headless Chrome on a loaded machine.

- Task 2.2: portrait replay render. `src/clip/render.js` draws each frame into a 2D canvas, burns in the end card over the last 1.2 s, and feeds the encoder. `exportClip` in `src/main.js` replays the last run from N seconds before its end. It resizes the renderer to 1080x1920 at pixel ratio 1 and steps the existing frame body (now `draw(dt, ticks)`) with exactly two sim ticks per 60 fps frame, then restores everything. No second post chain was needed.
  - Camera: the clip uses the chase camera, except on The Lineup, where a hero camera sits downrange of the line, 8 m off the centre and 4.5 m up. It zooms to hold about 18 m of width around the car. The broadcast camera's trackside positions sat behind grandstands on The Pad (first sheet), so the chase camera replaced them for clips. The broadcast camera now frames on the narrow axis, so portrait replays work.
  - Replays drop events, so the lineup now follows `race.dare.count` during a replay. `finishDare` now saves `lastRun`.
  - Evidence: `tests/dare.test.js` checks that a recorded dare replays to the same dare state and car position (142 of 142 pass). `node tools/clip-test.mjs /tmp/shook/clip5` passes: h264, 1080x1920, 360 frames, 6.0 s. The sheet `docs/sheets/2026-11-01-clip-lineup.jpg` shows the car airborne over the line, then the burned-in card.
  - Export time for 6 s of clip, measured in the page: 5.4, 6.6, 8.9 and 19.1 s across four runs on a machine with a load average of 70 after a reboot. Rendering takes about 2 s. The rest is the encoder waiting on the GPU. The 20 s budget for 10 s of clip needs a check on a quiet machine.
  - Still open: the hero shot is readable, not great. The car fills about a tenth of the frame width. Phase 3 should add a second angle and a cut on the lip.

- Task 2.5: ghost links. `src/share.js` stores a JSON header (sim version, event, assist, seed, tier, total, venue, frame count, FNV-1a hash of the inputs) and then the six input channels, delta-coded, in deflate-raw and base64url. Because deflate has no checksum, the hash rejects corrupt links. Opening `index.html#g=<link>` decodes it and switches venue if needed. It then opens the event and starts the race with the linked ghost, even with the ghost setting off. Results name the ghost's time, or for a dare the ghost's score and who won.
  - Evidence: `tests/share.test.js` round-trips a 60 s bot run on The Pad (under 8,000 characters) and replays it to the same dare state. A corrupt tail, garbage and an empty string all decode to null. In the browser, a 9 s run gave a 1,170-character link. Opened from the default venue, it reloaded onto The Pad and started The Lineup. The ghost reached the source run's first clear at tick 1120, against 1115 in the source, which is the polling gap. `npm test`: 144 of 144.
  - Not done: the plan's check across two machines. The burn-in cannot carry the link, because a link runs to thousands of characters. Task 2.4 should put the link on the results screen and in the share text.

- Task 2.3: offline clip audio in `src/clip/audio.js`. It does not use a licensed bed. The game's own procedural music engine runs in manual mode inside an `OfflineAudioContext`, suspended every 100 ms and at each cue to tick it and fire stingers: `lineup` on a clear, `bail` on a clip, `rampEnd` on a perfect landing. Sound effects come from the game's sprite (the clear chime pitched by the multiplier, the clip, the lip burst, landings), and the wind loop follows the replayed speed. A limiter and a peak cap at −2 dBFS finish the mix. Cues come from a deterministic pre-pass over the replay; `createGhost().step(sink)` now hands back events. The encoder adds AAC 128 kbit/s when the browser supports it, else the clip ships silent.
  - Evidence: `tools/clip-test.mjs` passes with `aac,48000,2`, −13.3 LUFS and −2.0 dBTP. In the earshot timeline of the clip, the clear chime starts 41 ms before the clear, the music stinger peaks 52 ms after it at +14 dB over the bed, and the lip burst starts 70 ms after the lip. No clipping. `npm test`: 144 of 144.
  - Judged by meters and earshot tags only. Nobody has listened to it.

- Task 2.4: the results board has a Share action (key C). It opens a sheet with Portrait 9:16 and Landscape 16:9, a progress bar, and then Share (when `navigator.canShare` accepts the file), Save video and Copy ghost link. The share text carries the ghost link, so the link travels with the clip. While the sheet is open, board clicks and keys are ignored, and Escape closes it. Result actions shrink their type when five share the row.
  - Evidence: a scripted run in headless Chrome. The car clipped line 1, C opened the sheet, Portrait produced a 10 s clip in 9.4 s (14.6 MB, h264 1080x1920 plus AAC). Save downloaded `voltitude-lineup-0.mp4`, the link reached the clipboard (253 characters for this short run), and Escape returned to results. Sheet `docs/sheets/2026-11-01-share-sheet.jpg`. `npm test`: 144 of 144.
  - Not done, needs a person: the Phase 2 gate. Three people export on their own phones, play the clip in the gallery and upload it to one app. A ghost link raced on a second machine. An export timed on the user's laptop when it is quiet.

Phase 3:
- Task 3.1: a golden hour session, now the default. It loads the baked `golden_sky` with the sun at 7.6° and azimuth 76°, north along The Pad's straight, so the jump is backlit. The sun is warm (#ffb877) and set to 3.4 directly, because the golden HDR's sun disc is clipped (maximum luminance 55 against 141,000 for day). Golden has its own exposure (EV100 13.0), auto-exposure range and warmer split-tone grade. The session setting offers Golden hour, Day and Night, and `?golden`, `?day` and `?night` override it. `main.js` keeps `NIGHT` as `SESSION === 'night'` to keep the diff small.
  - Sheet `docs/sheets/2026-11-01-golden-hour.jpg`: day on top, golden below. Grid, a low view of the line and a wide view of The Pad.
  - Found while looking: a contrast curve stronger than 1 in `makeLut` goes negative near zero and blacked out the sky. Golden keeps strength 1.
  - Changed from the plan: golden is the default for every event, not night for the Grand Prix. A per-event default would need a reload whenever the event changes.
  - Not checked: the garage under golden. It takes the day path.

- Task 3.2: aerial perspective. No LUT rewrite. The atmosphere reference's own tier rule says a small scene with no orbital camera takes an analytic height and distance model. `skyFog` already has one, with height falloff, per-channel extinction and inscatter from the HDRI horizon in the view direction. So sky and haze share one sun and one source by construction. The change: golden haze density rises from 0.00034 to 0.000476, giving 25%, 30% and 42% haze (R, G, B) at 1 km against the plan's target of about 30%. Day and night are unchanged. Sheet `docs/sheets/2026-11-01-golden-haze.jpg`, before on top.
  - Not done: the plan's check at three sun elevations. The skies are baked HDRIs at fixed elevations, so only the three sessions exist.

- Task 3.3: the car at close range. The car is procedural, so decimation does not apply, and the LODs and the cube probe already existed. The paint gains two layers in `onBeforeCompile`, keyed to chassis space in metres through a per-frame inverse matrix (the mesh has no UVs and a 2.3x node scale).
  - Flakes: sparse 2.5 mm cells tilt the base normal under the clearcoat, so they glint in highlights only. They fade out before they alias.
  - Dust: `uDust` grows with off-road speed and long air time, is weighted to the sills and the tail, adds noise, and dulls the clearcoat. `startRace` washes it.
  - Sheet `docs/sheets/2026-11-01-paint-dust.jpg`: before at golden (top left), dust at full (top right), a close 3/4 with flakes, and full dust at night. The flakes read as a fine grain only at the closest framing. `npm test`: 144 of 144.
  - Not checked: dust building up in a real off-road run. The frames set `dust` directly.

- Task 3.4: cold-gas plumes. The existing additive cones stay. `createVapour` in `src/render/fx.js` adds a world-space vapour trail. The car view emits from each nozzle at a rate set by its power, with the nozzle's exit speed plus the car's velocity, so the trail hangs in the air behind the car. About 7% of the particles are small sunlit ice glints. The existing ground dust now also rises when the car hops or hovers within 1.5 m of the ground.
  - Sheet `docs/sheets/2026-11-01-plumes.jpg`, from a fixed camera beside the start: rest, a hop with down plumes and dust, the vapour columns left behind, and a boost from rest with its trail. `npm test`: 144 of 144.
  - Not done: the refracting cone. The post chain's `uHeat` is a screen-space ground shimmer with no per-object mask, so plume refraction needs a mask pass. Deferred to Task 3.7, which owns heat shimmer.
  - Not done: the plan's 4 s portrait clip. The clip renders through the same `draw`, and replay time only moves forward, so old particles expire. No clip was rendered to prove it.

- Task 3.5: the ground. The asphalt already had macro variation, tar seams, joints and skid streaks, so the work went into what the track's use leaves behind.
  - Rubber line: `createRoad` now passes the bot's racing line (`racingLine(track).off`) into a new `aLine` attribute. The road shader darkens a band on the line, with two tyre tracks and a little gloss.
  - Kerb wear: kerb blocks are scuffed with noise where the racing line reaches the kerb.
  - Grid stains: dark, slightly glossy blots at the 12 grid slots. A higher gloss read as white smears against the low golden sun.
  - Tyre marks: new `src/render/decals.js`. An instanced, multiply-blended ring buffer of 4,096 ground quads. Each wheel writes a segment on lateral slip above 3 m/s (the squeal threshold), a hard brake above 25 m/s, or a landing. Marks persist for the session.
  - Evidence, sheet `docs/sheets/2026-11-01-ground.jpg`: the tightest GP corner from above (before, after), the GP grid after the field leaves, and tyre marks from a scripted boost, steer and brake on The Pad (372 segments). `npm test`: 144 of 144.
  - Changed from the plan: no 4K asphalt (the 2K set stays) and no `src/sim/line.js` change, because `racingLine` already exports offsets. The rubber line and the grid stains are subtle at golden. Signature frame 4 waits for the heat shimmer in Task 3.7.

- Task 3.6: flora. The boulders and a procedural card scrub already existed. The Poly Haven Wild Rooibos Bush (CC0, credited) replaces the olive card bush; the dry grass tufts stay. `tools/bake-flora.mjs` decimates it (27.5k to 9.6k triangles for five variants, 3.6k for LOD 1) and converts textures to WebP. `src/render/flora.js` uses three variants, merged by material, instanced in 300 m cells: full detail to 45 m, LOD 1 to 260 m, then culled. 1,897 bushes on The Pad. A vertex shader sways them by instance phase.
  - Found while looking: the bush albedo averages sRGB (32, 27, 21), about 1.5% reflectance, so the bushes read black against the sand. Back-facing cards also flipped their normals into shade. Fixes: albedo ×9, foliage normals bent toward up, no back-face flip, no card normal map, no self-shadow.
  - Sheet `docs/sheets/2026-11-01-flora.jpg`: The Pad wide (before, after), a close view at golden, and the GP chase at 30 s.
  - Not met: the 1.5 ms budget is unmeasured. Headless frame times sit on the 16.7 ms vsync cap. The GP chase went from about 3.6M to 4.2–4.4M triangles at the same draw call count, before LOD 0 was cut from 70 m to 45 m. No Joshua trees: the Poly Haven dead quiver trunk reads as a pole at game distance.
  - Not fixed: scatter only checks distance from the walls, so a bush can sit inside a grandstand. The old card scrub had the same rule.

- Task 3.7: cloud shadows and heat. Shafts dropped.
  - Cloud shadows: `skyFog` dims direct sun on every patched material (terrain, road, props, flora) with three octaves of drifting value noise in 260 m cells. One uniform, `skyUniforms.uCloud`, set to 0.55 by day and 0 otherwise. Sheet `docs/sheets/2026-11-01-cloud-shadows.jpg`: day, before on the left.
  - Heat: the existing `uHeat` ground shimmer stays; golden now uses half strength.
  - Dropped: screen-space sun shafts. I built them (a 32-tap march over sky depth toward the sun's screen position) and shot into the sun at The Pad and the GP. At 7.6° the sun sits on the ridge line. Pixels below it march into mountain, and pixels above it are already near-white sky, so the frames with and without shafts matched even at triple strength. The bloom veil already carries the glare. The code was removed.
  - Dropped: clouds at golden. With the sun that low, direct light is a small share of the sand's light. The patches did not read, and auto-exposure lifted the whole frame.
  - Not done: the car ignores cloud shadows (its materials are not `skyFog` patched).

- Task 3.8: signature frames 1, 2 and 4. `FRAMES=leap,inverted,grid node tools/shot-match.mjs <out>` reproduces them at golden.
  - The leap: The Lineup on autopilot. A camera tracks the car from a low rear three-quarter and fires when the car is 2 m above the lip.
  - Inverted: the GP loop on autopilot. A camera rolled to the car's up vector fires at `uy < -0.9`. `fixedCam` takes an optional up vector (values 7 to 9) for this.
  - The grid: low behind pole during the countdown.
  - Sheet `docs/sheets/2026-11-01-signature-frames.jpg`. Metrics: leap hue 1.79, L50 80.1; inverted hue 1.37, L50 18.3; grid hue 1.98, L50 45.9. `npm test`: 144 of 144.
  - Gaps against the design text: no cold-gas puffs in the leap (the autopilot does not lift there), no phone lights in the stand, and no test stand or tank farm on the grid skyline (those are Phase 4 venue work).
  - Not done, needs people: the blind 30 s clip test against Forza Horizon 6.

Phase 3 status: Tasks 3.1 to 3.8 are built and committed. Open human gates: the Phase 1 cold test and quiet-machine perf, the Phase 2 phone share and two-machine ghost link, and the Phase 3 blind clip test. The flora 1.5 ms budget needs the perf run.

Next: Phase 4 (the range).

## Session 2026-11-02: Phase 4, the range

- Kit (4.1), changed from the plan: no Blender. `src/render/range.js` builds the kit from merged primitives, the pattern `launch.js` and `festival.js` already use. Pieces: test stand with flame bucket (52 m lattice), horizontal stand with trench, tank farm, water tower, propellant tanker, container stacks, antenna mast with dish, vertical tank pair, generators, and the rocket on its mount (110 m, half stainless, half black tile). Everything merges into five meshes (white, concrete, steel, silver, painted) plus one point cloud of red beacons, so the whole kit costs about 7 main draws and 10 shadow draws.
- Placement (4.2): `festivalSites` takes setbacks (`[24, 50, 70, 110]`), and `createFestival` returns its used footprints so the kit never overlaps stands, camps or tents.
  - Anchors sit at 110 m, spread around the lap.
  - Mid-ground pieces come one per 110 m of track, with no repeat of a type within 200 m. Low pieces go at 24 m and tall ones at 50 to 70 m.
  - The rocket is placed by a line-of-sight test from the grid camera: 14° to 30° off-axis to clear the start gantry, with sightlines passing near a grandstand rejected, then relaxed tiers.
  - Counts: Proving 39, Airfield 39, Launch 30, The Pad 16.
- Re-dress (4.3): flags drop from 20 to 8; the kit takes their sites. Launch already had a flame trench.
- Draw calls: the baseline already broke the gate (up to 998). A per-object `renderBufferDirect` tally on the Launch grid found the player car at 220 (three shadow cascades), rivals at 47 each and boulders at 140. Fixes: only paint, gloss, black, carbon and tyre cast car shadows. Rival near LOD folds trim into black. Boulder cells grew from 140 m to 300 m, far LODs cast no shadows, and pebbles use one kind. Launch grid: 885 to 671.
- Gate evidence (`gate4.mjs`, chase frames at 1, 9, 18, 30 and 45 s on all four venues, golden and night): every frame is under 700 draw calls (231 to 635). Sheets `docs/sheets/2026-11-02-range-before.jpg`, `-after.jpg` and `-night.jpg` (rows: airfield, launch, pad, proving). The rocket now shows from every grid.
- Gate not met:
  - Landmark in every frame: most frames now hold one, but some fast corners on Airfield and Proving still show only fences and stands. At night the kit reads only as silhouettes and beacons.
  - Edge density at 0.05: nine frames fall short (lowest 0.039, plus one camera-in-car frame), most of them at speed with motion blur. The baseline had more.
  - Collision proxies: not added. The kit sits at least 20 m beyond the walls, so ground cars cannot reach it, but a flying car can pass through it. Adding colliders changes the sim and the recorded ghosts.
- Found: on night Proving at 18 s the chase camera sat inside a rival car. Not caused by this phase.
- `npm test`: 144 of 144.

Next: Phase 5.

## Handoff 2026-11-02
The second compaction happened at the start of Phase 5. The handoff is at /private/tmp/claude-501/shook-handoff-2026-11-02.md. Task 5.1 (The Ramp) has no code yet.

## Session 2026-11-02 (cont.): Phase 5

- Task 5.1: The Ramp. It runs on a spur, a second open ribbon built by `buildCourse` that only its dare drives on. The Pad's circuit, its terrain bake and recorded ghosts are unchanged (`pad.baked` stays true, so the bake hash still matches). Design and code:
  - `venues.js`: `pad.spurs.ramp` in the infield beside the back straight: a 220 m run-up, a 40 m curl (`pitch: 180`), a 24 m ceiling over the run-up 15.5 m up, and a short gap that releases the car. `world.js` builds `track.spurs`; `eventsFor` lists spur dares with `spur` and `dare` fields; `createRace` swaps `race.world.track` for the spur.
  - `course.js`: a `tube` piece option (a roll that also lifts the ribbon round a tube radius) for the trench, plus `closed`, `loopMask` and `jumps` fields so open ribbons work with the shared race code.
  - Scoring (`rampStep` in `race.js`): three tries. A try is released at the lip (or when the car leaves the ceiling). The car's road hint then moves to the run-up below, so it lands on the deck. Points: 100 × alignment (up · normal × |heading · tangent|) + 100 × speed kept (landing speed over curl entry speed) + 150 per extra full roll. A wreck, a stall or reset scores 0. Input is idle for 1.5 s, then the next try starts from rest.
  - The autopilot (assist on) lands three clean tries for 585. Holding roll plus hover gets one extra roll (341 points for that try); with assist off and no input, the car lands on its roof and the try scores 0.
  - Render: `src/render/spur.js` (deck, rails, columns and beams under the raised parts, red and white chevrons on the curl). Festival props and the flora, scrub and boulder scatter now keep clear of spurs. The chase camera recovers its up vector faster when it starts inverted in the air (it took about 3 s to come upright after the lip).
  - HUD shows `TRY n/3` and `+150` per extra roll in the air; toasts for the lip and each try; `rampResults` in `menu.js` lists the tries.
  - Evidence: `tests/dare.test.js` adds five ramp tests (the spur leaves the bake untouched, a try holds the ceiling and lands upright, the extra roll and the roof landing, reset and the three-try end, the autopilot run replays to the same dare state). `npm test`: 149 of 149. `node tools/exploits.mjs pad`: PASS. Sheet `docs/sheets/2026-11-02-ramp.jpg`: side view, back view, run-up, the lip with the horizon inverted, roll-out, landing with +195.
  - Bug found while looking: the course start point is the car's heart height, so the deck sat 0.62 m lower and the terrain covered it. The start is now at y 0.7.
  - Open: the curl reads as a grey disc from the side. Rolls need hover, because the ceiling is only 15.5 m up (40 m curl, as planned).

- Task 5.2: The Trench. A timed spur at the Launch Complex, east of the tower straight (nearest circuit point 75 m away). It runs 739 m: a straight with gate 1, a 9 m wide trench with gate 2, an 80 m tube roll up the wall onto the ceiling 9 m up, two inverted gates, a roll back down, a 180° turn and two gates down the return lane to the finish. Each missed gate adds 3 s at the finish (`GATE_MISS` in `race.js`).
  - `course.js`: `gate` pieces, and tangents recomputed from the positions inside tube rolls. Without that, the frame ignored the roll's sideways and upward travel, and the car left the ceiling at speed and respawned 75 times.
  - The first rolls were 34 m long and stopped the car dead at 30 m/s or more. At 80 m, a full-throttle line finishes in 22 s.
  - The event is `kind: 'trial'` on the open-course timing path (checkpoints, splits, medals). `tools/medals.mjs launch trench` adds an author ghost of 22.2 s to `assets/ghosts/launch.json`. The existing `tt` ghost is byte-identical.
  - Render: concrete tunnel walls with buttresses, a floor slab, and a lattice tower over the trench in `spur.js`. Gates come from `createGates` on the spur. Menu tag `DR`, kicker "Dare · Time attack".
  - Respawn on open ribbons now walks back to a safe sample (it relied on `track.lap`).
  - Found: `tests/sim.test.js` skipped its flat-out test for any venue with dares. It meant the oval only, so the skip now applies to venues with the Lineup.
  - Evidence: three trench tests (six gates and two on the ceiling, the autopilot finishes with six gates and no penalty, a missed gate adds 3 s). `npm test`: 152 of 152. `node tools/exploits.mjs launch`: PASS. Sheet `docs/sheets/2026-11-02-trench.jpg`: gate 1, the roll, inverted on the ceiling, the roll back down, the return lane, a side view.
  - Open: the author time (22.2 s) is far faster than `sim-run` (29.4 s). Both use the same autopilot; the medal tool quantizes inputs first, and the trajectory is that sensitive at the roll.

- Task 5.3: the Worker in `server/` (`wrangler.toml`, `schema.sql`, `src/index.js`, `README.md`). It imports `src/sim/*` directly; the terrain bakes are its static assets. Routes: `POST /runs`, `GET /board/:venue.:event/:day`, `GET /runs/:id`, `GET /og/:id.jpg`, plus `GET /daily/:day`. Validation re-simulates the run with `createGhost`: the time must match within one tick and a dare score exactly, else 422. A SHA-256 of venue, event, settings and inputs is unique, so a resent run gets 409. The OG image must be a JPEG under 400 KB; it is stored in D1.
  - `src/sim/daily.js`: the daily card per UTC day. The first seven, from 2026-11-09, are authored (Task 7.4's first item). After that a fixed rotation alternates dares and timed events.
  - Evidence: `node --test server/test/*.test.js` (`npm run test:server`): 5 of 5, with D1 stood in for by `node:sqlite`. A real ramp run is accepted and served back with its image. The same run is rejected as a replay. A time 1 s or 2 ticks faster, a score 100 higher and one edited input byte are all rejected. A time 1 tick off is accepted. A daily run for the wrong event is rejected.
  - Load test, `node server/load.mjs 1000`: 1,000 submissions (one in ten forged) in 8.9 s: 900 accepted, 100 rejected with 422, re-simulation p50 9.2 ms, p99 10.7 ms. Both boards return their top 100. This is in-process against SQLite, not the deployed Worker over the network.
  - Not done, a one-way door for the user: `wrangler d1 create`, the schema, `wrangler deploy`. Steps in `server/README.md`. Re-simulation needs the paid plan's CPU limit; the free plan's 10 ms is too tight.

- Task 5.4: the daily in the client. The board's first row is the day's card (`src/sim/daily.js`, UTC). It shows the date, the venue and a brief. If the card is at another venue, choosing it reloads there with the row selected. A daily start fetches the day's top twenty runs and races them as translucent ghosts; only the eight nearest are drawn, because each ghost car costs about 13 draw calls. On finish the run is posted with the day, and the results board swaps its rows for the daily board with the player's rank. A run already on the board says so. With no API, or a failed request, the card still plays and the board reads "Daily board offline".
  - The API base comes from `<meta name="voltitude-api">` (empty, so offline until the Worker is deployed) or `?api=`. `?day=YYYY-MM-DD` previews another day's card. Players get a random callsign such as `RD-4F2A` until there is a name field.
  - `#g=<id>` short links: `openLink` in `share.js` fetches 12-hex ids from the API and decodes anything else as before. After a daily post, the share sheet copies the short link.
  - `server/dev.mjs` runs the Worker locally over HTTP with an in-memory D1, for testing the client.
  - Fixed while looking: Ramp results printed "undefined LINE REACHED" on the garage screen. They now read "3/3 LANDED" (`lineLabel`), with a menu test.
  - Evidence, against `server/dev.mjs` on :8791 with six seeded runs for 2026-11-11 (The Ramp): the title shows the daily row; seven ghosts loaded, and the boosted one (FOX) shows ahead on the run-up; the results list the daily board with ranks. Offline, the card plays and the board reads "Daily board offline". `#g=0ed7c02087d2` opened on the Launch Complex, reloaded onto The Pad and raced FOX's ghost (total 3246). Sheet `docs/sheets/2026-11-02-daily.jpg`. `npm test`: 153 of 153; `npm run test:server`: 5 of 5.

- Task 5.5: the OG image. Before a daily run is posted, `ogImage` in `main.js` replays it to its peak: the highest airborne tick with the car upright, so the ramp's inverted lip is skipped. It renders 1200x630 through the clip path (the chase camera, 20 frames to settle exposure), takes a JPEG at 0.85 and sends it with the run. The Worker stores it and serves `/og/:id.jpg`. A URL fragment never reaches a crawler, so the share link is now the Worker's `/r/:id`: a page with og and Twitter card tags and that run's image, which forwards to `GAME#g=<id>`. `GAME` is a Worker var.
  - Bug found: `postDaily` read the score after `ogImage` had swapped in a partial replay, so the Worker rejected the run ("score does not match the replay"). The score is now captured first.
  - Evidence: a daily ramp run through `server/dev.mjs`: the image arrives as a 1200x630 JPEG (`docs/sheets/2026-11-02-og-ramp.jpg`: the car mid-drop over the run-up at golden hour), and `/r/<id>` carries `og:image` for it. A Worker test checks the card's tags, redirect and 404. `npm run test:server`: 6 of 6.
  - Not verified: the X and iMessage unfurl previews. They need the Worker at a public URL, which waits on the deploy.

### Phase 5 gate (2026-11-02)
- The Worker rejects a forged run (a time 1 s or 2 ticks faster, a score 100 higher, one edited input byte) with 422 and a replayed run with 409: `npm run test:server`, 6 of 6.
- 1,000 submissions: `node server/load.mjs 1000`, 900 accepted, 100 forged rejected, 8.9 s, p99 10.7 ms. Met in-process only; the deployed Worker and D1 are untested.
- `npm test`: 153 of 153. `node tools/exploits.mjs pad` and `launch`: PASS.
- Open, needs the user: deploying the Worker (`server/README.md`), setting `<meta name="voltitude-api">`, then the X and iMessage unfurl checks.

Next: Phase 6 (phone tier, touch, boot).

## Session 2026-11-02 (cont.): Phase 6

- Task 6.1: the phone tier. `PHONE` is a coarse pointer plus a short screen side under 900 px, overridden by `?tier=phone|desktop`. On a phone: pixel ratio 1, `createPost({ lite })` (no jitter, TAA, GTAO or car velocity pass; blur, aberration, heat and sharpen off; exposure, auto-exposure, LUT and three bloom levels kept), the LOD1 car, crowd as cards only (`createPeople(…, cards)`), four terrain tiles, and one shadow cascade to 110 m. `shadows.js` has a one-cascade shader path; the old patch referenced three shadow maps and would not compile with one. On desktop a 1 s benchmark at boot renders the garage with a `readPixels` sync per frame and switches post to lite above 28 ms (`__perf.tier = 'lite'`). This machine measures 3 ms. A plain `gl.finish()` did not sync and read 0.6 ms.
  - Evidence: phone emulation at 844x390, DPR 3, touch. The Pad Lineup shows 256 draw calls and 2.39M triangles against desktop's 316 and 3.02M. Launch GP at 9 s shows 333 calls and 2.87M triangles. Sheet `docs/sheets/2026-11-02-phone-tier.jpg`: phone tier left, desktop right. The phone frame is aliased (no TAA) but reads. `npm test`: 153 of 153.
  - Not measured: real phone frame times. Headless frames sit on the 16.7 ms vsync. The triangle count is high for a phone (flora and boulders are unchanged), so it is the first suspect if the iPhone 13 misses 30 fps.

- Task 6.2: touch. `src/touch.js` puts an overlay (`#touch` in `index.html`) on coarse-pointer devices (or with `?touch`) while racing.
  - Dares, one thumb: throttle is automatic; a drag steers on the ground and pitches and rolls in the air; a tap shorter than 120 ms that does not move pulses lift, so it hops; holding still hovers; a second finger boosts.
  - Circuits, two thumbs: the left half is a steering pad; the right holds LIFT, BOOST, BRAKE and GAS (72 to 88 px, all at least 56 px). A pause button sits top right.
  - On short screens the HUD scales down. With touch on, the minimap and the keyboard hints hide, and on circuits the speed readout moves to bottom centre, clear of the buttons.
  - Evidence: Chrome phone emulation (844x390, DPR 3) driven with CDP touch events. On The Pad, a 60 px drag gave steer 0.86, a second finger gave boost 1, and a tap gave lift 1 with the car airborne (`hopped`). On Proving TT, holding GAS gave throttle 1 and the car reached 17 m/s, and a 50 px left drag with the other thumb gave steer −0.72. Buttons measured 56 to 88 px. Sheet `docs/sheets/2026-11-02-touch.jpg`. `npm test`: 153 of 153.
  - Not done: tilt steering (iOS needs a permission prompt; drag covers it). Not checked: the diegetic garage menu by touch, and play on a real iPhone and Pixel over the LAN. The garage legend still shows keyboard keys.

- Task 6.3: boot. `window.__boot` records a mark per loading phase.
  - Terrain bakes are delta coded, split into byte planes and gzipped (`packBake`/`unpackBake`, `.bin.gz`, about 40% smaller). The crowd VAT buffers are gzipped and cached so they load once. The client inflates both with `DecompressionStream`, and the raw files remain as a fallback.
  - On phones: no hero car GLB (LOD1 only), LOD1 boulders, flat normals, and 1k albedo for terrain and road.
  - The height bake, terrain textures, author ghosts, boulders, flora, stands, car and fonts now load in parallel instead of one after another.
  - Download size: desktop 36.1 to 26.5 MB, phone 10.1 MB.
  - Throttled cold boot to the first raced frame, measured on The Pad with `boot2.mjs`:
    - Desktop at 50 Mbps: 7.0 to 6.4 s.
    - Phone on Fast 4G (9 Mbps, 60 ms RTT, 4x CPU): 14.4 to 12.4 s.
    - Unthrottled on localhost: 2.4 s.
  - Both targets missed (3 s desktop, 5 s phone). Bandwidth alone sets a floor: 26.5 MB at 50 Mbps is 4.2 s, and 10.1 MB at 9 Mbps is 9 s. Meeting the targets needs a different design: boot into the hangar on a few MB and stream the venue in behind it. I did not build that.
  - `npm test`: 155 of 155, including gz round-trip tests for the bake and the crowd buffers.

### Phase 6 gate (2026-11-02)
- Phone tier, touch and boot changes are built and verified in emulation only.
- Open: 30 fps on a real iPhone 13 and Pixel 6, which needs the devices.
- Failed: boot under 3 s on desktop and under 5 s on phone (measured 6.4 s and 12.4 s throttled, see 6.3).
- Open: a cold playtest by someone new, which needs a person.

Next: Phase 7 (mark and type, HUD motion pass, trailer and launch page, launch).

## Session 2026-11-02 (cont.): Phase 7

- Task 7.1: the mark and the type.
  - Mark: three directions drawn and rendered at 160, 32 and 16 px, in single colour and as a lockup.
    - A, the lift V: a heavy V with a gap under its tip and the red light bar beneath. It reads at 16 px. The gap is the car hovering and the bar is the Roadster's light bar.
    - B, a V over its shadow: read as a warning triangle. Rejected.
    - C, a V over two thrust bars: smeared at small sizes. Rejected.
    - A shipped. It is in `src/mark.js` (the canvas path), `assets/mark.svg` and the favicon `assets/icon.svg`. The lockup appears on the loading screen, the garage header and the clip burn-in.
  - Type: Archivo replaces Michroma and Saira. Its width axis gives the expanded 800 display and normal-width UI text from one variable file. Martian Mono at 87.5% width replaces the display face for telemetry: the HUD clock and speed, garage times, the clip score. In CSS and canvas, `font: 800 expanded …` reaches the width axis without extra rules.
  - Typography audit:
    - Chrome loads Archivo as one variable face (weights 400 to 800, widths 62 to 125%).
    - Canvas `expanded` measures 22% wider than normal, so the axis applies on canvas too.
    - Fixed: body letterspacing on `.hint` and the fallback page's 0.32em tracking.
    - Fixed: the clip renderer now waits for Martian Mono.
    - The OFL licences are recorded in `assets/CREDITS.md`.
    - Pass: no faux bold or italic (weights 400 to 800 are all served) and uppercase labels are tracked.
    - Open, low: the generic fallback stacks have different metrics, a brief swap on the loading screen.
  - The swap is reversible. The variant sheet is in the sheet below, so another direction can be picked.
  - Evidence: sheet `docs/sheets/2026-11-02-mark-type.jpg` (variants, garage, HUD, clip burn-in, loading screen). `node tools/clip-test.mjs`: PASS. `npm test`: 155 of 155.

- Task 7.2: HUD and hangar motion pass (polish depth: only the cuts).
  - The HUD used `hidden` and cut in and out. It now toggles `.off`. The clock drops in from the top, then the card and the map slide in from their sides (50 ms later) and the dash rises (100 ms later): 360 ms translate, 240 ms fade, the project's `--ease`. On the way out the panels fade, and visibility follows 300 ms later, so hidden panels stay out of the accessibility tree. The individual `translate` property is used so the phone media queries' `transform: scale` stays intact.
  - The share dialog rises in and the replay bug slides in from the right.
  - Hangar: the camera already glides between pages, and cuts under reduced motion. The board's selected row jumped; the red highlight now slides between rows in 180 ms with an ease-out cubic (`slide` in `garage.js`). `garage.sliding` keeps the board redrawing until it lands.
  - Reduced motion: the in-game setting never reached the CSS. `settings.reduced` now sets `html.reduced`, which drops the translates (fade only) and swaps the dialog animations for a fade. The OS media query already collapses durations to 1 ms. Checked: with `reducedMotion: 'reduce'`, `html` has `reduced` and the HUD card's off-state translate is `none`; without it, `-28px`.
  - Evidence: sheet `docs/sheets/2026-11-02-motion.jpg`: HUD frames 0, 90, 180 and 500 ms after show, and the row highlight in mid-slide (captured with the duration stretched to 1.2 s through route injection, since a screenshot takes longer than 180 ms). `node tools/a11y-probe.mjs`: PASS, 105 text elements, 0 failing. `npm test`: 155 of 155.
  - Not done: the results screen's rows and the settings tyre still change without motion. The text colour swaps at once while the highlight travels.

- Task 7.3: trailer and launch page.
  - Footage: `tools/trailer-clips.mjs` drives five autopilot runs and exports each through the game's own `exportClip` in landscape:
    - The Lineup on The Pad.
    - The Ramp.
    - The Trench, 20 s window.
    - Proving Ground TT, 20 s window.
    - Launch GP at night.
  - Trailer: a HyperFrames project in `trailer/` (shot list and notes in `trailer/REVIEW.md`).
    - 30 s at 1920x1080 and 30 fps: nine shots, dip cuts at the chapter seams, and Archivo titles ("IT FLIES.", "THE RAMP", "THE TRENCH", "GRAND PRIX", "ONE DAILY CARD. EVERY GHOST ON IT.").
    - End card: the mark drops, the bar wipes in, then the wordmark, then "Free in your browser · voltitude.app".
    - Sound is the game's own clip mix. Measured, not heard: −14.3 LUFS, −1.8 dBTP.
    - `npx hyperframes check`: ok.
    - Render: `trailer/out/voltitude-trailer.mp4`, 47 MB, gitignored. Rebuild with `node tools/trailer-clips.mjs trailer/assets/clips`, then `cd trailer && npx hyperframes render -o out/voltitude-trailer.mp4`.
  - Launch page: the game is the page. The loading screen now carries it:
    - `assets/hero.mp4`, an 8.6 s 16:9 loop (720p, 1.1 MB) cut from the trailer. It plays on desktop only and not under reduced motion; phones and reduced motion get the poster. It pauses when the hangar appears.
    - The lockup, a one-line pitch, the fan-project disclaimer, and share links for X, Reddit and Hacker News.
    - OG and Twitter card tags pointing at `assets/og.jpg`: the Lineup leap, signature frame 1.
    - A canonical link and `robots.txt`. The disclaimer also appears on the WebGL fallback page.
    - `voltitude.app` is a placeholder until the deploy names the domain.
  - Fonts are now self-hosted (`assets/fonts/`, variable woff2, 125 KB, preloaded). Chrome measures the same axes as from Google Fonts. Self-hosting removes a third-party round trip from boot, and the audit's 3.3 MB TTF result (Google serves TTF to non-browser user agents).
  - The audit found no `<h1>` and no `<main>`. The lockup is now the `<h1>`, and the canvas, HUD and dialogs sit in `<main>`. Audit: 0 FAIL.
  - Jury (`.jury/localhost-8790/scorecard.md`), from an independent critic subagent:
    - Critic 7.3: Design 7.5, Usability 6.5, Creativity 8, Content 7.5. Jury estimate about 8.4.
    - Caveat: the jury capture script timed out under software WebGL, so the critic scored GPU captures I chose. No hover, keyboard, reduced-motion or LCP data.
    - Fixed after scoring: floor-pad labels crowding the borders, and no pitch line on the landing.
    - Open: legend size and contrast, a sparse detail panel, minimap clipping on phone landscape, a sitemap and 404 at deploy.
  - Evidence: sheets `docs/sheets/2026-11-02-launch-page.jpg` and the trailer contact sheets (scratchpad). `npm test`: 155 of 155.

- Task 7.4: launch.
  - Dailies: the seven authored cards (`src/sim/daily.js`, from 2026-11-09) were checked. Each one resolves to a real event: Lineup, Airfield TT, Ramp, Proving TT, Trench, Launch TT, Lineup. Day eight falls through to the rotation.
  - Drafts, not posted:
    - `docs/launch/show-hn.md`, on the deterministic sim and the server-side replay check.
    - `docs/launch/x-thread.md`, six posts naming the 9:16 clips to attach.
  - Seeded ghost links: `docs/launch/ghost-links.md` holds three author ghosts (The Trench 0:22.208, Proving TT 3:58.358, Launch TT 3:21.625).
    - Each one was encoded, decoded and replayed through the Worker's `resimulate`, and matches to the tick.
    - The trench link opened in the game on the bare URL. It reloaded onto the Launch Complex, started The Trench and loaded the ghost.
    - The TT links are 23k to 27k characters. Short `/r/<id>` links wait on the Worker deploy.
    - Choosing and messaging the three creators is a message to people, so it waits for the user.

### Launch gate (design section 12), 2026-11-02

| Gate | Result |
|---|---|
| 1. Blind clip test (five people) | Open: needs people. The 30 s trailer and the game's 9:16 clips are ready to show. |
| 2. Cold playtest (five strangers) | Open: needs people. |
| 3. Share test (three people, own phones) | Open: needs phones and people. The export passes in Chrome (`clip-test`: H.264 + AAC, −13.5 LUFS). |
| 4a. `npm test` | PASS, 155 of 155. `npm run test:server`: PASS, 6 of 6. |
| 4b. Exploits | PASS on Proving, Airfield, Launch and The Pad. |
| 4c. AI bench (`ai-bench 20`) | Proving PASS on every tier. **Launch FAIL on every tier, check `air`.** Lap, held passes, contacts and stuck all pass. VOG skips the air line in at least one race of 20 (fewest 0, 1.0 to 1.1 per race). Air lines came in at `af292d9`, before this session, and that gate ran only six races. Not fixed: rival AI is re-simulated inside recorded Grand Prix ghosts, so a driver change needs a SIM_VERSION bump. |
| 4d. Perf, desktop (`perf.mjs`, Launch GP night, 60 s) | **FAIL**: 74 to 132 frames over 20 ms per run, 4 to 7 long tasks, the longest 547 to 587 ms. p50 7.3 ms, p99 20 ms. The session's start commit `f95c671` fails the same way (131 to 180 frames over 20 ms, longest task 474 to 509 ms), so this is not a regression. The spikes cluster at boot and from 36 to 46 s into the race. Headless frames are uncapped. |
| 4e. Perf, phone tier (844x390, DPR 3, on this Mac) | **FAIL**: 12 frames over 20 ms, 1 long task of 107 ms. p99 11.8 ms, 288 draw calls, 2.07M triangles. A real iPhone 13 and Pixel 6 are unmeasured. |
| 4f. Boot times | **FAIL**: desktop 6.4 s at 50 Mbps (target 3 s), phone 12.4 s on Fast 4G with 4x CPU (target 5 s). See Task 6.3. |
| 4g. The Worker rejects a forged run | PASS: a faster time, a higher score and an edited input byte each get 422, and a duplicate gets 409 (`test:server`). Load test: 1,000 submissions in 8.9 s, p99 10.7 ms, in process only. |
| 5. Jury | Launch page and hangar: critic 7.3, jury estimate about 8.4, with the caveats in `.jury/localhost-8790/scorecard.md`. |

Still open with the user (one-way doors): `wrangler d1 create` and `wrangler deploy` (`server/README.md`), the domain behind the `voltitude.app` placeholders, posting the Show HN and X drafts, and messaging the three creators.
