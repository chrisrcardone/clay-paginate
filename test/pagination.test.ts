import { describe, expect, it } from "vitest";
import { getByPath } from "../src/jsonPath";
import { buildPageUrl, normalizeTargetUrl, runPagination } from "../src/pagination";
import type { RunnerConfig } from "../src/types";

const baseConfig: RunnerConfig = {
  name: "G2",
  targetUrl: "https://data.g2.com/api/v1/ahoy/remote-event-streams",
  method: "GET",
  resultPath: "data",
  responseMode: "array",
  staticHeaders: [],
  passThroughHeaders: ["authorization"],
  pagination: {
    type: "jsonapi",
    maxPages: 10,
    pageSize: 2,
    pageParam: "page[number]",
    pageSizeParam: "page[size]",
    startPage: 1,
    nextLinkPath: "links.next",
    totalPagesPath: "meta.page_count",
  },
};

describe("json path helper", () => {
  it("reads dotted and bracketed paths", () => {
    const value = { data: [{ attributes: { name: "Clay" } }], meta: { page_count: 2 } };
    expect(getByPath(value, "data[0].attributes.name")).toBe("Clay");
    expect(getByPath(value, "$.meta.page_count")).toBe(2);
  });
});

describe("page URL builder", () => {
  it("merges Clay query params and pagination params", () => {
    const url = buildPageUrl(
      baseConfig,
      { pageNumber: 1, offset: 0 },
      new URLSearchParams("filter[start_time]=2026-05-27T00:00:00Z"),
    );

    expect(url.searchParams.get("filter[start_time]")).toBe("2026-05-27T00:00:00Z");
    expect(url.searchParams.get("page[number]")).toBe("1");
    expect(url.searchParams.get("page[size]")).toBe("2");
  });
});

describe("target URL normalization", () => {
  it("canonicalizes equivalent target URLs before uniqueness checks", () => {
    expect(normalizeTargetUrl("HTTPS://DATA.G2.COM:443/api/v1/vendors?b=2&a=1#ignore")).toBe(
      "https://data.g2.com/api/v1/vendors?a=1&b=2",
    );
  });
});

describe("pagination runner", () => {
  it("follows JSON:API next links and returns a combined array", async () => {
    const calls: string[] = [];
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = input.toString();
      calls.push(url);
      const page = new URL(url).searchParams.get("page[number]");
      if (page === "1") {
        return Response.json({
          data: [{ id: "1" }, { id: "2" }],
          links: {
            next: "https://data.g2.com/api/v1/ahoy/remote-event-streams?page%5Bnumber%5D=2&page%5Bsize%5D=2",
          },
          meta: { page_count: 2 },
        });
      }

      return Response.json({
        data: [{ id: "3" }],
        links: {},
        meta: { page_count: 2 },
      });
    };

    const result = await runPagination(baseConfig, { fetcher });

    expect(result.items).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    expect(result.pages).toHaveLength(2);
    expect(calls[0]).toContain("page%5Bnumber%5D=1");
    expect(calls[1]).toContain("page%5Bnumber%5D=2");
  });

  it("fills URL placeholders from Clay query params without forwarding consumed secrets", async () => {
    let requestedUrl = "";
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      requestedUrl = input.toString();
      return Response.json({
        data: [{ id: "1" }],
        links: {},
        meta: { page_count: 1 },
      });
    };

    const result = await runPagination(
      {
        ...baseConfig,
        targetUrl: "https://api.example.com/call?api={{key}}",
        pagination: { ...baseConfig.pagination, maxPages: 1 },
      },
      {
        fetcher,
        incomingQuery: new URLSearchParams("key=secret-api-key&filter=value"),
      },
    );

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("api")).toBe("secret-api-key");
    expect(url.searchParams.get("key")).toBeNull();
    expect(url.searchParams.get("filter")).toBe("value");
    expect(result.pages[0].url).toContain("api=redacted");
  });
});
