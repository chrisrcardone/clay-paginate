import { detectFromFirstResponse, MissingPlaceholderError, runPagination, UpstreamError } from "./pagination";
import { renderApp } from "./ui";
import {
  DuplicateConfigError,
  ImmutableConfigError,
  getAnalytics,
  getConfig,
  listConfigs,
  logRun,
  saveConfig,
} from "./storage";
import type { Env, HeaderPair, RunnerConfig, TestRequest } from "./types";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const LEGACY_BASE_PATH = "/paginate";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = getRoute(url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    try {
      if (route.appPath === "/" && isReadMethod(request.method)) {
        return request.method === "HEAD" ? htmlHead() : html(renderApp(route.basePath));
      }

      if (route.appPath === "/health" && isReadMethod(request.method)) {
        return json({ ok: true });
      }

      if (route.appPath === "/api/test" && request.method === "POST") {
        return await handleTest(request, env);
      }

      if (route.appPath === "/api/detect" && request.method === "POST") {
        return await handleDetect(request);
      }

      if (route.appPath === "/api/configs" && request.method === "GET") {
        const configs = await listConfigs(env.DB, route.publicBaseUrl(url.origin));
        return json({ configs });
      }

      if (route.appPath === "/api/configs" && request.method === "POST") {
        return await handleSave(request, env, route.publicBaseUrl(url.origin));
      }

      const configMatch = route.appPath.match(/^\/api\/configs\/([^/]+)$/);
      if (configMatch && request.method === "GET") {
        return await handleGet(env, configMatch[1], route.publicBaseUrl(url.origin));
      }

      if (configMatch && request.method === "DELETE") {
        return json({ error: "Saved configurations are immutable and cannot be deleted" }, 405);
      }

      const analyticsMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/analytics$/);
      if (analyticsMatch && request.method === "GET") {
        return await handleAnalytics(env, analyticsMatch[1]);
      }

      const legacyRunMatch = route.appPath.match(/^\/run\/([^/]+)$/);
      const baseRunMatch = route.appPath.match(/^\/([^/]+)$/);
      const runMatch = legacyRunMatch ?? baseRunMatch;
      if (runMatch && (request.method === "GET" || request.method === "POST")) {
        return await handleRun(request, env, runMatch[1]);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return handleError(error);
    }
  },
};

function getRoute(url: URL): {
  appPath: string;
  basePath: string;
  publicBaseUrl: (origin: string) => string;
} {
  const { pathname } = url;

  // Primary deployment is the subdomain root:
  //   https://paginate.chris-apis.xyz
  // Keep /paginate as a compatibility prefix so older links and workers.dev
  // smoke checks still work while the public surface moves to the subdomain.
  if (pathname === LEGACY_BASE_PATH || pathname === `${LEGACY_BASE_PATH}/`) {
    return {
      appPath: "/",
      basePath: LEGACY_BASE_PATH,
      publicBaseUrl: (origin) => `${publicOrigin(origin)}${LEGACY_BASE_PATH}`,
    };
  }

  if (pathname.startsWith(`${LEGACY_BASE_PATH}/`)) {
    return {
      appPath: pathname.slice(LEGACY_BASE_PATH.length),
      basePath: LEGACY_BASE_PATH,
      publicBaseUrl: (origin) => `${publicOrigin(origin)}${LEGACY_BASE_PATH}`,
    };
  }

  return {
    appPath: pathname,
    basePath: "",
    publicBaseUrl: (origin) => publicOrigin(origin),
  };
}

function publicOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.hostname === "paginate.chris-apis.xyz") {
    url.protocol = "https:";
  }
  return url.origin;
}

function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  const body = await request.json<TestRequest>();
  validateConfigInput(body.config);
  const query = new URLSearchParams(body.queryString ?? "");
  const result = await runPagination(body.config, {
    incomingHeaders: headersFromPairs(body.credentialHeaders ?? []),
    incomingQuery: query,
    incomingBody: body.body,
    testMode: true,
  });

  if (body.config.id) {
    await logRun(env.DB, {
      configId: body.config.id,
      mode: "test",
      status: "ok",
      pageCount: result.pages.length,
      itemCount: result.items.length,
      durationMs: result.durationMs,
      upstreamStatus: result.upstreamStatus,
      stopReason: result.stopReason,
      retryCount: result.retryCount,
    });
  }

  return json({
    ok: true,
    itemCount: result.items.length,
    pageCount: result.pages.length,
    durationMs: result.durationMs,
    truncated: result.truncated,
    stopReason: result.stopReason,
    retryCount: result.retryCount,
    pages: result.pages,
    sample: result.items.slice(0, 10),
  });
}

async function handleDetect(request: Request): Promise<Response> {
  const body = await request.json<TestRequest>();
  validateConfigInput(body.config);
  const query = new URLSearchParams(body.queryString ?? "");
  const detection = await detectFromFirstResponse(body.config, {
    incomingHeaders: headersFromPairs(body.credentialHeaders ?? []),
    incomingQuery: query,
    incomingBody: body.body,
    testMode: true,
  });
  return json({ ok: true, detection });
}

async function handleAnalytics(env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  return json({ analytics: await getAnalytics(env.DB, id) });
}

async function handleSave(request: Request, env: Env, publicBaseUrl: string): Promise<Response> {
  const body = await request.json<{ config: RunnerConfig }>();
  validateConfigInput(body.config);
  const config = await saveConfig(env.DB, body.config);
  return json({
    config,
    runUrl: `${publicBaseUrl}/${config.id}`,
  });
}

async function handleGet(env: Env, id: string, publicBaseUrl: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  return json({
    config,
    runUrl: `${publicBaseUrl}/${config.id}`,
  });
}

async function handleRun(request: Request, env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  const requestUrl = new URL(request.url);
  const body = request.method === "POST" ? await request.text() : undefined;

  try {
    const result = await runPagination(config, {
      incomingHeaders: request.headers,
      incomingQuery: requestUrl.searchParams,
      incomingBody: body,
    });

    await logRun(env.DB, {
      configId: id,
      mode: "run",
      status: "ok",
      pageCount: result.pages.length,
      itemCount: result.items.length,
      durationMs: result.durationMs,
      upstreamStatus: result.upstreamStatus,
      stopReason: result.stopReason,
      retryCount: result.retryCount,
    });

    if (config.responseMode === "envelope") {
      return json({
        data: result.items,
        meta: {
          itemCount: result.items.length,
          pageCount: result.pages.length,
          durationMs: result.durationMs,
          truncated: result.truncated,
          stopReason: result.stopReason,
          retryCount: result.retryCount,
        },
      });
    }

    return json(result.items);
  } catch (error) {
    await logRun(env.DB, {
      configId: id,
      mode: "run",
      status: "error",
      upstreamStatus: error instanceof UpstreamError ? error.status : undefined,
      error: getAnalyticsErrorCode(error),
    });
    throw error;
  }
}

function validateConfigInput(config: RunnerConfig | undefined): asserts config is RunnerConfig {
  if (!config || typeof config !== "object") {
    throw new HttpError(400, "Missing config");
  }

  if (!config.targetUrl || !/^https?:\/\//i.test(config.targetUrl)) {
    throw new HttpError(400, "Target URL must be an absolute HTTP URL");
  }

  assertTargetUrlDoesNotStoreSecrets(config.targetUrl);

  if ((config.staticHeaders ?? []).some((header) => isSensitiveHeaderName(header.name))) {
    throw new HttpError(400, "Credential headers must be pass-through or test-only, not saved as static headers");
  }

  if (!config.name || config.name.trim().length < 2) {
    throw new HttpError(400, "Name is required");
  }
}

function assertTargetUrlDoesNotStoreSecrets(targetUrl: string): void {
  const url = new URL(targetUrl.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, "placeholder"));
  for (const [key, value] of url.searchParams.entries()) {
    if (isSensitiveQueryParamName(key) && value && !/^placeholder$/i.test(value)) {
      throw new HttpError(
        400,
        `Target URL appears to contain a credential in "${key}". Use a placeholder like {{${key}}} and pass the value at run time.`,
      );
    }
  }
}

function isSensitiveQueryParamName(name: string): boolean {
  return /^(api[_-]?key|apikey|key|token|access[_-]?token|auth[_-]?token|authorization|credential|client[_-]?secret|secret|password)$/i.test(
    name.trim(),
  );
}

function headersFromPairs(pairs: HeaderPair[]): Headers {
  const headers = new Headers();
  for (const pair of pairs) {
    if (pair.name.trim() && pair.value.trim()) {
      headers.set(pair.name.trim(), pair.value.trim());
    }
  }
  return headers;
}

function html(markup: string): Response {
  return new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function htmlHead(): Response {
  return new Response(null, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function json(body: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: JSON_HEADERS,
    }),
  );
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization,x-api-key,api-key");
  return new Response(response.body, { status: response.status, headers });
}

function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }

  if (error instanceof MissingPlaceholderError) {
    return json(
      {
        error: error.message,
        code: "missing_url_placeholder",
        missing: error.names,
      },
      400,
    );
  }

  if (error instanceof UpstreamError) {
    return json(
      {
        error: error.message,
        upstreamStatus: error.status,
        upstreamBody: error.body,
      },
      error.status >= 400 && error.status < 600 ? error.status : 502,
    );
  }

  if (error instanceof DuplicateConfigError) {
    return json(
      {
        error: error.message,
        code: "duplicate_config",
        targetUrl: error.targetUrl,
        method: error.method,
      },
      409,
    );
  }

  if (error instanceof ImmutableConfigError) {
    return json({ error: error.message, code: "immutable_config" }, 409);
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return json({ error: message }, 500);
}

function isSensitiveHeaderName(name: string): boolean {
  return /^(authorization|proxy-authorization|x-api-key|api-key|apikey|x-auth-token|x-access-token)$/i.test(name.trim());
}

function getAnalyticsErrorCode(error: unknown): string {
  if (error instanceof UpstreamError) {
    return `upstream_${error.status}`;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "upstream_timeout";
  }

  return "request_failed";
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}
