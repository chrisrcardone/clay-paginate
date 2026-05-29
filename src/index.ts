import { detectFromFirstResponse, MissingPlaceholderError, runPagination, UpstreamError } from "./pagination";
import {
  SecurityValidationError,
  assertAllowedMethod,
  assertBodyTemplateDoesNotStoreSecrets,
  assertSafeUpstreamUrl,
  assertStaticHeadersAreSafe,
  isCallerIpAllowed,
} from "./security";
import { renderApp } from "./ui";
import {
  DuplicateConfigError,
  ImmutableConfigError,
  getAnalytics,
  getConfig,
  getRunnerTokenRecord,
  getRunnerTokenStatus,
  listConfigs,
  logRun,
  markRunnerTokenEmailed,
  saveConfig,
  upsertRunnerToken,
} from "./storage";
import { decryptRunnerToken, encryptRunnerToken, generateRunnerToken, verifyRunnerToken } from "./runnerToken";
import type { Env, HeaderPair, RunnerConfig, TestRequest } from "./types";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};

const LEGACY_BASE_PATH = "/paginate";
const RUNNER_AUTH_HEADERS = ["x-clay-paginate-token", "x-runner-token"];
const RUNNER_TOKEN_CONFIRMATION = "REGENERATE RUNNER TOKEN";
const TOKEN_EMAIL_FROM = "no-reply@chris-apis.xyz";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = getRoute(url);

    if (request.method === "OPTIONS") {
      return withSecurityHeaders(new Response(null, { status: 204 }));
    }

    try {
      if (route.appPath === "/" && isReadMethod(request.method)) {
        return request.method === "HEAD" ? htmlHead() : html(renderApp(route.basePath));
      }

      if (route.appPath === "/health" && isReadMethod(request.method)) {
        return json({ ok: true });
      }

      if (route.appPath === "/api/test" && request.method === "POST") {
        requireAdmin(request, env);
        return await handleTest(request, env);
      }

      if (route.appPath === "/api/detect" && request.method === "POST") {
        requireAdmin(request, env);
        return await handleDetect(request, env);
      }

      if (route.appPath === "/api/configs" && request.method === "GET") {
        requireAdmin(request, env);
        const configs = await listConfigs(env.DB, route.publicBaseUrl(url.origin));
        return json({ configs });
      }

      if (route.appPath === "/api/configs" && request.method === "POST") {
        requireAdmin(request, env);
        return await handleSave(request, env, route.publicBaseUrl(url.origin));
      }

      const configMatch = route.appPath.match(/^\/api\/configs\/([^/]+)$/);
      if (configMatch && request.method === "GET") {
        requireAdmin(request, env);
        return await handleGet(env, configMatch[1], route.publicBaseUrl(url.origin));
      }

      if (configMatch && request.method === "DELETE") {
        requireAdmin(request, env);
        return json({ error: "Saved configurations are immutable and cannot be deleted" }, 405);
      }

      const analyticsMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/analytics$/);
      if (analyticsMatch && request.method === "GET") {
        requireAdmin(request, env);
        return await handleAnalytics(env, analyticsMatch[1]);
      }

      const tokenEmailMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/runner-token\/email$/);
      if (tokenEmailMatch && request.method === "POST") {
        requireAdmin(request, env);
        return await handleEmailRunnerToken(request, env, tokenEmailMatch[1], route.publicBaseUrl(url.origin));
      }

      const tokenRegenerateMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/runner-token\/regenerate$/);
      if (tokenRegenerateMatch && request.method === "POST") {
        requireAdmin(request, env);
        return await handleRegenerateRunnerToken(request, env, tokenRegenerateMatch[1], route.publicBaseUrl(url.origin));
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

function requireAdmin(request: Request, env: Env): void {
  if (!hasValidAdminToken(request, env)) {
    if (!env.ADMIN_TOKEN) {
      throw new HttpError(503, "Admin API is not configured");
    }
    throw new HttpError(401, "Unauthorized");
  }
}

async function assertRunCallerAllowed(request: Request, env: Env, configId: string): Promise<void> {
  const hasRunCidrGate = Boolean(env.ALLOWED_RUN_CIDRS?.trim());
  const runnerToken = await getRunnerTokenRecord(env.DB, configId);
  const hasRunTokenGate = Boolean(runnerToken || env.RUNNER_AUTH_TOKEN);

  if (!hasRunCidrGate && !hasRunTokenGate) {
    return;
  }

  if (
    (hasRunCidrGate && isCallerIpAllowed(getClientIp(request), env.ALLOWED_RUN_CIDRS)) ||
    (hasRunTokenGate && await hasValidRunnerToken(request, env, runnerToken)) ||
    hasValidAdminToken(request, env)
  ) {
    return;
  }

  throw new HttpError(403, "Caller is not allowed for runner execution");
}

function hasValidAdminToken(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN ?? "";
  if (!expected) return false;
  const provided = request.headers.get("x-admin-token") ?? "";
  return constantTimeEqual(provided, expected);
}

async function hasValidRunnerToken(
  request: Request,
  env: Env,
  runnerToken: Awaited<ReturnType<typeof getRunnerTokenRecord>>,
): Promise<boolean> {
  const provided = RUNNER_AUTH_HEADERS.map((name) => request.headers.get(name) ?? "").find(Boolean) ?? "";
  if (!provided) return false;

  if (runnerToken) {
    return verifyRunnerToken(provided, runnerToken.tokenHash);
  }

  const expected = env.RUNNER_AUTH_TOKEN ?? "";
  return Boolean(expected) && constantTimeEqual(provided, expected);
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function getClientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip");
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  const body = await request.json<TestRequest>();
  validateConfigInput(body.config, env);
  const query = new URLSearchParams(body.queryString ?? "");
  const result = await runPagination(body.config, {
    incomingHeaders: headersFromPairs(body.credentialHeaders ?? []),
    incomingQuery: query,
    incomingBody: body.body,
    testMode: true,
    allowedUpstreamHosts: env.ALLOWED_UPSTREAM_HOSTS,
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

async function handleDetect(request: Request, env: Env): Promise<Response> {
  const body = await request.json<TestRequest>();
  validateConfigInput(body.config, env);
  const query = new URLSearchParams(body.queryString ?? "");
  const detection = await detectFromFirstResponse(body.config, {
    incomingHeaders: headersFromPairs(body.credentialHeaders ?? []),
    incomingQuery: query,
    incomingBody: body.body,
    testMode: true,
    allowedUpstreamHosts: env.ALLOWED_UPSTREAM_HOSTS,
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
  validateConfigInput(body.config, env);
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
    runnerToken: await getRunnerTokenStatus(env.DB, id),
  });
}

async function handleRun(request: Request, env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }
  await assertRunCallerAllowed(request, env, id);
  validateConfigInput(config, env);

  const requestUrl = new URL(request.url);
  const body = request.method === "POST" ? await request.text() : undefined;

  try {
    const result = await runPagination(config, {
      incomingHeaders: stripControlHeaders(request.headers),
      incomingQuery: requestUrl.searchParams,
      incomingBody: body,
      allowedUpstreamHosts: env.ALLOWED_UPSTREAM_HOSTS,
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

async function handleEmailRunnerToken(request: Request, env: Env, id: string, publicBaseUrl: string): Promise<Response> {
  const body = await request.json<{ email?: string; generateIfMissing?: boolean }>();
  const recipient = normalizeClayEmail(body.email);
  const config = await requireConfig(env, id);
  let tokenRecord = await getRunnerTokenRecord(env.DB, id);
  let generated = false;
  let token: string;

  if (!tokenRecord) {
    if (!body.generateIfMissing) {
      return json(
        {
          error: "No runner token has been generated for this runner yet",
          code: "runner_token_missing",
        },
        409,
      );
    }
    token = await createAndStoreRunnerToken(env, id, false);
    generated = true;
  } else {
    token = await decryptStoredRunnerToken(env, tokenRecord);
  }

  await sendRunnerTokenEmail(env, {
    recipient,
    token,
    runUrl: `${publicBaseUrl}/${id}`,
    runnerName: config.name,
    regenerated: false,
  });

  return json({
    ok: true,
    generated,
    recipient,
    runnerToken: await markRunnerTokenEmailed(env.DB, id),
  });
}

async function handleRegenerateRunnerToken(request: Request, env: Env, id: string, publicBaseUrl: string): Promise<Response> {
  const body = await request.json<{ email?: string; confirmation?: string; acknowledgeOffline?: boolean }>();
  const recipient = normalizeClayEmail(body.email);
  if (body.confirmation !== RUNNER_TOKEN_CONFIRMATION || body.acknowledgeOffline !== true) {
    throw new HttpError(400, `Type "${RUNNER_TOKEN_CONFIRMATION}" and acknowledge the outage risk before regenerating this runner token`);
  }

  const config = await requireConfig(env, id);
  const token = await createAndStoreRunnerToken(env, id, true);
  await sendRunnerTokenEmail(env, {
    recipient,
    token,
    runUrl: `${publicBaseUrl}/${id}`,
    runnerName: config.name,
    regenerated: true,
  });

  return json({
    ok: true,
    regenerated: true,
    recipient,
    runnerToken: await markRunnerTokenEmailed(env.DB, id),
  });
}

async function requireConfig(env: Env, id: string): Promise<RunnerConfig> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    throw new HttpError(404, "Config not found");
  }
  return config;
}

async function createAndStoreRunnerToken(env: Env, configId: string, rotated: boolean): Promise<string> {
  if (!env.RUNNER_TOKEN_ENCRYPTION_KEY) {
    throw new HttpError(503, "Runner token encryption is not configured");
  }

  const token = generateRunnerToken();
  const encrypted = await encryptRunnerToken(token, env.RUNNER_TOKEN_ENCRYPTION_KEY);
  await upsertRunnerToken(env.DB, {
    configId,
    tokenHash: encrypted.tokenHash,
    tokenCiphertext: encrypted.tokenCiphertext,
    tokenIv: encrypted.tokenIv,
    rotated,
  });
  return token;
}

async function decryptStoredRunnerToken(
  env: Env,
  tokenRecord: NonNullable<Awaited<ReturnType<typeof getRunnerTokenRecord>>>,
): Promise<string> {
  if (!env.RUNNER_TOKEN_ENCRYPTION_KEY) {
    throw new HttpError(503, "Runner token encryption is not configured");
  }

  return decryptRunnerToken(tokenRecord.tokenCiphertext, tokenRecord.tokenIv, env.RUNNER_TOKEN_ENCRYPTION_KEY);
}

async function sendRunnerTokenEmail(
  env: Env,
  input: {
    recipient: string;
    token: string;
    runUrl: string;
    runnerName: string;
    regenerated: boolean;
  },
): Promise<void> {
  if (!env.EMAIL) {
    throw new HttpError(503, "Email sending is not configured");
  }

  const subject = input.regenerated
    ? `Regenerated Clay Pagination Runner token for ${input.runnerName}`
    : `Clay Pagination Runner token for ${input.runnerName}`;
  const text = [
    `Runner: ${input.runnerName}`,
    `Runner URL: ${input.runUrl}`,
    "",
    "Use this request header when Clay calls the generated runner URL:",
    `x-clay-paginate-token: ${input.token}`,
    "",
    "This token authenticates Clay to the pagination runner only. It is stripped before upstream API requests and is not an upstream API credential.",
    input.regenerated ? "This token was regenerated. Any Clay Signals or workflows using the previous token must be updated before their next run." : "",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#16181f">
      <h2>Clay Pagination Runner token</h2>
      <p><strong>Runner:</strong> ${escapeHtml(input.runnerName)}</p>
      <p><strong>Runner URL:</strong> <a href="${escapeHtml(input.runUrl)}">${escapeHtml(input.runUrl)}</a></p>
      <p>Use this request header when Clay calls the generated runner URL:</p>
      <pre style="padding:12px;background:#f4f6f8;border:1px solid #d6d9df;border-radius:6px;white-space:pre-wrap">x-clay-paginate-token: ${escapeHtml(input.token)}</pre>
      <p>This token authenticates Clay to the pagination runner only. It is stripped before upstream API requests and is not an upstream API credential.</p>
      ${input.regenerated ? "<p><strong>Important:</strong> This token was regenerated. Any Clay Signals or workflows using the previous token must be updated before their next run.</p>" : ""}
    </div>
  `;

  await env.EMAIL.send({
    to: input.recipient,
    from: { email: TOKEN_EMAIL_FROM, name: "Clay Pagination Runner" },
    subject,
    text,
    html,
  });
}

function normalizeClayEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@clay\.com$/.test(email)) {
    throw new HttpError(400, "Runner tokens can only be emailed to a clay.com address");
  }
  return email;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validateConfigInput(config: RunnerConfig | undefined, env: Env): asserts config is RunnerConfig {
  if (!config || typeof config !== "object") {
    throw new HttpError(400, "Missing config");
  }

  if (!config.targetUrl) {
    throw new HttpError(400, "Target URL is required");
  }

  assertAllowedMethod(config.method);
  assertSafeUpstreamUrl(config.targetUrl, env.ALLOWED_UPSTREAM_HOSTS);
  assertTargetUrlDoesNotStoreSecrets(config.targetUrl);
  assertStaticHeadersAreSafe(config.staticHeaders);
  assertBodyTemplateDoesNotStoreSecrets(config.bodyTemplate);

  const invalidPassThrough = (config.passThroughHeaders ?? []).find((header) => !/^[A-Za-z0-9-]+$/.test(header.trim()));
  if (invalidPassThrough) {
    throw new HttpError(400, `Invalid pass-through header name "${invalidPassThrough}"`);
  }

  const reservedPassThrough = (config.passThroughHeaders ?? []).find((header) => isReservedControlHeader(header));
  if (reservedPassThrough) {
    throw new HttpError(400, `Pass-through header "${reservedPassThrough}" is reserved by the runner and cannot be forwarded upstream`);
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

function stripControlHeaders(headers: Headers): Headers {
  const stripped = new Headers(headers);
  stripped.delete("x-admin-token");
  for (const name of RUNNER_AUTH_HEADERS) {
    stripped.delete(name);
  }
  return stripped;
}

function isReservedControlHeader(header: string): boolean {
  const normalized = header.trim().toLowerCase();
  return normalized === "x-admin-token" || RUNNER_AUTH_HEADERS.includes(normalized);
}

function html(markup: string): Response {
  return new Response(markup, {
    headers: HTML_HEADERS,
  });
}

function htmlHead(): Response {
  return new Response(null, {
    headers: HTML_HEADERS,
  });
}

function json(body: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: JSON_HEADERS,
    }),
  );
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
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

  if (error instanceof SecurityValidationError) {
    return json({ error: error.message, code: "security_validation_failed" }, 400);
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return json({ error: message }, 500);
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
