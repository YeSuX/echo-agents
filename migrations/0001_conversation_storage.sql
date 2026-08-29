CREATE TABLE app_users (
  clerk_user_id TEXT PRIMARY KEY,
  history_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (history_enabled IN (0, 1)),
  consent_version TEXT,
  consented_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  mode TEXT NOT NULL
    CHECK (mode IN ('companion', 'guest')),
  guest_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_message_at INTEGER,
  FOREIGN KEY (owner_id)
    REFERENCES app_users(clerk_user_id)
    ON DELETE CASCADE,
  CHECK (
    (mode = 'companion' AND guest_id IS NULL) OR
    (mode = 'guest' AND guest_id IS NOT NULL)
  )
);

CREATE TABLE conversation_turns (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  client_message_id TEXT NOT NULL,
  user_ciphertext BLOB NOT NULL,
  user_iv BLOB NOT NULL,
  assistant_ciphertext BLOB,
  assistant_iv BLOB,
  encryption_key_version INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'completed', 'stopped', 'failed')),
  error_code TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  UNIQUE (conversation_id, client_message_id),
  CHECK (
    (status = 'completed' AND assistant_ciphertext IS NOT NULL AND assistant_iv IS NOT NULL) OR
    (status != 'completed' AND assistant_ciphertext IS NULL AND assistant_iv IS NULL)
  )
);

CREATE INDEX idx_conversations_owner_updated
  ON conversations(owner_id, updated_at DESC, id DESC);

CREATE INDEX idx_turns_conversation_created
  ON conversation_turns(conversation_id, created_at ASC, id ASC);
