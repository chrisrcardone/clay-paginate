import { getByPath, toArray } from "./jsonPath";
import type {
  DetectionResult,
  FieldMapping,
  HeaderPair,
  PageDebug,
  RateLimitSettings,
  RunnerConfig,
  RunnerResult,
} from "./types";

const DEFAULT_MAX_PAGES = 250;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES_LIMIT = 1000;
const DEFAULT_TIMEOUT_MS = 25000;
const GET_RETRY_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_TIMEOUT_MS = 55000;
const MAX_DELAY_MS = 10000;
const MAX_RETRY_ATTEMPTS = 5;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class MissingPlaceholderError extends Error {
  constructor(readonly names: string[]) {
    super(`Missing required URL parameter${names.length === 1 ? "" : "s"}: ${names.join(", ")}`);
    this.name = "MissingPlaceholderError";
  }
}

export interface RunOptions {
  incomingHeaders?: Headers;
  incomingQuery?: URLSearchParams;
  incomingBody?: string;
  extraHeaders?: HeaderPair[];
  testMode?: boolean;
  fetcher?: typeof fetch;
  sleeper?: (ms: number) => Promise<void>;
}

interface PageState {
  nextUrl?: string;
  pageNumber: number;
  offset: number;
  cursor?: string;
}

interface FetchWithRetryResult {
  response: Response;
  retryCount: number;
}

export async function runPagination(config: RunnerConfig, options: RunOptions = {}): Promise<RunnerResult> {
  const started = Date.now();
  const fetcher = options.fetcher ?? fetch;
  const sleeper = options.sleeper ?? sleep;
  const normalized = normalizeConfig(config, options.testMode);
  const placeholderContext = resolveUrlPlaceholders(normalized.targetUrl, options.incomingQuery);
  const passthroughQuery = removeConsumedQueryParams(options.incomingQuery, placeholderContext.consumedParams);
  const state: PageState = {
    pageNumber: normalized.pagination.startPage ?? 1,
    offset: normalized.pagination.startOffset ?? 0,
    cursor: normalized.pagination.initialCursor,
  };

  const pages: PageDebug[] = [];
  const items: unknown[] = [];
  const seenRequestUrls = new Set<string>();
  const seenNextMarkers = new Set<string>();
  const seenItemIds = new Set<string>();
  let upstreamStatus = 200;
  let truncated = false;
  let stopReason = "completed";
  let totalRetryCount = 0;
  let totalResponseBytes = 0;

  for (let index = 0; index < normalized.pagination.maxPages; index += 1) {
    if (hasExceededDuration(started, normalized.stopConditions?.maxDurationMs)) {
      truncated = true;
      stopReason = "max_duration";
      break;
    }

    const requestUrl = buildPageUrl(normalized, state, passthroughQuery, placeholderContext.targetUrl);
    const requestMarker = requestUrl.toString();
    if (normalized.stopConditions?.stopOnRepeatedNext && seenRequestUrls.has(requestMarker)) {
      truncated = true;
      stopReason = "repeated_url";
      break;
    }
    seenRequestUrls.add(requestMarker);

    const init = buildFetchInit(normalized, options);
    const pageStarted = Date.now();
    const { response, retryCount } = await fetchWithTimeout(fetcher, requestUrl.toString(), init, normalized.rateLimit);
    totalRetryCount += retryCount;
    upstreamStatus = response.status;

    const rawBody = await response.text();
    const responseBytes = byteLength(rawBody);
    totalResponseBytes += responseBytes;
    if (!response.ok) {
      throw new UpstreamError(`Upstream returned ${response.status}`, response.status, rawBody);
    }

    const json = parseJson(rawBody);
    const batch = toArray(getByPath(json, normalized.resultPath));
    const duplicateDetected = normalized.stopConditions?.stopOnDuplicateItemId
      ? hasDuplicateItemId(batch, seenItemIds, normalized.stopConditions.itemIdPath)
      : false;
    items.push(...shapeItems(batch, normalized));

    const next = getNextState(normalized, state, requestUrl, response.headers, json, batch.length);
    const pageStopReason = getPageStopReason({
      batchLength: batch.length,
      duplicateDetected,
      hasNext: next.hasNext,
      normalized,
      nextMarker: getNextMarker(next),
      seenNextMarkers,
      started,
      totalResponseBytes,
    });
    if (pageStopReason) {
      stopReason = pageStopReason;
      truncated = pageStopReason !== "completed";
    } else if (!next.hasNext) {
      stopReason = "completed";
    }

    pages.push({
      page: index + 1,
      url: sanitizeUrlForDebug(requestUrl),
      status: response.status,
      itemCount: batch.length,
      durationMs: Date.now() - pageStarted,
      retryCount,
      responseBytes,
      next: sanitizeDebugNext(next.debugNext),
      stopReason: pageStopReason ?? (!next.hasNext ? "completed" : null),
    });

    if (normalized.pagination.maxItems && items.length >= normalized.pagination.maxItems) {
      items.length = normalized.pagination.maxItems;
      truncated = true;
      stopReason = "max_items";
      break;
    }

    if (pageStopReason || !next.hasNext) {
      break;
    }

    const nextMarker = getNextMarker(next);
    if (nextMarker) {
      seenNextMarkers.add(nextMarker);
    }

    state.nextUrl = next.nextUrl;
    state.pageNumber = next.pageNumber ?? state.pageNumber + 1;
    state.offset = next.offset ?? state.offset;
    state.cursor = next.cursor ?? state.cursor;

    if (normalized.rateLimit?.delayMs) {
      await sleeper(normalized.rateLimit.delayMs);
    }
  }

  if (pages.length === normalized.pagination.maxPages) {
    truncated = true;
    stopReason = "max_pages";
    const last = pages[pages.length - 1];
    if (last && !last.stopReason) {
      last.stopReason = "max_pages";
    }
  }

  return {
    items,
    pages,
    upstreamStatus,
    durationMs: Date.now() - started,
    truncated,
    stopReason,
    retryCount: totalRetryCount,
  };
}

export async function detectFromFirstResponse(config: RunnerConfig, options: RunOptions = {}): Promise<DetectionResult> {
  const fetcher = options.fetcher ?? fetch;
  const normalized = normalizeConfig(config, true);
  const placeholderContext = resolveUrlPlaceholders(normalized.targetUrl, options.incomingQuery);
  const passthroughQuery = removeConsumedQueryParams(options.incomingQuery, placeholderContext.consumedParams);
  const state: PageState = {
    pageNumber: normalized.pagination.startPage ?? 1,
    offset: normalized.pagination.startOffset ?? 0,
    cursor: normalized.pagination.initialCursor,
  };
  const requestUrl = buildPageUrl(normalized, state, passthroughQuery, placeholderContext.targetUrl);
  const pageStarted = Date.now();
  const { response, retryCount } = await fetchWithTimeout(
    fetcher,
    requestUrl.toString(),
    buildFetchInit(normalized, options),
    normalized.rateLimit,
  );
  const rawBody = await response.text();
  if (!response.ok) {
    throw new UpstreamError(`Upstream returned ${response.status}`, response.status, rawBody);
  }

  const json = parseJson(rawBody);
  const analysis = analyzeResponseShape(json, response.headers);
  return {
    suggestions: buildDetectionSuggestions(normalized, analysis),
    detected: analysis.detected,
    evidence: analysis.evidence,
    warnings: analysis.warnings,
    upstreamStatus: response.status,
    page: {
      page: 1,
      url: sanitizeUrlForDebug(requestUrl),
      status: response.status,
      itemCount: analysis.itemCount,
      durationMs: Date.now() - pageStarted,
      retryCount,
      responseBytes: byteLength(rawBody),
      next: analysis.nextPreview,
      stopReason: "single_page_detection",
    },
  };
}

export function normalizeConfig(config: RunnerConfig, testMode = false): RunnerConfig {
  const maxPages = clampNumber(config.pagination.maxPages, DEFAULT_MAX_PAGES, 1, MAX_PAGES_LIMIT);
  const pageSize = config.pagination.pageSize
    ? clampNumber(config.pagination.pageSize, DEFAULT_PAGE_SIZE, 1, 10000)
    : undefined;
  const retryStatuses = (config.rateLimit?.retryStatuses ?? Array.from(RETRYABLE_STATUSES))
    .map((status) => Number(status))
    .filter((status) => Number.isInteger(status) && status >= 100 && status <= 599);

  return {
    ...config,
    name: config.name?.trim() || "Untitled runner",
    targetUrl: normalizeTargetUrl(config.targetUrl),
    method: config.method || "GET",
    resultPath: config.resultPath?.trim() || "data",
    responseMode: config.responseMode || "array",
    staticHeaders: cleanHeaderPairs(config.staticHeaders),
    passThroughHeaders: cleanHeaderNames(config.passThroughHeaders),
    pagination: {
      ...config.pagination,
      type: config.pagination.type || "jsonapi",
      maxPages,
      maxItems: config.pagination.maxItems ? clampNumber(config.pagination.maxItems, 0, 1, 100000) : undefined,
      pageParam: config.pagination.pageParam || "page[number]",
      pageSizeParam: config.pagination.pageSizeParam || "page[size]",
      pageSize,
      startPage: config.pagination.startPage ?? 1,
      totalPagesPath: config.pagination.totalPagesPath || "meta.page_count",
      nextLinkPath: config.pagination.nextLinkPath || "links.next",
      offsetParam: config.pagination.offsetParam || "offset",
      limitParam: config.pagination.limitParam || "limit",
      startOffset: config.pagination.startOffset ?? 0,
      cursorParam: config.pagination.cursorParam || "cursor",
      nextCursorPath: config.pagination.nextCursorPath || "meta.next_cursor",
    },
    stopConditions: {
      stopOnEmptyPage: config.stopConditions?.stopOnEmptyPage ?? true,
      stopOnRepeatedNext: config.stopConditions?.stopOnRepeatedNext ?? true,
      stopOnDuplicateItemId: config.stopConditions?.stopOnDuplicateItemId ?? false,
      itemIdPath: config.stopConditions?.itemIdPath?.trim() || "id",
      maxDurationMs: config.stopConditions?.maxDurationMs
        ? clampNumber(config.stopConditions.maxDurationMs, 0, 1000, 290000)
        : undefined,
      maxResponseBytes: config.stopConditions?.maxResponseBytes
        ? clampNumber(config.stopConditions.maxResponseBytes, 0, 1024, 50_000_000)
        : undefined,
    },
    rateLimit: {
      delayMs: config.rateLimit?.delayMs ? clampNumber(config.rateLimit.delayMs, 0, 0, MAX_DELAY_MS) : 0,
      retryAttempts: clampNumber(config.rateLimit?.retryAttempts, GET_RETRY_ATTEMPTS, 0, MAX_RETRY_ATTEMPTS),
      retryStatuses: retryStatuses.length ? retryStatuses : Array.from(RETRYABLE_STATUSES),
      respectRetryAfter: config.rateLimit?.respectRetryAfter ?? true,
      timeoutMs: clampNumber(config.rateLimit?.timeoutMs, DEFAULT_TIMEOUT_MS, 1000, MAX_TIMEOUT_MS),
    },
    responseShape: {
      mode: config.responseShape?.mode || "raw",
      fields: cleanFieldMappings(config.responseShape?.fields),
    },
  };
}

interface ResponseAnalysis {
  detected: DetectionResult["detected"];
  evidence: string[];
  warnings: string[];
  itemCount: number;
  nextPreview: string | null;
}

function analyzeResponseShape(json: unknown, headers: Headers): ResponseAnalysis {
  const evidence: string[] = [];
  const warnings: string[] = [];
  const detected: DetectionResult["detected"] = {};
  const arrayCandidates = findArrayPaths(json);
  const resultPath = chooseResultPath(arrayCandidates);
  if (resultPath) {
    detected.resultPath = resultPath.path;
    evidence.push(`Found an array at "${resultPath.path}" with ${resultPath.length} item(s).`);
  } else {
    warnings.push("No JSON array was detected in the first response. Confirm the Results path manually.");
  }

  const linkHeaderNext = parseLinkHeader(headers.get("link"));
  if (linkHeaderNext) {
    detected.paginationType = "linkHeader";
    evidence.push('Detected an HTTP Link header with rel="next".');
  }

  const linksNext = getByPath(json, "links.next");
  if (typeof linksNext === "string" && linksNext.trim()) {
    detected.paginationType = "jsonapi";
    detected.nextLinkPath = "links.next";
    evidence.push('Detected JSON:API-style "links.next".');
  }

  const totalPagesPath = findFirstPrimitivePath(json, [
    "meta.page_count",
    "meta.total_pages",
    "pagination.total_pages",
    "page.total_pages",
    "total_pages",
  ]);
  if (totalPagesPath) {
    detected.totalPagesPath = totalPagesPath;
    evidence.push(`Detected total pages at "${totalPagesPath}".`);
    if (!detected.paginationType) detected.paginationType = "page";
  }

  const cursorPath = findCursorPath(json);
  if (cursorPath && !detected.paginationType) {
    detected.paginationType = "cursor";
    detected.nextCursorPath = cursorPath;
    evidence.push(`Detected a next-cursor value at "${cursorPath}".`);
  } else if (cursorPath) {
    detected.nextCursorPath = cursorPath;
  }

  if (!detected.paginationType) {
    detected.paginationType = "none";
    warnings.push("No next page signal was detected in the first response. Use None only if the endpoint really returns all rows in one response.");
  }

  return {
    detected,
    evidence,
    warnings,
    itemCount: resultPath?.length ?? 0,
    nextPreview: sanitizeDebugNext(linkHeaderNext || (typeof linksNext === "string" ? linksNext : cursorPath ?? null)),
  };
}

function buildDetectionSuggestions(config: RunnerConfig, analysis: ResponseAnalysis): Partial<RunnerConfig> {
  return {
    resultPath: analysis.detected.resultPath,
    pagination: {
      ...config.pagination,
      type: analysis.detected.paginationType ?? config.pagination.type,
      nextLinkPath: analysis.detected.nextLinkPath ?? config.pagination.nextLinkPath,
      totalPagesPath: analysis.detected.totalPagesPath ?? config.pagination.totalPagesPath,
      nextCursorPath: analysis.detected.nextCursorPath ?? config.pagination.nextCursorPath,
    },
  };
}

function chooseResultPath(candidates: Array<{ path: string; length: number }>): { path: string; length: number } | undefined {
  const preferred = ["data", "results", "items", "records", "products"];
  for (const path of preferred) {
    const match = candidates.find((candidate) => candidate.path === path);
    if (match) return match;
  }

  return candidates
    .filter((candidate) => candidate.length > 0)
    .sort((a, b) => a.path.split(".").length - b.path.split(".").length || b.length - a.length)[0]
    ?? candidates[0];
}

function findArrayPaths(value: unknown, prefix = "", depth = 0): Array<{ path: string; length: number }> {
  if (depth > 4 || value == null || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return [{ path: prefix || "$", length: value.length }];
  }

  const found: Array<{ path: string; length: number }> = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    found.push(...findArrayPaths(child, path, depth + 1));
  }
  return found;
}

function findFirstPrimitivePath(value: unknown, candidates: string[]): string | undefined {
  for (const path of candidates) {
    const candidate = getByPath(value, path);
    if (typeof candidate === "string" || typeof candidate === "number") {
      return path;
    }
  }
  return undefined;
}

function findCursorPath(value: unknown, prefix = "", depth = 0): string | undefined {
  if (depth > 5 || value == null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (/next.*cursor|cursor.*next|end_cursor|nextCursor|nextToken|next_page_token/i.test(key)) {
      if (typeof child === "string" || typeof child === "number") {
        return path;
      }
    }
    const nested = findCursorPath(child, path, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

export function normalizeTargetUrl(value: string): string {
  const placeholders = new Map<string, string>();
  const masked = value.trim().replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, name: string) => {
    const marker = `__PLACEHOLDER_${placeholders.size}__`;
    placeholders.set(marker, name);
    return marker;
  });

  const url = new URL(masked);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  url.searchParams.sort();
  let normalized = url.toString();
  for (const [marker, name] of placeholders.entries()) {
    normalized = normalized.replaceAll(marker, `{{${name}}}`);
  }

  return normalized;
}

export function buildPageUrl(
  config: RunnerConfig,
  state: PageState,
  incomingQuery?: URLSearchParams,
  resolvedTargetUrl = config.targetUrl,
): URL {
  const url = state.nextUrl ? new URL(state.nextUrl, resolvedTargetUrl) : new URL(resolvedTargetUrl);

  if (!state.nextUrl && incomingQuery) {
    for (const [key, value] of incomingQuery.entries()) {
      url.searchParams.append(key, value);
    }
  }

  const pagination = config.pagination;

  if (pagination.type === "jsonapi" || pagination.type === "page") {
    if (pagination.pageParam) {
      url.searchParams.set(pagination.pageParam, String(state.pageNumber));
    }
    if (pagination.pageSizeParam && pagination.pageSize) {
      url.searchParams.set(pagination.pageSizeParam, String(pagination.pageSize));
    }
  }

  if (pagination.type === "offset") {
    if (pagination.offsetParam) {
      url.searchParams.set(pagination.offsetParam, String(state.offset));
    }
    if (pagination.limitParam && pagination.pageSize) {
      url.searchParams.set(pagination.limitParam, String(pagination.pageSize));
    }
  }

  if (pagination.type === "cursor" && pagination.cursorParam && state.cursor) {
    url.searchParams.set(pagination.cursorParam, state.cursor);
  }

  return url;
}

function buildFetchInit(config: RunnerConfig, options: RunOptions): RequestInit {
  const headers = new Headers();

  for (const header of config.staticHeaders) {
    headers.set(header.name, header.value);
  }

  for (const name of config.passThroughHeaders) {
    const incomingValue = options.incomingHeaders?.get(name);
    if (incomingValue) {
      headers.set(name, incomingValue);
    }
  }

  for (const header of options.extraHeaders ?? []) {
    headers.set(header.name, header.value);
  }

  const init: RequestInit = {
    method: config.method,
    headers,
  };

  if (config.method !== "GET") {
    const body = config.bodyTemplate || options.incomingBody;
    if (body) {
      init.body = body;
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }

  return init;
}

function getNextState(
  config: RunnerConfig,
  state: PageState,
  currentUrl: URL,
  headers: Headers,
  json: unknown,
  batchLength: number,
): { hasNext: boolean; nextUrl?: string; pageNumber?: number; offset?: number; cursor?: string; debugNext?: string | null } {
  const pagination = config.pagination;

  if (pagination.type === "none") {
    return { hasNext: false, debugNext: null };
  }

  if (pagination.type === "linkHeader") {
    const nextUrl = parseLinkHeader(headers.get("link"));
    return {
      hasNext: Boolean(nextUrl),
      nextUrl: nextUrl ?? undefined,
      debugNext: nextUrl,
    };
  }

  if (pagination.type === "cursor") {
    const cursorValue = getByPath(json, pagination.nextCursorPath);
    const cursor = typeof cursorValue === "string" || typeof cursorValue === "number" ? String(cursorValue) : "";
    return {
      hasNext: cursor !== "",
      cursor: cursor || undefined,
      debugNext: cursor || null,
    };
  }

  if (pagination.type === "offset") {
    const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    const nextOffset = state.offset + pageSize;
    return {
      hasNext: batchLength >= pageSize,
      offset: nextOffset,
      debugNext: batchLength >= pageSize ? `${pagination.offsetParam}=${nextOffset}` : null,
    };
  }

  if (pagination.type === "jsonapi") {
    const nextLink = getByPath(json, pagination.nextLinkPath);
    if (typeof nextLink === "string" && nextLink.trim() !== "") {
      const absolute = new URL(nextLink, currentUrl).toString();
      return { hasNext: true, nextUrl: absolute, debugNext: absolute };
    }
  }

  const totalPages = Number(getByPath(json, pagination.totalPagesPath));
  if (Number.isFinite(totalPages) && totalPages > 0) {
    const nextPage = state.pageNumber + 1;
    return {
      hasNext: nextPage <= totalPages,
      pageNumber: nextPage,
      debugNext: nextPage <= totalPages ? `${pagination.pageParam}=${nextPage}` : null,
    };
  }

  const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
  const nextPage = state.pageNumber + 1;
  return {
    hasNext: batchLength >= pageSize,
    pageNumber: nextPage,
    debugNext: batchLength >= pageSize ? `${pagination.pageParam}=${nextPage}` : null,
  };
}

function getPageStopReason(input: {
  batchLength: number;
  duplicateDetected: boolean;
  hasNext: boolean;
  normalized: RunnerConfig;
  nextMarker?: string;
  seenNextMarkers: Set<string>;
  started: number;
  totalResponseBytes: number;
}): string | null {
  const stop = input.normalized.stopConditions;
  if (stop?.maxResponseBytes && input.totalResponseBytes >= stop.maxResponseBytes) {
    return "max_response_bytes";
  }

  if (hasExceededDuration(input.started, stop?.maxDurationMs)) {
    return "max_duration";
  }

  if (stop?.stopOnDuplicateItemId && input.duplicateDetected) {
    return "duplicate_item_id";
  }

  if (stop?.stopOnEmptyPage && input.batchLength === 0) {
    return "empty_page";
  }

  if (stop?.stopOnRepeatedNext && input.hasNext && input.nextMarker && input.seenNextMarkers.has(input.nextMarker)) {
    return "repeated_next";
  }

  return null;
}

function hasExceededDuration(started: number, maxDurationMs: number | undefined): boolean {
  return Boolean(maxDurationMs && Date.now() - started >= maxDurationMs);
}

function getNextMarker(next: {
  nextUrl?: string;
  pageNumber?: number;
  offset?: number;
  cursor?: string;
}): string | undefined {
  if (next.nextUrl) return `url:${next.nextUrl}`;
  if (next.cursor) return `cursor:${next.cursor}`;
  if (next.pageNumber !== undefined) return `page:${next.pageNumber}`;
  if (next.offset !== undefined) return `offset:${next.offset}`;
  return undefined;
}

function hasDuplicateItemId(batch: unknown[], seen: Set<string>, itemIdPath = "id"): boolean {
  let duplicate = false;
  for (const item of batch) {
    const id = getByPath(item, itemIdPath);
    if (id === undefined || id === null || id === "") {
      continue;
    }
    const key = String(id);
    if (seen.has(key)) {
      duplicate = true;
    }
    seen.add(key);
  }
  return duplicate;
}

function shapeItems(batch: unknown[], config: RunnerConfig): unknown[] {
  const mode = config.responseShape?.mode ?? "raw";
  if (mode === "raw") {
    return batch;
  }

  return batch.map((item) => shapeItem(item, config.responseShape?.fields ?? [], mode));
}

function shapeItem(item: unknown, fields: FieldMapping[], mode: string): unknown {
  if (mode === "jsonapiAttributes" && item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    const attributes = record.attributes && typeof record.attributes === "object" && !Array.isArray(record.attributes)
      ? (record.attributes as Record<string, unknown>)
      : {};
    return {
      ...(record.id !== undefined ? { id: record.id } : {}),
      ...(record.type !== undefined ? { type: record.type } : {}),
      ...attributes,
    };
  }

  if (mode === "select") {
    const shaped: Record<string, unknown> = {};
    for (const field of fields) {
      const value = getByPath(item, field.path);
      if (value !== undefined) {
        shaped[field.name || field.path] = value;
      }
    }
    return shaped;
  }

  return item;
}

function cleanFieldMappings(fields: FieldMapping[] | undefined): FieldMapping[] {
  return (fields ?? [])
    .map((field) => ({
      name: field.name?.trim() || field.path?.trim() || "",
      path: field.path?.trim() || "",
    }))
    .filter((field) => field.name !== "" && field.path !== "");
}

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new UpstreamError("Upstream returned non-JSON data", 502, rawBody);
  }
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="?next"?/i);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  rateLimit: RateLimitSettings | undefined,
): Promise<FetchWithRetryResult> {
  const method = (init.method ?? "GET").toUpperCase();
  const retryAttempts = method === "GET" ? (rateLimit?.retryAttempts ?? GET_RETRY_ATTEMPTS) : 0;
  const attempts = retryAttempts + 1;
  const retryStatuses = new Set(rateLimit?.retryStatuses ?? Array.from(RETRYABLE_STATUSES));
  const timeoutMs = rateLimit?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchOnceWithTimeout(fetcher, url, init, timeoutMs);
      if (attempt >= attempts - 1 || !retryStatuses.has(response.status)) {
        return { response, retryCount: attempt };
      }

      await sleep(getRetryDelayMs(response, attempt, rateLimit?.respectRetryAfter ?? true));
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) {
        throw error;
      }

      await sleep(getRetryDelayMs(undefined, attempt, rateLimit?.respectRetryAfter ?? true));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upstream request failed");
}

async function fetchOnceWithTimeout(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("Request timed out"), timeoutMs);

  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getRetryDelayMs(response: Response | undefined, attempt: number, respectRetryAfter: boolean): number {
  const retryAfter = response?.headers.get("retry-after");
  if (respectRetryAfter && retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds * 1000, 100), 5000);
    }

    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) {
      return Math.min(Math.max(dateDelay, 100), 5000);
    }
  }

  return 250 * 2 ** attempt + Math.floor(Math.random() * 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanHeaderPairs(headers: HeaderPair[] | undefined): HeaderPair[] {
  return (headers ?? [])
    .map((header) => ({ name: header.name.trim(), value: header.value.trim() }))
    .filter((header) => header.name !== "" && header.value !== "");
}

function cleanHeaderNames(headers: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (headers ?? [])
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Number(value), min), max);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function sanitizeUrlForDebug(url: URL): string {
  const clone = new URL(url);
  for (const key of clone.searchParams.keys()) {
    if (/api|auth|credential|token|key|secret|password/i.test(key)) {
      clone.searchParams.set(key, "redacted");
    }
  }
  return clone.toString();
}

function sanitizeDebugNext(value: string | null | undefined): string | null {
  if (!value) {
    return value ?? null;
  }

  try {
    return sanitizeUrlForDebug(new URL(value));
  } catch {
    if (/api|auth|credential|token|key|secret|password/i.test(value)) {
      return "redacted";
    }
    return value;
  }
}

interface PlaceholderContext {
  targetUrl: string;
  consumedParams: Set<string>;
}

function resolveUrlPlaceholders(template: string, params?: URLSearchParams): PlaceholderContext {
  const consumedParams = new Set<string>();
  const missing = new Set<string>();

  // Placeholder values come from the Clay call URL. They are substituted into
  // the upstream URL in memory only; neither the raw value nor the final URL is
  // persisted to D1 analytics.
  const targetUrl = template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, name: string) => {
    const value = params?.get(name);
    if (value === null || value === undefined) {
      missing.add(name);
      return "";
    }

    consumedParams.add(name);
    return encodeURIComponent(value);
  });

  if (missing.size > 0) {
    throw new MissingPlaceholderError(Array.from(missing));
  }

  return { targetUrl, consumedParams };
}

function removeConsumedQueryParams(params: URLSearchParams | undefined, consumed: Set<string>): URLSearchParams | undefined {
  if (!params) {
    return undefined;
  }

  const filtered = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (!consumed.has(key)) {
      filtered.append(key, value);
    }
  }

  return filtered;
}
