CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  guest_name TEXT,
  message TEXT,
  local_filename TEXT NOT NULL,
  thumbnail_filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  thumb_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  bucket_key TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_hidden ON photos(hidden, created_at);
