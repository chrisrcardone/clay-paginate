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

export class ImmutableConfigError extends Error {
  constructor() {
    super("Saved configurations are immutable. Create a new runner instead.");
    this.name = "ImmutableConfigError";
  }
}

export interface ConfigSummary {
  id: string;
  name: string;
  targetUrl: string;
  method: string;
  runUrl: string;
  totalCalls: number;
  clayCalls: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listConfigs(db: D1Database, publicBaseUrl: string): Promise<ConfigSummary[]> {
  const result = await db
    .prepare(
      `SELECT
         c.id,
         c.name,
         c.target_url,
         c.target_method,
         c.created_at,
         c.updated_at,
         COUNT(r.id) AS total_calls,
         SUM(CASE WHEN r.mode = 'run' THEN 1 ELSE 0 END) AS clay_calls,
         MAX(r.created_at) AS last_run_at
       FROM configs c
       LEFT JOIN run_logs r ON r.config_id = c.id
       GROUP BY c.id
       ORDER BY clay_calls DESC, total_calls DESC, c.created_at DESC
       LIMIT 100`,
    )
    .all<Omit<SavedConfigRow, "config_json">>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    targetUrl: row.target_url,
    method: row.target_method,
    runUrl: `${publicBaseUrl}/${row.id}`,
    totalCalls: Number(row.total_calls ?? 0),
    clayCalls: Number(row.clay_calls ?? 0),
    lastRunAt: row.last_run_at ?? null,
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
  if (config.id) {
    throw new ImmutableConfigError();
  }

  const normalized = normalizeConfig(config);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stored = { ...normalized, id };

  try {
    await db
      .prepare(
        `INSERT INTO configs (id, name, target_url, target_method, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    stopReason?: string;
    retryCount?: number;
  },
): Promise<void> {
  // Analytics are deliberately metadata-only. No Clay headers, query params,
  // request bodies, upstream URLs, response rows, or upstream error bodies are
  // persisted here. Stop reasons and retry counts are operational metadata.
  await db
    .prepare(
      `INSERT INTO run_logs (id, config_id, mode, status, page_count, item_count, duration_ms, upstream_status, error, stop_reason, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.stopReason ? input.stopReason.slice(0, 80) : null,
      input.retryCount ?? 0,
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
         COALESCE(ROUND(AVG(page_count), 1), 0) AS avgPagesPerRun,
         COALESCE(ROUND(AVG(item_count), 1), 0) AS avgItemsPerRun,
         COALESCE(SUM(retry_count), 0) AS totalRetries,
         MAX(created_at) AS lastRunAt
       FROM run_logs
       WHERE config_id = ?`,
    )
    .bind(configId)
    .first<Record<string, number | string | null>>();

  const statusCounts = await db
    .prepare(
      `SELECT
         CASE
           WHEN upstream_status IS NOT NULL THEN CAST(upstream_status AS TEXT)
           WHEN status = 'ok' THEN 'unknown'
           ELSE 'worker_error'
         END AS status_code,
         COUNT(*) AS count
       FROM run_logs
       WHERE config_id = ?
       GROUP BY status_code
       ORDER BY count DESC, status_code ASC`,
    )
    .bind(configId)
    .all<{ status_code: string; count: number }>();

  const statusTimeline = await db
    .prepare(
      `SELECT
         date(created_at) AS bucket,
         CASE
           WHEN upstream_status IS NOT NULL THEN CAST(upstream_status AS TEXT)
           WHEN status = 'ok' THEN 'unknown'
           ELSE 'worker_error'
         END AS status_code,
         COUNT(*) AS count
       FROM run_logs
       WHERE config_id = ? AND created_at >= datetime('now', '-30 days')
       GROUP BY bucket, status_code
      ORDER BY bucket ASC, status_code ASC`,
    )
    .bind(configId)
    .all<{ bucket: string; status_code: string; count: number }>();

  const volumeTimeline = await db
    .prepare(
      `SELECT
         date(created_at) AS bucket,
         COUNT(*) AS calls,
         COALESCE(SUM(page_count), 0) AS pages,
         COALESCE(SUM(item_count), 0) AS items,
         COALESCE(ROUND(AVG(duration_ms)), 0) AS avg_duration_ms
       FROM run_logs
       WHERE config_id = ? AND created_at >= datetime('now', '-30 days')
       GROUP BY bucket
       ORDER BY bucket ASC`,
    )
    .bind(configId)
    .all<{ bucket: string; calls: number; pages: number; items: number; avg_duration_ms: number }>();

  const errorCounts = await db
    .prepare(
      `SELECT COALESCE(error, 'none') AS error, COUNT(*) AS count
       FROM run_logs
       WHERE config_id = ? AND status = 'error'
       GROUP BY error
       ORDER BY count DESC, error ASC
       LIMIT 10`,
    )
    .bind(configId)
    .all<{ error: string; count: number }>();

  const stopReasonCounts = await db
    .prepare(
      `SELECT COALESCE(stop_reason, 'unknown') AS stop_reason, COUNT(*) AS count
       FROM run_logs
       WHERE config_id = ? AND status = 'ok'
       GROUP BY stop_reason
       ORDER BY count DESC, stop_reason ASC
       LIMIT 10`,
    )
    .bind(configId)
    .all<{ stop_reason: string; count: number }>();

  const recent = await db
    .prepare(
      `SELECT mode, status, page_count, item_count, duration_ms, upstream_status, error, stop_reason, retry_count, created_at
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
      stop_reason: string | null;
      retry_count: number;
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
    avgPagesPerRun: Number(aggregate?.avgPagesPerRun ?? 0),
    avgItemsPerRun: Number(aggregate?.avgItemsPerRun ?? 0),
    totalRetries: Number(aggregate?.totalRetries ?? 0),
    lastRunAt: typeof aggregate?.lastRunAt === "string" ? aggregate.lastRunAt : null,
    statusCounts: (statusCounts.results ?? []).map((row) => ({
      statusCode: row.status_code,
      count: row.count,
    })),
    errorCounts: (errorCounts.results ?? []).map((row) => ({
      error: row.error,
      count: row.count,
    })),
    stopReasonCounts: (stopReasonCounts.results ?? []).map((row) => ({
      stopReason: row.stop_reason,
      count: row.count,
    })),
    statusTimeline: (statusTimeline.results ?? []).map((row) => ({
      bucket: row.bucket,
      statusCode: row.status_code,
      count: row.count,
    })),
    volumeTimeline: (volumeTimeline.results ?? []).map((row) => ({
      bucket: row.bucket,
      calls: row.calls,
      pages: row.pages,
      items: row.items,
      avgDurationMs: row.avg_duration_ms,
    })),
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
  stop_reason: string | null;
  retry_count: number;
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
    stopReason: row.stop_reason,
    retryCount: row.retry_count,
    createdAt: row.created_at,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}
