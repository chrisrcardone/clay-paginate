export interface Env {
  DB: D1Database;
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
  lastRunAt: string | null;
  statusCounts: StatusCount[];
  statusTimeline: StatusTimelinePoint[];
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

export interface RunLogSummary {
  mode: "test" | "run";
  status: "ok" | "error";
  pageCount: number;
  itemCount: number;
  durationMs: number;
  upstreamStatus: number | null;
  error: string | null;
  createdAt: string;
}

export interface PageDebug {
  page: number;
  url: string;
  status: number;
  itemCount: number;
  next?: string | null;
}

export interface RunnerResult {
  items: unknown[];
  pages: PageDebug[];
  upstreamStatus: number;
  durationMs: number;
  truncated: boolean;
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
