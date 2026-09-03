CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
