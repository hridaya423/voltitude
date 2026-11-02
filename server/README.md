# Voltitude Worker

One Cloudflare Worker with D1. It re-simulates every submitted run with the game's own deterministic sim before it stores a time or a score.

| Route | Does |
|---|---|
| `POST /runs` | `{ venue, run, score?, day?, name?, og? }`. Re-simulates `run`. 201 with `{ id, rank }`; 409 for a run already stored; 422 when the replay's time differs by more than one tick, the dare score differs, the run does not finish, or `day` names another event. |
| `GET /board/:venue.:event/:day` | Top 100 for a day (`YYYY-MM-DD`) or `all`. Dares rank by score, timed events by time. |
| `GET /runs/:id` | The stored run, for ghost links (`#g=<id>`). |
| `GET /og/:id.jpg` | The 1200x630 JPEG uploaded with the run. |
| `GET /daily/:day` | The daily card for that day. |

Test locally: `node --test server/test/*.test.js`. Load test: `node server/load.mjs 1000`.

Deploy (not done yet; it publishes the service):

1. `npx wrangler d1 create voltitude`, then put the printed id in `wrangler.toml`.
2. `npx wrangler d1 execute voltitude --remote --file=schema.sql`
3. `npx wrangler deploy` from this folder. Re-simulation needs the paid plan's CPU limit (`[limits] cpu_ms`); a 35 s run costs about 9 ms of CPU in node on an M-series laptop.
