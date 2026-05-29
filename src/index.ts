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
  addRunnerUsageNote,
  getAnalytics,
  getConfig,
  getConfigWithToken,
  getRunnerTokenRecord,
  getRunnerTokenStatus,
  listRunnerUsageNotes,
  listConfigs,
  logRun,
  markRunnerTokenEmailed,
  pruneRunLogs,
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
// Only serve the production custom domain (plus local dev). This holds even if
// workers.dev / preview URLs get re-enabled, so edge protections cannot be
// bypassed by hitting an alternate hostname.
const ALLOWED_HOSTS = new Set(["paginate.chris-apis.xyz", "localhost", "127.0.0.1"]);
const RUNNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RUN_BODY_BYTES = 1_000_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!isAllowedHost(url.hostname)) {
      return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    }
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
        await requireAdmin(request, env);
        return await handleTest(request, env);
      }

      if (route.appPath === "/api/detect" && request.method === "POST") {
        await requireAdmin(request, env);
        return await handleDetect(request, env);
      }

      if (route.appPath === "/api/configs" && request.method === "GET") {
        await requireAdmin(request, env);
        const configs = await listConfigs(env.DB, route.publicBaseUrl(url.origin));
        return json({ configs });
      }

      if (route.appPath === "/api/configs" && request.method === "POST") {
        await requireAdmin(request, env);
        return await handleSave(request, env, route.publicBaseUrl(url.origin));
      }

      const configMatch = route.appPath.match(/^\/api\/configs\/([^/]+)$/);
      if (configMatch && request.method === "GET") {
        await requireAdmin(request, env);
        return await handleGet(env, configMatch[1], route.publicBaseUrl(url.origin));
      }

      if (configMatch && request.method === "DELETE") {
        await requireAdmin(request, env);
        return json({ error: "Saved configurations are immutable and cannot be deleted" }, 405);
      }

      const analyticsMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/analytics$/);
      if (analyticsMatch && request.method === "GET") {
        await requireAdmin(request, env);
        return await handleAnalytics(env, analyticsMatch[1]);
      }

      const usageMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/usage-notes$/);
      if (usageMatch && request.method === "GET") {
        await requireAdmin(request, env);
        return await handleListUsageNotes(env, usageMatch[1]);
      }

      if (usageMatch && request.method === "POST") {
        await requireAdmin(request, env);
        return await handleAddUsageNote(request, env, usageMatch[1]);
      }

      const tokenEmailMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/runner-token\/email$/);
      if (tokenEmailMatch && request.method === "POST") {
        await requireAdmin(request, env);
        return await handleEmailRunnerToken(request, env, tokenEmailMatch[1], route.publicBaseUrl(url.origin));
      }

      const tokenRegenerateMatch = route.appPath.match(/^\/api\/configs\/([^/]+)\/runner-token\/regenerate$/);
      if (tokenRegenerateMatch && request.method === "POST") {
        await requireAdmin(request, env);
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

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // Daily retention so run_logs cannot grow without bound under sustained load.
    ctx.waitUntil(pruneRunLogs(env.DB));
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

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname.toLowerCase());
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  if (hasValidAdminToken(request, env)) {
    return;
  }

  // Only failed/missing-token attempts are counted, so a valid operator is never
  // throttled while online brute-forcing of ADMIN_TOKEN is rate-limited per IP.
  if (env.ADMIN_RL) {
    const { success } = await env.ADMIN_RL.limit({ key: getClientIp(request) ?? "unknown" });
    if (!success) {
      throw new HttpError(429, "Too many authentication attempts. Try again shortly.");
    }
  }

  if (!env.ADMIN_TOKEN) {
    throw new HttpError(503, "Admin API is not configured");
  }
  throw new HttpError(401, "Unauthorized");
}

async function assertRunCallerAllowed(
  request: Request,
  env: Env,
  runnerToken: Awaited<ReturnType<typeof getRunnerTokenRecord>>,
): Promise<void> {
  const hasRunCidrGate = Boolean(env.ALLOWED_RUN_CIDRS?.trim());
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

// Best-effort, high-volume run metrics to Analytics Engine. This is the durable,
// write-cheap metrics sink; it never blocks or fails a run if the binding is
// absent or errors. D1 run_logs remains the source for the analytics UI.
function recordRunMetric(
  env: Env,
  input: {
    configId: string;
    mode: "run" | "test";
    status: "ok" | "error";
    pageCount?: number;
    itemCount?: number;
    durationMs?: number;
    upstreamStatus?: number;
    stopReason?: string;
    errorCode?: string;
  },
): void {
  if (!env.RUN_METRICS) return;
  try {
    env.RUN_METRICS.writeDataPoint({
      indexes: [input.configId],
      blobs: [input.mode, input.status, input.stopReason ?? "", input.errorCode ?? ""],
      doubles: [
        input.pageCount ?? 0,
        input.itemCount ?? 0,
        input.durationMs ?? 0,
        input.upstreamStatus ?? 0,
      ],
    });
  } catch {
    // Metrics are best-effort and must never fail a run.
  }
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
    detailUrl: buildDetailUrl(publicBaseUrl, config.id ?? ""),
    analyticsUrl: buildAnalyticsUrl(publicBaseUrl, config.id ?? ""),
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
    detailUrl: buildDetailUrl(publicBaseUrl, id),
    analyticsUrl: buildAnalyticsUrl(publicBaseUrl, id),
    runnerToken: await getRunnerTokenStatus(env.DB, id),
    usageNotes: await listRunnerUsageNotes(env.DB, id),
  });
}

async function handleListUsageNotes(env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  return json({ usageNotes: await listRunnerUsageNotes(env.DB, id) });
}

async function handleAddUsageNote(request: Request, env: Env, id: string): Promise<Response> {
  const config = await getConfig(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }

  const body = await request.json<{ workspaceId?: string; addedBy?: string; note?: string }>();
  const input = normalizeUsageNoteInput(body);
  const usageNote = await addRunnerUsageNote(env.DB, {
    configId: id,
    ...input,
  });
  return json({ usageNote, usageNotes: await listRunnerUsageNotes(env.DB, id) });
}

async function handleRun(request: Request, env: Env, id: string): Promise<Response> {
  // Reject anything that is not a real runner id before touching D1. This drops
  // scanner/bot traffic (favicon.ico, etc.) hitting the catch-all run route and
  // shrinks the unauthenticated D1-read surface to plausibly-valid ids only.
  if (!RUNNER_ID_PATTERN.test(id)) {
    return json({ error: "Config not found" }, 404);
  }

  // Per-caller rate limit, applied before any D1 read so a flood cannot exhaust
  // D1 quota / Worker invocations or hammer upstream APIs through this Worker.
  if (env.RUN_RL) {
    const { success } = await env.RUN_RL.limit({ key: getClientIp(request) ?? "unknown" });
    if (!success) {
      return json({ error: "Rate limit exceeded. Slow down and retry shortly." }, 429);
    }
  }

  // Reject oversized bodies up front so a large POST cannot pressure isolate memory.
  if (request.method === "POST") {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RUN_BODY_BYTES) {
      return json({ error: "Request body too large" }, 413);
    }
  }

  const { config, tokenRecord } = await getConfigWithToken(env.DB, id);
  if (!config) {
    return json({ error: "Config not found" }, 404);
  }
  await assertRunCallerAllowed(request, env, tokenRecord);
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
    recordRunMetric(env, {
      configId: id,
      mode: "run",
      status: "ok",
      pageCount: result.pages.length,
      itemCount: result.items.length,
      durationMs: result.durationMs,
      upstreamStatus: result.upstreamStatus,
      stopReason: result.stopReason,
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
    recordRunMetric(env, {
      configId: id,
      mode: "run",
      status: "error",
      upstreamStatus: error instanceof UpstreamError ? error.status : undefined,
      errorCode: getAnalyticsErrorCode(error),
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
    detailUrl: buildDetailUrl(publicBaseUrl, id),
    analyticsUrl: buildAnalyticsUrl(publicBaseUrl, id),
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
    detailUrl: buildDetailUrl(publicBaseUrl, id),
    analyticsUrl: buildAnalyticsUrl(publicBaseUrl, id),
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
    detailUrl: string;
    analyticsUrl: string;
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
    `Runner management link: ${input.detailUrl}`,
    `Analytics link: ${input.analyticsUrl}`,
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
      <p><strong>Runner management:</strong> <a href="${escapeHtml(input.detailUrl)}">${escapeHtml(input.detailUrl)}</a></p>
      <p><strong>Analytics:</strong> <a href="${escapeHtml(input.analyticsUrl)}">${escapeHtml(input.analyticsUrl)}</a></p>
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

function buildDetailUrl(publicBaseUrl: string, id: string): string {
  return `${publicBaseUrl}/?runner=${encodeURIComponent(id)}`;
}

function buildAnalyticsUrl(publicBaseUrl: string, id: string): string {
  return `${buildDetailUrl(publicBaseUrl, id)}&view=analytics`;
}

function normalizeUsageNoteInput(body: { workspaceId?: string; addedBy?: string; note?: string }): {
  workspaceId: string;
  addedBy: string;
  note: string;
} {
  const workspaceId = normalizeSingleLine(body.workspaceId, "Workspace ID", 120);
  const addedBy = normalizeSingleLine(body.addedBy, "Name", 120);
  const note = normalizeMultiLine(body.note, "Usage note", 1000);
  assertUsageNoteDoesNotLookSensitive(`${workspaceId}\n${addedBy}\n${note}`);
  return { workspaceId, addedBy, note };
}

function normalizeSingleLine(value: string | undefined, label: string, maxLength: number): string {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new HttpError(400, `${label} is required`);
  }
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${label} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

function normalizeMultiLine(value: string | undefined, label: string, maxLength: number): string {
  const normalized = (value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    throw new HttpError(400, `${label} is required`);
  }
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${label} must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

function assertUsageNoteDoesNotLookSensitive(value: string): void {
  if (/(cpr_[A-Za-z0-9_-]{20,}|bearer\s+[A-Za-z0-9._~+/=-]{20,}|api[_ -]?key\s*[:=]\s*\S{8,}|token\s*[:=]\s*\S{8,}|secret\s*[:=]\s*\S{8,})/i.test(value)) {
    throw new HttpError(400, "Usage notes must not contain credentials, tokens, or secrets");
  }
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
