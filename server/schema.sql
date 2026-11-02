CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  venue TEXT NOT NULL,
  event TEXT NOT NULL,
  day TEXT,
  name TEXT NOT NULL,
  total INTEGER NOT NULL,
  score INTEGER,
  run TEXT NOT NULL,
  og BLOB,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_by_time ON runs (venue, event, day, total);
CREATE INDEX IF NOT EXISTS runs_by_score ON runs (venue, event, day, score);
