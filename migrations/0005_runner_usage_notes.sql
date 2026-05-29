CREATE TABLE IF NOT EXISTS runner_usage_notes (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  added_by TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runner_usage_notes_config_created_at
ON runner_usage_notes(config_id, created_at DESC);
