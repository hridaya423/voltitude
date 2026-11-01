# Voltitude: the plan to make the internet stop scrolling

Date: 2026-11-01. Written after a gather pass and a baseline capture of the build at `c9c9899`.

The implementation plan is `docs/plans/2026-11-01-shook-plan.md`. It replaces the open items of `2026-10-28-thruster-festival-plan.md`. Everything that plan shipped stays.

## 1. Where the build is

The user's verdict: "very mediocre". The capture agrees. Evidence: `docs/sheets/2026-11-01-baseline-race.jpg` (25 autopilot frames across three venues, day and night) and `docs/sheets/2026-11-01-baseline-menu.jpg`.

Scored against the visual scorecard in the `threejs` games reference (0 placeholder, 1 basic styled, 2 premium, 3 showcase):

| Category | Score | What the frames show |
|---|---|---|
| Art direction | 1 | The theme is flags, banners and kerbs. Nothing in a frame says "rocket test range". The mesas are smooth blobs. |
| Hero car | 1.5 | A real 2026 Roadster, but decimation facets show on the body in the garage and on every rival. Paint reads flat. Rivals at distance look like clay. |
| Rivals and hazards | 1 | One silhouette in eight liveries. |
| Rewards | 1.5 | Gate rings and gas toasts. No object the player wants. |
| World | 1.5 | A circuit kit on a heightfield. Fence, flag line, grandstand, repeat. No mid-ground, no landmark. |
| Materials | 1.5 | Flat asphalt, plain concrete, generic banner type. No rubber, no wear, no dust. |
| Lighting | 2 | The pipeline is strong (TAA, GTAO, motion blur, auto exposure, cascaded shadows, LUT). The art is not: a washed midday HDRI, low contrast, no haze, no golden hour. |
| VFX | 1.5 | Boost plumes and a little dust. No landing dust, no sparks, no downwash. |
| UI | 2 | Readable plates. Generic type. No mark. |
| Performance evidence | 3 | Perf traces, shot-match, exploit and AI benches. The best part of the repo. |

Average 1.65. The repo's own bar is Forza Horizon 6 in a blind 30 s clip test. The gap is not the renderer. It is art direction, world authorship, the hero at close range, and the fact that the special thing (sticking to walls, flying) fills a tenth of screen time. In the 25 frames the car is simply driving in 23 of them.

Root causes, not symptoms:

1. The venues are race circuits. Flight is a sector, not the game.
2. The world has no authored landmarks and no skyline. The facility fiction lives in the README.
3. The car model was decimated at UV seams. It looks scanned, not built.
4. Light is physically right and artistically flat. Nobody chose a time of day.
5. There is no signature image. There is no mark.

## 2. What "the whole internet shook" needs

Three facts about viral browser games, from the cases checked this session:

- Slow Roads (three.js, October 2022) hit a reported one million players in two weeks on one feeling and zero friction: no login, no install, no fail state. Sources: Jalopnik, Prima Games, the web.dev case study.
- PolyTrack grew on a Trackmania shape plus a track editor plus leaderboards and replays, and on being playable anywhere, including school networks. Sources: Kodub's itch.io devlog, karura.subsquare.io.
- The Tesla Roadster reveal on 2026-10-15 at McGregor, Texas was itself the viral clip: the car drove up a curved ramp, held on upside down with its fans, barrel-rolled off with cold-gas thrusters, then hopped over a lineup of a Cybercab, a Cybertruck, a Semi, a Model Y and a Model 3. Tesla's Lars Moravy quoted ten thrusters on 600 litres of compressed air and 2 g of suction. Sources: InsideEVs, Aviation Week, TheNextWeb, Live Science.

So the pitch is one sentence: **the Roadster reveal, but you are driving.** The first sixty seconds recreate the three stunts the internet already watched. Then the game opens into a stunt range where the fastest line is three-dimensional.

The product has to produce the clip itself. A game that goes viral is a camera. Every run ends with a 9:16 video the player can post in one tap, and a link that lets a friend race the ghost.

## 3. Decisions

| Question | Decision | Why |
|---|---|---|
| Name | Voltitude stays. | It is owned, it is not a Tesla mark, and the repo is public under it. |
| Look | Photoreal, at the Forza Horizon bar. Not stylized. | The clip must pass as footage of the real demo. Polyfork's flat-shaded style would make it a toy. |
| Default time of day | Golden hour. Night stays for Grand Prix. | Long shadows and dust haze read as cinema. The reveal was at dusk under floodlights, so night is the second look. |
| First thing built | The Lineup dare on its own oval, "The Pad". | It is the most watched stunt, it is 30 s long, it is endless, it is one-thumb on a phone, and it produces the clip. |
| Share loop | Clip export (WebCodecs, MP4) and ghost links. Then a Cloudflare Worker for daily boards. | The clip is the viral unit. The ghost link is the "beat this" unit. The board is the retention unit. |
| Backend | One Cloudflare Worker with D1. The Worker re-simulates every submitted run with the same deterministic sim before it accepts a time. | The sim already runs headless in node. Server-side validation is cheap and is itself a story for the launch post. |
| Assets | Poly Haven (CC0) for props, rocks and desert plants. Blender for landmarks and the lineup vehicles. Scenario only for the 1950s pickup. Polyfork: none. | See the asset board in section 8. |
| Phone | A phone tier ships before launch, with touch controls for the dares. | A game that cannot be opened from a TikTok link cannot go viral there. |
| Trademarks | No Tesla marks or logos anywhere. The lineup vehicles are fictional silhouettes in festival liveries ("a robotaxi, a pickup, a semi"). The car model's licence is checked before launch. | Fan project. One takedown ends the launch. |

## 4. Pillars

The four from the festival design stay. One is added.

1. Air is the point.
2. Earned, not rationed.
3. A test range, not a racetrack. Every chase frame shows hardware, dust and heat.
4. Clear at 300 mph.
5. Every run ends with a clip. The game is a camera.

A feature that serves no pillar is cut.

## 5. The product in three layers

### Dares

Scored challenges of 20 to 60 seconds. Each one recreates a reveal stunt, then escalates past it. Each has a daily seed, a global board and a clip.

**The Lineup.** The Pad is a 1.4 km oval with two banked turns. A kicker sits on the front straight. Behind it stands a line of vehicles. Clear the line and land clean: the line grows by one on the next lap. Touch a vehicle: the run ends. Fly low over the roofs and the near-miss rule pays gas. Fly high and you are safe but poor. A barrel roll over the line doubles that clear. A flip triples it. A hard landing keeps the count and resets the multiplier. Score is vehicles cleared. The first clear is in the first fifteen seconds.

**The Ramp.** The reveal ramp: a quarter pipe that curls to a ceiling. Drive up, hold on inverted, leave the lip, roll out, land on the wheels. Three attempts. Scored on landing alignment, speed kept, and rolls counted. The Pad gets the ramp on its back straight.

**The Trench.** A flame trench under a test stand. Thirty seconds, six gates, two of them inverted on the trench ceiling. Time attack.

**Wall of Death.** The Launch Complex tank-farm wall. Hold the wall at speed for as long as the gas lasts, then cash it in on the final jump. Scored on wall time and the length of the last flight.

### Grand Prix and Time Trial

The three venues stay and get the range treatment in Phase 4. Nothing in their rules changes in this plan. The AI and the economy are done.

### Daily

One card a day, 00:00 UTC, the same seed for everyone. It alternates dares and time trials. The board shows the top one hundred. The top twenty ghosts download and run beside you as translucent cars. A player who finishes gets a clip, a ghost link and a rank.

## 6. The signature frames

The art pass is judged on five fixed frames. Each has a camera that `tools/shot-match.mjs` can reproduce. They are the trailer, the OG image and the App Store shot, so they are built first and everything else fills in behind them.

1. **The leap.** Low rear three-quarter, the car two metres above the lineup, four white cold-gas puffs, golden sun through dust, phone lights in the stand behind.
2. **Inverted.** The car on the ramp ceiling, its shadow on the road below, the horizon upside down.
3. **The wall at night.** The tank-farm wall-ride under floodlights, light shafts in the haze, the light bar streaking.
4. **The grid.** The start line with the test stand and the tank farm on the skyline, heat shimmer on the straight.
5. **The hangar.** The garage hero with the real door open onto frame 4.

## 7. Art direction

**Fiction.** A private rocket test range in the high desert that hosts a flight festival once a year. Vertical test stands with flame buckets, a horizontal engine stand with a flame trench, a tank farm of white horizontal tanks with pipe runs, a water tower, propellant tankers, generators, light masts, catch fences, concrete K-rails, container stacks, antenna masts. A tall silver rocket on a transporter as the skyline anchor. Dry scrub, Joshua trees, boulders.

**Light.** Golden hour as the hero: sun at 8 to 12 degrees, warm key, blue fill from the sky, dust haze that separates every plane, long shadows across the straight. Night: LED floodlight heads (already built), light shafts, phone lights, the red light bar.

**Palette.** Ano white paint, the red light bar, black asphalt with grey rubber, ochre desert, steel-grey hardware, warm floodlight, cyan for gas in the UI and nowhere else.

**Car.** The 500k source rebuilt with smooth normals and seam-aware decimation so no facet shows at any distance. Dynamic reflections from a cube camera that follows the car. Flake in the paint. Dust that builds on the lower body during a run and washes off on a restart. Cold-gas plumes as refracting white vapour with ice sparkle, not fire. Downwash dust when the down thrusters fire near the ground.

**World rules.** Every chase frame holds at least one piece of range hardware in the mid-ground. Nothing repeats within 200 m along the track. Props are placed by screen time (the `festivalSites` scorer already does this).

**UI.** A mark. One display face with real character and one mono face for telemetry. The HUD is a broadcast overlay with motion, not plates. The menu is the hangar.

**References kept from the gather pass**, each with the one thing to take:

- The reveal footage (2026-10-15, McGregor): the ramp geometry, the puff of each thruster, floodlit dusk, the crowd on phones. Take the stunts and the light.
- Forza Horizon 5 Mexico desert: how a festival dresses a desert without clutter, how golden hour is used as the default. Take the time of day and the prop density.
- F1 TV broadcast graphics: the timing tower, the sector colours, the replay bug. Already borrowed. Take the motion: nothing cuts, everything slides.
- Trackmania (2020): one timer on screen, medals, author ghost, instant restart. Take the restraint.
- SpaceX McGregor photographs (public): test stands, flame trenches, tank farms, the water tower. Take the silhouettes for the Blender kit.
- recent.design, Websites tab (seen 2026-11-01): the current taste is dark hero, one huge display word, one accent. Take it for the launch page only.

Galleries that could not be read this session and stay unchecked: Inspora (client-rendered, empty headless), Supahero (now a hero library for apps, not useful here), Collect UI.

## 8. Asset board

The user's skills list two catalogues. Both were checked against the catalogue APIs this session.

**Polyfork** (polyfork.dev, free tier, commercial use, no attribution, no redistribution). Every asset is flat-shaded vertex-colour low poly on one material. The hero renders (`docs/sheets/2026-11-01-polyfork.jpg`) confirm it: a toy look. It cannot sit next to a photoreal Roadster. Useful parts, for the record, in case the look ever pivots: the stadium kit (grandstand-seating-run, stand-roof-run, press-box, scaffold-camera-platform, players-tunnel, spectator), the space-base kit (fuel-tank, horizontal-tank, antenna-mast, floodlight-mast, surface-pipe-run, shuttle-hangar), the roadside-americana kit (semi-tractor, water-tower, joshua-tree, saguaro-cactus, mesa-backdrop, tyre-stack), the construction-site kit (site-lighting-tower, site-generator, crash-barrier-run, mesh-site-fence-run). Decision: not used.

**Scenario 3D Collection** (Hugging Face `scenario-labs/3d-collection`, 1,342 items, CC BY 4.0, credit "Scenario"). The metadata parquet was filtered for range props. 48 hits, nearly all cartoon or stylized (pirate lighthouses, toy food trucks, palm trees). Usable: `ed7933642f6bab81` (a 1950s pickup truck, GLB and .blend) for the paddock, and `scenario:asset_BS4GzCyvKhEUwB2mBYvNNzBm` (a scout drone) as a drone-show body. Each must be opened in Blender with auto-run scripts off, checked for baked lighting, and decimated. Decision: the pickup, maybe the drone. Nothing else.

**Poly Haven** (CC0, PBR, already the source of the skies and terrain sets). 521 models; 220 outdoor or industrial. The picks for the range kit:

| Need | Poly Haven asset ids |
|---|---|
| Barriers and fences | `concrete_road_barrier`, `concrete_road_barrier_02`, `modular_chainlink_fence`, `old_tyre` |
| Industrial | `modular_industrial_pipes_01`, `modular_pipes`, `portable_generator`, `propane_tank`, `small_lpg_tank`, `overhead_crane`, `utility_box_01`, `power_box_01`, `modular_electricity_poles`, `street_lamp_01`, `security_light`, `security_camera_01`, `caged_hanging_light`, `portable_welding_cart`, `old_military_compressor`, `metal_jerrycan`, `barrel_03`, `plastic_crate_03`, `cardboard_box_01` |
| Desert ground cover | `namaqualand_boulder_02` to `_06`, `namaqualand_boulders_01`, `namaqualand_cliff_01`, `namaqualand_rocks_01`, `namaqualand_stones_01`, `dead_quiver_branch_01`, `dead_quiver_trunk`, `quiver_tree_01`, `searsia_burchellii`, `searsia_lucida`, `wild_rooibos_bush`, `didelta_spinosa`, `othonna_cerarioides`, `bark_debris_01` |
| Paddock | `hand_truck`, `metal_tool_chest`, `metal_toolbox`, `ladder_sectioned_01`, `industrial_storage_cart`, `korean_fire_extinguisher_01` |

Everything else in the fiction (test stands, flame trench, tank farm, water tower, rocket on transporter, light masts, gantries, the lineup vehicles, the ramp) is built in Blender by scripts under `tools/range/`, the same way `tools/car/` builds the Roadster. Joshua trees are built procedurally from the vegetation reference in the `threejs` skill.

**Sketchfab** (per-asset CC BY or CC0): a fallback for a rocket hero if the Blender build stalls. Each asset's licence is recorded in `assets/CREDITS.md` before it ships.

**Code and libraries**

| Need | Pick | Status |
|---|---|---|
| MP4 muxing for clips | mp4-muxer (MIT, about 15 KB) vendored under `rl/vendor` | add |
| Video and audio encoding | WebCodecs `VideoEncoder` and `AudioEncoder` | native |
| Ghost link compression | `CompressionStream('deflate-raw')` | native |
| Daily boards, ghosts, OG images | Cloudflare Worker with D1 | add, `server/` |
| Sky and aerial perspective | The LUT example under the `threejs` skill's atmosphere reference | copy source, licence unknown, verify before ship |
| Plumes, dust, sparks | The `threejs` procedural VFX reference, built on the existing `fx.js` pool | copy patterns |
| Fonts | Google Fonts, pairing chosen in Phase 7 | keep |
| UI framework | None. Plain DOM and CSS, as today. | keep |

No component library from the UI galleries fits a WebGL game HUD. The UI tokens worth stealing are the spring and ease values in `gather`'s effect sourcing notes, for the HUD motion pass.

## 9. Share loop

**Clip.** The results screen offers one button: Share clip. The game re-simulates the last 10 s of the recorded inputs with the broadcast director, renders off-screen at 1080x1920 (or 1920x1080) at 60 fps, encodes H.264 with WebCodecs, mixes a music bed and the run's stingers offline, muxes to MP4 and hands the file to `navigator.share` on a phone or a download on a desktop. The mark, the score and the ghost link are burned into the last second. A 10 s clip must export in under 20 s on a 2020 laptop.

**Ghost link.** The input stream (6 bytes per tick at 120 Hz) is delta-coded and deflated. A 60 s run compresses to a few kilobytes. The link is `voltitude.app/#g=<id>` when the Worker is up and `#g=<base64url>` when it is not. Opening it loads the venue, shows the ghost, and starts a countdown.

**Board.** The Worker accepts a run only if its own simulation of the inputs reproduces the claimed time within one tick. The sim is deterministic and shared, so this costs nothing to build and makes cheating a matter of beating the physics.

**OG image.** The client uploads a 1200x630 JPEG of signature frame 1 at the moment of the run's best clear. Every shared link unfurls as a real frame of that run.

## 10. Platform

- Desktop WebGL2 at 60 fps on an M1 MacBook Air and a 2020 Intel iGPU laptop at the low tier. The existing perf gate (no frame over 20 ms, no long task over 50 ms) stays.
- Phone tier: iPhone 13 and Pixel 6 at 30 fps in the dares. DPR 1, no TAA or GTAO, one shadow cascade, the LOD1 car, crowd as cards, post reduced to exposure, LUT and bloom.
- Touch: one thumb for the dares (tap hop, hold hover, tilt or drag to steer). Two thumbs for circuits.
- Boot to driving under 3 s on a desktop cold cache and under 5 s on a phone. Today it is 4.0 to 6.4 s.

## 11. Launch

- A 30 s trailer cut from the five signature frames and the clip pipeline itself, so the trailer is footage, not a render.
- The game is the landing page. The OG image is frame 1.
- Day one: a "Show HN" post on the deterministic sim and the server-side replay validation, an X thread of the 9:16 clips, r/teslamotors, r/webgames, r/threejs, and seeded ghost links to three Trackmania and Rocket League creators.
- The first seven dailies are authored before launch.
- Timing: the Roadster is in the news until 2028. The clip is the hook, not the date.

## 12. Gates

Each phase has its own gate in the plan. The launch gate is all of these:

1. **Blind clip test.** Five people rate 30 s clips of Voltitude, Forza Horizon 6 and a mid-tier racer for "looks AAA" and "want to play". Pass: within 2 points of Forza on "want to play", and clearly above the mid-tier racer on both.
2. **Cold playtest.** Five strangers, no instructions, 15 minutes. Pass: everyone clears the Lineup once in 2 minutes, three name flight as the best part, three say they would send a clip to someone, nobody finds a soft-lock.
3. **Share test.** Three people export a clip on their own phone and it plays in the native player and uploads to one social app.
4. **Hard gates.** `npm test`, exploits, AI bench, perf on desktop and phone, boot times, the Worker rejects a forged run.
5. **Jury.** The `jury` skill scores the launch page and the hangar.

## 13. Risks

- **Trademark.** Mitigated by section 3. Residual: the Roadster shape itself. A fan project disclaimer stays in the README and the footer.
- **Scope.** This is a solo project with agents. The order in the plan is a priority list. Phase 1 plus Phase 2 is a shippable product on its own. Every later phase improves a shipped game.
- **WebCodecs.** H.264 encode is in Chrome, Edge and Safari 16.4 and later, and in Firefox 130 and later. The fallback is WebM with VP9, and the last fallback is a GIF of 3 s.
- **Phone GPUs.** The car and the post stack are desktop-sized. The phone tier is its own phase with its own gate, not a settings toggle.
- **Asset licences.** The Roadster GLB from Sketchfab has an unrecorded licence in the repo. It is checked and recorded before any launch material goes out.

## 14. Open calls for the user

The plan proceeds on the decisions in section 3. Three of them are taste and can be overturned without waste:

1. Golden hour as the default look, with night for Grand Prix.
2. The Lineup before any further circuit work.
3. A Cloudflare Worker for boards and ghosts, which is the only server in the project.
