# Review: Voltitude trailer (30 s, 1920x1080, 60 fps)

Footage: the ten game clips in `assets/clips/`, listed in `SHOTS.md`. All ten are 60 fps, so the render is 60 fps. Each shot ends at least 0.25 s before its clip's score card.

| Time | Shot (clip, source seconds) | Line |
|---|---|---|
| 0.00 | Wreck: the impact, sparks and debris (`wreck` 4.95–5.65) | |
| 0.70 | Night pack: boost flames off the grid (`gp-night` 0.40–1.20) | |
| 1.50 | The Lineup, chase camera: run-up and the clear over the vehicles (`near-miss` 3.40–5.65) | JUMP. |
| 3.75 | The Lineup, trackside: the leap and the landing ring, cropped 1.36x to 1.46x (`lineup` 1.50–3.70) | |
| 5.95 | The Ramp: into the curl, inverted, out over the lip (`ramp` 5.50–7.40) | |
| 7.85 | The Trench: the tube roll onto the ceiling (`trench` 4.10–6.40) | ROLL. |
| 10.15 | Airfield: the banked hairpin as a wall ride, fan glow (`hairpin` 5.10–7.40) | RIDE / WALLS. |
| 12.45 | Proving Ground: the slide with tyre smoke (`slide` 3.50–5.00) | SLIDE. |
| 13.95 | Grand Prix night: boost in the pack, speed lines (`gp-night` 1.60–4.00) | BOOST. |
| 16.35 | Proving Ground: through the loop (`loop` 0.10–2.70) | LOOP IT. |
| 18.95 | Grand Prix night: the pack into the first corner (`gp-night` 6.75–9.30) | |
| 21.50 | The Pad: the roll off the kicker and the wreck (`wreck` 3.45–5.65) | CRASH. |
| 23.70 | The Pad: the kicker and a clean landing with the ring (`landing` 3.10–5.60) | GO AGAIN. |
| 26.20 | End card: the mark drops, the bar wipes, the wordmark wipes in; `Free in your browser · voltitude.hridya.tech` at 27.5 | |

- Order: a cold open on the wreck impact (first cut at 0.70 s), then the verbs, then scale (night pack, loop), then the fail and the retry, then the end card. The longest shot is 2.6 s.
- Dip cuts (45% for 0.1 s) at 13.95 and 21.5; hard cuts elsewhere.
- Lines: the same type system as before (Archivo 800 expanded, per-word blur-in, red bar wipe). They now start at x = 192 px, inside title-safe.
- Sound: each shot's own game audio, with a 30 ms fade in and a 60 ms fade out at each cut. The end card is silent. Strobe does not render per-clip fades, so `node mix-audio.mjs` mixes the shots into `assets/clips/mix.m4a` from the times in `index.html`. Run it after any shot change. Measured, not heard: −14.3 LUFS integrated, −1.6 dBTP, LRA 2.0 LU.
- `npx hyperframes check`: ok, with the three baseline warnings on the line scene.

## Render

Strobe on the Windows PC: `strobe render <dir> --fps 60 -o out.mp4`, about 30 s for 1800 frames. Strobe 0.1.0 supports only HyperFrames 0.8.216, so the render folder installs `hyperframes@0.8.216`. The project scripts stay pinned to 0.9.2. The output is H.264 at about 45 Mbit/s, 169 MB, because Strobe has no bitrate flag. Keep it in `out/` (gitignored).

## Review passes

- Pass 1: the Lineup crop did not render, because Strobe ignores a transform on a `<video>`. The scale now sits on a wrapper div (`#crop4`).
- Pass 2: the near-miss shot drove for about 1.7 s before the jump. It now starts 0.45 s later, and the night corner shot is 0.45 s longer.
- Pass 3: every cut lands on action. No score card or hint box appears, and no frame is black or frozen outside the end card. The end card holds 3.8 s, with the URL readable for 2.5 s. Contact sheet: `docs/sheets/2026-11-10-trailer-recut.jpg`.
- Before the first render, snapshots showed "RIDE THE WALL." and "RACE THE PACK." over the car's tail lights. They became "RIDE / WALLS." on two rows and "BOOST.".

## Known

- The Lineup crop is upscaled 1.4x from 1080p, so it is soft.
- The slide's smoke is light, so the shot is kept to 1.5 s.
- The landing shot is mostly low flight before the ring. The ring arrives in its last 0.3 s.
- Not used: the Ramp sky after 7.6 s (near white), the hairpin's lit wall (3.8–4.5 s), the loop's sweeper wall ride (8–10.5 s).

## Hero loop

`assets/hero.mp4` is trailer 7.85–16.35 s (Trench, hairpin, slide, night boost): 8.5 s, 1280x720, 30 fps, no audio, 1.07 MB (two-pass x264 at 1 Mbit/s). It starts and ends on cuts, so the loop seam is a hard cut between two chase-camera shots.
