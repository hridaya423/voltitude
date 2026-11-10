# Voltitude Worker

One Cloudflare Worker with D1. It re-simulates every submitted run with the game's own deterministic sim before it stores a time or a score.

| Route | Does |
|---|---|
| `POST /runs` | `{ venue, run, score?, day?, name?, player?, og? }`. Re-simulates `run`. 201 with `{ id, rank, best, players, total, score }`: `rank` on that day's board, or on `all` when there is no `day`; `best` is true when the run is now the player's best; `players` is the board size. 409 for a run already stored; 422 when the replay's time differs by more than one tick, the dare score differs, the run does not finish, or `day` names another event. `player` is 8 to 40 characters of `A-Z a-z 0-9 _ -`; anything else is stored as no player. |
| `GET /board/:venue.:event/:day` | `day` is `YYYY-MM-DD` or `all` (every day and undated runs). Query: `limit` (default 20, max 100), `offset`, `player`. Returns `{ venue, event, day, total, rows: [{ rank, id, name, total, score, created }] }`. Only runs of the Worker's sim version count. Each player has one row, their best; a run with no player is its own player. Dares rank by score, timed events by time, and the earlier run wins a tie. With `player`, also `me: { rank, id, name, total, score }` or `null`, and `around` (ranks `me - 2` to `me + 2`, `me` included) when `me` is not on the page. |
| `GET /runs/:id` | The stored run, for ghost links (`#g=<id>`). |
| `GET /og/:id.jpg` | The 1200x630 JPEG uploaded with the run. |
| `GET /daily/:day` | The daily card for that day. |

Test locally: `node --test server/test/*.test.js`. Load test: `node server/load.mjs 1000`.

Deployed 2026-11-02 at https://voltitude.hridayahoney.workers.dev (D1 `voltitude`, id in `wrangler.toml`). To redeploy, run `npx wrangler deploy` from this folder.

Migrations: `migrations/` holds changes for the live database, in order. Run each one once, before deploying the Worker that needs it:

```
npx wrangler d1 execute voltitude --remote --file=migrations/001-leaderboard.sql
```

`001-leaderboard.sql` adds `v` (sim version) and `player` to `runs`, plus the `runs_board` index. Rows stored before it keep `v` as NULL and do not show on any board. `schema.sql` already holds these for a fresh database.

First-time deploy steps:

1. `npx wrangler d1 create voltitude`, then put the printed id in `wrangler.toml`.
2. `npx wrangler d1 execute voltitude --remote --file=schema.sql`
3. `npx wrangler deploy` from this folder.

The account is on the free plan, which allows 10 ms of CPU per request and rejects a `[limits] cpu_ms` setting. Measured live: The Trench (22 s) re-simulates and stores; 3 to 4 minute time trials return 503. To accept time trials, move to the paid plan and add `[limits]` with `cpu_ms = 30000` back to `wrangler.toml`.
