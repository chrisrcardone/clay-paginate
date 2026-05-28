CREATE UNIQUE INDEX IF NOT EXISTS idx_configs_target_method_unique
ON configs(target_method, target_url);

ALTER TABLE run_logs ADD COLUMN upstream_status INTEGER;
