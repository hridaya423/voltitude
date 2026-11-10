# Trailer footage: shot list

The clips are in `assets/clips/` (gitignored). They are 1920x1080, 60 fps, H.264 at 12 Mbit/s with the game's own clip audio. `tools/trailer-clips.mjs` makes them; see "Regenerate" below.

Every clip ends with the game's score card, burned in over the last 1.2 s. The card fades in at the time given in the "Card" column. Cut before that time unless you want the card.

No clip shows the HUD, a hint or a toast. The exporter draws the 3D canvas only.

| File | Length | Card | What happens | Best moment |
|---|---|---|---|---|
| `lineup.mp4` | 13.1 s | 11.9 s | The Lineup on The Pad at golden hour, from the trackside camera. The car barrel-rolls over line 2 for a ×2 clear, then runs back, takes the kicker again and clears line 3. | 1.0–1.6 s: the barrel roll over the line. 10.0–11.0 s: the second leap. |
| `ramp.mp4` | 10.1 s | 8.9 s | The Ramp: run-up, the curl and the lip. The car goes inverted at the top and rolls out. | 6.7–7.5 s: inverted at the top of the curl. 7.4–8.2 s: past the lip; the sun-side sky is near white. |
| `trench.mp4` | 12.1 s | 10.9 s | The Trench at Launch: the first gate, the tube roll onto the ceiling, the inverted gates, and the roll back down. | 4.0–5.0 s: the tube roll. 6.0–7.0 s: inverted gates on the ceiling. |
| `loop.mp4` | 12.1 s | 10.9 s | Proving Ground at golden hour on boost: through the loop, then the sweeper as a wall ride with fan glow, wall dust and speed lines. | 0.0–2.5 s: the loop, inverted at about 1.0 s. 8.0–10.5 s: the sweeper wall ride on boost. |
| `gp-night.mp4` | 11.1 s | 9.9 s | Grand Prix at Launch by night: the player boosts down the straight inside the pack, then the pack turns into the first corner. | 0.0–3.0 s: boost flames in the pack. 7.0–9.2 s: the pack through the corner. |
| `hairpin.mp4` | 9.1 s | 7.9 s | Airfield at golden hour: the approach, the panelled lit retaining wall, then the 45 degree banked hairpin taken as a wall ride with the cyan fan glow. | 4.5–7.0 s: the wall ride. 3.8–4.5 s: the lit wall. |
| `slide.mp4` | 8.1 s | 6.9 s | Proving Ground by day: held slides through the sweeper, with thick tyre smoke that trails the car. | 4.1–6.6 s: the long slide. |
| `landing.mp4` | 7.1 s | 5.9 s | The Pad by day: boost down the straight, the kicker, and a perfect landing with the cyan ring and dust. | 5.3–5.5 s: touchdown and the ring. |
| `near-miss.mp4` | 7.1 s | 5.9 s | The Lineup on The Pad by day, from the chase camera: the run-up and a close clear over the vehicles, with the near-miss rush lines. | 4.7–5.4 s: the leap over the line. |
| `wreck.mp4` | 7.1 s | 5.9 s | The Pad by day: the car rolls in the air off the kicker, lands on its roof and wrecks, with sparks, smoke and debris. | 3.5–4.7 s: the roll. 5.2–5.5 s: the impact. |

Total: 139 MB.

`slide`, `loop`, `ramp`, `gp-night` and `trench` were re-shot on 2026-11-10, after the polish-3 camera, sky, edge, floodlight and smoke fixes. Their timings did not move.

## Notes for the editor

- `lineup.mp4` uses the trackside broadcast camera, so the car is small at the leaps. `near-miss.mp4` shows a Lineup clear from the chase camera if you need a closer shot.
- No Grand Prix near miss happened on autopilot, even with boost held for a whole race. The near-miss shot is a Lineup clear.
- The cards show the run's own numbers, for example a race time of 0:13.008 in `gp-night.mp4`. Each clip is a window into a longer run.

## Regenerate

Run `node tools/serve.mjs 8795`, then `PORT=8795 node tools/trailer-clips.mjs trailer/assets/clips`. `ONLY=loop,wreck` limits the run to the shots named. The tool runs with the API off and posts nothing.
