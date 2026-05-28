import { runPagination, UpstreamError } from "./pagination";
import { renderApp } from "./ui";
import {
  deleteConfig,
  DuplicateConfigError,
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    try {
      if (url.pathname === "/" && request.method === "GET") {
        return html(renderApp());
      }

      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true });
      }

      if (url.pathname === "/api/test" && request.method === "POST") {
        requireAdmin(request, env);
        return await handleTest(request, env);
      }

      if (url.pathname === "/api/configs" && request.method === "GET") {
        requireAdmin(request, env);
        const configs = await listConfigs(env.DB, url.origin);
        return json({ configs });
      }

      if (url.pathname === "/api/configs" && request.method === "POST") {
        requireAdmin(request, env);
        return await handleSave(request, env, url.origin);
      }

      const configMatch = url.pathname.match(/^\/api\/configs\/([^/]+)$/);
      if (configMatch && request.method === "GET") {
        requireAdmin(request, env);
        return await handleGet(env, configMatch[1], url.origin);
      }

      if (configMatch && request.method === "DELETE") {
        requireAdmin(request, env);
        const deleted = await deleteConfig(env.DB, configMatch[1]);
        return json({ deleted });
      }

      const analyticsMatch = url.pathname.match(/^\/api\/configs\/([^/]+)\/analytics$/);
      if (analyticsMatch && request.method === "GET") {
        requireAdmin(request, env);
        return await handleAnalytics(env, analyticsMatch[1]);
      }

      const runMatch = url.pathname.match(/^\/run\/([^/]+)$/);
      if (runMatch && (request.method === "GET" || request.method === "POST")) {
        return await handleRun(request, env, runMatch[1]);
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return handleError(error);
    }
  },
};

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
    });
  }

  return json({
    ok: true,
    itemCount: result.items.length,
    pageCount: result.pages.length,
    durationMs: result.durationMs,
    truncated: result.truncated,
    pages: result.pages,
    sample: result.items.slice(0, 10),
  });
}

async function handleAnalytics(env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  return json({ analytics: await getAnalytics(env.DB, id) });
}

async function handleSave(request: Request, env: Env, origin: string): Promise<Response> {
  const body = await request.json<{ config: RunnerConfig }>();
  validateConfigInput(body.config);
  const config = await saveConfig(env.DB, body.config);
  return json({
    config,
    runUrl: `${origin}/run/${config.id}`,
  });
}

async function handleGet(env: Env, id: string, origin: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  return json({
    config,
    runUrl: `${origin}/run/${config.id}`,
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
    });

    if (config.responseMode === "envelope") {
      return json({
        data: result.items,
        meta: {
          itemCount: result.items.length,
          pageCount: result.pages.length,
          durationMs: result.durationMs,
          truncated: result.truncated,
        },
      });
    }

    return json(result.items);
  } catch (error) {
    await logRun(env.DB, {
      configId: id,
      mode: "run",
      status: "error",
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

  if ((config.staticHeaders ?? []).some((header) => isSensitiveHeaderName(header.name))) {
    throw new HttpError(400, "Credential headers must be pass-through or test-only, not saved as static headers");
  }

  if (!config.name || config.name.trim().length < 2) {
    throw new HttpError(400, "Name is required");
  }
}

function requireAdmin(request: Request, env: Env): void {
  if (!env.ADMIN_TOKEN) {
    return;
  }

  const provided = request.headers.get("x-admin-token");
  if (provided !== env.ADMIN_TOKEN) {
    throw new HttpError(401, "Unauthorized");
  }
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
  headers.set("access-control-allow-headers", "content-type,x-admin-token,authorization,x-api-key,api-key");
  return new Response(response.body, { status: response.status, headers });
}

function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
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
