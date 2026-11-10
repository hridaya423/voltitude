# Review: Voltitude trailer (30 s, 1920x1080, 60 fps)

Footage: the ten game clips in `assets/clips/`, listed in `SHOTS.md`. All ten are 60 fps, so the render is 60 fps. Each shot ends at least 0.25 s before its clip's score card.

| Time | Shot (clip, source seconds) | Line |
|---|---|---|
| 0.00 | Wreck: the impact, sparks and debris (`wreck` 4.95–5.65) | |
| 0.70 | Night pack: boost flames off the grid (`gp-night` 0.30–1.00) | |
| 1.40 | The Lineup, chase camera: 0.4 s of run-up, then the clear over the vehicles (`near-miss` 5.05–5.85) | JUMP. |
| 2.20 | The Lineup, trackside: the leap and the landing ring, cropped 1.36x to 1.46x (`lineup` 1.50–3.70) | |
| 4.40 | The Ramp: into the curl, inverted, out over the lip (`ramp` 5.60–7.90) | |
| 6.70 | The Trench: the tube roll onto the ceiling (`trench` 4.00–6.30) | ROLL. |
| 9.00 | Airfield: the banked hairpin as a wall ride, fan glow (`hairpin` 5.10–7.40) | RIDE / WALLS. |
| 11.30 | Proving Ground: the slide with thick tyre smoke (`slide` 4.15–6.65) | SLIDE. |
| 13.80 | Grand Prix night: boost in the pack, speed lines (`gp-night` 3.75–6.65) | BOOST. |
| 16.70 | Proving Ground: through the loop (`loop` 0.00–3.00) | LOOP IT. |
| 19.70 | Grand Prix night: the pack into the first corner (`gp-night` 7.15–9.60) | |
| 22.15 | The Pad: the roll off the kicker and the wreck (`wreck` 3.15–5.75) | CRASH. |
| 24.75 | White flash, then the clean landing with the ring; touchdown at 25.15 (`landing` 4.90–5.80) | GO AGAIN. (24.80) |
| 25.65 | End card: the mark drops, the bar wipes, the wordmark wipes in; `Free in your browser` and the URL at 72 px from 26.95. The game's `finish` sting plays under it. | |

- Order: a cold open on the wreck impact (first cut at 0.70 s), then the verbs, then scale (night pack, loop), then the fail and the retry, then the end card. The longest shot is 3.0 s (the loop).
- Dip cuts (45% for 0.1 s) at 13.8 and 22.15; a 55% white flash at 24.75 lands GO AGAIN; hard cuts elsewhere.
- Lines: the same type system as before (Archivo 800 expanded, per-word blur-in, red bar wipe). They now start at x = 192 px, inside title-safe.
- Sound: each shot's own game audio, with a 30 ms fade in and a 60 ms fade out at each cut. The end card plays the game's `finish` sting (`assets/audio/sfx.m4a` 16.35–19.75 s, CC0, see `assets/audio/CREDITS.md`) with a 0.5 s fade out. Strobe does not render per-clip fades, so `node mix-audio.mjs` mixes the shots into `assets/clips/mix.m4a` from the times in `index.html`. Run it after any shot change. Measured, not heard: −14.2 LUFS integrated, −1.6 dBFS peak, LRA 1.9 LU.
- `npx hyperframes check`: ok, with the three baseline warnings on the line scene.

## Render

Strobe on the Windows PC: `strobe render <dir> --fps 60 -o out.mp4`, about 30 s for 1800 frames. Strobe 0.1.0 supports only HyperFrames 0.8.216, so the render folder installs `hyperframes@0.8.216`. The project scripts stay pinned to 0.9.2. The output is H.264 at about 45 Mbit/s, 169 MB, because Strobe has no bitrate flag. Keep it in `out/` (gitignored).

## Review passes

- Pass 1: the Lineup crop did not render, because Strobe ignores a transform on a `<video>`. The scale now sits on a wrapper div (`#crop4`).
- Pass 2: the near-miss shot drove for about 1.7 s before the jump. It now starts 0.45 s later, and the night corner shot is 0.45 s longer.
- Pass 3: every cut lands on action. No score card or hint box appears, and no frame is black or frozen outside the end card. The end card holds 3.8 s, with the URL readable for 2.5 s. Contact sheet: `docs/sheets/2026-11-10-trailer-recut.jpg`.
- Recut 2, pass 1: GO AGAIN entered at 24.2, about 1 s before touchdown. It now enters at 24.8 on the white flash.
- Recut 2, pass 2: no score card or hint box; the only dark frames are the end card. The URL is 72 px Martian Mono, about 13.5 px tall at 360 px wide playback, readable for 3.0 s. Contact sheet: `docs/sheets/2026-11-10-trailer-recut-2.jpg`.
- Before the first render, snapshots showed "RIDE THE WALL." and "RACE THE PACK." over the car's tail lights. They became "RIDE / WALLS." on two rows and "BOOST.".

## Known

- The Lineup crop is upscaled 1.4x from 1080p, so it is soft.
- The landing shot is 0.9 s, so the ring shows for 0.5 s before the end card.
- Not used: the Ramp sky after 7.6 s (near white), the hairpin's lit wall (3.8–4.5 s), the loop's sweeper wall ride (8–10.5 s).

## Hero loop

`assets/hero.mp4` is trailer 11.3–19.7 s (slide, night boost, loop): 8.4 s, 1280x720, 30 fps, no audio, 1.06 MB (two-pass x264 at 1 Mbit/s). It was picked as the 8–9 s cut-to-cut stretch with the most frame-to-frame motion. It starts and ends on cuts, so the loop seam is a hard cut between two chase-camera shots.

`out/voltitude-trailer-share.mp4`: H.264 CRF 23, AAC 160k, faststart, 32 MB.
