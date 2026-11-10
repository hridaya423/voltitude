ALTER TABLE runs ADD COLUMN v INTEGER;
ALTER TABLE runs ADD COLUMN player TEXT;
CREATE INDEX IF NOT EXISTS runs_board ON runs (venue, event, v, day);
