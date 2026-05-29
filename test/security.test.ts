import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { encryptRunnerToken } from "../src/runnerToken";
import type { Env, RunnerConfig } from "../src/types";

const baseConfig: RunnerConfig = {
  name: "Security smoke",
  targetUrl: "https://example.com/items",
  method: "GET",
  resultPath: "data",
  responseMode: "array",
  staticHeaders: [{ name: "Accept", value: "application/json" }],
  passThroughHeaders: ["authorization"],
  pagination: {
    type: "none",
    maxPages: 1,
  },
};

// Production runner ids are UUIDv4; the run path now validates the shape before
// any D1 read, so run-path tests must use a real UUID.
const RUNNER_ID = "11111111-1111-4111-8111-111111111111";

function rateLimit(success: boolean): RateLimit {
  return { limit: async () => ({ success }) } as unknown as RateLimit;
}

const env = (overrides: Partial<Env> = {}): Env => ({
  DB: dbWithConfig(null),
  ADMIN_TOKEN: "admin-secret",
  ...overrides,
});

function dbWithConfig(config: RunnerConfig | null, tokenRowInput: Record<string, unknown> | null = null): D1Database {
  const configRow = config
    ? {
      id: config.id ?? "runner-id",
      name: config.name,
      target_url: config.targetUrl,
      target_method: config.method,
      config_json: JSON.stringify(config),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    : null;
  let tokenRow = tokenRowInput;
  let usageRows: Record<string, unknown>[] = [];

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("LEFT JOIN runner_tokens")) {
            if (!configRow) return null;
            return {
              c_id: configRow.id,
              c_config_json: configRow.config_json,
              t_config_id: tokenRow ? (tokenRow.config_id ?? configRow.id) : null,
              t_token_hash: tokenRow?.token_hash ?? null,
              t_token_ciphertext: tokenRow?.token_ciphertext ?? null,
              t_token_iv: tokenRow?.token_iv ?? null,
              t_created_at: tokenRow?.created_at ?? null,
              t_updated_at: tokenRow?.updated_at ?? null,
              t_rotated_at: tokenRow?.rotated_at ?? null,
              t_emailed_at: tokenRow?.emailed_at ?? null,
            };
          }
          if (sql.includes("FROM configs")) return configRow;
          if (sql.includes("FROM runner_tokens")) return tokenRow;
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO runner_tokens")) {
            tokenRow = {
              config_id: args[0],
              token_hash: args[1],
              token_ciphertext: args[2],
              token_iv: args[3],
              created_at: args[4],
              updated_at: args[5],
              rotated_at: args[6],
              emailed_at: null,
            };
          }
          if (sql.includes("UPDATE runner_tokens SET emailed_at")) {
            tokenRow = tokenRow ? { ...tokenRow, emailed_at: args[0], updated_at: args[1] } : tokenRow;
          }
          if (sql.includes("INSERT INTO runner_usage_notes")) {
            usageRows = [
              {
                id: args[0],
                config_id: args[1],
                workspace_id: args[2],
                added_by: args[3],
                note: args[4],
                created_at: args[5],
              },
              ...usageRows,
            ];
          }
          return { success: true };
        },
        all: async () => {
          if (sql.includes("FROM runner_usage_notes")) return { results: usageRows };
          return { results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}

function emailBinding(sent: unknown[]): SendEmail {
  return {
    send: async (message: unknown) => {
      sent.push(message);
      return { messageId: "test-message" };
    },
  } as SendEmail;
}

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`https://paginate.chris-apis.xyz${path}`, init);
}

describe("security controls", () => {
  it("serves the UI shell without admin auth but with browser security headers", async () => {
    const response = await worker.fetch(request("/"), env());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("fails closed when admin APIs are missing ADMIN_TOKEN", async () => {
    const response = await worker.fetch(request("/api/configs"), env({ ADMIN_TOKEN: undefined }));

    expect(response.status).toBe(503);
  });

  it("rejects unauthenticated admin API calls", async () => {
    const response = await worker.fetch(request("/api/configs"), env());

    expect(response.status).toBe(401);
  });

  it("does not emit wildcard CORS headers on admin API errors", async () => {
    const response = await worker.fetch(request("/api/configs"), env());

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects unsafe methods before proxying", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ config: { ...baseConfig, method: "DELETE" } }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "security_validation_failed" });
  });

  it("rejects private upstream hosts before proxying", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ config: { ...baseConfig, targetUrl: "https://127.0.0.1/admin" } }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects URL placeholders in the target authority", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ config: { ...baseConfig, targetUrl: "https://{{host}}/items" }, queryString: "host=example.com" }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "security_validation_failed" });
  });

  it("enforces the optional upstream host allowlist before proxying", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ config: { ...baseConfig, targetUrl: "https://example.com/items" } }),
      }),
      env({ ALLOWED_UPSTREAM_HOSTS: "api.example.com" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "security_validation_failed" });
  });

  it("rejects static credential headers", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({
          config: { ...baseConfig, staticHeaders: [{ name: "x-rapidapi-key", value: "secret" }] },
        }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects runner control headers as upstream pass-through headers", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({
          config: { ...baseConfig, passThroughHeaders: ["authorization", "x-clay-paginate-token"] },
        }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects credential-looking body templates", async () => {
    const response = await worker.fetch(
      request("/api/test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({
          config: { ...baseConfig, method: "POST", bodyTemplate: JSON.stringify({ api_key: "secret" }) },
        }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects requests to non-allowed hosts (no workers.dev bypass)", async () => {
    const response = await worker.fetch(
      new Request("https://clay-pagination-runner.example.workers.dev/api/configs", {
        headers: { "x-admin-token": "admin-secret" },
      }),
      env(),
    );

    expect(response.status).toBe(404);
  });

  it("rejects non-UUID runner ids before any D1 read", async () => {
    const exploding = { prepare: () => { throw new Error("D1 must not be touched"); } } as unknown as D1Database;
    const response = await worker.fetch(request("/not-a-uuid"), env({ DB: exploding }));

    expect(response.status).toBe(404);
  });

  it("rate limits run requests before reading D1", async () => {
    const exploding = { prepare: () => { throw new Error("D1 must not be touched"); } } as unknown as D1Database;
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, { headers: { "cf-connecting-ip": "198.51.100.10" } }),
      env({ DB: exploding, RUN_RL: rateLimit(false) }),
    );

    expect(response.status).toBe(429);
  });

  it("rate limits repeated failed admin authentication", async () => {
    const response = await worker.fetch(
      request("/api/configs", { headers: { "x-admin-token": "wrong-token" } }),
      env({ ADMIN_RL: rateLimit(false) }),
    );

    expect(response.status).toBe(429);
  });

  it("rejects oversized run request bodies", async () => {
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "2000000" },
        body: "{}",
      }),
      env(),
    );

    expect(response.status).toBe(413);
  });

  it("can restrict public runner execution to configured caller CIDRs", async () => {
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        headers: { "cf-connecting-ip": "198.51.100.10" },
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }), ALLOWED_RUN_CIDRS: "203.0.113.0/24" }),
    );

    expect(response.status).toBe(403);
  });

  it("allows runner execution with a dedicated runner token when CIDR does not match", async () => {
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        headers: {
          "cf-connecting-ip": "198.51.100.10",
          "x-clay-paginate-token": "runner-secret",
        },
      }),
      env({
        DB: dbWithConfig({ ...baseConfig, id: "runner-id", targetUrl: "https://127.0.0.1/private" }),
        ALLOWED_RUN_CIDRS: "203.0.113.0/24",
        RUNNER_AUTH_TOKEN: "runner-secret",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("requires the runner token when token auth is configured without a CIDR gate", async () => {
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        headers: { "cf-connecting-ip": "198.51.100.10" },
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }), RUNNER_AUTH_TOKEN: "runner-secret" }),
    );

    expect(response.status).toBe(403);
  });

  it("prefers per-runner tokens over the legacy global runner token", async () => {
    const encrypted = await encryptRunnerToken("runner-specific", "test-encryption-key");
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        headers: { "x-clay-paginate-token": "global-secret" },
      }),
      env({
        DB: dbWithConfig(
          { ...baseConfig, id: "runner-id" },
          {
            config_id: "runner-id",
            token_hash: encrypted.tokenHash,
            token_ciphertext: encrypted.tokenCiphertext,
            token_iv: encrypted.tokenIv,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rotated_at: null,
            emailed_at: null,
          },
        ),
        RUNNER_AUTH_TOKEN: "global-secret",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("only emails runner tokens to clay.com addresses", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id/runner-token/email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ email: "person@example.com", generateIfMissing: true }),
      }),
      env(),
    );

    expect(response.status).toBe(400);
  });

  it("generates and emails a runner token without returning it in JSON", async () => {
    const sent: unknown[] = [];
    const response = await worker.fetch(
      request("/api/configs/runner-id/runner-token/email", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ email: "person@clay.com", generateIfMissing: true }),
      }),
      env({
        DB: dbWithConfig({ ...baseConfig, id: "runner-id" }),
        EMAIL: emailBinding(sent),
        RUNNER_TOKEN_ENCRYPTION_KEY: "test-encryption-key",
      }),
    );

    const bodyText = await response.text();
    expect(response.status).toBe(200);
    expect(bodyText).not.toContain("cpr_");
    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0])).toContain("person@clay.com");
    expect(JSON.stringify(sent[0])).toContain("x-clay-paginate-token: cpr_");
    expect(JSON.stringify(sent[0])).toContain("?runner=runner-id");
    expect(JSON.stringify(sent[0])).toContain("view=analytics");
  });

  it("requires admin auth for usage-note reads", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id/usage-notes"),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }) }),
    );

    expect(response.status).toBe(401);
  });

  it("does not expose config detail usage notes without valid admin auth", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id", {
        headers: { "x-admin-token": "wrong-token" },
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }) }),
    );

    const bodyText = await response.text();
    expect(response.status).toBe(401);
    expect(bodyText).not.toContain("usageNotes");
    expect(bodyText).not.toContain("workspace");
  });

  it("adds manual runner usage notes for token-rotation coordination", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id/usage-notes", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({
          workspaceId: "workspace_123",
          addedBy: "Chris",
          note: "Signals table used by EGS. Notify #signals-ops before rotation.",
        }),
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }) }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      usageNote: {
        configId: "runner-id",
        workspaceId: "workspace_123",
        addedBy: "Chris",
        note: "Signals table used by EGS. Notify #signals-ops before rotation.",
      },
      usageNotes: [
        {
          workspaceId: "workspace_123",
        },
      ],
    });
  });

  it("rejects credential-looking usage notes", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id/usage-notes", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({
          workspaceId: "workspace_123",
          addedBy: "Chris",
          note: "token: abcdefghijklmnopqrstuvwxyz",
        }),
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }) }),
    );

    expect(response.status).toBe(400);
  });

  it("requires explicit acknowledgement before regenerating runner tokens", async () => {
    const response = await worker.fetch(
      request("/api/configs/runner-id/runner-token/regenerate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": "admin-secret" },
        body: JSON.stringify({ email: "person@clay.com", confirmation: "yes", acknowledgeOffline: true }),
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }) }),
    );

    expect(response.status).toBe(400);
  });

  it("does not trust spoofable x-forwarded-for for public runner CIDR checks", async () => {
    const response = await worker.fetch(
      request(`/${RUNNER_ID}`, {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
      env({ DB: dbWithConfig({ ...baseConfig, id: "runner-id" }), ALLOWED_RUN_CIDRS: "203.0.113.0/24" }),
    );

    expect(response.status).toBe(403);
  });
});
