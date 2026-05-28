import { normalizeConfig } from "./pagination";
import type { RunAnalytics, RunLogSummary, RunnerConfig, SavedConfigRow } from "./types";

export class DuplicateConfigError extends Error {
  constructor(
    readonly targetUrl: string,
    readonly method: string,
  ) {
    super(`A ${method} runner for ${targetUrl} already exists`);
    this.name = "DuplicateConfigError";
  }
}

export interface ConfigSummary {
  id: string;
  name: string;
  targetUrl: string;
  method: string;
  runUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function listConfigs(db: D1Database, origin: string): Promise<ConfigSummary[]> {
  const result = await db
    .prepare("SELECT id, name, target_url, target_method, created_at, updated_at FROM configs ORDER BY updated_at DESC LIMIT 100")
    .all<Omit<SavedConfigRow, "config_json">>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    targetUrl: row.target_url,
    method: row.target_method,
    runUrl: `${origin}/run/${row.id}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getConfig(db: D1Database, id: string): Promise<RunnerConfig | null> {
  const row = await db.prepare("SELECT * FROM configs WHERE id = ?").bind(id).first<SavedConfigRow>();
  if (!row) {
    return null;
  }

  return {
    ...JSON.parse(row.config_json),
    id: row.id,
  } as RunnerConfig;
}

export async function saveConfig(db: D1Database, config: RunnerConfig): Promise<RunnerConfig> {
  const normalized = normalizeConfig(config);
  const id = config.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const stored = { ...normalized, id };

  try {
    await db
      .prepare(
        `INSERT INTO configs (id, name, target_url, target_method, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           target_url = excluded.target_url,
           target_method = excluded.target_method,
           config_json = excluded.config_json,
           updated_at = excluded.updated_at`,
      )
      .bind(id, stored.name, stored.targetUrl, stored.method, JSON.stringify(stored), now, now)
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateConfigError(stored.targetUrl, stored.method);
    }
    throw error;
  }

  return stored;
}

export async function deleteConfig(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM configs WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}

export async function logRun(
  db: D1Database,
  input: {
    configId: string;
    mode: "test" | "run";
    status: "ok" | "error";
    pageCount?: number;
    itemCount?: number;
    durationMs?: number;
    upstreamStatus?: number;
    error?: string;
  },
): Promise<void> {
  // Analytics are deliberately metadata-only. No Clay headers, query params,
  // request bodies, upstream URLs, or response rows are persisted here.
  await db
    .prepare(
      `INSERT INTO run_logs (id, config_id, mode, status, page_count, item_count, duration_ms, upstream_status, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.configId,
      input.mode,
      input.status,
      input.pageCount ?? 0,
      input.itemCount ?? 0,
      input.durationMs ?? 0,
      input.upstreamStatus ?? null,
      input.error ? input.error.slice(0, 80) : null,
    )
    .run();
}

export async function getAnalytics(db: D1Database, configId: string): Promise<RunAnalytics> {
  const aggregate = await db
    .prepare(
      `SELECT
         COUNT(*) AS totalRuns,
         SUM(CASE WHEN mode = 'run' THEN 1 ELSE 0 END) AS clayRuns,
         SUM(CASE WHEN mode = 'test' THEN 1 ELSE 0 END) AS testRuns,
         SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS successfulRuns,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS failedRuns,
         COALESCE(SUM(page_count), 0) AS totalPages,
         COALESCE(SUM(item_count), 0) AS totalItems,
         COALESCE(ROUND(AVG(duration_ms)), 0) AS avgDurationMs,
         MAX(created_at) AS lastRunAt
       FROM run_logs
       WHERE config_id = ?`,
    )
    .bind(configId)
    .first<Record<string, number | string | null>>();

  const recent = await db
    .prepare(
      `SELECT mode, status, page_count, item_count, duration_ms, upstream_status, error, created_at
       FROM run_logs
       WHERE config_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .bind(configId)
    .all<{
      mode: "test" | "run";
      status: "ok" | "error";
      page_count: number;
      item_count: number;
      duration_ms: number;
      upstream_status: number | null;
      error: string | null;
      created_at: string;
    }>();

  return {
    totalRuns: Number(aggregate?.totalRuns ?? 0),
    clayRuns: Number(aggregate?.clayRuns ?? 0),
    testRuns: Number(aggregate?.testRuns ?? 0),
    successfulRuns: Number(aggregate?.successfulRuns ?? 0),
    failedRuns: Number(aggregate?.failedRuns ?? 0),
    totalPages: Number(aggregate?.totalPages ?? 0),
    totalItems: Number(aggregate?.totalItems ?? 0),
    avgDurationMs: Number(aggregate?.avgDurationMs ?? 0),
    lastRunAt: typeof aggregate?.lastRunAt === "string" ? aggregate.lastRunAt : null,
    recentRuns: (recent.results ?? []).map(toRunLogSummary),
  };
}

function toRunLogSummary(row: {
  mode: "test" | "run";
  status: "ok" | "error";
  page_count: number;
  item_count: number;
  duration_ms: number;
  upstream_status: number | null;
  error: string | null;
  created_at: string;
}): RunLogSummary {
  return {
    mode: row.mode,
    status: row.status,
    pageCount: row.page_count,
    itemCount: row.item_count,
    durationMs: row.duration_ms,
    upstreamStatus: row.upstream_status,
    error: row.error,
    createdAt: row.created_at,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}
