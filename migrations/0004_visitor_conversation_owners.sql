ALTER TABLE app_users RENAME TO conversation_owners;
ALTER TABLE conversation_owners RENAME COLUMN clerk_user_id TO id;
ALTER TABLE conversation_owners ADD COLUMN kind TEXT NOT NULL DEFAULT 'account'
  CHECK (kind IN ('account', 'visitor'));
ALTER TABLE conversation_owners ADD COLUMN visitor_token_hash TEXT
  CHECK (visitor_token_hash IS NULL OR kind = 'visitor');
ALTER TABLE conversation_owners ADD COLUMN visitor_expires_at INTEGER
  CHECK (visitor_expires_at IS NULL OR kind = 'visitor');
CREATE UNIQUE INDEX idx_owners_visitor_token
  ON conversation_owners(visitor_token_hash) WHERE visitor_token_hash IS NOT NULL;
CREATE INDEX idx_owners_visitor_expiry
  ON conversation_owners(visitor_expires_at) WHERE kind = 'visitor';
