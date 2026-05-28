import { getByPath, toArray } from "./jsonPath";
import type { HeaderPair, PageDebug, RunnerConfig, RunnerResult } from "./types";

const DEFAULT_MAX_PAGES = 25;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_TIMEOUT_MS = 25000;
const GET_RETRY_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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
}

interface PageState {
  nextUrl?: string;
  pageNumber: number;
  offset: number;
  cursor?: string;
}

export async function runPagination(config: RunnerConfig, options: RunOptions = {}): Promise<RunnerResult> {
  const started = Date.now();
  const fetcher = options.fetcher ?? fetch;
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
  let upstreamStatus = 200;
  let truncated = false;

  for (let index = 0; index < normalized.pagination.maxPages; index += 1) {
    const requestUrl = buildPageUrl(normalized, state, passthroughQuery, placeholderContext.targetUrl);
    const init = buildFetchInit(normalized, options);
    const response = await fetchWithTimeout(fetcher, requestUrl.toString(), init, DEFAULT_TIMEOUT_MS);
    upstreamStatus = response.status;

    const rawBody = await response.text();
    if (!response.ok) {
      throw new UpstreamError(`Upstream returned ${response.status}`, response.status, rawBody);
    }

    const json = parseJson(rawBody);
    const batch = toArray(getByPath(json, normalized.resultPath));
    items.push(...batch);

    const next = getNextState(normalized, state, requestUrl, response.headers, json, batch.length);
    pages.push({
      page: index + 1,
      url: sanitizeUrlForDebug(requestUrl),
      status: response.status,
      itemCount: batch.length,
      next: next.debugNext,
    });

    if (normalized.pagination.maxItems && items.length >= normalized.pagination.maxItems) {
      items.length = normalized.pagination.maxItems;
      truncated = true;
      break;
    }

    if (!next.hasNext) {
      break;
    }

    state.nextUrl = next.nextUrl;
    state.pageNumber = next.pageNumber ?? state.pageNumber + 1;
    state.offset = next.offset ?? state.offset;
    state.cursor = next.cursor ?? state.cursor;
  }

  if (pages.length === normalized.pagination.maxPages) {
    truncated = true;
  }

  return {
    items,
    pages,
    upstreamStatus,
    durationMs: Date.now() - started,
    truncated,
  };
}

export function normalizeConfig(config: RunnerConfig, testMode = false): RunnerConfig {
  const maxPages = clampNumber(config.pagination.maxPages, testMode ? 3 : DEFAULT_MAX_PAGES, 1, 250);
  const pageSize = config.pagination.pageSize
    ? clampNumber(config.pagination.pageSize, DEFAULT_PAGE_SIZE, 1, 10000)
    : undefined;

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
  };
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
  timeoutMs: number,
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const attempts = method === "GET" ? GET_RETRY_ATTEMPTS + 1 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchOnceWithTimeout(fetcher, url, init, timeoutMs);
      if (attempt >= attempts - 1 || !RETRYABLE_STATUSES.has(response.status)) {
        return response;
      }

      await sleep(getRetryDelayMs(response, attempt));
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) {
        throw error;
      }

      await sleep(getRetryDelayMs(undefined, attempt));
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

function getRetryDelayMs(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
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

function sanitizeUrlForDebug(url: URL): string {
  const clone = new URL(url);
  for (const key of clone.searchParams.keys()) {
    if (/api|auth|credential|token|key|secret|password/i.test(key)) {
      clone.searchParams.set(key, "redacted");
    }
  }
  return clone.toString();
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
