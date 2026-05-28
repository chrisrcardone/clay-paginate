export function renderApp(basePath = ""): string {
  const runPathExample = `${basePath}/<runner-id>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clay pagination runner</title>
  <style>
    :root {
      color-scheme: light;
      --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
      --content: #16181f;
      --secondary: #525a69;
      --tertiary: #717989;
      --action: #0382f7;
      --action-hover: #0667d9;
      --danger: #dd2c53;
      --success: #0dac65;
      --bg: #f7f8f9;
      --surface: #ffffff;
      --surface-soft: #f7f8f9;
      --blue-soft: #ecf6ff;
      --green-soft: #eefff1;
      --red-soft: #fff1f2;
      --yellow-soft: #fff8d2;
      --border: #d6d9df;
      --border-soft: #e6e8ec;
      --focus: #b8ddff;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--content);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.45;
    }
    header {
      height: 48px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      background: var(--surface);
      border-bottom: 0.5px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 4;
    }
    header svg { width: 22px; height: 22px; flex: none; }
    h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
    }
    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0;
    }
    main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 12px;
      padding: 12px;
      max-width: 1360px;
      margin: 0 auto;
    }
    .panel {
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      min-width: 0;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 0.5px solid var(--border-soft);
    }
    .panel-body {
      display: grid;
      gap: 14px;
      padding: 16px;
    }
    .section {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 0.5px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .pagination-group {
      display: grid;
      gap: 10px;
    }
    .pagination-group[hidden] { display: none; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-copy {
      color: var(--secondary);
      font-size: 13px;
      font-weight: 500;
      max-width: 860px;
    }
    .step {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--action);
      font-size: 12px;
      font-weight: 600;
      flex: none;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    label {
      display: grid;
      gap: 5px;
      min-width: 0;
      color: var(--content);
      font-size: 12px;
      font-weight: 600;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 9px;
      color: var(--content);
      background: var(--surface);
      font: inherit;
      font-size: 13px;
      letter-spacing: 0;
    }
    textarea {
      min-height: 78px;
      resize: vertical;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    textarea.tall {
      min-height: 170px;
    }
    input[type="file"] {
      padding: 7px;
    }
    input:focus, select:focus, textarea:focus, button:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 0;
      border-color: var(--action);
    }
    input:disabled, select:disabled, textarea:disabled {
      color: var(--tertiary);
      background: var(--surface-soft);
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 32px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--content);
      padding: 7px 11px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    button:hover:not(:disabled) { background: var(--surface-soft); }
    button.primary {
      color: #fff;
      border-color: var(--action);
      background: var(--action);
    }
    button.primary:hover:not(:disabled) { background: var(--action-hover); }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .hint {
      color: var(--secondary);
      font-size: 12px;
      font-weight: 500;
    }
    .muted {
      color: var(--secondary);
      font-weight: 500;
    }
    .required { color: var(--danger); }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .header-row {
      display: grid;
      grid-template-columns: minmax(120px, 1fr) minmax(160px, 2fr) 32px;
      gap: 8px;
      align-items: end;
    }
    .notice {
      border: 0.5px solid #b8ddff;
      background: var(--blue-soft);
      color: #01418d;
      border-radius: var(--radius-md);
      padding: 10px;
      font-size: 12px;
      font-weight: 500;
    }
    .locked {
      border-color: #fdd4b7;
      background: #fff3ed;
      color: #752b12;
    }
    .status {
      min-height: 20px;
      font-weight: 600;
    }
    .status.ok { color: var(--success); }
    .status.err { color: var(--danger); }
    .url-box {
      display: grid;
      gap: 8px;
      padding: 10px;
      border: 0.5px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-soft);
    }
    .prompt-box {
      min-height: 220px;
      color: var(--content);
      background: var(--surface-soft);
    }
    .object-box {
      min-height: 150px;
    }
    .ai-review {
      white-space: pre-wrap;
      color: #01418d;
    }
    code, pre {
      font-family: var(--font-mono);
      font-size: 12px;
    }
    code { overflow-wrap: anywhere; }
    pre {
      margin: 0;
      max-height: 320px;
      overflow: auto;
      color: #eef1f5;
      background: #16181f;
      border-radius: var(--radius-md);
      padding: 12px;
      line-height: 1.5;
    }
    aside {
      display: grid;
      gap: 12px;
      align-content: start;
    }
    .saved-list {
      display: grid;
      gap: 8px;
      max-height: 360px;
      overflow: auto;
    }
    .saved-item {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 3px 8px;
      justify-content: stretch;
      text-align: left;
      min-height: 48px;
    }
    .saved-item strong, .saved-item small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .saved-item small { grid-column: 1 / -1; color: var(--secondary); font-weight: 500; }
    .volume { color: var(--action); font-size: 12px; font-weight: 600; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .metric {
      border: 0.5px solid var(--border-soft);
      border-radius: var(--radius-md);
      padding: 10px;
      background: var(--surface-soft);
    }
    .metric span {
      display: block;
      color: var(--secondary);
      font-size: 11px;
      font-weight: 600;
    }
    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 18px;
      font-weight: 600;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 8px;
      background: var(--surface-soft);
      border: 0.5px solid var(--border-soft);
      color: var(--secondary);
      font-size: 12px;
      font-weight: 600;
    }
    .chart {
      display: flex;
      align-items: end;
      gap: 6px;
      min-height: 96px;
      padding: 10px;
      border: 0.5px solid var(--border-soft);
      border-radius: var(--radius-md);
      background: var(--surface-soft);
      overflow: auto;
    }
    .bar {
      width: 18px;
      min-height: 2px;
      border-radius: 3px 3px 0 0;
      background: var(--action);
      flex: none;
    }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      .header-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <svg viewBox="0 0 128 128" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M107.357 128C108.416 128 109.275 127.142 109.275 126.083L109.275 1.9175C109.275 0.858509 108.416 0.0000282862 107.357 0.000028101L69.8901 0.00002155C57.6202 0.0000194047 42.6613 3.90392 30.0048 14.6158C15.9247 26.5325 8.00001 44.132 8.00001 64C8.00001 83.868 15.9247 101.467 30.0048 113.384C42.6613 124.096 57.6202 128 69.8901 128L107.357 128Z" fill="#3BD3FD"></path>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M109.276 106.198L109.276 21.8021L69.8911 21.8021C61.7869 21.8021 51.846 24.3919 43.5485 31.3374C34.5392 38.8786 29.0999 50.219 29.0999 63.9999C29.0999 77.7808 34.5392 89.1212 43.5484 96.6624C51.846 103.608 61.7869 106.198 69.8911 106.198L109.276 106.198Z" fill="#FE5D75"></path>
      <path d="M109.274 42.901L69.8897 42.901C62.0127 42.901 50.1974 48.1757 50.1974 63.9999C50.1974 79.8241 62.0127 85.0988 69.8897 85.0988H109.274V42.901Z" fill="#FFCB00"></path>
    </svg>
    <h1>Pagination runner</h1>
  </header>

  <main>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Create runner</h2>
          <div class="hint">Test first. Save once. Use the generated URL in Clay.</div>
        </div>
        <button id="newBtn" type="button">New runner</button>
      </div>
      <div class="panel-body">
        <div id="lockedNotice" class="notice locked" hidden>This runner is locked. Create a new runner for changes.</div>

        <div class="section">
          <div class="section-title"><span class="step">AI</span><h3>AI setup helper</h3></div>
          <div class="section-copy">Use this when you have API docs but do not know which fields to enter. Generate a prompt, send it to Claude, ChatGPT, or another AI, then paste the returned JSON object back here. The app fills the values the AI provided and clears untouched defaults it did not provide.</div>
          <div class="grid-2">
            <label>API documentation URL<input id="docsUrl" placeholder="https://docs.example.com/api/list-endpoint"></label>
            <label>What data do you want Clay to fetch?<input id="docsGoal" placeholder="Example: G2 buyer intent event stream for a date range"></label>
          </div>
          <label>Documentation file<input id="docsFile" type="file" accept=".txt,.md,.json,.yaml,.yml,.html,.htm,.csv"></label>
          <label>Paste docs excerpt or notes<textarea id="docsExcerpt" class="tall" spellcheck="false" placeholder="Optional. Paste the pagination section, endpoint example response, auth notes, or copied file text here."></textarea></label>
          <div class="actions">
            <button id="generatePromptBtn" class="primary" type="button">Generate AI prompt</button>
            <button id="copyPromptBtn" type="button">Copy prompt</button>
            <span id="promptStatus" class="hint"></span>
          </div>
          <label>Prompt to paste into AI<textarea id="aiPrompt" class="prompt-box" readonly spellcheck="false"></textarea></label>
          <label>Paste AI object<textarea id="aiObjectPaste" class="object-box" spellcheck="false" placeholder='Paste the full JSON object returned by the AI here'></textarea></label>
          <div class="actions">
            <button id="applyAiObjectBtn" type="button">Apply AI object</button>
            <button id="clearAiObjectBtn" type="button">Clear object</button>
            <span id="aiObjectStatus" class="hint"></span>
          </div>
          <div id="aiObjectReview" class="notice ai-review" hidden></div>
        </div>

        <div class="section">
          <div class="section-title"><span class="step">1</span><h3>Endpoint</h3></div>
          <div class="section-copy">Enter the upstream API endpoint exactly as the API expects it. If a credential must live in the URL, use a placeholder such as <code>{{key}}</code>; Clay will pass the value on the generated runner URL at run time.</div>
          <div class="grid-2">
            <label>Name <span class="required">required</span><input id="name" value="G2 Buyer Stream v2 API"></label>
            <label>Method
              <select id="method"><option value="">Select method</option><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option></select>
            </label>
          </div>
          <label>Target URL <span class="required">required</span><input id="targetUrl" value="https://data.g2.com/api/v1/ahoy/remote-event-streams"></label>
          <div class="hint">For URL keys, use placeholders like <code>https://api.com/call?api={{key}}</code>. Clay will call <code>${runPathExample}?key=...</code>.</div>
          <div class="grid-3">
            <label>Results path <span class="required">required</span><input id="resultPath" value="data"></label>
            <label>Response
              <select id="responseMode"><option value="">Select response</option><option value="array">Array</option><option value="envelope">Envelope</option></select>
            </label>
            <label>Max items<input id="maxItems" type="number" min="1" placeholder="Optional"></label>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><span class="step">2</span><h3>Pagination</h3></div>
          <div class="section-copy">Choose the pagination style from the API docs. Max pages is a safety cap, not the number of pages to fetch; the runner stops automatically when the API has no next page.</div>
          <div class="grid-3">
            <label>Type
              <select id="paginationType">
                <option value="">Select type</option>
                <option value="jsonapi">JSON next link</option>
                <option value="page">Page number</option>
                <option value="offset">Offset limit</option>
                <option value="cursor">Cursor</option>
                <option value="linkHeader">Link header</option>
                <option value="none">None</option>
              </select>
            </label>
            <label>Max pages <span class="required">required</span><input id="maxPages" type="number" min="1" max="1000" value="250"></label>
            <label>Page size<input id="pageSize" type="number" min="1" value="25"></label>
          </div>
          <div class="pagination-group" data-pagination-group="page">
            <div class="hint">Use this for APIs that paginate with page numbers. JSON next link also follows <code>links.next</code> when present.</div>
            <div class="grid-3">
              <label>Page param<input id="pageParam" value="page[number]"></label>
              <label>Page size param<input id="pageSizeParam" value="page[size]"></label>
              <label>Start page<input id="startPage" type="number" min="1" value="1"></label>
            </div>
            <div class="grid-2">
              <label>Next link path<input id="nextLinkPath" value="links.next"></label>
              <label>Total pages path<input id="totalPagesPath" value="meta.page_count"></label>
            </div>
          </div>
          <div class="pagination-group" data-pagination-group="offset" hidden>
            <div class="hint">Use this for APIs that ask for an offset and limit.</div>
            <div class="grid-3">
              <label>Offset param<input id="offsetParam" value="offset"></label>
              <label>Limit param<input id="limitParam" value="limit"></label>
              <label>Start offset<input id="startOffset" type="number" min="0" value="0"></label>
            </div>
          </div>
          <div class="pagination-group" data-pagination-group="cursor" hidden>
            <div class="hint">Use this for APIs that return a cursor for the next page.</div>
            <div class="grid-2">
              <label>Cursor param<input id="cursorParam" value="cursor"></label>
              <label>Next cursor path<input id="nextCursorPath" value="meta.next_cursor"></label>
            </div>
            <label>Initial cursor<input id="initialCursor"></label>
          </div>
          <div class="pagination-group" data-pagination-group="linkHeader" hidden>
            <div class="hint">Use this for APIs that return the next page in the HTTP <code>Link</code> header.</div>
          </div>
          <div class="pagination-group" data-pagination-group="none" hidden>
            <div class="hint">Use this when the endpoint returns everything in one response.</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><span class="step">3</span><h3>Auth and test</h3></div>
          <div class="section-copy">List only the header names Clay should forward at run time. Use test credentials here to verify the runner; test credentials and query values are not saved.</div>
          <label>Pass-through headers<input id="passThroughHeaders" value="authorization,x-api-key,api-key"></label>
          <div class="hint">Header values come from Clay at run time. They are never stored.</div>
          <div class="actions">
            <strong class="muted">Static headers</strong>
            <button id="addStaticHeader" type="button">Add static header</button>
          </div>
          <div id="staticHeaders"></div>
          <div class="actions">
            <strong class="muted">Test credentials</strong>
            <button id="addCredentialHeader" type="button">Add test header</button>
          </div>
          <div id="credentialHeaders"></div>
          <label>Test query params<input id="queryString" placeholder="filter[start_time]=2026-05-27T00:00:00Z or key=api-key"></label>
          <label>Body template<textarea id="bodyTemplate" spellcheck="false"></textarea></label>
          <div class="actions"><button id="testBtn" class="primary" type="button">Run test</button><span class="hint">Test credentials and query params are not saved.</span></div>
          <pre id="output">{}</pre>
        </div>

        <div class="section">
          <div class="section-title"><span class="step">4</span><h3>Save and connect</h3></div>
          <div class="section-copy">Save only after testing. Saved runners are locked so live Clay tables keep a stable URL and behavior.</div>
          <div id="urlShape" class="hint"></div>
          <div class="notice">Saving creates a stable URL. Saved runners cannot be edited or deleted.</div>
          <div class="actions"><button id="saveBtn" type="button">Save runner</button><div id="status" class="status"></div></div>
          <div id="runUrl" class="url-box" hidden>
            <strong>Clay URL</strong>
            <code id="runUrlText"></code>
            <div class="actions"><button id="copyBtn" type="button">Copy URL</button></div>
          </div>
        </div>
      </div>
    </section>

    <aside>
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Configurations</h2>
            <div class="hint">Sorted by Clay call volume.</div>
          </div>
          <button id="refreshBtn" type="button">Refresh</button>
        </div>
        <div class="panel-body"><div id="savedList" class="saved-list"></div></div>
      </section>

      <section id="analyticsPanel" class="panel" hidden>
        <div class="panel-head">
          <h2>Analytics</h2>
          <button id="analyticsRefreshBtn" type="button">Refresh</button>
        </div>
        <div class="panel-body">
          <div class="metrics">
            <div class="metric"><span>Total calls</span><strong id="metricTotalRuns">0</strong></div>
            <div class="metric"><span>Clay calls</span><strong id="metricClayRuns">0</strong></div>
            <div class="metric"><span>Items returned</span><strong id="metricItems">0</strong></div>
            <div class="metric"><span>Avg duration</span><strong id="metricDuration">0 ms</strong></div>
          </div>
          <div id="statusCounts" class="actions"></div>
          <div id="statusChart" class="chart"></div>
          <div id="recentRuns" class="hint"></div>
        </div>
      </section>
    </aside>
  </main>

  <script>
    const BASE_PATH = ${JSON.stringify(basePath)};
    const state = { id: null, locked: false };
    const $ = (id) => document.getElementById(id);
    const editableIds = ["name","method","targetUrl","resultPath","responseMode","maxItems","paginationType","maxPages","pageSize","pageParam","pageSizeParam","startPage","nextLinkPath","totalPagesPath","offsetParam","limitParam","startOffset","cursorParam","nextCursorPath","initialCursor","passThroughHeaders","bodyTemplate"];
    const defaults = {
      name: "G2 Buyer Stream v2 API",
      targetUrl: "https://data.g2.com/api/v1/ahoy/remote-event-streams",
      method: "GET",
      resultPath: "data",
      responseMode: "array",
      staticHeaders: [{ name: "Content-Type", value: "application/vnd.api+json" }],
      passThroughHeaders: ["authorization", "x-api-key", "api-key"],
      bodyTemplate: "",
      pagination: {
        type: "jsonapi",
        maxPages: 250,
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
    const MISSING = Symbol("missing");
    const fieldDefaults = {
      name: defaults.name,
      method: defaults.method,
      targetUrl: defaults.targetUrl,
      resultPath: defaults.resultPath,
      responseMode: defaults.responseMode,
      maxItems: "",
      paginationType: defaults.pagination.type,
      maxPages: String(defaults.pagination.maxPages),
      pageSize: String(defaults.pagination.pageSize),
      pageParam: defaults.pagination.pageParam,
      pageSizeParam: defaults.pagination.pageSizeParam,
      startPage: String(defaults.pagination.startPage),
      nextLinkPath: defaults.pagination.nextLinkPath,
      totalPagesPath: defaults.pagination.totalPagesPath,
      offsetParam: defaults.pagination.offsetParam,
      limitParam: defaults.pagination.limitParam,
      startOffset: String(defaults.pagination.startOffset),
      cursorParam: defaults.pagination.cursorParam,
      nextCursorPath: defaults.pagination.nextCursorPath,
      initialCursor: defaults.pagination.initialCursor,
      passThroughHeaders: defaults.passThroughHeaders.join(","),
      bodyTemplate: defaults.bodyTemplate,
      queryString: ""
    };

    async function api(path, options = {}) {
      const response = await fetch(BASE_PATH + path, {
        ...options,
        headers: { "content-type": "application/json", ...(options.headers || {}) }
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(body?.error || "Request failed");
      return body;
    }

    function setStatus(message, ok = true) {
      $("status").textContent = message;
      $("status").className = "status " + (ok ? "ok" : "err");
    }

    function updateUrlShape() {
      $("urlShape").textContent = "Clay URL format: " + location.origin + BASE_PATH + "/<runner-id>";
    }

    function setPromptStatus(message) {
      $("promptStatus").textContent = message;
    }

    function setAiObjectStatus(message, ok = true) {
      $("aiObjectStatus").textContent = message;
      $("aiObjectStatus").style.color = ok ? "var(--secondary)" : "var(--danger)";
    }

    function buildAiPrompt() {
      const docsUrl = $("docsUrl").value.trim();
      const goal = $("docsGoal").value.trim();
      const excerpt = $("docsExcerpt").value.trim();
      const current = readConfig();
      return [
        "You are helping configure Clay Pagination Runner, an open-source Cloudflare Worker that lets Clay call paginated APIs and receive one combined array.",
        "",
        "Read the project guide if you can browse:",
        "https://github.com/chrisrcardone/clay-paginate/blob/main/AI_CONFIG_GUIDE.md",
        "",
        "Task:",
        "Given the API documentation URL, any attached API documentation file, and any pasted excerpt below, return one strict JSON object that a non-technical user can paste back into the Clay Pagination Runner app.",
        "",
        "API documentation URL:",
        docsUrl || "(not provided)",
        "",
        "User goal:",
        goal || "(not provided)",
        "",
        "Pasted docs excerpt or notes:",
        excerpt || "(not provided; use the URL or attached file)",
        "",
        "Current form defaults for context only. These are UI starter examples, not source documentation:",
        JSON.stringify(current, null, 2),
        "",
        "Important rules:",
        "1. Do not invent API credentials. For header auth, return pass-through header names only, usually authorization, x-api-key, or api-key.",
        "2. If an API key must be in the URL, use a URL placeholder like {{key}} in targetUrl and tell the user to call the generated Clay URL with ?key=their-key.",
        "3. Never put credential values in staticHeaders.",
        "4. Choose the safest pagination type from: jsonapi, page, offset, cursor, linkHeader, none.",
        "5. maxPages is a production safety cap, not a sample size. Set it high enough to capture all pages; usually 250, or up to 1000 for large result sets. The runner stops when there is no next page, so a high cap does not force extra calls.",
        "6. resultPath must point to the array of rows in the JSON response, such as data, results, items, records, or products.",
        "7. If the API returns JSON:API links.next, use type jsonapi, nextLinkPath links.next, and totalPagesPath meta.page_count if available.",
        "8. Use the largest documented pageSize unless the docs warn against it; larger page sizes reduce API calls and make full pagination more reliable.",
        "9. Current form defaults are not evidence. Do not copy a default value unless the API docs or the user's goal confirms it. If the docs URL conflicts with a default, prefer the docs or leave the value blank and warn.",
        "10. For every non-blank value you return, include an explanation with certainty: high, medium, or low.",
        "11. If a value is not confirmed by the docs, leave it blank or null instead of guessing, explain the uncertainty, and add a warning.",
        "12. Return strict JSON only. Do not wrap it in markdown and do not add prose outside the object.",
        "",
        "Return exactly this JSON object shape:",
        "{",
        "  \\"summary\\": \\"One sentence explaining the endpoint and pagination method.\\",",
        "  \\"overallCertainty\\": \\"high | medium | low\\",",
        "  \\"values\\": {",
        "    \\"name\\": \\"Human-readable immutable runner name\\",",
        "    \\"method\\": \\"GET\\",",
        "    \\"targetUrl\\": \\"https://api.example.com/items?api_key={{key}}\\",",
        "    \\"resultPath\\": \\"data\\",",
        "    \\"responseMode\\": \\"array\\",",
        "    \\"maxItems\\": null,",
        "    \\"pagination\\": {",
        "      \\"type\\": \\"jsonapi | page | offset | cursor | linkHeader | none\\",",
        "      \\"maxPages\\": 250,",
        "      \\"pageSize\\": 100,",
        "      \\"pageParam\\": \\"page[number]\\",",
        "      \\"pageSizeParam\\": \\"page[size]\\",",
        "      \\"startPage\\": 1,",
        "      \\"nextLinkPath\\": \\"links.next\\",",
        "      \\"totalPagesPath\\": \\"meta.page_count\\",",
        "      \\"offsetParam\\": null,",
        "      \\"limitParam\\": null,",
        "      \\"startOffset\\": null,",
        "      \\"cursorParam\\": null,",
        "      \\"nextCursorPath\\": null,",
        "      \\"initialCursor\\": null",
        "    },",
        "    \\"passThroughHeaders\\": [\\"authorization\\"],",
        "    \\"staticHeaders\\": [{ \\"name\\": \\"Accept\\", \\"value\\": \\"application/json\\" }],",
        "    \\"bodyTemplate\\": \\"\\",",
        "    \\"testQueryParams\\": \\"key=replace-with-test-key\\",",
        "    \\"testCredentialHeaders\\": [{ \\"name\\": \\"Authorization\\", \\"value\\": \\"\\" }]",
        "  },",
        "  \\"explanations\\": {",
        "    \\"targetUrl\\": { \\"certainty\\": \\"high\\", \\"reason\\": \\"Why this endpoint and URL placeholders are correct.\\" },",
        "    \\"resultPath\\": { \\"certainty\\": \\"high\\", \\"reason\\": \\"Why this points to the returned array.\\" },",
        "    \\"pagination\\": { \\"certainty\\": \\"high\\", \\"reason\\": \\"Why this pagination type and these params/paths are correct.\\" },",
        "    \\"auth\\": { \\"certainty\\": \\"high\\", \\"reason\\": \\"Why credentials should be forwarded this way without storing secrets.\\" }",
        "  },",
        "  \\"warnings\\": [\\"Anything the user must verify before saving the immutable runner.\\"]",
        "}"
      ].join("\\n");
    }

    function generatePrompt() {
      $("aiPrompt").value = buildAiPrompt();
      setPromptStatus("Prompt ready.");
    }

    async function readDocsFile(file) {
      const text = await file.text();
      const trimmed = text.slice(0, 40000);
      $("docsExcerpt").value = trimmed;
      setPromptStatus(file.name + " loaded" + (text.length > trimmed.length ? " (first 40k characters)" : "") + ".");
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
      setLocked(state.locked);
    }

    function setHeaderRows(containerId, headers) {
      $(containerId).innerHTML = "";
      headers.forEach((header) => addHeaderRow(containerId, header));
    }

    function readHeaderRows(containerId) {
      return Array.from($(containerId).querySelectorAll(".header-row"))
        .map((row) => ({
          name: row.querySelector(".header-name").value.trim(),
          value: row.querySelector(".header-value").value.trim()
        }))
        .filter((row) => row.name && row.value);
    }

    function readHeaderRowsRaw(containerId) {
      return Array.from($(containerId).querySelectorAll(".header-row"))
        .map((row) => ({
          name: row.querySelector(".header-name").value.trim(),
          value: row.querySelector(".header-value").value.trim()
        }));
    }

    function parseAiObjectText(text) {
      const trimmed = text.trim();
      if (!trimmed) throw new Error("Paste the JSON object returned by the AI first.");
      const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
      const unfenced = trimmed
        .replace(new RegExp("^" + fence + "(?:json|javascript|js)?\\\\s*", "i"), "")
        .replace(new RegExp(fence + "$", "i"), "")
        .trim()
        .replace(/^const\\s+[A-Za-z0-9_$]+\\s*=\\s*/i, "")
        .replace(/^export\\s+default\\s+/i, "")
        .replace(/;\\s*$/i, "");
      const objectText = extractJsonObject(unfenced);
      try {
        return JSON.parse(objectText);
      } catch {
        throw new Error("The pasted object is not strict JSON. Ask the AI to return JSON only, with double quotes and no comments.");
      }
    }

    function extractJsonObject(text) {
      const start = text.indexOf("{");
      if (start === -1) throw new Error("No JSON object found.");
      let depth = 0;
      let quote = "";
      let escaped = false;
      for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (quote) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\\\") {
            escaped = true;
          } else if (char === quote) {
            quote = "";
          }
          continue;
        }
        if (char === "\\\"" || char === "'") {
          quote = char;
          continue;
        }
        if (char === "{") depth += 1;
        if (char === "}") {
          depth -= 1;
          if (depth === 0) return text.slice(start, index + 1);
        }
      }
      throw new Error("The JSON object looks incomplete.");
    }

    function getAiRoot(parsed) {
      for (const key of ["values", "formValues", "config", "configuration"]) {
        const value = looseGet(parsed, key);
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
      }
      return parsed;
    }

    function looseGet(source, path) {
      if (!source || typeof source !== "object") return MISSING;
      const parts = Array.isArray(path) ? path : String(path).split(".");
      let current = source;
      for (const part of parts) {
        if (!current || typeof current !== "object") return MISSING;
        const key = Object.keys(current).find((candidate) => normalizeObjectKey(candidate) === normalizeObjectKey(part));
        if (!key) return MISSING;
        current = current[key];
      }
      return current;
    }

    function firstAiValue(source, paths) {
      for (const path of paths) {
        const value = looseGet(source, path);
        if (value !== MISSING) return value;
      }
      return MISSING;
    }

    function normalizeObjectKey(key) {
      return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function toFormString(value) {
      if (value === MISSING) return MISSING;
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value, null, 2);
      return String(value);
    }

    function toFormNumber(value) {
      if (value === MISSING) return MISSING;
      if (value === null || value === "") return "";
      const number = Number(value);
      return Number.isFinite(number) ? String(number) : "";
    }

    function toMethod(value) {
      if (value === MISSING) return MISSING;
      const method = String(value || "").trim().toUpperCase();
      return ["GET", "POST", "PUT", "PATCH"].includes(method) ? method : "";
    }

    function toResponseMode(value) {
      if (value === MISSING) return MISSING;
      const mode = String(value || "").trim().toLowerCase();
      if (mode === "array") return "array";
      if (mode === "envelope" || mode === "object") return "envelope";
      return "";
    }

    function toPaginationType(value) {
      if (value === MISSING) return MISSING;
      const type = normalizeObjectKey(value);
      if (type === "jsonapi" || type === "jsonnextlink" || type === "jsonapilinks") return "jsonapi";
      if (type === "page" || type === "pagenumber") return "page";
      if (type === "offset" || type === "offsetlimit") return "offset";
      if (type === "cursor" || type === "cursorbased") return "cursor";
      if (type === "linkheader" || type === "httplinkheader") return "linkHeader";
      if (type === "none" || type === "singlepage") return "none";
      return "";
    }

    function formatHeaderNames(value) {
      if (value === MISSING) return MISSING;
      if (Array.isArray(value)) {
        return value
          .map((item) => typeof item === "string" ? item : item?.name || item?.header || item?.key)
          .filter(Boolean)
          .join(",");
      }
      if (value && typeof value === "object") return Object.keys(value).join(",");
      return String(value || "");
    }

    function normalizeHeaderPairs(value, keepValues = true) {
      if (value === MISSING) return MISSING;
      if (value === null || value === "") return [];
      const rows = [];
      const add = (name, headerValue) => {
        const cleanName = String(name || "").trim();
        if (!cleanName) return;
        rows.push({ name: cleanName, value: keepValues ? String(headerValue || "").trim() : "" });
      };

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string") {
            const parsed = parseHeaderLine(item);
            add(parsed.name, parsed.value);
          } else if (item && typeof item === "object") {
            add(item.name || item.header || item.key, item.value || "");
          }
        });
        return rows;
      }

      if (value && typeof value === "object") {
        Object.entries(value).forEach(([name, headerValue]) => add(name, headerValue));
        return rows;
      }

      String(value)
        .split(/\\n|,/)
        .map(parseHeaderLine)
        .forEach((header) => add(header.name, header.value));
      return rows;
    }

    function parseHeaderLine(line) {
      const value = String(line || "").trim();
      const separator = value.indexOf(":");
      if (separator === -1) return { name: value, value: "" };
      return { name: value.slice(0, separator).trim(), value: value.slice(separator + 1).trim() };
    }

    function formatQueryParams(value) {
      if (value === MISSING) return MISSING;
      if (value === null) return "";
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean).join("&");
      if (typeof value === "object") {
        const params = new URLSearchParams();
        Object.entries(value).forEach(([key, paramValue]) => {
          if (paramValue !== null && paramValue !== undefined) params.set(key, String(paramValue));
        });
        return params.toString();
      }
      return String(value);
    }

    function applyFieldFromAi(id, value, defaultValue, formatter, applied, blanked) {
      if (value !== MISSING) {
        $(id).value = formatter(value);
        applied.push(id);
        return;
      }
      if (String($(id).value).trim() === String(defaultValue ?? "").trim()) {
        $(id).value = "";
        blanked.push(id);
      }
    }

    function rowsEqual(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }

    function applyHeadersFromAi(containerId, value, defaultRows, applied, blanked, keepValues = true) {
      if (value !== MISSING) {
        setHeaderRows(containerId, normalizeHeaderPairs(value, keepValues));
        applied.push(containerId);
        return;
      }
      if (rowsEqual(readHeaderRowsRaw(containerId), defaultRows)) {
        setHeaderRows(containerId, []);
        blanked.push(containerId);
      }
    }

    function applyAiObject() {
      if (state.locked) {
        setAiObjectStatus("Loaded runners are locked. Click New runner first.", false);
        return;
      }

      let parsed;
      try {
        parsed = parseAiObjectText($("aiObjectPaste").value);
      } catch (error) {
        setAiObjectStatus(error.message, false);
        return;
      }

      const source = getAiRoot(parsed);
      const applied = [];
      const blanked = [];
      const fields = {
        name: firstAiValue(source, ["name"]),
        method: firstAiValue(source, ["method"]),
        targetUrl: firstAiValue(source, ["targetUrl", "url", "endpoint"]),
        resultPath: firstAiValue(source, ["resultPath", "resultsPath", "dataPath"]),
        responseMode: firstAiValue(source, ["responseMode", "response"]),
        maxItems: firstAiValue(source, ["maxItems", "pagination.maxItems"]),
        paginationType: firstAiValue(source, ["pagination.type", "paginationType"]),
        maxPages: firstAiValue(source, ["pagination.maxPages", "maxPages"]),
        pageSize: firstAiValue(source, ["pagination.pageSize", "pageSize"]),
        pageParam: firstAiValue(source, ["pagination.pageParam", "pageParam"]),
        pageSizeParam: firstAiValue(source, ["pagination.pageSizeParam", "pageSizeParam"]),
        startPage: firstAiValue(source, ["pagination.startPage", "startPage"]),
        nextLinkPath: firstAiValue(source, ["pagination.nextLinkPath", "nextLinkPath"]),
        totalPagesPath: firstAiValue(source, ["pagination.totalPagesPath", "totalPagesPath"]),
        offsetParam: firstAiValue(source, ["pagination.offsetParam", "offsetParam"]),
        limitParam: firstAiValue(source, ["pagination.limitParam", "limitParam"]),
        startOffset: firstAiValue(source, ["pagination.startOffset", "startOffset"]),
        cursorParam: firstAiValue(source, ["pagination.cursorParam", "cursorParam"]),
        nextCursorPath: firstAiValue(source, ["pagination.nextCursorPath", "nextCursorPath"]),
        initialCursor: firstAiValue(source, ["pagination.initialCursor", "initialCursor"]),
        passThroughHeaders: firstAiValue(source, ["passThroughHeaders", "auth.passThroughHeaders"]),
        staticHeaders: firstAiValue(source, ["staticHeaders", "headers.static"]),
        bodyTemplate: firstAiValue(source, ["bodyTemplate", "body"]),
        queryString: firstAiValue(source, ["testQueryParams", "suggestedTestQueryParams", "queryString"]),
        credentialHeaders: firstAiValue(source, ["testCredentialHeaders", "suggestedTestCredentialHeaders", "credentialHeaders"])
      };

      applyFieldFromAi("name", fields.name, fieldDefaults.name, toFormString, applied, blanked);
      applyFieldFromAi("method", fields.method, fieldDefaults.method, toMethod, applied, blanked);
      applyFieldFromAi("targetUrl", fields.targetUrl, fieldDefaults.targetUrl, toFormString, applied, blanked);
      applyFieldFromAi("resultPath", fields.resultPath, fieldDefaults.resultPath, toFormString, applied, blanked);
      applyFieldFromAi("responseMode", fields.responseMode, fieldDefaults.responseMode, toResponseMode, applied, blanked);
      applyFieldFromAi("maxItems", fields.maxItems, fieldDefaults.maxItems, toFormNumber, applied, blanked);
      applyFieldFromAi("paginationType", fields.paginationType, fieldDefaults.paginationType, toPaginationType, applied, blanked);
      applyFieldFromAi("maxPages", fields.maxPages, fieldDefaults.maxPages, toFormNumber, applied, blanked);
      applyFieldFromAi("pageSize", fields.pageSize, fieldDefaults.pageSize, toFormNumber, applied, blanked);
      applyFieldFromAi("pageParam", fields.pageParam, fieldDefaults.pageParam, toFormString, applied, blanked);
      applyFieldFromAi("pageSizeParam", fields.pageSizeParam, fieldDefaults.pageSizeParam, toFormString, applied, blanked);
      applyFieldFromAi("startPage", fields.startPage, fieldDefaults.startPage, toFormNumber, applied, blanked);
      applyFieldFromAi("nextLinkPath", fields.nextLinkPath, fieldDefaults.nextLinkPath, toFormString, applied, blanked);
      applyFieldFromAi("totalPagesPath", fields.totalPagesPath, fieldDefaults.totalPagesPath, toFormString, applied, blanked);
      applyFieldFromAi("offsetParam", fields.offsetParam, fieldDefaults.offsetParam, toFormString, applied, blanked);
      applyFieldFromAi("limitParam", fields.limitParam, fieldDefaults.limitParam, toFormString, applied, blanked);
      applyFieldFromAi("startOffset", fields.startOffset, fieldDefaults.startOffset, toFormNumber, applied, blanked);
      applyFieldFromAi("cursorParam", fields.cursorParam, fieldDefaults.cursorParam, toFormString, applied, blanked);
      applyFieldFromAi("nextCursorPath", fields.nextCursorPath, fieldDefaults.nextCursorPath, toFormString, applied, blanked);
      applyFieldFromAi("initialCursor", fields.initialCursor, fieldDefaults.initialCursor, toFormString, applied, blanked);
      applyFieldFromAi("passThroughHeaders", fields.passThroughHeaders, fieldDefaults.passThroughHeaders, formatHeaderNames, applied, blanked);
      applyFieldFromAi("bodyTemplate", fields.bodyTemplate, fieldDefaults.bodyTemplate, toFormString, applied, blanked);
      applyFieldFromAi("queryString", fields.queryString, fieldDefaults.queryString, formatQueryParams, applied, blanked);
      applyHeadersFromAi("staticHeaders", fields.staticHeaders, defaults.staticHeaders, applied, blanked, true);
      applyHeadersFromAi("credentialHeaders", fields.credentialHeaders, [{ name: "Authorization", value: "" }], applied, blanked, false);

      updatePaginationFields();
      renderAiObjectReview(parsed, applied, blanked);
      setAiObjectStatus("Applied " + applied.length + " field(s). Cleared " + blanked.length + " untouched default(s).");
    }

    function renderAiObjectReview(parsed, applied, blanked) {
      const lines = [];
      const summary = firstAiValue(parsed, ["summary"]);
      const certainty = firstAiValue(parsed, ["overallCertainty", "certainty", "confidence"]);
      const warnings = firstAiValue(parsed, ["warnings"]);
      const explanations = firstAiValue(parsed, ["explanations"]);

      if (summary !== MISSING && summary) lines.push("Summary: " + summary);
      if (certainty !== MISSING && certainty) lines.push("Certainty: " + certainty);
      if (applied.length) lines.push("Applied: " + applied.join(", "));
      if (blanked.length) lines.push("Cleared untouched defaults: " + blanked.join(", "));
      if (explanations !== MISSING && explanations && typeof explanations === "object") {
        lines.push("");
        lines.push("Explanations:");
        Object.entries(explanations).slice(0, 8).forEach(([key, value]) => {
          if (value && typeof value === "object") {
            const fieldCertainty = value.certainty ? " [" + value.certainty + "]" : "";
            lines.push("- " + key + fieldCertainty + ": " + (value.reason || JSON.stringify(value)));
          } else {
            lines.push("- " + key + ": " + value);
          }
        });
      }
      if (Array.isArray(warnings) && warnings.length) {
        lines.push("");
        lines.push("Warnings:");
        warnings.forEach((warning) => lines.push("- " + warning));
      }

      $("aiObjectReview").textContent = lines.join("\\n") || "AI object applied. Review the form, test, then save.";
      $("aiObjectReview").hidden = false;
      print({
        aiObjectApplied: true,
        appliedFields: applied,
        clearedUntouchedDefaults: blanked,
        summary: summary === MISSING ? undefined : summary,
        certainty: certainty === MISSING ? undefined : certainty,
        warnings: warnings === MISSING ? [] : warnings
      });
    }

    function numberOrUndefined(id) {
      const value = $(id).value.trim();
      return value === "" ? undefined : Number(value);
    }

    function readConfig() {
      return {
        id: state.locked ? state.id : undefined,
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
          maxPages: Number($("maxPages").value || 250),
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

    function requireFormReady() {
      const missing = [];
      const requireValue = (id, label) => {
        if (!$(id).value.trim()) missing.push(label);
      };

      requireValue("name", "Name");
      requireValue("method", "Method");
      requireValue("targetUrl", "Target URL");
      requireValue("resultPath", "Results path");
      requireValue("responseMode", "Response");
      requireValue("paginationType", "Pagination type");
      requireValue("maxPages", "Max pages");

      const type = $("paginationType").value;
      if (type === "jsonapi" || type === "page") {
        requireValue("pageParam", "Page param");
        requireValue("pageSizeParam", "Page size param");
        requireValue("startPage", "Start page");
      }
      if (type === "jsonapi") {
        requireValue("nextLinkPath", "Next link path");
      }
      if (type === "offset") {
        requireValue("offsetParam", "Offset param");
        requireValue("limitParam", "Limit param");
        requireValue("startOffset", "Start offset");
        requireValue("pageSize", "Page size");
      }
      if (type === "cursor") {
        requireValue("cursorParam", "Cursor param");
        requireValue("nextCursorPath", "Next cursor path");
      }

      if (missing.length) {
        throw new Error("Fill required fields before testing or saving: " + missing.join(", "));
      }
    }

    function applyConfig(config) {
      state.id = config.id || null;
      state.locked = Boolean(state.id);
      $("name").value = config.name || "";
      $("targetUrl").value = config.targetUrl || "";
      $("method").value = config.method || "GET";
      $("resultPath").value = config.resultPath || "data";
      $("responseMode").value = config.responseMode || "array";
      $("passThroughHeaders").value = (config.passThroughHeaders || []).join(",");
      $("bodyTemplate").value = config.bodyTemplate || "";
      const p = config.pagination || {};
      $("paginationType").value = p.type || "jsonapi";
      $("maxPages").value = p.maxPages || 250;
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
      updatePaginationFields();
      setLocked(state.locked);
    }

    function updatePaginationFields() {
      const type = $("paginationType").value;
      const active =
        type === "jsonapi" || type === "page"
          ? "page"
          : type === "offset"
            ? "offset"
            : type === "cursor"
              ? "cursor"
              : type === "linkHeader"
                ? "linkHeader"
                : "none";
      document.querySelectorAll("[data-pagination-group]").forEach((group) => {
        group.hidden = group.dataset.paginationGroup !== active;
      });
    }

    function setLocked(locked) {
      editableIds.forEach((id) => { if ($(id)) $(id).disabled = locked; });
      $("addStaticHeader").disabled = locked;
      $("saveBtn").disabled = locked;
      if ($("applyAiObjectBtn")) $("applyAiObjectBtn").disabled = locked;
      $("lockedNotice").hidden = !locked;
      Array.from($("staticHeaders").querySelectorAll("input, button")).forEach((el) => { el.disabled = locked; });
    }

    function showRunUrl(url) {
      $("runUrl").hidden = false;
      $("runUrlText").textContent = url;
    }

    async function refreshList() {
      const body = await api("/api/configs");
      const list = $("savedList");
      list.innerHTML = "";
      if (!body.configs.length) {
        list.innerHTML = '<div class="hint">No runners yet. Create one on the left.</div>';
        return;
      }
      body.configs.forEach((config) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "saved-item";
        button.innerHTML = '<strong></strong><span class="volume"></span><small></small>';
        button.querySelector("strong").textContent = config.name;
        button.querySelector(".volume").textContent = (config.clayCalls || 0) + " calls";
        button.querySelector("small").textContent = config.method + " " + config.targetUrl;
        button.addEventListener("click", async () => {
          const detail = await api("/api/configs/" + config.id);
          applyConfig(detail.config);
          showRunUrl(detail.runUrl);
          print(detail.config);
          setStatus("Loaded", true);
          await refreshAnalytics();
        });
        list.appendChild(button);
      });
    }

    async function runTest() {
      requireFormReady();
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
      if (state.id) await refreshAnalytics();
    }

    async function saveRunner() {
      if (state.locked) return;
      requireFormReady();
      setStatus("Saving...", true);
      const body = await api("/api/configs", { method: "POST", body: JSON.stringify({ config: readConfig() }) });
      state.id = body.config.id;
      state.locked = true;
      showRunUrl(body.runUrl);
      print(body);
      setLocked(true);
      setStatus("Saved", true);
      await refreshList();
      await refreshAnalytics();
    }

    async function refreshAnalytics() {
      if (!state.id) {
        $("analyticsPanel").hidden = true;
        return;
      }
      const body = await api("/api/configs/" + state.id + "/analytics");
      renderAnalytics(body.analytics);
    }

    function renderAnalytics(analytics) {
      $("analyticsPanel").hidden = false;
      $("metricTotalRuns").textContent = analytics.totalRuns || 0;
      $("metricClayRuns").textContent = analytics.clayRuns || 0;
      $("metricItems").textContent = analytics.totalItems || 0;
      $("metricDuration").textContent = (analytics.avgDurationMs || 0) + " ms";
      $("statusCounts").innerHTML = "";
      (analytics.statusCounts || []).forEach((entry) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = entry.statusCode + ": " + entry.count;
        $("statusCounts").appendChild(pill);
      });
      renderChart(analytics.statusTimeline || []);
      $("recentRuns").textContent = analytics.recentRuns?.length ? "Last call: " + analytics.recentRuns[0].status + " · " + analytics.recentRuns[0].itemCount + " items" : "No calls yet.";
    }

    function renderChart(points) {
      const chart = $("statusChart");
      chart.innerHTML = "";
      if (!points.length) {
        chart.innerHTML = '<span class="hint">No calls yet.</span>';
        return;
      }
      const max = Math.max(...points.map((point) => point.count), 1);
      points.slice(-30).forEach((point) => {
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = Math.max(4, Math.round((point.count / max) * 74)) + "px";
        bar.title = point.bucket + " · " + point.statusCode + " · " + point.count;
        if (String(point.statusCode).startsWith("4")) bar.style.background = "#f58c50";
        if (String(point.statusCode).startsWith("5")) bar.style.background = "#dd2c53";
        chart.appendChild(bar);
      });
    }

    $("newBtn").addEventListener("click", () => {
      applyConfig(defaults);
      state.id = null;
      state.locked = false;
      setLocked(false);
      setHeaderRows("credentialHeaders", [{ name: "Authorization", value: "" }]);
      $("runUrl").hidden = true;
      $("analyticsPanel").hidden = true;
      $("aiObjectReview").hidden = true;
      $("aiObjectPaste").value = "";
      setAiObjectStatus("");
      print({});
      setStatus("", true);
    });
    $("refreshBtn").addEventListener("click", () => refreshList().catch((error) => setStatus(error.message, false)));
    $("analyticsRefreshBtn").addEventListener("click", () => refreshAnalytics().catch((error) => setStatus(error.message, false)));
    $("addStaticHeader").addEventListener("click", () => addHeaderRow("staticHeaders"));
    $("addCredentialHeader").addEventListener("click", () => addHeaderRow("credentialHeaders"));
    $("paginationType").addEventListener("change", updatePaginationFields);
    $("testBtn").addEventListener("click", () => runTest().catch((error) => { print({ error: error.message }); setStatus(error.message, false); }));
    $("saveBtn").addEventListener("click", () => saveRunner().catch((error) => { print({ error: error.message }); setStatus(error.message, false); }));
    $("copyBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("runUrlText").textContent);
      setStatus("Copied", true);
    });

    $("generatePromptBtn").addEventListener("click", generatePrompt);
    $("copyPromptBtn").addEventListener("click", async () => {
      if (!$("aiPrompt").value.trim()) generatePrompt();
      await navigator.clipboard.writeText($("aiPrompt").value);
      setPromptStatus("Copied.");
    });
    $("applyAiObjectBtn").addEventListener("click", applyAiObject);
    $("clearAiObjectBtn").addEventListener("click", () => {
      $("aiObjectPaste").value = "";
      $("aiObjectReview").hidden = true;
      setAiObjectStatus("");
    });
    $("docsFile").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) readDocsFile(file).catch((error) => setPromptStatus(error.message));
    });

    applyConfig(defaults);
    setHeaderRows("credentialHeaders", [{ name: "Authorization", value: "" }]);
    updateUrlShape();
    refreshList().catch((error) => setStatus(error.message, false));
  </script>
</body>
</html>`;
}
