# Review: Voltitude trailer (30 s, 1920x1080, 30 fps)

Footage is the game's own clip export (`tools/trailer-clips.mjs`, autopilot runs replayed through `exportClip` in landscape). Regenerate it with `node tools/trailer-clips.mjs trailer/assets/clips` while `tools/serve.mjs` runs.

| Time | Shot | Line |
|---|---|---|
| 0.0 | The Lineup: the car lifts over the line | IT FLIES. |
| 3.3 | Grand Prix night: the pack on the banking | |
| 5.7 | The Ramp: run-up into the curl | THE RAMP |
| 9.9 | The Trench: up the wall and onto the ceiling | THE TRENCH |
| 14.3 | Proving Ground kerbs | |
| 16.1 | Grand Prix night: the bank wall | GRAND PRIX |
| 19.0 | The Trench: coming down the wall | |
| 21.0 | The Ramp: inverted at the top of the curl | |
| 23.8 | Grand Prix night: chasing the pack | ONE DAILY CARD. EVERY GHOST ON IT. |
| 26.3 | End card: the mark drops, the bar wipes, the wordmark wipes in; `Free in your browser · voltitude.app` | |

- Dip cuts (45% for 3 frames) at the chapter seams 5.7, 9.9, 19.0 and 23.8; hard cuts on action elsewhere.
- Titles: Archivo 800 expanded, per-word blur-in 0.16 s at 80 ms steps, red bar wipe; blur-out 0.16 s.
- Sound: the game's own clip mix (music bed and stingers) on every shot, 50 ms fade in and 80 ms fade out at each cut. Measured, not heard: −14.3 LUFS integrated, −1.8 dBTP.
- `npx hyperframes check`: ok, three baseline warnings on the title scene.
- Known: the trench walls show stretched terrain texture, as in the game. The Proving clip shows kerbs, not the loop.
