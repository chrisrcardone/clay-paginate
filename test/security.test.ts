import { describe, expect, it } from "vitest";
import worker from "../src/index";
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

const env = (overrides: Partial<Env> = {}): Env => ({
  DB: {} as D1Database,
  ADMIN_TOKEN: "admin-secret",
  ...overrides,
});

function dbWithConfig(config: RunnerConfig | null): D1Database {
  const row = config
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

  return {
    prepare: () => ({
      bind: () => ({
        first: async () => row,
        run: async () => ({ success: true }),
      }),
    }),
  } as unknown as D1Database;
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

  it("can restrict public runner execution to configured caller CIDRs", async () => {
    const response = await worker.fetch(
      request("/runner-id", {
        headers: { "cf-connecting-ip": "198.51.100.10" },
      }),
      env({ ALLOWED_RUN_CIDRS: "203.0.113.0/24" }),
    );

    expect(response.status).toBe(403);
  });

  it("allows runner execution with a dedicated runner token when CIDR does not match", async () => {
    const response = await worker.fetch(
      request("/runner-id", {
        headers: {
          "cf-connecting-ip": "198.51.100.10",
          "x-clay-paginate-token": "runner-secret",
        },
      }),
      env({
        DB: dbWithConfig(null),
        ALLOWED_RUN_CIDRS: "203.0.113.0/24",
        RUNNER_AUTH_TOKEN: "runner-secret",
      }),
    );

    expect(response.status).toBe(404);
  });

  it("requires the runner token when token auth is configured without a CIDR gate", async () => {
    const response = await worker.fetch(
      request("/runner-id", {
        headers: { "cf-connecting-ip": "198.51.100.10" },
      }),
      env({ RUNNER_AUTH_TOKEN: "runner-secret" }),
    );

    expect(response.status).toBe(403);
  });

  it("does not trust spoofable x-forwarded-for for public runner CIDR checks", async () => {
    const response = await worker.fetch(
      request("/runner-id", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
      env({ ALLOWED_RUN_CIDRS: "203.0.113.0/24" }),
    );

    expect(response.status).toBe(403);
  });
});
