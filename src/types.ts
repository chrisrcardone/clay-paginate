export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
  RUNNER_AUTH_TOKEN?: string;
  ALLOWED_RUN_CIDRS?: string;
  ALLOWED_UPSTREAM_HOSTS?: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

export type PaginationType =
  | "none"
  | "jsonapi"
  | "page"
  | "offset"
  | "cursor"
  | "linkHeader";

export interface HeaderPair {
  name: string;
  value: string;
}

export interface FieldMapping {
  name: string;
  path: string;
}

export interface StopConditions {
  stopOnEmptyPage?: boolean;
  stopOnRepeatedNext?: boolean;
  stopOnDuplicateItemId?: boolean;
  itemIdPath?: string;
  maxDurationMs?: number;
  maxResponseBytes?: number;
}

export interface RateLimitSettings {
  delayMs?: number;
  retryAttempts?: number;
  retryStatuses?: number[];
  respectRetryAfter?: boolean;
  timeoutMs?: number;
}

export interface ResponseShape {
  mode?: "raw" | "jsonapiAttributes" | "select";
  fields?: FieldMapping[];
}

export interface PaginationSettings {
  type: PaginationType;
  maxPages: number;
  maxItems?: number;
  pageParam?: string;
  pageSizeParam?: string;
  pageSize?: number;
  startPage?: number;
  totalPagesPath?: string;
  nextLinkPath?: string;
  offsetParam?: string;
  limitParam?: string;
  startOffset?: number;
  cursorParam?: string;
  nextCursorPath?: string;
  initialCursor?: string;
}

export interface RunnerConfig {
  id?: string;
  name: string;
  targetUrl: string;
  method: HttpMethod;
  resultPath: string;
  responseMode: "array" | "envelope";
  staticHeaders: HeaderPair[];
  passThroughHeaders: string[];
  bodyTemplate?: string;
  pagination: PaginationSettings;
  stopConditions?: StopConditions;
  rateLimit?: RateLimitSettings;
  responseShape?: ResponseShape;
}

export interface RunAnalytics {
  totalRuns: number;
  clayRuns: number;
  testRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalPages: number;
  totalItems: number;
  avgDurationMs: number;
  avgPagesPerRun: number;
  avgItemsPerRun: number;
  totalRetries: number;
  lastRunAt: string | null;
  statusCounts: StatusCount[];
  errorCounts: ErrorCount[];
  stopReasonCounts: StopReasonCount[];
  statusTimeline: StatusTimelinePoint[];
  volumeTimeline: VolumeTimelinePoint[];
  recentRuns: RunLogSummary[];
}

export interface StatusCount {
  statusCode: string;
  count: number;
}

export interface StatusTimelinePoint {
  bucket: string;
  statusCode: string;
  count: number;
}

export interface VolumeTimelinePoint {
  bucket: string;
  calls: number;
  pages: number;
  items: number;
  avgDurationMs: number;
}

export interface ErrorCount {
  error: string;
  count: number;
}

export interface StopReasonCount {
  stopReason: string;
  count: number;
}

export interface RunLogSummary {
  mode: "test" | "run";
  status: "ok" | "error";
  pageCount: number;
  itemCount: number;
  durationMs: number;
  upstreamStatus: number | null;
  error: string | null;
  stopReason: string | null;
  retryCount: number;
  createdAt: string;
}

export interface PageDebug {
  page: number;
  url: string;
  status: number;
  itemCount: number;
  durationMs: number;
  retryCount: number;
  responseBytes: number;
  next?: string | null;
  stopReason?: string | null;
}

export interface RunnerResult {
  items: unknown[];
  pages: PageDebug[];
  upstreamStatus: number;
  durationMs: number;
  truncated: boolean;
  stopReason: string;
  retryCount: number;
}

export interface SavedConfigRow {
  id: string;
  name: string;
  target_url: string;
  target_method: string;
  config_json: string;
  created_at: string;
  updated_at: string;
  total_calls?: number;
  clay_calls?: number;
  last_run_at?: string | null;
}

export interface TestRequest {
  config: RunnerConfig;
  credentialHeaders?: HeaderPair[];
  queryString?: string;
  body?: string;
}

export interface DetectionResult {
  suggestions: Partial<RunnerConfig>;
  detected: {
    resultPath?: string;
    paginationType?: PaginationType;
    nextLinkPath?: string;
    totalPagesPath?: string;
    nextCursorPath?: string;
  };
  evidence: string[];
  warnings: string[];
  page: PageDebug;
  upstreamStatus: number;
}
