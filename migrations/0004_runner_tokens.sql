CREATE TABLE IF NOT EXISTS runner_tokens (
  config_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TEXT,
  emailed_at TEXT,
  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runner_tokens_updated_at
ON runner_tokens(updated_at);
