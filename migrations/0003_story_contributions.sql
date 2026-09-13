CREATE TABLE story_contributions (
  id TEXT PRIMARY KEY,
  content_ciphertext BLOB NOT NULL,
  content_iv BLOB NOT NULL CHECK (length(content_iv) = 12),
  encryption_key_version INTEGER NOT NULL,
  original_length INTEGER NOT NULL CHECK (original_length > 0),
  content_length INTEGER NOT NULL CHECK (content_length > 0),
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  created_at INTEGER NOT NULL
);

CREATE INDEX story_contributions_review_queue
  ON story_contributions(status, created_at);
