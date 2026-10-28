# AAA rebuild: plan

Date: 2026-10-28. Written after the user's playtest verdict: "it isn't at a good stage".

## Decisions (user, 2026-10-28)

- Game format: Grand Prix against 7 AI Roadsters, 3 laps, with Time Trial as a second mode.
- Car: a bespoke Blender build, modelled by the lead agent itself, matched to the reveal photos as closely as pixel overlay allows. No subagents for the car.
- Starman is dropped. No driver in the seat.
- Menu: lives on physical objects in the pit garage (LED board, floor markings, a tyre-warmer screen), with the camera moving between them. This replaces the Starman visor idea in workstream 7.

## The verdict, traced to code

| Complaint | Root cause |
|---|---|
| Car looks like slop | One 2048 texture over the whole car, and a lumpy scan-like source mesh. Cleaning a bad source cannot make a good car. |
| Gas is always full | The compressor refills 12.5%/s, 25%/s when coasting. Boost cannot drain the last 15%. There is no economy. |
| You can just fly off | Hover thrust is 13 m/s² against 9.81 m/s² gravity. The car out-thrusts its own weight. |
| The hop is unrealistic | An instant upward impulse with no wind-up, no suspension load and no cost that matters. |
| The loop looks fake | A 26 m wide road bent into a circle reads as a drum. Real loops are narrow, teardrop shaped and offset sideways. |
| The crowd looks fake | Shader silhouettes on flat planes. |
| The timing tower is pointless | Ghosts do not race. Positions mean nothing alone. |
| Tracks do not loop | Every course is point to point. No laps. |
| The world feels noisy | 140 random screen streaks, LED strips everywhere, red bars on every structure. |
| The world feels low-res | A 362 KB JPEG sky, a 1k HDR for reflections, 6 m terrain cells, 2k tiling textures. |

## The bar

The ECHO menu (Ultra Ultra), shared by @WarmPlatypus. One extreme close-up of an eye. The menu exists only as a reflection on the cornea. The eye looks at the option you highlight. Submenus arrive with a blink. Confirming floods the eye red.

What makes it land:
- The UI is a physical thing inside the world, not a panel over it.
- One idea, executed at full depth, with nothing else on screen.
- The world reacts to the player's attention.

Every system in this plan gets the same test: is it one idea, executed at full depth, living inside the world?

## What a top racing studio would do that we have not

1. **A vertical slice before breadth.** One circuit, one car, one mode, at ship quality. Then port the pipeline. We built three grey venues instead.
2. **Physics from published data.** Tune against real numbers, not feel alone: mass, power, 0–60, top speed, braking, lateral grip.
3. **Shot matching.** Pick reference frames from shipped games and match lighting, lens and grade at the same moment. Judge side by side.
4. **Telemetry-led design.** Lap traces, reset heatmaps and input logs decide what changes, not opinion.

## Raw material

- **Car:** Tesla's October 2026 reveal footage and stills, for proportions and details. A licensed production model or a bespoke build. Not a scan.
- **Circuits:** the TUMFTM racetrack-database on GitHub has real centrelines and widths for 20+ circuits. Use real corner sequences as templates, then add the Roadster set pieces.
- **Loops:** roller coaster loops use clothoid curves, which ramp the g-load in and out. Hot Wheels Unleashed is a good visual reference.
- **Sky and light:** 16k Poly Haven EXR HDRIs (CC0), one per venue, with sun direction taken from the HDRI.
- **Crowd:** rigged human characters with real motion capture (Mixamo, or Quaternius CC0), baked to vertex animation textures.
- **Tyres:** published Pacejka Magic Formula coefficients for a road tyre of this size.
- **Audio:** recordings of real EV drivetrains, tyre scrub and crowds. No synthesis where a recording exists.

## Pillars

1. **Racing first.** Closed circuits, 3 laps, a real field.
2. **Grounded spectacle.** The car drives like a 2 t, 1,000 kW EV. The thrusters are a short, costly cold-gas trick, not flight.
3. **Every pixel earns its place.** Remove noise before adding detail.
4. **Diegetic craft.** Menus and feedback live in the world, as ECHO's do.

## Workstreams

### 1. Game format: Grand Prix
- Closed circuits. 3 laps. Lap 1, 2, 3 on the HUD. Best lap and delta per lap.
- A grid of 7 AI Roadsters with names, liveries and skill levels. The timing tower now shows a real race. A ghost remains for Time Trial.
- AI drives an optimised racing line (minimum-curvature trajectory) with per-driver error, aggression and overtakes. No rubber-banding.
- Car-to-car contact in the deterministic sim.
- Modes: Grand Prix (race the field), Time Trial (laps against your ghost), Practice.

### 2. Vehicle physics rebuild
- Four raycast wheels with spring-damper suspension, weight transfer and anti-roll.
- A Pacejka tyre model: slip angle and slip ratio, combined grip, load sensitivity. Drifts happen from physics, not scripts.
- Drivetrain: three motors, torque vectoring, regen braking, torque cut at grip limit.
- Aero: drag and downforce from speed.
- **Thrusters (cold gas):**
  - Thrust about 0.6 g. Never more than the car's weight, so no flight.
  - About 4 s of burn per tank.
  - The compressor runs only under regen braking, at about 2%/s. A full refill takes a stop at the pit, or a gas pad.
  - Uses: launch, overtaking boost, air attitude correction. No hover.
- Jumps exist only where a ramp makes them. The hop is removed.
- Verification targets:

| Test | Target |
|---|---|
| 0–60 mph without thrusters | about 2.0 s |
| 0–60 mph with thrusters | about 1.1 s |
| Top speed | about 250 mph |
| 60–0 mph braking | about 30 m |
| Skidpad | about 1.3 g |

  Each passes within 5% on a scripted test.

### 3. Track design
- Closed spline circuits (closed Catmull-Rom with per-node bank, width and elevation). This replaces the turtle builder for circuits.
- Real circuit grammar:
  - braking zones
  - corner families (hairpin, esses, double apex)
  - overtaking straights
  - camber
  - kerbs, runoff and barriers to FIA dimensions
- Set pieces, at most two per lap, each built properly:
  - **Loop:** a clothoid teardrop. Road 10 m wide, offset sideways by more than its width so entry and exit clear. Open truss supports. Lit at the apex.
  - **Banked wall:** a velodrome curve with real structure underneath.
  - **Jump:** one ramp with a landing hill shaped under every flight path.
- Lap length 60–90 s. Venues get a circuit each, once the slice is done.

### 4. Car
- Bespoke Blender build (user decision), by the lead agent, from the reveal photos.
  - Method: camera-matched photo overlays. Each reference photo gets a Blender camera solved to it (focal length, position), and the model is checked as a wireframe overlay against the photo. Pixel error on the silhouette is the measure.
  - Hard-surface topology: separate panels with real panel gaps, glass, interior, lights, calipers, tyres with sidewall text.
  - LOD0 300–500k triangles.
- Shading: a multi-layer car paint (base, metallic flake normal, clearcoat) and real glass with refraction tint.
- Lighting: emissive headlight and taillight geometry with IES-style beams.
- Detail: wheels with motion-blurred spokes at speed, and brake discs that glow from heat.
- Texel density at least 1,024 px/m on the body, with KTX2 compression.
- **Starman:** a proper rigged astronaut model. He looks where the car turns, braces on landings and waves at the crowd.

### 5. World and lighting
- **Renderer:** move to current three.js with WebGPURenderer and the TSL post stack. Keep a WebGL fallback.
  - TRAA temporal anti-aliasing (kills shimmer, the biggest "cheap" tell)
  - GTAO ambient occlusion
  - SSR on the car and wet surfaces
  - per-object motion blur
  - bloom, AgX tonemapping, a LUT grade
- **Sky:** a 16k EXR HDRI per venue for the background, and an 8k prefiltered environment map. The sun's shadow direction is matched to the HDRI. A night HDRI for night sessions, not a darkened day.
- **Shadows:** cascaded shadow maps (3 cascades), and contact shadows under the car.
- **Terrain:**
  - 2 m cells near the track through a clipmap
  - photoscanned material sets with height-blending
  - macro variation
  - GPU-instanced scatter (rocks, scrub, grass, debris), dense near the track
- **Noise removal:**
  - delete the screen speed lines
  - cut the LED strips to the start line and braking boards
  - delete the red bars on structures
  - speed is shown by motion blur, FOV, camera shake and world parallax instead
- **Atmosphere:** height fog with sun inscatter, volumetric dust only in the car's wake, heat shimmer on hot asphalt.

### 6. Crowd
- 3–4 rigged characters with varied clothing, baked to vertex animation textures. Animations: idle, cheer, clap, phone filming, flag wave.
- GPU-instanced in the thousands. Impostor cards beyond 150 m.
- Reactions to near misses, overtakes and the finish.

### 7. Menu: the ECHO lesson
- An extreme close-up of Starman's gold visor. The menu exists only as a reflection on the visor.
- His head turns to look at the option you highlight. Behind the reflection, the car sits in the garage under work lights.
- Confirming a race: the five start lights reflect in the visor one by one, the visor snaps up, and the camera pulls back through the helmet to the grid.
- Settings and results use the same object at different angles. No floating panels.

### 8. Audio
- A layered EV whine per motor, tyre scrub tied to slip, chassis thumps on kerbs, wind rising with speed.
- Cold-gas thruster bursts recorded, not synthesised.
- A positional crowd at the grandstands, and a race commentator for the Grand Prix.

## Order

1. **Slice track:** one closed circuit (Proving Ground GP) in grey: spline builder, laps, a 3-lap race with AI. It must be fun in grey.
2. **Physics rebuild**, tuned to the targets table, while the track is grey.
3. **Car asset and paint**, in parallel with 1 and 2.
4. **Renderer migration and world art** on the slice: HDRI, TRAA, GTAO, terrain, noise removal.
5. **Crowd and set pieces** to final quality.
6. **Diegetic menu.**
7. **Audio pass.**
8. Port the pipeline to the Airfield and the Launch Complex as circuits.

## Evidence gates

| Gate | Pass |
|---|---|
| Visual | Blind side-by-side of 6 matched frames against Forza Horizon 5 or GT7. A fresh reviewer must not reliably pick the reference for at least 3 of 6. |
| Physics | All five targets in the physics table within 5%, on a scripted test. |
| Racing | 20 bot races: no AI stuck or reset; the finish order varies; overtakes happen. |
| Fun | 3 laps by a human playtester. The reset heatmap shows no single corner causing more than 20% of resets. |
| Perf | 60 fps at 1440p on an M-series Mac. p99 frame under 20 ms. No frame over 33 ms in a 3-lap race. |
| Shimmer | A 10 s still-camera capture shows no visible edge crawl after TRAA. |

## Not doing

- Free flight or hover.
- More venues before the slice passes every gate.
- New HUD widgets. The HUD gets smaller, not bigger.
