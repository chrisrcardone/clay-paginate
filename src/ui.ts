export function renderApp(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clay Pagination Runner</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --ink: #15191f;
      --muted: #667085;
      --line: #d9dee7;
      --accent: #126a6f;
      --accent-ink: #ffffff;
      --warn: #a15c00;
      --danger: #b42318;
      --ok: #067647;
      --code: #101828;
      --shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-size: 14px;
      line-height: 1.45;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px;
      background: var(--panel);
      border-bottom: 1px solid var(--line);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 650;
      letter-spacing: 0;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 650;
      letter-spacing: 0;
    }
    main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
      gap: 16px;
      padding: 16px;
      max-width: 1440px;
      margin: 0 auto;
    }
    main > aside {
      grid-column: 2;
      grid-row: 1;
    }
    main > div.stack {
      grid-column: 1;
      grid-row: 1;
    }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 16px;
      min-width: 0;
    }
    .stack { display: grid; gap: 12px; }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    label {
      display: grid;
      gap: 6px;
      font-weight: 600;
      color: #344054;
      min-width: 0;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid #c9d1dc;
      border-radius: 6px;
      padding: 9px 10px;
      color: var(--ink);
      background: #fff;
      font: inherit;
      letter-spacing: 0;
    }
    textarea {
      min-height: 88px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    input:focus, select:focus, textarea:focus {
      outline: 2px solid rgba(18, 106, 111, 0.22);
      border-color: var(--accent);
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid #aeb8c7;
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      min-height: 38px;
      padding: 8px 12px;
      font-weight: 650;
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      color: var(--accent-ink);
      border-color: var(--accent);
    }
    button.danger {
      border-color: #f0b8b3;
      color: var(--danger);
    }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .muted { color: var(--muted); font-weight: 500; }
    .help {
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
    }
    .required {
      color: var(--danger);
      font-size: 12px;
      font-weight: 700;
    }
    .guide {
      display: grid;
      gap: 10px;
      color: #344054;
    }
    .guide ol, .guide ul {
      margin: 0;
      padding-left: 18px;
    }
    .guide li + li { margin-top: 6px; }
    .callout {
      border: 1px solid #b8d8db;
      border-radius: 8px;
      padding: 10px;
      background: #f0fbfc;
      color: #24484c;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid var(--line);
      padding: 3px 8px;
      font-size: 12px;
      color: #475467;
      background: #fff;
    }
    .saved-list {
      display: grid;
      gap: 8px;
      max-height: calc(100vh - 200px);
      overflow: auto;
    }
    .saved-item {
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 8px;
      min-height: 0;
      justify-content: stretch;
      align-items: stretch;
    }
    .saved-item strong, .saved-item span, .saved-item small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .saved-item .target { grid-column: 1 / -1; }
    .saved-item .volume {
      color: var(--accent);
      font-weight: 700;
      font-size: 12px;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .divider {
      height: 1px;
      background: var(--line);
      margin: 4px 0;
    }
    pre {
      margin: 0;
      max-height: 420px;
      overflow: auto;
      background: var(--code);
      color: #eef4ff;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
    }
    .status {
      min-height: 20px;
      font-weight: 650;
    }
    .status.ok { color: var(--ok); }
    .status.err { color: var(--danger); }
    .url-box {
      display: grid;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #fbfcfe;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fbfcfe;
      min-width: 0;
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    .metric strong {
      display: block;
      margin-top: 3px;
      font-size: 20px;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }
    .recent-runs {
      display: grid;
      gap: 6px;
    }
    .chart {
      min-height: 190px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fbfcfe;
      overflow-x: auto;
    }
    .chart svg {
      display: block;
      width: 100%;
      min-width: 520px;
      height: 170px;
    }
    .locked-notice {
      border: 1px solid #d5c7a3;
      border-radius: 8px;
      padding: 10px;
      background: #fff9e8;
      color: #614a12;
    }
    .run-row {
      display: grid;
      grid-template-columns: 84px 80px repeat(4, minmax(70px, 1fr));
      gap: 8px;
      align-items: center;
      border-bottom: 1px solid var(--line);
      padding: 8px 0;
      color: #344054;
      font-size: 12px;
    }
    .run-row:last-child { border-bottom: 0; }
    code {
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .header-row {
      display: grid;
      grid-template-columns: minmax(120px, 1fr) minmax(160px, 2fr) 38px;
      gap: 8px;
      align-items: end;
    }
    @media (max-width: 900px) {
      header { position: static; padding: 14px 16px; }
      main { grid-template-columns: 1fr; padding: 12px; }
      main > aside, main > div.stack { grid-column: 1; grid-row: auto; }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      .header-row { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .run-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <header>
    <h1>Clay Pagination Runner</h1>
    <div class="actions">
      <label style="min-width: 220px;">
        <span class="muted">Admin token</span>
        <input id="adminToken" type="password" autocomplete="off">
      </label>
      <button id="refreshBtn" type="button">Refresh</button>
    </div>
  </header>
  <main>
    <aside class="stack">
      <section>
        <div class="toolbar">
          <h2>Configurations</h2>
          <button id="newBtn" type="button">New</button>
        </div>
        <div class="help" style="margin-bottom: 10px;">Sorted by Clay call volume. Saved configurations are immutable.</div>
        <div id="savedList" class="saved-list"></div>
      </section>
      <section class="guide">
        <h2>Setup guide</h2>
        <ol>
          <li>Enter the upstream API endpoint and method. The same normalized URL and method can only be saved once.</li>
          <li>Use <code>{{name}}</code> placeholders for URL-only secrets, then pass them on the Clay URL as query params.</li>
          <li>Choose where the response array lives, pick pagination, and run a test with temporary credentials.</li>
          <li>Save only after the test looks right. Name, URL, method, and all pagination settings cannot be changed later.</li>
        </ol>
        <div class="callout">
          Credentials are not saved. Put tokens in Test credentials for previewing, then configure the same header in Clay so it is passed through at run time.
        </div>
      </section>
    </aside>
    <div class="stack">
      <section class="stack">
        <div class="toolbar">
          <h2>Configuration</h2>
          <span id="currentId" class="pill">Unsaved</span>
        </div>
        <div id="immutableNotice" class="locked-notice" hidden>This saved configuration is locked to protect live Clay workflows. Create a new runner for any changes.</div>
        <div class="grid-2">
          <label>Name <span class="required">Required</span><input id="name" autocomplete="off" value="G2 Buyer Intent events"><span class="help">A short label for the saved runner.</span></label>
          <label>Method
            <select id="method">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
            </select>
            <span class="help">Saved configurations are unique by method plus normalized target URL.</span>
          </label>
        </div>
        <label>Target URL <span class="required">Required</span><input id="targetUrl" autocomplete="off" value="https://data.g2.com/api/v1/ahoy/remote-event-streams"><span class="help">Use the upstream list endpoint. URL placeholders like <code>{{key}}</code> are filled from Clay URL query params and then removed from normal query forwarding.</span></label>
        <div class="grid-3">
          <label>Results path <span class="required">Required</span><input id="resultPath" value="data"><span class="help">Dot path to the array in each page response.</span></label>
          <label>Response
            <select id="responseMode">
              <option value="array">Array</option>
              <option value="envelope">Envelope</option>
            </select>
            <span class="help">Array is easiest for Clay. Envelope adds metadata.</span>
          </label>
          <label>Max items<input id="maxItems" type="number" min="1" placeholder="Optional"><span class="help">Optional hard cap across all pages.</span></label>
        </div>
        <div class="divider"></div>
        <div class="grid-3">
          <label>Pagination
            <select id="paginationType">
              <option value="jsonapi">JSON next link</option>
              <option value="page">Page number</option>
              <option value="offset">Offset limit</option>
              <option value="cursor">Cursor</option>
              <option value="linkHeader">Link header</option>
              <option value="none">None</option>
            </select>
            <span class="help">G2 uses JSON next link with <code>links.next</code>.</span>
          </label>
          <label>Max pages <span class="required">Required</span><input id="maxPages" type="number" min="1" max="250" value="25"><span class="help">Safety limit to prevent runaway pagination.</span></label>
          <label>Page size<input id="pageSize" type="number" min="1" value="25"><span class="help">For G2 BuyerIntent::EventStreams, use 25.</span></label>
        </div>
        <div class="grid-3">
          <label>Page param<input id="pageParam" value="page[number]"><span class="help">Used by JSON next link and page-number modes.</span></label>
          <label>Page size param<input id="pageSizeParam" value="page[size]"><span class="help">Used when the API accepts a page size parameter.</span></label>
          <label>Start page<input id="startPage" type="number" min="1" value="1"><span class="help">Usually 1.</span></label>
        </div>
        <div class="grid-2">
          <label>Next link path<input id="nextLinkPath" value="links.next"><span class="help">Dot path to the next page URL.</span></label>
          <label>Total pages path<input id="totalPagesPath" value="meta.page_count"><span class="help">Fallback for page-number APIs.</span></label>
        </div>
        <div class="grid-3">
          <label>Offset param<input id="offsetParam" value="offset"></label>
          <label>Limit param<input id="limitParam" value="limit"></label>
          <label>Start offset<input id="startOffset" type="number" min="0" value="0"></label>
        </div>
        <div class="grid-2">
          <label>Cursor param<input id="cursorParam" value="cursor"></label>
          <label>Next cursor path<input id="nextCursorPath" value="meta.next_cursor"></label>
        </div>
        <label>Initial cursor<input id="initialCursor"></label>
        <label>Clay query passthrough<input id="queryString" placeholder="filter[start_time]=2026-05-27T00:00:00Z"><span class="help">Test-only query params. In Clay, append these to the generated runner URL.</span></label>
        <label>Body template<textarea id="bodyTemplate" spellcheck="false"></textarea><span class="help">Optional saved request body for POST, PUT, or PATCH runners.</span></label>
      </section>

      <section class="stack">
        <div class="toolbar">
          <h2>Headers</h2>
          <button id="addStaticHeader" type="button">Add static header</button>
        </div>
        <label>Pass-through headers<input id="passThroughHeaders" value="authorization,x-api-key,api-key"><span class="help">Header names accepted from Clay and forwarded upstream. Values are never stored.</span></label>
        <div id="staticHeaders" class="stack"></div>
        <div class="divider"></div>
        <div class="toolbar">
          <h2>Test credentials</h2>
          <button id="addCredentialHeader" type="button">Add credential header</button>
        </div>
        <div id="credentialHeaders" class="stack"></div>
        <div class="callout">Do not add API tokens as static headers. Static headers are persisted for non-secret values such as content type or API version.</div>
      </section>

      <section id="analyticsPanel" class="stack" hidden>
        <div class="toolbar">
          <h2>Analytics</h2>
          <button id="analyticsRefreshBtn" type="button">Refresh analytics</button>
        </div>
        <div class="metrics">
          <div class="metric"><span>Total calls</span><strong id="metricTotalRuns">0</strong></div>
          <div class="metric"><span>Clay calls</span><strong id="metricClayRuns">0</strong></div>
          <div class="metric"><span>Items returned</span><strong id="metricItems">0</strong></div>
          <div class="metric"><span>Avg duration</span><strong id="metricDuration">0 ms</strong></div>
        </div>
        <div id="statusCounts" class="actions"></div>
        <div id="statusChart" class="chart"></div>
        <div class="help">Analytics are metadata-only: counts, timing, page totals, item totals, status, and error codes. No request headers, query params, request bodies, upstream URLs, or response rows are stored.</div>
        <div id="recentRuns" class="recent-runs"></div>
      </section>

      <section class="stack">
        <div class="actions">
          <button id="testBtn" class="primary" type="button">Run test</button>
          <button id="saveBtn" type="button">Save runner</button>
        </div>
        <div id="status" class="status"></div>
        <div id="runUrl" class="url-box" hidden>
          <strong>Clay URL</strong>
          <code id="runUrlText"></code>
          <div class="actions">
            <button id="copyBtn" type="button">Copy URL</button>
          </div>
        </div>
        <pre id="output">{}</pre>
      </section>
    </div>
  </main>
  <script>
    const state = { id: null, locked: false };
    const $ = (id) => document.getElementById(id);
    const configFieldIds = [
      "name", "method", "targetUrl", "resultPath", "responseMode", "maxItems",
      "paginationType", "maxPages", "pageSize", "pageParam", "pageSizeParam",
      "startPage", "nextLinkPath", "totalPagesPath", "offsetParam", "limitParam",
      "startOffset", "cursorParam", "nextCursorPath", "initialCursor",
      "bodyTemplate", "passThroughHeaders"
    ];

    const defaults = {
      name: "G2 Buyer Intent events",
      targetUrl: "https://data.g2.com/api/v1/ahoy/remote-event-streams",
      method: "GET",
      resultPath: "data",
      responseMode: "array",
      staticHeaders: [{ name: "Content-Type", value: "application/vnd.api+json" }],
      passThroughHeaders: ["authorization", "x-api-key", "api-key"],
      bodyTemplate: "",
      pagination: {
        type: "jsonapi",
        maxPages: 25,
        pageSize: 25,
        pageParam: "page[number]",
        pageSizeParam: "page[size]",
        startPage: 1,
        nextLinkPath: "links.next",
        totalPagesPath: "meta.page_count",
        offsetParam: "offset",
        limitParam: "limit",
        startOffset: 0,
        cursorParam: "cursor",
        nextCursorPath: "meta.next_cursor",
        initialCursor: ""
      }
    };

    function authHeaders() {
      const token = $("adminToken").value.trim();
      localStorage.setItem("paginationRunnerAdminToken", token);
      return token ? { "x-admin-token": token } : {};
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: {
          "content-type": "application/json",
          ...authHeaders(),
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(body?.error || "Request failed");
      }
      return body;
    }

    function setStatus(message, ok = true) {
      $("status").textContent = message;
      $("status").className = "status " + (ok ? "ok" : "err");
    }

    function print(value) {
      $("output").textContent = JSON.stringify(value, null, 2);
    }

    function addHeaderRow(containerId, pair = { name: "", value: "" }) {
      const row = document.createElement("div");
      row.className = "header-row";
      row.innerHTML = '<label>Name<input class="header-name"></label><label>Value<input class="header-value"></label><button type="button">x</button>';
      row.querySelector(".header-name").value = pair.name || "";
      row.querySelector(".header-value").value = pair.value || "";
      row.querySelector("button").addEventListener("click", () => row.remove());
      $(containerId).appendChild(row);
      setEditorLocked(state.locked);
    }

    function readHeaderRows(containerId) {
      return Array.from($(containerId).querySelectorAll(".header-row"))
        .map((row) => ({
          name: row.querySelector(".header-name").value.trim(),
          value: row.querySelector(".header-value").value.trim()
        }))
        .filter((row) => row.name && row.value);
    }

    function setHeaderRows(containerId, headers) {
      $(containerId).innerHTML = "";
      headers.forEach((header) => addHeaderRow(containerId, header));
    }

    function numberOrUndefined(id) {
      const value = $(id).value.trim();
      return value === "" ? undefined : Number(value);
    }

    function readConfig() {
      return {
        id: state.id || undefined,
        name: $("name").value.trim(),
        targetUrl: $("targetUrl").value.trim(),
        method: $("method").value,
        resultPath: $("resultPath").value.trim(),
        responseMode: $("responseMode").value,
        staticHeaders: readHeaderRows("staticHeaders"),
        passThroughHeaders: $("passThroughHeaders").value.split(",").map((x) => x.trim()).filter(Boolean),
        bodyTemplate: $("bodyTemplate").value,
        pagination: {
          type: $("paginationType").value,
          maxPages: Number($("maxPages").value || 25),
          maxItems: numberOrUndefined("maxItems"),
          pageSize: numberOrUndefined("pageSize"),
          pageParam: $("pageParam").value.trim(),
          pageSizeParam: $("pageSizeParam").value.trim(),
          startPage: numberOrUndefined("startPage"),
          nextLinkPath: $("nextLinkPath").value.trim(),
          totalPagesPath: $("totalPagesPath").value.trim(),
          offsetParam: $("offsetParam").value.trim(),
          limitParam: $("limitParam").value.trim(),
          startOffset: numberOrUndefined("startOffset"),
          cursorParam: $("cursorParam").value.trim(),
          nextCursorPath: $("nextCursorPath").value.trim(),
          initialCursor: $("initialCursor").value.trim()
        }
      };
    }

    function applyConfig(config) {
      state.id = config.id || null;
      state.locked = Boolean(state.id);
      $("currentId").textContent = state.id ? state.id : "Unsaved";
      $("name").value = config.name || "";
      $("targetUrl").value = config.targetUrl || "";
      $("method").value = config.method || "GET";
      $("resultPath").value = config.resultPath || "data";
      $("responseMode").value = config.responseMode || "array";
      $("passThroughHeaders").value = (config.passThroughHeaders || []).join(",");
      $("bodyTemplate").value = config.bodyTemplate || "";
      const p = config.pagination || {};
      $("paginationType").value = p.type || "jsonapi";
      $("maxPages").value = p.maxPages || 25;
      $("maxItems").value = p.maxItems || "";
      $("pageSize").value = p.pageSize || "";
      $("pageParam").value = p.pageParam || "page[number]";
      $("pageSizeParam").value = p.pageSizeParam || "page[size]";
      $("startPage").value = p.startPage || 1;
      $("nextLinkPath").value = p.nextLinkPath || "links.next";
      $("totalPagesPath").value = p.totalPagesPath || "meta.page_count";
      $("offsetParam").value = p.offsetParam || "offset";
      $("limitParam").value = p.limitParam || "limit";
      $("startOffset").value = p.startOffset || 0;
      $("cursorParam").value = p.cursorParam || "cursor";
      $("nextCursorPath").value = p.nextCursorPath || "meta.next_cursor";
      $("initialCursor").value = p.initialCursor || "";
      setHeaderRows("staticHeaders", config.staticHeaders || []);
      $("runUrl").hidden = !state.id;
      $("analyticsPanel").hidden = !state.id;
      $("immutableNotice").hidden = !state.id;
      setEditorLocked(state.locked);
      if (!state.id) {
        renderAnalytics(null);
      }
    }

    function setEditorLocked(locked) {
      configFieldIds.forEach((id) => {
        const element = $(id);
        if (element) element.disabled = locked;
      });
      Array.from($("staticHeaders").querySelectorAll("input, button")).forEach((element) => {
        element.disabled = locked;
      });
      $("addStaticHeader").disabled = locked;
      $("saveBtn").disabled = locked;
    }

    async function refreshList() {
      const body = await api("/api/configs");
      const list = $("savedList");
      list.innerHTML = "";
      body.configs.forEach((config) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "saved-item";
        button.innerHTML = "<strong></strong><span class='volume'></span><small class='muted target'></small>";
        button.querySelector("strong").textContent = config.name;
        button.querySelector(".volume").textContent = (config.clayCalls || 0) + " calls";
        button.querySelector(".target").textContent = config.method + " " + config.targetUrl;
        button.addEventListener("click", async () => {
          const detail = await api("/api/configs/" + config.id);
          applyConfig(detail.config);
          showRunUrl(detail.runUrl);
          print(detail.config);
          await refreshAnalytics();
          setStatus("Loaded", true);
        });
        list.appendChild(button);
      });
    }

    function showRunUrl(url) {
      $("runUrl").hidden = false;
      $("runUrlText").textContent = url;
    }

    async function runTest() {
      setStatus("Testing...", true);
      const body = await api("/api/test", {
        method: "POST",
        body: JSON.stringify({
          config: readConfig(),
          credentialHeaders: readHeaderRows("credentialHeaders"),
          queryString: $("queryString").value.trim()
        })
      });
      print(body);
      setStatus("Test returned " + body.itemCount + " items across " + body.pageCount + " page(s)", true);
      await refreshAnalytics();
    }

    async function saveRunner() {
      if (state.locked) {
        setStatus("Saved configurations are locked. Create a new runner for changes.", false);
        return;
      }
      setStatus("Saving...", true);
      const body = await api("/api/configs", {
        method: "POST",
        body: JSON.stringify({ config: readConfig() })
      });
      state.id = body.config.id;
      state.locked = true;
      $("currentId").textContent = state.id;
      setEditorLocked(true);
      $("immutableNotice").hidden = false;
      showRunUrl(body.runUrl);
      print(body);
      setStatus("Saved", true);
      await refreshList();
      await refreshAnalytics();
    }

    async function refreshAnalytics() {
      if (!state.id) {
        renderAnalytics(null);
        return;
      }
      const body = await api("/api/configs/" + state.id + "/analytics");
      renderAnalytics(body.analytics);
    }

    function renderAnalytics(analytics) {
      const empty = analytics || {
        totalRuns: 0,
        clayRuns: 0,
        totalItems: 0,
        avgDurationMs: 0,
        statusCounts: [],
        statusTimeline: [],
        recentRuns: []
      };
      $("metricTotalRuns").textContent = empty.totalRuns || 0;
      $("metricClayRuns").textContent = empty.clayRuns || 0;
      $("metricItems").textContent = empty.totalItems || 0;
      $("metricDuration").textContent = (empty.avgDurationMs || 0) + " ms";
      renderStatusCounts(empty.statusCounts || []);
      renderStatusChart(empty.statusTimeline || []);
      const recent = $("recentRuns");
      recent.innerHTML = "";
      if (!empty.recentRuns || empty.recentRuns.length === 0) {
        const row = document.createElement("div");
        row.className = "help";
        row.textContent = "No calls logged yet.";
        recent.appendChild(row);
        return;
      }
      empty.recentRuns.forEach((run) => {
        const row = document.createElement("div");
        row.className = "run-row";
        row.innerHTML = "<strong></strong><span></span><span></span><span></span><span></span><span></span>";
        row.children[0].textContent = run.mode;
        row.children[1].textContent = run.status;
        row.children[2].textContent = run.itemCount + " items";
        row.children[3].textContent = run.pageCount + " pages";
        row.children[4].textContent = run.durationMs + " ms";
        row.children[5].textContent = run.error || new Date(run.createdAt).toLocaleString();
        recent.appendChild(row);
      });
    }

    function renderStatusCounts(counts) {
      const target = $("statusCounts");
      target.innerHTML = "";
      if (counts.length === 0) {
        return;
      }
      counts.forEach((entry) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = entry.statusCode + ": " + entry.count;
        target.appendChild(pill);
      });
    }

    function renderStatusChart(points) {
      const target = $("statusChart");
      target.innerHTML = "";
      if (!points.length) {
        const empty = document.createElement("div");
        empty.className = "help";
        empty.textContent = "No status-code timeline yet.";
        target.appendChild(empty);
        return;
      }

      const buckets = Array.from(new Set(points.map((point) => point.bucket)));
      const statuses = Array.from(new Set(points.map((point) => point.statusCode))).sort();
      const totals = new Map(buckets.map((bucket) => [bucket, points.filter((p) => p.bucket === bucket).reduce((sum, p) => sum + p.count, 0)]));
      const maxTotal = Math.max(...Array.from(totals.values()), 1);
      const width = Math.max(520, buckets.length * 54 + 72);
      const height = 170;
      const chartHeight = 108;
      const barWidth = Math.max(18, Math.min(36, Math.floor((width - 72) / buckets.length) - 12));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);

      buckets.forEach((bucket, index) => {
        const x = 48 + index * ((width - 72) / buckets.length);
        let y = 124;
        statuses.forEach((status) => {
          const match = points.find((point) => point.bucket === bucket && point.statusCode === status);
          const count = match ? match.count : 0;
          if (!count) return;
          const segmentHeight = Math.max(2, Math.round((count / maxTotal) * chartHeight));
          y -= segmentHeight;
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", String(x));
          rect.setAttribute("y", String(y));
          rect.setAttribute("width", String(barWidth));
          rect.setAttribute("height", String(segmentHeight));
          rect.setAttribute("fill", statusColor(status));
          svg.appendChild(rect);
        });

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(x + barWidth / 2));
        label.setAttribute("y", "148");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", "#667085");
        label.textContent = bucket.slice(5);
        svg.appendChild(label);
      });

      const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
      axis.setAttribute("x1", "36");
      axis.setAttribute("x2", String(width - 16));
      axis.setAttribute("y1", "124");
      axis.setAttribute("y2", "124");
      axis.setAttribute("stroke", "#d9dee7");
      svg.appendChild(axis);
      target.appendChild(svg);
    }

    function statusColor(status) {
      if (status.startsWith("2")) return "#067647";
      if (status.startsWith("3")) return "#175cd3";
      if (status.startsWith("4")) return "#b54708";
      if (status.startsWith("5")) return "#b42318";
      return "#667085";
    }

    $("adminToken").value = localStorage.getItem("paginationRunnerAdminToken") || "";
    $("addStaticHeader").addEventListener("click", () => addHeaderRow("staticHeaders"));
    $("addCredentialHeader").addEventListener("click", () => addHeaderRow("credentialHeaders"));
    $("refreshBtn").addEventListener("click", () => refreshList().catch((error) => setStatus(error.message, false)));
    $("analyticsRefreshBtn").addEventListener("click", () => refreshAnalytics().catch((error) => setStatus(error.message, false)));
    $("newBtn").addEventListener("click", () => {
      applyConfig(defaults);
      setHeaderRows("credentialHeaders", []);
      print({});
      setStatus("", true);
    });
    $("testBtn").addEventListener("click", () => runTest().catch((error) => setStatus(error.message, false)));
    $("saveBtn").addEventListener("click", () => saveRunner().catch((error) => setStatus(error.message, false)));
    $("copyBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("runUrlText").textContent);
      setStatus("Copied", true);
    });

    applyConfig(defaults);
    setHeaderRows("credentialHeaders", [{ name: "Authorization", value: "" }]);
    refreshList().catch((error) => setStatus(error.message, false));
  </script>
</body>
</html>`;
}
