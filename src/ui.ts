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
    header nav {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    a {
      color: var(--action);
      text-decoration: none;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
    header a {
      color: var(--secondary);
      font-size: 12px;
    }
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
      padding: 0;
    }
    .app-view {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px;
    }
    .app-view[hidden] { display: none; }
    .view-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 0 18px;
    }
    .view-head h2 {
      font-size: 24px;
      line-height: 1.2;
    }
    .view-subtitle {
      margin-top: 4px;
      color: var(--secondary);
      font-size: 14px;
      font-weight: 500;
    }
    .overview {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      padding: 16px 0 22px;
    }
    .overview-card {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 16px;
    }
    .overview-icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: var(--blue-soft);
      color: var(--action);
      font-weight: 700;
    }
    .overview-card span,
    .detail-label {
      display: block;
      color: var(--secondary);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .overview-card strong {
      display: block;
      margin-top: 2px;
      font-size: 22px;
      font-weight: 600;
    }
    .runner-list {
      display: grid;
      gap: 12px;
    }
    .runner-card {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: start;
      text-align: left;
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 18px;
    }
    .runner-card:hover:not(:disabled) {
      background: var(--surface);
      box-shadow: 0 6px 18px rgba(20, 24, 35, 0.08);
    }
    .runner-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .runner-title strong {
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: var(--radius-sm);
      padding: 2px 7px;
      background: var(--surface-soft);
      color: var(--secondary);
      border: 0.5px solid var(--border-soft);
      font-size: 11px;
      font-weight: 700;
    }
    .runner-url {
      margin: 10px 0 14px;
      color: var(--secondary);
      overflow-wrap: anywhere;
      font-size: 13px;
    }
    .runner-metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }
    .runner-metrics span {
      color: var(--secondary);
      display: block;
      font-size: 11px;
      font-weight: 600;
    }
    .runner-metrics strong {
      display: block;
      margin-top: 2px;
      font-size: 14px;
      font-weight: 600;
    }
    .wizard-wrap {
      display: grid;
      gap: 20px;
    }
    .progress {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      padding: 14px;
      border: 0.5px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .progress-step {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--secondary);
      font-weight: 600;
    }
    .progress-step .step {
      background: var(--surface-soft);
      color: var(--secondary);
    }
    .progress-step.active {
      color: var(--content);
    }
    .progress-step.active .step {
      background: var(--content);
      color: #fff;
    }
    .progress-step.complete .step {
      background: var(--green-soft);
      color: var(--success);
    }
    .step-panel[hidden] { display: none; }
    .wizard-nav {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
      gap: 18px;
      align-items: start;
    }
    .detail-stack {
      display: grid;
      gap: 14px;
    }
    .detail-row {
      display: grid;
      gap: 5px;
    }
    .review-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
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
      padding: 16px 18px;
      border-bottom: 0.5px solid var(--border-soft);
    }
    .panel-body {
      display: grid;
      gap: 20px;
      padding: 18px;
    }
    .section {
      display: grid;
      gap: 16px;
      padding: 18px;
      border: 0.5px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .pagination-group {
      display: grid;
      gap: 14px;
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
      gap: 14px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    label {
      display: grid;
      gap: 7px;
      min-width: 0;
      color: var(--content);
      font-size: 12px;
      font-weight: 600;
    }
    .label-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .help {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      border: 0.5px solid var(--border);
      color: var(--secondary);
      background: var(--surface-soft);
      font-size: 11px;
      font-weight: 700;
      cursor: help;
    }
    .help::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 8px);
      transform: translateX(-50%);
      z-index: 8;
      display: none;
      width: min(280px, 70vw);
      padding: 9px 10px;
      border-radius: var(--radius-md);
      background: var(--content);
      color: #fff;
      box-shadow: 0 8px 20px rgba(20, 24, 35, 0.18);
      font-size: 12px;
      line-height: 1.4;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
    }
    .help:hover::after,
    .help:focus::after {
      display: block;
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
    input[type="checkbox"] {
      width: auto;
      justify-self: start;
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
    button.danger {
      color: #fff;
      border-color: var(--danger);
      background: var(--danger);
    }
    button.danger:hover:not(:disabled) { filter: brightness(0.94); }
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
    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
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
    .warning {
      border-color: #f2d987;
      background: var(--yellow-soft);
      color: #594400;
    }
    .error-card {
      border-color: #ffc1cd;
      background: var(--red-soft);
      color: #81172d;
      white-space: pre-wrap;
    }
    .status {
      min-height: 20px;
      font-weight: 600;
    }
    .status.ok { color: var(--success); }
    .status.err { color: var(--danger); }
    .loading-line {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--secondary);
      font-size: 12px;
      font-weight: 600;
      min-height: 24px;
    }
    .loading-line[hidden] { display: none; }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--border);
      border-top-color: var(--action);
      border-radius: 999px;
      animation: spin 0.85s linear infinite;
      flex: none;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    button.is-loading {
      position: relative;
    }
    button.is-loading::before {
      content: "";
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.55);
      border-top-color: currentColor;
      border-radius: 999px;
      animation: spin 0.85s linear infinite;
    }
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
    .trace {
      display: grid;
      gap: 6px;
      max-height: 220px;
      overflow: auto;
    }
    .trace-row {
      display: grid;
      grid-template-columns: 48px 70px 84px 84px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      padding: 7px 8px;
      border: 0.5px solid var(--border-soft);
      border-radius: var(--radius-sm);
      background: var(--surface-soft);
      font-size: 12px;
    }
    .trace-row code {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 980px) {
      .app-view { padding: 14px; }
      .view-head, .runner-card { grid-template-columns: 1fr; }
      .view-head { display: grid; }
      .overview, .runner-metrics, .progress, .detail-grid, .review-grid { grid-template-columns: 1fr; }
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
    <nav aria-label="Project links">
      <a href="https://github.com/chrisrcardone/clay-paginate" target="_blank" rel="noreferrer">GitHub</a>
      <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/src/index.ts" target="_blank" rel="noreferrer">Worker source</a>
      <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/SKILL.md" target="_blank" rel="noreferrer">AI skill</a>
    </nav>
  </header>

  <main>
    <section id="listView" class="app-view">
      <div class="view-head">
        <div>
          <h2>API Pagination Runners</h2>
          <div class="view-subtitle">Configure once, use everywhere. Runtime credentials stay in Clay.</div>
        </div>
        <button id="newBtn" class="primary" type="button">Create New Runner</button>
      </div>
      <div id="listStatus" class="status"></div>
      <div class="notice">
        <div class="grid-2">
          <label><span class="label-row">Admin token <span class="help" tabindex="0" data-tooltip="Required for creating, testing, listing, and viewing runner configs. It is stored only in this browser's local storage and sent as x-admin-token.">?</span></span><input id="adminToken" type="password" autocomplete="off" placeholder="Paste admin token"></label>
          <div class="actions" style="align-self:end;"><button id="saveAdminTokenBtn" type="button">Save token</button><button id="clearAdminTokenBtn" type="button">Clear token</button><span id="adminTokenStatus" class="hint"></span></div>
        </div>
      </div>
      <div id="listLoading" class="loading-line" hidden><span class="spinner"></span><span>Loading saved runners...</span></div>
      <div class="overview">
        <div class="overview-card"><div class="overview-icon">A</div><div><span>Active runners</span><strong id="overviewRunnerCount">0</strong></div></div>
        <div class="overview-card"><div class="overview-icon">R</div><div><span>Total calls</span><strong id="overviewTotalRuns">0</strong></div></div>
        <div class="overview-card"><div class="overview-icon">S</div><div><span>Clay calls</span><strong id="overviewClayRuns">0</strong></div></div>
      </div>
      <div id="savedList" class="runner-list"></div>
      <div class="notice">
        This project is open source for auditability. Review the <a href="https://github.com/chrisrcardone/clay-paginate" target="_blank" rel="noreferrer">GitHub repository</a>, <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/src/pagination.ts" target="_blank" rel="noreferrer">pagination engine</a>, or <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/SECURITY.md" target="_blank" rel="noreferrer">security notes</a>.
      </div>
    </section>

    <section id="createView" class="app-view" hidden>
      <div class="view-head">
        <div>
          <button id="backToListBtn" type="button">Back to List</button>
          <h2>Create New Runner</h2>
          <div id="createSubtitle" class="view-subtitle">Let AI help you configure from documentation.</div>
        </div>
        <button id="newBtnSecondary" type="button">Reset</button>
      </div>
      <div class="wizard-wrap">
        <div class="progress">
          <div class="progress-step" data-progress-step="ai"><span class="step">1</span><span>AI Setup</span></div>
          <div class="progress-step" data-progress-step="configure"><span class="step">2</span><span>Configure</span></div>
          <div class="progress-step" data-progress-step="test"><span class="step">3</span><span>Test</span></div>
          <div class="progress-step" data-progress-step="review"><span class="step">4</span><span>Review & Save</span></div>
        </div>
        <div id="flowStatus" class="status"></div>
    <section class="panel">
      <div class="panel-body">
        <div id="lockedNotice" class="notice locked" hidden>This runner is locked. Create a new runner for changes.</div>

        <div class="section step-panel" data-wizard-step="ai">
          <div class="section-title"><span class="step">AI</span><h3>AI setup helper</h3></div>
          <div class="section-copy">Use this when you have API docs but do not know which fields to enter. Generate a prompt, send it to Claude, ChatGPT, or another AI, then paste the returned JSON object back here. The app fills the values the AI provided and clears untouched defaults it did not provide.</div>
          <div class="link-row">
            <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/AI_CONFIG_GUIDE.md" target="_blank" rel="noreferrer">AI configuration guide</a>
            <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/SKILL.md" target="_blank" rel="noreferrer">Skill file for AI tools</a>
          </div>
          <div class="grid-2">
            <label><span class="label-row">API documentation URL <span class="help" tabindex="0" data-tooltip="Paste the public docs page for the exact endpoint. The generated AI prompt will ask the AI to read this before returning values.">?</span></span><input id="docsUrl" placeholder="https://docs.example.com/api/list-endpoint"></label>
            <label><span class="label-row">What data do you want Clay to fetch? <span class="help" tabindex="0" data-tooltip="Describe the result you expect in business language so the AI can choose the right endpoint and avoid nearby but incorrect APIs.">?</span></span><input id="docsGoal" placeholder="Example: G2 buyer intent event stream for a date range"></label>
          </div>
          <label><span class="label-row">Documentation file <span class="help" tabindex="0" data-tooltip="Optional. Upload copied docs text when the docs are private, blocked, or easier to provide as a file. The file is read locally into the prompt area only.">?</span></span><input id="docsFile" type="file" accept=".txt,.md,.json,.yaml,.yml,.html,.htm,.csv"></label>
          <label><span class="label-row">Paste docs excerpt or notes <span class="help" tabindex="0" data-tooltip="Paste endpoint examples, pagination notes, auth requirements, and sample responses here. More specific excerpts produce better AI output.">?</span></span><textarea id="docsExcerpt" class="tall" spellcheck="false" placeholder="Optional. Paste the pagination section, endpoint example response, auth notes, or copied file text here."></textarea></label>
          <div class="actions">
            <button id="generatePromptBtn" class="primary" type="button">Generate AI prompt</button>
            <button id="copyPromptBtn" type="button">Copy prompt</button>
            <span id="promptStatus" class="hint"></span>
          </div>
          <label><span class="label-row">Prompt to paste into AI <span class="help" tabindex="0" data-tooltip="Copy this prompt into Claude, ChatGPT, or another AI. The linked GitHub guide gives the AI the current schema and safety rules.">?</span></span><textarea id="aiPrompt" class="prompt-box" readonly spellcheck="false"></textarea></label>
          <label><span class="label-row">Paste AI object <span class="help" tabindex="0" data-tooltip="Paste the strict JSON object returned by the AI. Values the AI does not provide are cleared if they are still starter defaults.">?</span></span><textarea id="aiObjectPaste" class="object-box" spellcheck="false" placeholder='Paste the full JSON object returned by the AI here'></textarea></label>
          <div class="actions">
            <button id="applyAiObjectBtn" type="button">Apply AI object</button>
            <button id="clearAiObjectBtn" type="button">Clear object</button>
            <span id="aiObjectStatus" class="hint"></span>
          </div>
          <div id="aiObjectReview" class="notice ai-review" hidden></div>
          <div class="wizard-nav">
            <button id="skipAiBtn" type="button">Skip AI - Configure Manually</button>
            <button id="aiContinueBtn" class="primary" type="button">Continue to Configure</button>
          </div>
        </div>

        <div class="section step-panel" data-wizard-step="configure">
          <div class="section-title"><span class="step">1</span><h3>Endpoint</h3></div>
          <div class="section-copy">Enter the upstream API endpoint exactly as the API expects it. If a credential must live in the URL, use a placeholder such as <code>{{key}}</code>; Clay will pass the value on the generated runner URL at run time.</div>
          <div class="grid-2">
            <label><span class="label-row">Name <span class="required">required</span> <span class="help" tabindex="0" data-tooltip="A stable human-readable name for this saved runner. It cannot be changed after saving.">?</span></span><input id="name" value="G2 Buyer Stream v2 API"></label>
            <label><span class="label-row">Method <span class="help" tabindex="0" data-tooltip="The HTTP method used when calling the upstream API. Clay will always call this Worker URL, and the Worker uses this method upstream.">?</span></span>
              <select id="method"><option value="">Select method</option><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option></select>
            </label>
          </div>
          <label><span class="label-row">Target URL <span class="required">required</span> <span class="help" tabindex="0" data-tooltip="The exact upstream endpoint to paginate. Use {{key}} placeholders for URL credentials so secrets are supplied at runtime and never saved.">?</span></span><input id="targetUrl" value="https://data.g2.com/api/v1/ahoy/remote-event-streams"></label>
          <div class="hint">For URL keys, use placeholders like <code>https://api.com/call?api={{key}}</code>. Clay will call <code>${runPathExample}?key=...</code>.</div>
          <div class="grid-3">
            <label><span class="label-row">Results path <span class="required">required</span> <span class="help" tabindex="0" data-tooltip="JSON path to the array of records in each response page, such as data, results, items, records, or products.">?</span></span><input id="resultPath" value="data"></label>
            <label><span class="label-row">Response <span class="help" tabindex="0" data-tooltip="Array returns only the combined rows. Envelope returns data plus metadata such as page count and stop reason.">?</span></span>
              <select id="responseMode"><option value="">Select response</option><option value="array">Array</option><option value="envelope">Envelope</option></select>
            </label>
            <label><span class="label-row">Max items <span class="help" tabindex="0" data-tooltip="Optional hard cap for returned rows. Leave blank when Clay should receive every result available from the paginated endpoint.">?</span></span><input id="maxItems" type="number" min="1" placeholder="Optional"></label>
          </div>
        </div>

        <div class="section step-panel" data-wizard-step="configure">
          <div class="section-title"><span class="step">2</span><h3>Pagination</h3></div>
          <div class="section-copy">Choose the pagination style from the API docs. Max pages is a safety cap, not the number of pages to fetch; the runner stops automatically when the API has no next page.</div>
          <div class="grid-3">
            <label><span class="label-row">Type <span class="help" tabindex="0" data-tooltip="Select the pagination pattern shown in the API docs. Auto-detect can suggest this from one test response.">?</span></span>
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
            <label><span class="label-row">Max pages <span class="required">required</span> <span class="help" tabindex="0" data-tooltip="A runaway-loop safety cap. It should be high enough to fetch all pages; it does not force extra calls after pagination ends.">?</span></span><input id="maxPages" type="number" min="1" max="1000" value="250"></label>
            <label><span class="label-row">Page size <span class="help" tabindex="0" data-tooltip="The number of records requested per page when the API supports it. Larger documented values usually reduce total API calls.">?</span></span><input id="pageSize" type="number" min="1" value="25"></label>
          </div>
          <div class="pagination-group" data-pagination-group="page">
            <div class="hint">Use this for APIs that paginate with page numbers. JSON next link also follows <code>links.next</code> when present.</div>
            <div class="grid-3">
              <label><span class="label-row">Page param <span class="help" tabindex="0" data-tooltip="Query parameter used to request a specific page number, for example page or page[number].">?</span></span><input id="pageParam" value="page[number]"></label>
              <label><span class="label-row">Page size param <span class="help" tabindex="0" data-tooltip="Query parameter used to request page size, for example per_page, limit, or page[size].">?</span></span><input id="pageSizeParam" value="page[size]"></label>
              <label><span class="label-row">Start page <span class="help" tabindex="0" data-tooltip="First page number documented by the API. Most APIs start at 1; some start at 0.">?</span></span><input id="startPage" type="number" min="1" value="1"></label>
            </div>
            <div class="grid-2">
              <label><span class="label-row">Next link path <span class="help" tabindex="0" data-tooltip="JSON path to the next page URL. For JSON:API this is commonly links.next.">?</span></span><input id="nextLinkPath" value="links.next"></label>
              <label><span class="label-row">Total pages path <span class="help" tabindex="0" data-tooltip="Optional JSON path to total pages. The runner can also stop from next-link absence, empty pages, or other stop conditions.">?</span></span><input id="totalPagesPath" value="meta.page_count"></label>
            </div>
          </div>
          <div class="pagination-group" data-pagination-group="offset" hidden>
            <div class="hint">Use this for APIs that ask for an offset and limit.</div>
            <div class="grid-3">
              <label><span class="label-row">Offset param <span class="help" tabindex="0" data-tooltip="Query parameter that tells the API how many records to skip.">?</span></span><input id="offsetParam" value="offset"></label>
              <label><span class="label-row">Limit param <span class="help" tabindex="0" data-tooltip="Query parameter that tells the API how many records to return per page.">?</span></span><input id="limitParam" value="limit"></label>
              <label><span class="label-row">Start offset <span class="help" tabindex="0" data-tooltip="First offset value. Most offset APIs start at 0.">?</span></span><input id="startOffset" type="number" min="0" value="0"></label>
            </div>
          </div>
          <div class="pagination-group" data-pagination-group="cursor" hidden>
            <div class="hint">Use this for APIs that return a cursor for the next page.</div>
            <div class="grid-2">
              <label><span class="label-row">Cursor param <span class="help" tabindex="0" data-tooltip="Query parameter used to send the next cursor back to the API.">?</span></span><input id="cursorParam" value="cursor"></label>
              <label><span class="label-row">Next cursor path <span class="help" tabindex="0" data-tooltip="JSON path where the API returns the cursor for the following page.">?</span></span><input id="nextCursorPath" value="meta.next_cursor"></label>
            </div>
            <label><span class="label-row">Initial cursor <span class="help" tabindex="0" data-tooltip="Optional cursor for the first call. Leave blank unless the API docs require a starting cursor.">?</span></span><input id="initialCursor"></label>
          </div>
          <div class="pagination-group" data-pagination-group="linkHeader" hidden>
            <div class="hint">Use this for APIs that return the next page in the HTTP <code>Link</code> header.</div>
          </div>
          <div class="pagination-group" data-pagination-group="none" hidden>
            <div class="hint">Use this when the endpoint returns everything in one response.</div>
          </div>
        </div>

        <div class="section step-panel" data-wizard-step="configure">
          <div class="section-title"><span class="step">3</span><h3>Response shaping</h3></div>
          <div class="section-copy">Return the full item by default, flatten JSON:API attributes for easier Clay columns, or select only the fields Clay needs.</div>
          <div class="grid-2">
            <label><span class="label-row">Shape mode <span class="help" tabindex="0" data-tooltip="Choose how records are returned to Clay. Raw preserves each item, JSON:API attributes flattens attributes, and Select fields returns only mapped columns.">?</span></span>
              <select id="shapeMode">
                <option value="raw">Full item</option>
                <option value="jsonapiAttributes">Flatten JSON:API attributes</option>
                <option value="select">Select fields</option>
              </select>
            </label>
            <label><span class="label-row">Selected fields <span class="help" tabindex="0" data-tooltip="Only used in Select fields mode. Add one output column per line as output_name:path.to.value.">?</span></span><textarea id="shapeFields" spellcheck="false" placeholder="company:attributes.company_name&#10;score:attributes.score"></textarea></label>
          </div>
          <div class="hint">Use one field per line as <code>output_name:path.to.value</code>. Selected fields only applies when Shape mode is Select fields.</div>
        </div>

        <div class="section step-panel" data-wizard-step="configure">
          <div class="section-title"><span class="step">4</span><h3>Safety and rate controls</h3></div>
          <div class="section-copy">These controls prevent runaway loops and help with rate-limited APIs. The defaults stop on empty pages and repeated next links while still allowing full pagination.</div>
          <div class="grid-3">
            <label><span class="label-row">Delay between pages, ms <span class="help" tabindex="0" data-tooltip="Optional pause between upstream page calls. Use when docs require rate limiting; too high can make Clay wait longer.">?</span></span><input id="delayMs" type="number" min="0" max="10000" value="0"></label>
            <label><span class="label-row">Retry attempts <span class="help" tabindex="0" data-tooltip="Number of times to retry transient upstream failures such as 429 and 5xx responses.">?</span></span><input id="retryAttempts" type="number" min="0" max="5" value="2"></label>
            <label><span class="label-row">Timeout, ms <span class="help" tabindex="0" data-tooltip="Maximum time to wait for each upstream page request before treating it as failed.">?</span></span><input id="timeoutMs" type="number" min="1000" max="55000" value="25000"></label>
          </div>
          <div class="grid-3">
            <label><span class="label-row">Retry statuses <span class="help" tabindex="0" data-tooltip="Comma-separated upstream HTTP statuses that should be retried. Defaults cover timeouts, rate limits, and transient server errors.">?</span></span><input id="retryStatuses" value="408,429,500,502,503,504"></label>
            <label><span class="label-row">Max duration, ms <span class="help" tabindex="0" data-tooltip="Optional total runtime cap for a full pagination run. Leave blank unless the upstream API is especially large or slow.">?</span></span><input id="maxDurationMs" type="number" min="1000" placeholder="Optional"></label>
            <label><span class="label-row">Max response bytes <span class="help" tabindex="0" data-tooltip="Optional cap for the total response size processed during a run. This protects against unexpectedly huge responses.">?</span></span><input id="maxResponseBytes" type="number" min="1024" placeholder="Optional"></label>
          </div>
          <div class="grid-3">
            <label><input id="respectRetryAfter" type="checkbox" checked> Respect Retry-After</label>
            <label><input id="stopOnEmptyPage" type="checkbox" checked> Stop on empty page</label>
            <label><input id="stopOnRepeatedNext" type="checkbox" checked> Stop on repeated next</label>
          </div>
          <div class="grid-2">
            <label><input id="stopOnDuplicateItemId" type="checkbox"> Stop on duplicate item ID</label>
            <label>Item ID path<input id="itemIdPath" value="id"></label>
          </div>
          <div class="wizard-nav">
            <button id="configureBackBtn" type="button">Back to AI</button>
            <button id="configureContinueBtn" class="primary" type="button">Continue to Testing</button>
          </div>
        </div>

        <div class="section step-panel" data-wizard-step="test">
          <div class="section-title"><span class="step">5</span><h3>Auth and test</h3></div>
          <div class="section-copy">List only the header names Clay should forward at run time. Use test credentials here to verify the runner; test credentials and query values are not saved.</div>
          <label><span class="label-row">Pass-through headers <span class="help" tabindex="0" data-tooltip="Header names the Worker may forward from Clay to the upstream API. Only names are saved; values come from Clay at runtime.">?</span></span><input id="passThroughHeaders" value="authorization,x-api-key,api-key"></label>
          <div class="hint">Header values come from Clay at run time. They are never stored.</div>
          <div class="actions">
            <strong class="muted">Static headers</strong>
            <span class="help" tabindex="0" data-tooltip="Static headers are saved and sent on every upstream request. Use only non-secret values like Accept or Content-Type.">?</span>
            <button id="addStaticHeader" type="button">Add static header</button>
          </div>
          <div id="staticHeaders"></div>
          <div class="actions">
            <strong class="muted">Test credentials</strong>
            <span class="help" tabindex="0" data-tooltip="Temporary headers used only for this browser test. They are sent to the upstream API but never saved.">?</span>
            <button id="addCredentialHeader" type="button">Add test header</button>
          </div>
          <div id="credentialHeaders"></div>
          <label><span class="label-row">Test query params <span class="help" tabindex="0" data-tooltip="Temporary query params for this test only. Use this for URL placeholders such as key=temporary-test-key or filters needed by the endpoint.">?</span></span><input id="queryString" placeholder="filter[start_time]=2026-05-27T00:00:00Z or key=api-key"></label>
          <label><span class="label-row">Body template <span class="help" tabindex="0" data-tooltip="Static request body for POST, PUT, or PATCH endpoints. Do not include credentials here.">?</span></span><textarea id="bodyTemplate" spellcheck="false"></textarea></label>
          <div class="actions">
            <button id="detectBtn" type="button">Auto-detect from first response</button>
            <button id="testBtn" class="primary" type="button">Run test</button>
            <span class="hint">Test credentials, query params, response rows, and traces are not saved.</span>
          </div>
          <div id="testLoading" class="loading-line" hidden><span class="spinner"></span><span id="testLoadingText">Working...</span></div>
          <div id="lastError" class="notice error-card" hidden></div>
          <div id="trace" class="trace"></div>
          <pre id="output">{}</pre>
          <div class="wizard-nav">
            <button id="testBackBtn" type="button">Back to Configuration</button>
            <button id="testContinueBtn" class="primary" type="button" disabled>Continue to Review</button>
          </div>
        </div>

        <div class="section step-panel" data-wizard-step="review">
          <div class="section-title"><span class="step">6</span><h3>Save and connect</h3></div>
          <div class="section-copy">Review the tested configuration, then save. Saved runners are locked so live Clay tables keep a stable URL and behavior.</div>
          <div id="reviewSummary" class="review-grid"></div>
          <div id="urlShape" class="hint"></div>
          <div id="validationWarnings" class="notice warning" hidden></div>
          <div class="notice">Saving creates a stable URL. Saved runners cannot be edited or deleted.</div>
          <div class="wizard-nav">
            <button id="reviewBackBtn" type="button">Back to Testing</button>
            <div class="actions"><button id="saveBtn" class="primary" type="button">Save runner</button><div id="status" class="status"></div></div>
          </div>
          <div id="runUrl" class="url-box" hidden>
            <strong>Clay URL</strong>
            <code id="runUrlText"></code>
            <div id="claySetup" class="hint"></div>
            <div class="actions"><button id="copyBtn" type="button">Copy URL</button><button id="copySetupBtn" type="button">Copy Clay setup</button></div>
          </div>
        </div>
      </div>
    </section>

      </div>
    </section>

    <section id="detailsView" class="app-view" hidden>
      <div class="view-head">
        <div>
          <button id="detailsBackBtn" type="button">Back to List</button>
          <h2 id="detailName">Runner details</h2>
          <div class="view-subtitle"><span id="detailMethod" class="badge"></span> <span id="detailPagination" class="badge"></span></div>
        </div>
        <button id="refreshBtn" type="button">Refresh</button>
      </div>
      <div id="detailStatus" class="status"></div>
      <div id="detailLoading" class="loading-line" hidden><span class="spinner"></span><span>Loading runner details...</span></div>
      <div class="detail-grid">
        <div class="detail-stack">
          <section class="panel">
            <div class="panel-head"><h2>Generated Runner URL</h2></div>
            <div class="panel-body">
              <div class="url-box">
                <code id="detailRunUrlText"></code>
                <div class="actions"><button id="detailCopyBtn" type="button">Copy URL</button><button id="detailCopySetupBtn" type="button">Copy Clay setup</button></div>
              </div>
              <div id="detailClaySetup" class="notice"></div>
              <div class="notice warning">
                <strong>Runner access token</strong>
                <div class="hint">Tokens are only emailed to <code>@clay.com</code> addresses. The token is not shown in the app and is never forwarded to the upstream API.</div>
                <div id="runnerTokenMeta" class="hint"></div>
                <div class="grid-2">
                  <label><span class="label-row">Clay email <span class="help" tabindex="0" data-tooltip="Only clay.com email addresses can receive runner tokens.">?</span></span><input id="runnerTokenEmail" type="email" autocomplete="off" placeholder="name@clay.com"></label>
                  <div class="actions" style="align-self:end;"><button id="emailRunnerTokenBtn" type="button">Email token</button><button id="generateRunnerTokenBtn" type="button">Generate and email token</button></div>
                </div>
                <div class="notice locked">
                  <strong>Regeneration warnings</strong>
                  <div>Regenerating replaces the token for this runner. Clay Signals and workflows using the old token will fail until each one is updated. Do this only during a planned change window.</div>
                  <label><span class="label-row">Confirmation phrase</span><input id="runnerTokenConfirm" autocomplete="off" placeholder="Type REGENERATE RUNNER TOKEN"></label>
                  <label class="label-row"><input id="runnerTokenAck" type="checkbox"> I understand this can offline active Signals using the current token.</label>
                  <div class="actions"><button id="regenerateRunnerTokenBtn" class="danger" type="button">Regenerate and email new token</button></div>
                </div>
                <div id="runnerTokenStatus" class="status"></div>
              </div>
              <div class="link-row">
                <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/src/index.ts" target="_blank" rel="noreferrer">Worker routes</a>
                <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/src/pagination.ts" target="_blank" rel="noreferrer">Pagination logic</a>
                <a href="https://github.com/chrisrcardone/clay-paginate/blob/main/SECURITY.md" target="_blank" rel="noreferrer">Security model</a>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Configuration Details</h2></div>
            <div class="panel-body">
              <div class="detail-row"><span class="detail-label">Target endpoint</span><code id="detailTargetUrl"></code></div>
              <div class="review-grid">
                <div><span class="detail-label">Method</span><strong id="detailMethodValue"></strong></div>
                <div><span class="detail-label">Result path</span><strong id="detailResultPath"></strong></div>
                <div><span class="detail-label">Response</span><strong id="detailResponseMode"></strong></div>
                <div><span class="detail-label">Max pages</span><strong id="detailMaxPages"></strong></div>
                <div><span class="detail-label">Page size</span><strong id="detailPageSize"></strong></div>
                <div><span class="detail-label">Shape</span><strong id="detailShapeMode"></strong></div>
              </div>
              <div class="notice locked">Saved runners are immutable. Create a new runner for changes.</div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Recent Runs</h2></div>
            <div class="panel-body"><div id="detailRecentRuns" class="trace"></div></div>
          </section>
        </div>
        <section id="analyticsPanel" class="panel" hidden>
          <div class="panel-head">
            <h2>Analytics</h2>
            <button id="analyticsRefreshBtn" type="button">Refresh</button>
          </div>
          <div class="panel-body">
            <div id="analyticsLoading" class="loading-line" hidden><span class="spinner"></span><span>Loading analytics...</span></div>
            <div class="metrics">
              <div class="metric"><span>Total calls</span><strong id="metricTotalRuns">0</strong></div>
              <div class="metric"><span>Clay calls</span><strong id="metricClayRuns">0</strong></div>
              <div class="metric"><span>Items returned</span><strong id="metricItems">0</strong></div>
              <div class="metric"><span>Avg duration</span><strong id="metricDuration">0 ms</strong></div>
              <div class="metric"><span>Avg pages</span><strong id="metricAvgPages">0</strong></div>
              <div class="metric"><span>Retries</span><strong id="metricRetries">0</strong></div>
            </div>
            <div id="statusCounts" class="actions"></div>
            <div id="stopCounts" class="actions"></div>
            <div id="errorCounts" class="actions"></div>
            <div id="statusChart" class="chart"></div>
            <div id="volumeChart" class="chart"></div>
            <div id="recentRuns" class="hint"></div>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
    const BASE_PATH = ${JSON.stringify(basePath)};
    const ADMIN_TOKEN_STORAGE_KEY = "clay-pagination-admin-token";
    const state = { id: null, locked: false, view: "list", step: "ai", lastTestOk: false, configs: [], detailRunUrl: "" };
    const $ = (id) => document.getElementById(id);
    const editableIds = ["name","method","targetUrl","resultPath","responseMode","maxItems","paginationType","maxPages","pageSize","pageParam","pageSizeParam","startPage","nextLinkPath","totalPagesPath","offsetParam","limitParam","startOffset","cursorParam","nextCursorPath","initialCursor","shapeMode","shapeFields","delayMs","retryAttempts","timeoutMs","retryStatuses","maxDurationMs","maxResponseBytes","respectRetryAfter","stopOnEmptyPage","stopOnRepeatedNext","stopOnDuplicateItemId","itemIdPath","passThroughHeaders","bodyTemplate"];
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
      },
      stopConditions: {
        stopOnEmptyPage: true,
        stopOnRepeatedNext: true,
        stopOnDuplicateItemId: false,
        itemIdPath: "id"
      },
      rateLimit: {
        delayMs: 0,
        retryAttempts: 2,
        retryStatuses: [408, 429, 500, 502, 503, 504],
        respectRetryAfter: true,
        timeoutMs: 25000
      },
      responseShape: {
        mode: "raw",
        fields: []
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
      shapeMode: defaults.responseShape.mode,
      shapeFields: "",
      delayMs: String(defaults.rateLimit.delayMs),
      retryAttempts: String(defaults.rateLimit.retryAttempts),
      timeoutMs: String(defaults.rateLimit.timeoutMs),
      retryStatuses: defaults.rateLimit.retryStatuses.join(","),
      maxDurationMs: "",
      maxResponseBytes: "",
      itemIdPath: defaults.stopConditions.itemIdPath,
      passThroughHeaders: defaults.passThroughHeaders.join(","),
      bodyTemplate: defaults.bodyTemplate,
      queryString: ""
    };

    async function api(path, options = {}) {
      const adminToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
      const response = await fetch(BASE_PATH + path, {
        ...options,
        headers: {
          "content-type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text ? { rawBody: text } : null;
      }
      if (!response.ok) {
        const error = new Error(body?.error || text || "Request failed");
        error.status = response.status;
        error.body = body;
        error.receivedAt = new Date().toISOString();
        throw error;
      }
      return body;
    }

    function setStatus(message, ok = true) {
      const text = message && !ok ? "[" + formatClock(new Date()) + "] " + message : message;
      ["status", "flowStatus", "listStatus", "detailStatus"].forEach((id) => {
        const element = $(id);
        if (!element) return;
        element.textContent = text;
        element.className = "status " + (ok ? "ok" : "err");
      });
    }

    function formatClock(value) {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
    }

    function formatFullTimestamp(value) {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    function setLoadingLine(id, loading, message) {
      const element = $(id);
      if (!element) return;
      if (message) {
        const text = element.querySelector("span:last-child");
        if (text) text.textContent = message;
      }
      element.hidden = !loading;
    }

    function setButtonBusy(id, busy, label) {
      const button = $(id);
      if (!button) return;
      if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
      button.classList.toggle("is-loading", busy);
      button.disabled = busy;
      button.textContent = busy ? label : button.dataset.defaultText;
    }

    function clearLastError() {
      const element = $("lastError");
      if (!element) return;
      element.hidden = true;
      element.textContent = "";
    }

    function handleUiError(error, context, options = {}) {
      const receivedAt = error?.receivedAt || new Date().toISOString();
      const status = error?.status ? "HTTP " + error.status : "Worker error";
      const body = error?.body;
      const upstreamBody = body?.upstreamBody;
      const message = error?.message || "Request failed";
      const bodyText = upstreamBody
        ? "\\n\\nUpstream body:\\n" + String(upstreamBody)
        : body
          ? "\\n\\nResponse body:\\n" + JSON.stringify(body, null, 2)
          : "";
      const full = context + " failed at " + formatFullTimestamp(receivedAt) + "\\n" + status + ": " + message + bodyText;

      if (options.showLastError !== false) {
        $("lastError").textContent = full;
        $("lastError").hidden = false;
      }
      setStatus(context + " failed: " + message, false);
      print({ error: message, context, receivedAt, status, response: body || null });
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

    function setAdminTokenStatus(message, ok = true) {
      $("adminTokenStatus").textContent = message;
      $("adminTokenStatus").style.color = ok ? "var(--secondary)" : "var(--danger)";
    }

    function hydrateAdminTokenState() {
      const saved = Boolean(localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY));
      $("adminToken").placeholder = saved ? "Admin token saved in this browser" : "Paste admin token";
      setAdminTokenStatus(saved ? "Token saved." : "Token required for admin actions.");
    }

    function showView(view) {
      state.view = view;
      $("listView").hidden = view !== "list";
      $("createView").hidden = view !== "create";
      $("detailsView").hidden = view !== "details";
      if (view === "create") setWizardStep(state.step || "ai");
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    function setWizardStep(step) {
      state.step = step;
      const subtitles = {
        ai: "Let AI help you configure from documentation.",
        configure: "Review and adjust endpoint, pagination, safety, and output settings.",
        test: "Test with temporary credentials before saving.",
        review: "Review the tested configuration and save an immutable runner."
      };
      $("createSubtitle").textContent = subtitles[step] || "";
      document.querySelectorAll("[data-wizard-step]").forEach((section) => {
        section.hidden = section.dataset.wizardStep !== step;
      });
      const order = ["ai", "configure", "test", "review"];
      document.querySelectorAll("[data-progress-step]").forEach((item) => {
        const itemStep = item.dataset.progressStep;
        item.className = "progress-step" +
          (itemStep === step ? " active" : "") +
          (order.indexOf(itemStep) < order.indexOf(step) ? " complete" : "");
      });
      if (step === "review") renderReviewSummary();
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    function resetCreateFlow() {
      applyConfig(defaults);
      state.id = null;
      state.locked = false;
      state.lastTestOk = false;
      setLocked(false);
      setHeaderRows("credentialHeaders", [{ name: "Authorization", value: "" }]);
      $("runUrl").hidden = true;
      $("trace").innerHTML = "";
      $("claySetup").textContent = "";
      $("aiObjectReview").hidden = true;
      $("aiObjectPaste").value = "";
      $("output").textContent = "{}";
      $("testContinueBtn").disabled = true;
      $("analyticsPanel").hidden = true;
      setAiObjectStatus("");
      setStatus("", true);
      setWizardStep("ai");
      showView("create");
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
        "The app is a guided flow: AI Setup -> Configure -> Test -> Review & Save. Your object will be pasted into AI Setup, applied to the form, then reviewed by the user before a required test and immutable save.",
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
        "10. Keep stopConditions and rateLimit conservative but production-ready: stopOnEmptyPage true, stopOnRepeatedNext true, retryAttempts 2, retryStatuses [408,429,500,502,503,504], respectRetryAfter true.",
        "11. Choose responseShape mode raw unless the API is JSON:API and flattening attributes would clearly help Clay users.",
        "12. For every non-blank value you return, include an explanation with certainty: high, medium, or low.",
        "13. If a value is not confirmed by the docs, leave it blank or null instead of guessing, explain the uncertainty, and add a warning.",
        "14. For values that are not confirmed, do not repeat the current defaults. The app clears untouched defaults so the user can see what still needs review.",
        "15. Return strict JSON only. Do not wrap it in markdown and do not add prose outside the object.",
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
        "    \\"stopConditions\\": {",
        "      \\"stopOnEmptyPage\\": true,",
        "      \\"stopOnRepeatedNext\\": true,",
        "      \\"stopOnDuplicateItemId\\": false,",
        "      \\"itemIdPath\\": \\"id\\",",
        "      \\"maxDurationMs\\": null,",
        "      \\"maxResponseBytes\\": null",
        "    },",
        "    \\"rateLimit\\": {",
        "      \\"delayMs\\": 0,",
        "      \\"retryAttempts\\": 2,",
        "      \\"retryStatuses\\": [408, 429, 500, 502, 503, 504],",
        "      \\"respectRetryAfter\\": true,",
        "      \\"timeoutMs\\": 25000",
        "    },",
        "    \\"responseShape\\": {",
        "      \\"mode\\": \\"raw | jsonapiAttributes | select\\",",
        "      \\"fields\\": [{ \\"name\\": \\"company\\", \\"path\\": \\"attributes.company_name\\" }]",
        "    },",
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
      row.querySelector("button").addEventListener("click", () => { row.remove(); markConfigDirty(); });
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", markConfigDirty);
        input.addEventListener("change", markConfigDirty);
      });
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

    function toBool(value) {
      if (value === MISSING) return MISSING;
      if (typeof value === "boolean") return value;
      return ["true", "1", "yes", "on"].includes(String(value || "").trim().toLowerCase());
    }

    function toShapeMode(value) {
      if (value === MISSING) return MISSING;
      const mode = normalizeObjectKey(value);
      if (mode === "raw" || mode === "fullitem") return "raw";
      if (mode === "jsonapiattributes" || mode === "flattenjsonapiattributes") return "jsonapiAttributes";
      if (mode === "select" || mode === "selectedfields") return "select";
      return "raw";
    }

    function formatFieldMappings(value) {
      if (value === MISSING) return MISSING;
      if (!value) return "";
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        return value
          .map((field) => {
            if (typeof field === "string") return field;
            return (field.name || field.path || "") + ":" + (field.path || "");
          })
          .filter(Boolean)
          .join("\\n");
      }
      if (typeof value === "object") {
        return Object.entries(value).map(([name, path]) => name + ":" + path).join("\\n");
      }
      return String(value);
    }

    function parseFieldMappings(text) {
      return text
        .split("\\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf(":");
          if (separator === -1) return { name: line, path: line };
          return { name: line.slice(0, separator).trim(), path: line.slice(separator + 1).trim() };
        })
        .filter((field) => field.name && field.path);
    }

    function parseNumberList(text) {
      return text.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));
    }

    function formatNumberList(value) {
      if (value === MISSING) return MISSING;
      if (Array.isArray(value)) return value.join(",");
      return String(value || "");
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

    function applyCheckboxFromAi(id, value, defaultValue, applied, blanked) {
      if (value !== MISSING) {
        $(id).checked = toBool(value);
        applied.push(id);
        return;
      }
      if ($(id).checked === defaultValue) {
        $(id).checked = false;
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
        shapeMode: firstAiValue(source, ["responseShape.mode", "shapeMode"]),
        shapeFields: firstAiValue(source, ["responseShape.fields", "shapeFields"]),
        delayMs: firstAiValue(source, ["rateLimit.delayMs", "delayMs"]),
        retryAttempts: firstAiValue(source, ["rateLimit.retryAttempts", "retryAttempts"]),
        timeoutMs: firstAiValue(source, ["rateLimit.timeoutMs", "timeoutMs"]),
        retryStatuses: firstAiValue(source, ["rateLimit.retryStatuses", "retryStatuses"]),
        respectRetryAfter: firstAiValue(source, ["rateLimit.respectRetryAfter", "respectRetryAfter"]),
        stopOnEmptyPage: firstAiValue(source, ["stopConditions.stopOnEmptyPage", "stopOnEmptyPage"]),
        stopOnRepeatedNext: firstAiValue(source, ["stopConditions.stopOnRepeatedNext", "stopOnRepeatedNext"]),
        stopOnDuplicateItemId: firstAiValue(source, ["stopConditions.stopOnDuplicateItemId", "stopOnDuplicateItemId"]),
        itemIdPath: firstAiValue(source, ["stopConditions.itemIdPath", "itemIdPath"]),
        maxDurationMs: firstAiValue(source, ["stopConditions.maxDurationMs", "maxDurationMs"]),
        maxResponseBytes: firstAiValue(source, ["stopConditions.maxResponseBytes", "maxResponseBytes"]),
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
      applyFieldFromAi("shapeMode", fields.shapeMode, fieldDefaults.shapeMode, toShapeMode, applied, blanked);
      applyFieldFromAi("shapeFields", fields.shapeFields, fieldDefaults.shapeFields, formatFieldMappings, applied, blanked);
      applyFieldFromAi("delayMs", fields.delayMs, fieldDefaults.delayMs, toFormNumber, applied, blanked);
      applyFieldFromAi("retryAttempts", fields.retryAttempts, fieldDefaults.retryAttempts, toFormNumber, applied, blanked);
      applyFieldFromAi("timeoutMs", fields.timeoutMs, fieldDefaults.timeoutMs, toFormNumber, applied, blanked);
      applyFieldFromAi("retryStatuses", fields.retryStatuses, fieldDefaults.retryStatuses, formatNumberList, applied, blanked);
      applyFieldFromAi("itemIdPath", fields.itemIdPath, fieldDefaults.itemIdPath, toFormString, applied, blanked);
      applyFieldFromAi("maxDurationMs", fields.maxDurationMs, fieldDefaults.maxDurationMs, toFormNumber, applied, blanked);
      applyFieldFromAi("maxResponseBytes", fields.maxResponseBytes, fieldDefaults.maxResponseBytes, toFormNumber, applied, blanked);
      applyCheckboxFromAi("respectRetryAfter", fields.respectRetryAfter, defaults.rateLimit.respectRetryAfter, applied, blanked);
      applyCheckboxFromAi("stopOnEmptyPage", fields.stopOnEmptyPage, defaults.stopConditions.stopOnEmptyPage, applied, blanked);
      applyCheckboxFromAi("stopOnRepeatedNext", fields.stopOnRepeatedNext, defaults.stopConditions.stopOnRepeatedNext, applied, blanked);
      applyCheckboxFromAi("stopOnDuplicateItemId", fields.stopOnDuplicateItemId, defaults.stopConditions.stopOnDuplicateItemId, applied, blanked);
      applyFieldFromAi("passThroughHeaders", fields.passThroughHeaders, fieldDefaults.passThroughHeaders, formatHeaderNames, applied, blanked);
      applyFieldFromAi("bodyTemplate", fields.bodyTemplate, fieldDefaults.bodyTemplate, toFormString, applied, blanked);
      applyFieldFromAi("queryString", fields.queryString, fieldDefaults.queryString, formatQueryParams, applied, blanked);
      applyHeadersFromAi("staticHeaders", fields.staticHeaders, defaults.staticHeaders, applied, blanked, true);
      applyHeadersFromAi("credentialHeaders", fields.credentialHeaders, [{ name: "Authorization", value: "" }], applied, blanked, false);

      updatePaginationFields();
      renderAiObjectReview(parsed, applied, blanked);
      setAiObjectStatus("Applied " + applied.length + " field(s). Cleared " + blanked.length + " untouched default(s).");
      state.lastTestOk = false;
      $("testContinueBtn").disabled = true;
      setWizardStep("configure");
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
        },
        stopConditions: {
          stopOnEmptyPage: $("stopOnEmptyPage").checked,
          stopOnRepeatedNext: $("stopOnRepeatedNext").checked,
          stopOnDuplicateItemId: $("stopOnDuplicateItemId").checked,
          itemIdPath: $("itemIdPath").value.trim(),
          maxDurationMs: numberOrUndefined("maxDurationMs"),
          maxResponseBytes: numberOrUndefined("maxResponseBytes")
        },
        rateLimit: {
          delayMs: numberOrUndefined("delayMs") || 0,
          retryAttempts: numberOrUndefined("retryAttempts") ?? 2,
          retryStatuses: parseNumberList($("retryStatuses").value),
          respectRetryAfter: $("respectRetryAfter").checked,
          timeoutMs: numberOrUndefined("timeoutMs") || 25000
        },
        responseShape: {
          mode: $("shapeMode").value,
          fields: parseFieldMappings($("shapeFields").value)
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
      if ($("shapeMode").value === "select" && !parseFieldMappings($("shapeFields").value).length) {
        missing.push("Selected fields");
      }

      if (missing.length) {
        throw new Error("Fill required fields before testing or saving: " + missing.join(", "));
      }
    }

    function getValidationWarnings() {
      const config = readConfig();
      const warnings = [];
      if (config.pagination.maxPages < 50 && config.pagination.type !== "none") {
        warnings.push("Max pages is low for a full pagination runner. Use it only if the API has very small result sets.");
      }
      if (!config.passThroughHeaders.length) {
        warnings.push("No pass-through headers are configured. Most private APIs need at least one auth header from Clay.");
      }
      try {
        const url = new URL(config.targetUrl);
        for (const [key, value] of url.searchParams.entries()) {
          if (/^(api[_-]?key|apikey|key|token|access[_-]?token|auth[_-]?token|authorization|credential|client[_-]?secret|secret|password)$/i.test(key) && value && !/{{\\s*[A-Za-z0-9_.-]+\\s*}}/.test(value)) {
            warnings.push("Target URL appears to contain a saved credential in query param " + key + ". Use {{" + key + "}} instead.");
          }
        }
      } catch {
        warnings.push("Target URL is not a valid absolute URL yet.");
      }
      if (config.rateLimit.delayMs && config.rateLimit.delayMs > 5000) {
        warnings.push("Delay between pages is high and may cause long Clay waits.");
      }
      if (config.responseShape?.mode === "select" && !config.responseShape.fields?.length) {
        warnings.push("Select fields mode needs at least one output_name:path mapping.");
      }
      if (!config.stopConditions?.stopOnRepeatedNext) {
        warnings.push("Repeated-next protection is disabled. Only do this for APIs that intentionally repeat next tokens.");
      }
      return warnings;
    }

    function renderValidationWarnings() {
      const warnings = getValidationWarnings();
      $("validationWarnings").hidden = warnings.length === 0;
      $("validationWarnings").textContent = warnings.length ? "Before saving: " + warnings.join(" ") : "";
      return warnings;
    }

    function renderReviewSummary() {
      const config = readConfig();
      const summary = $("reviewSummary");
      const cells = [
        ["Name", config.name || "Untitled"],
        ["Endpoint", config.method + " " + config.targetUrl],
        ["Pagination", config.pagination.type + " · cap " + config.pagination.maxPages],
        ["Result path", config.resultPath],
        ["Page size", config.pagination.pageSize || "Not set"],
        ["Shape", config.responseShape?.mode || "raw"]
      ];
      summary.innerHTML = "";
      cells.forEach(([label, value]) => {
        const cell = document.createElement("div");
        cell.className = "metric";
        cell.innerHTML = "<span></span><strong></strong>";
        cell.querySelector("span").textContent = label;
        cell.querySelector("strong").textContent = value;
        summary.appendChild(cell);
      });
      renderValidationWarnings();
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
      const stop = config.stopConditions || {};
      $("stopOnEmptyPage").checked = stop.stopOnEmptyPage ?? true;
      $("stopOnRepeatedNext").checked = stop.stopOnRepeatedNext ?? true;
      $("stopOnDuplicateItemId").checked = stop.stopOnDuplicateItemId ?? false;
      $("itemIdPath").value = stop.itemIdPath || "id";
      $("maxDurationMs").value = stop.maxDurationMs || "";
      $("maxResponseBytes").value = stop.maxResponseBytes || "";
      const rate = config.rateLimit || {};
      $("delayMs").value = rate.delayMs ?? 0;
      $("retryAttempts").value = rate.retryAttempts ?? 2;
      $("retryStatuses").value = (rate.retryStatuses || [408,429,500,502,503,504]).join(",");
      $("respectRetryAfter").checked = rate.respectRetryAfter ?? true;
      $("timeoutMs").value = rate.timeoutMs ?? 25000;
      const shape = config.responseShape || {};
      $("shapeMode").value = shape.mode || "raw";
      $("shapeFields").value = formatFieldMappings(shape.fields || []);
      setHeaderRows("staticHeaders", config.staticHeaders || []);
      updatePaginationFields();
      renderValidationWarnings();
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
      setLoadingLine("listLoading", true, "Loading saved runners...");
      try {
        const body = await api("/api/configs");
        state.configs = body.configs || [];
        renderListStats(state.configs);
        const list = $("savedList");
        list.innerHTML = "";
        if (!state.configs.length) {
          list.innerHTML = '<div class="panel"><div class="panel-body" style="text-align:center; padding:48px;"><h2>No runners yet</h2><div class="view-subtitle">Create your first API pagination runner to get started.</div><div class="actions" style="justify-content:center; margin-top:16px;"><button class="primary" type="button" id="emptyCreateBtn">Create New Runner</button></div></div></div>';
          $("emptyCreateBtn").addEventListener("click", resetCreateFlow);
          return;
        }
        state.configs.forEach((config) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "runner-card";
          button.innerHTML = '<div><div class="runner-title"><strong></strong><span class="badge method"></span><span class="badge type"></span></div><div class="runner-url"></div><div class="runner-metrics"><div><span>Total calls</span><strong class="total"></strong></div><div><span>Clay calls</span><strong class="clay"></strong></div><div><span>Last run</span><strong class="last"></strong></div><div><span>Created</span><strong class="created"></strong></div><div><span>Runner ID</span><strong class="rid"></strong></div></div></div><div><span class="badge">View details</span></div>';
          button.querySelector(".runner-title strong").textContent = config.name;
          button.querySelector(".method").textContent = config.method;
          button.querySelector(".type").textContent = config.paginationType || "runner";
          button.querySelector(".runner-url").textContent = config.targetUrl;
          button.querySelector(".total").textContent = config.totalCalls || 0;
          button.querySelector(".clay").textContent = config.clayCalls || 0;
          button.querySelector(".last").textContent = config.lastRunAt ? formatRelative(config.lastRunAt) : "Never";
          button.querySelector(".created").textContent = formatRelative(config.createdAt);
          button.querySelector(".rid").textContent = config.id.slice(0, 8);
          button.addEventListener("click", () => openDetails(config.id).catch((error) => handleUiError(error, "Loading runner", { showLastError: false })));
          list.appendChild(button);
        });
      } finally {
        setLoadingLine("listLoading", false);
      }
    }

    function renderListStats(configs) {
      $("overviewRunnerCount").textContent = configs.length;
      $("overviewTotalRuns").textContent = configs.reduce((sum, config) => sum + Number(config.totalCalls || 0), 0);
      $("overviewClayRuns").textContent = configs.reduce((sum, config) => sum + Number(config.clayCalls || 0), 0);
    }

    function formatRelative(value) {
      const then = new Date(value).getTime();
      const diff = Math.max(0, Date.now() - then);
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 60) return mins + "m ago";
      if (hours < 24) return hours + "h ago";
      return days + "d ago";
    }

    function renderTrace(pages) {
      const trace = $("trace");
      trace.innerHTML = "";
      if (!pages || !pages.length) {
        return;
      }
      pages.forEach((page) => {
        const row = document.createElement("div");
        row.className = "trace-row";
        row.innerHTML = "<strong></strong><span></span><span></span><span></span><code></code>";
        row.querySelector("strong").textContent = "#" + page.page;
        row.querySelectorAll("span")[0].textContent = String(page.status);
        row.querySelectorAll("span")[1].textContent = (page.itemCount || 0) + " items";
        row.querySelectorAll("span")[2].textContent = (page.durationMs || 0) + " ms";
        row.querySelector("code").textContent = (page.stopReason ? page.stopReason + " · " : "") + page.url;
        trace.appendChild(row);
      });
    }

    async function runDetect() {
      requireFormReady();
      clearLastError();
      setStatus("Detecting from first response...", true);
      setLoadingLine("testLoading", true, "Fetching the first page for auto-detect...");
      setButtonBusy("detectBtn", true, "Detecting");
      try {
        const body = await api("/api/detect", {
          method: "POST",
          body: JSON.stringify({
            config: readConfig(),
            credentialHeaders: readHeaderRows("credentialHeaders"),
            queryString: $("queryString").value.trim()
          })
        });
        const suggestions = body.detection.suggestions || {};
        if (suggestions.resultPath) $("resultPath").value = suggestions.resultPath;
        if (suggestions.pagination) {
          const p = suggestions.pagination;
          if (p.type) $("paginationType").value = p.type;
          if (p.nextLinkPath) $("nextLinkPath").value = p.nextLinkPath;
          if (p.totalPagesPath) $("totalPagesPath").value = p.totalPagesPath;
          if (p.nextCursorPath) $("nextCursorPath").value = p.nextCursorPath;
        }
        updatePaginationFields();
        renderTrace([body.detection.page]);
        print(body);
        setStatus("Detected " + (body.detection.detected.paginationType || "unknown") + " pagination from the first response", true);
        renderValidationWarnings();
      } finally {
        setButtonBusy("detectBtn", false);
        setLoadingLine("testLoading", false);
      }
    }

    async function runTest() {
      requireFormReady();
      clearLastError();
      state.lastTestOk = false;
      $("testContinueBtn").disabled = true;
      setStatus("Testing...", true);
      setLoadingLine("testLoading", true, "Running test and following pagination...");
      setButtonBusy("testBtn", true, "Running test");
      try {
        const body = await api("/api/test", {
          method: "POST",
          body: JSON.stringify({
            config: readConfig(),
            credentialHeaders: readHeaderRows("credentialHeaders"),
            queryString: $("queryString").value.trim()
          })
        });
        print(body);
        renderTrace(body.pages);
        state.lastTestOk = true;
        $("testContinueBtn").disabled = false;
        setStatus("Test returned " + body.itemCount + " items across " + body.pageCount + " page(s). Stop: " + body.stopReason, true);
        if (state.id) await refreshAnalytics();
      } finally {
        setButtonBusy("testBtn", false);
        setLoadingLine("testLoading", false);
      }
    }

    async function saveRunner() {
      if (state.locked) return;
      requireFormReady();
      renderValidationWarnings();
      if (!state.lastTestOk) {
        setStatus("Run a successful test before saving this immutable runner.", false);
        setWizardStep("test");
        return;
      }
      clearLastError();
      setStatus("Saving...", true);
      setButtonBusy("saveBtn", true, "Saving");
      try {
        const body = await api("/api/configs", { method: "POST", body: JSON.stringify({ config: readConfig() }) });
        state.id = body.config.id;
        state.locked = true;
        state.detailRunUrl = body.runUrl;
        showRunUrl(body.runUrl);
        renderClaySetup(body.runUrl, body.config);
        print(body);
        setLocked(true);
        setStatus("Saved", true);
        await refreshList();
        await openDetails(body.config.id);
      } finally {
        setButtonBusy("saveBtn", false);
        if (state.locked) setLocked(true);
      }
    }

    function buildClaySetup(url, config = readConfig()) {
      const placeholders = Array.from(config.targetUrl.matchAll(/{{\\s*([A-Za-z0-9_.-]+)\\s*}}/g)).map((match) => match[1]);
      const queryText = placeholders.length ? "Add query params on the Clay URL: " + placeholders.map((name) => name + "=<secret>").join("&") : "No URL credential query params needed.";
      const headers = config.passThroughHeaders.length ? config.passThroughHeaders.join(", ") : "None configured";
      const response = config.responseMode === "envelope" ? "Envelope: { data, meta }" : "Array of items";
      return [
        "Clay HTTP Sourcing setup",
        "URL: " + url,
        "Method in Clay: GET",
        "Runner access header, if enabled: x-clay-paginate-token: <runner token>",
        "Authentication headers to send from Clay: " + headers,
        queryText,
        "Expected response: " + response,
        "Response shaping: " + (config.responseShape?.mode || "raw"),
        "The runner access header is only for calling this Worker and is never forwarded upstream.",
        "Do not put API keys into saved static headers."
      ].join("\\n");
    }

    function renderClaySetup(url, config = readConfig()) {
      $("claySetup").textContent = buildClaySetup(url, config);
    }

    function renderRunnerTokenStatus(status) {
      const meta = $("runnerTokenMeta");
      const emailBtn = $("emailRunnerTokenBtn");
      const generateBtn = $("generateRunnerTokenBtn");
      const exists = Boolean(status?.exists);
      emailBtn.hidden = !exists;
      generateBtn.hidden = exists;
      const parts = [];
      parts.push(exists ? "Token generated." : "No runner token generated yet.");
      if (status?.emailedAt) parts.push("Last emailed " + formatFullTimestamp(status.emailedAt) + ".");
      if (status?.rotatedAt) parts.push("Last regenerated " + formatFullTimestamp(status.rotatedAt) + ".");
      meta.textContent = parts.join(" ");
      $("runnerTokenStatus").textContent = "";
      $("runnerTokenStatus").className = "status";
    }

    function setRunnerTokenStatus(message, ok = true) {
      $("runnerTokenStatus").textContent = message;
      $("runnerTokenStatus").className = "status " + (ok ? "ok" : "err");
    }

    async function openDetails(id) {
      const loadingId = state.view === "details" ? "detailLoading" : "listLoading";
      setLoadingLine(loadingId, true, "Loading runner details...");
      try {
        const detail = await api("/api/configs/" + id);
        applyConfig(detail.config);
        state.detailRunUrl = detail.runUrl;
        $("detailName").textContent = detail.config.name;
        $("detailMethod").textContent = detail.config.method;
        $("detailPagination").textContent = detail.config.pagination?.type || "runner";
        $("detailRunUrlText").textContent = detail.runUrl;
        $("detailClaySetup").textContent = buildClaySetup(detail.runUrl, detail.config);
        $("detailTargetUrl").textContent = detail.config.targetUrl;
        $("detailMethodValue").textContent = detail.config.method;
        $("detailResultPath").textContent = detail.config.resultPath;
        $("detailResponseMode").textContent = detail.config.responseMode;
        $("detailMaxPages").textContent = detail.config.pagination?.maxPages || "";
        $("detailPageSize").textContent = detail.config.pagination?.pageSize || "Not set";
        $("detailShapeMode").textContent = detail.config.responseShape?.mode || "raw";
        renderRunnerTokenStatus(detail.runnerToken);
        showView("details");
        await refreshAnalytics();
      } finally {
        setLoadingLine(loadingId, false);
      }
    }

    async function refreshAnalytics() {
      if (!state.id) {
        $("analyticsPanel").hidden = true;
        return;
      }
      $("analyticsPanel").hidden = false;
      setLoadingLine("analyticsLoading", true, "Loading analytics...");
      try {
        const body = await api("/api/configs/" + state.id + "/analytics");
        renderAnalytics(body.analytics);
      } finally {
        setLoadingLine("analyticsLoading", false);
      }
    }

    async function emailRunnerToken(generateIfMissing = false) {
      if (!state.id) return;
      const email = $("runnerTokenEmail").value.trim();
      if (!email) {
        setRunnerTokenStatus("Enter a clay.com email address first.", false);
        return;
      }
      const buttonId = generateIfMissing ? "generateRunnerTokenBtn" : "emailRunnerTokenBtn";
      setRunnerTokenStatus(generateIfMissing ? "Generating and emailing token..." : "Emailing token...");
      setButtonBusy(buttonId, true, generateIfMissing ? "Generating" : "Emailing");
      try {
        const body = await api("/api/configs/" + state.id + "/runner-token/email", {
          method: "POST",
          body: JSON.stringify({ email, generateIfMissing })
        });
        renderRunnerTokenStatus(body.runnerToken);
        setRunnerTokenStatus("Runner token emailed to " + body.recipient + ".");
      } finally {
        setButtonBusy(buttonId, false);
      }
    }

    async function regenerateRunnerToken() {
      if (!state.id) return;
      const email = $("runnerTokenEmail").value.trim();
      const confirmation = $("runnerTokenConfirm").value.trim();
      const acknowledgeOffline = $("runnerTokenAck").checked;
      if (!email) {
        setRunnerTokenStatus("Enter a clay.com email address first.", false);
        return;
      }
      setRunnerTokenStatus("Regenerating token...");
      setButtonBusy("regenerateRunnerTokenBtn", true, "Regenerating");
      try {
        const body = await api("/api/configs/" + state.id + "/runner-token/regenerate", {
          method: "POST",
          body: JSON.stringify({ email, confirmation, acknowledgeOffline })
        });
        $("runnerTokenConfirm").value = "";
        $("runnerTokenAck").checked = false;
        renderRunnerTokenStatus(body.runnerToken);
        setRunnerTokenStatus("New runner token emailed to " + body.recipient + ". Update every active Clay Signal using the old token.");
      } finally {
        setButtonBusy("regenerateRunnerTokenBtn", false);
      }
    }

    function renderAnalytics(analytics) {
      $("analyticsPanel").hidden = false;
      $("metricTotalRuns").textContent = analytics.totalRuns || 0;
      $("metricClayRuns").textContent = analytics.clayRuns || 0;
      $("metricItems").textContent = analytics.totalItems || 0;
      $("metricDuration").textContent = (analytics.avgDurationMs || 0) + " ms";
      $("metricAvgPages").textContent = analytics.avgPagesPerRun || 0;
      $("metricRetries").textContent = analytics.totalRetries || 0;
      $("statusCounts").innerHTML = "";
      (analytics.statusCounts || []).forEach((entry) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = entry.statusCode + ": " + entry.count;
        $("statusCounts").appendChild(pill);
      });
      $("stopCounts").innerHTML = "";
      (analytics.stopReasonCounts || []).forEach((entry) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = "stop " + entry.stopReason + ": " + entry.count;
        $("stopCounts").appendChild(pill);
      });
      $("errorCounts").innerHTML = "";
      (analytics.errorCounts || []).forEach((entry) => {
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = entry.error + ": " + entry.count;
        $("errorCounts").appendChild(pill);
      });
      renderChart(analytics.statusTimeline || []);
      renderVolumeChart(analytics.volumeTimeline || []);
      $("recentRuns").textContent = analytics.recentRuns?.length ? "Last call: " + analytics.recentRuns[0].status + " · " + analytics.recentRuns[0].itemCount + " items · stop " + (analytics.recentRuns[0].stopReason || "unknown") : "No calls yet.";
      renderRecentRuns(analytics.recentRuns || []);
    }

    function renderRecentRuns(runs) {
      const list = $("detailRecentRuns");
      list.innerHTML = "";
      if (!runs.length) {
        list.innerHTML = '<div class="hint">No calls yet.</div>';
        return;
      }
      runs.slice(0, 10).forEach((run) => {
        const row = document.createElement("div");
        row.className = "trace-row";
        row.innerHTML = "<strong></strong><span></span><span></span><span></span><code></code>";
        row.querySelector("strong").textContent = run.mode;
        row.querySelectorAll("span")[0].textContent = run.upstreamStatus ? String(run.upstreamStatus) : run.status;
        row.querySelectorAll("span")[1].textContent = (run.itemCount || 0) + " items";
        row.querySelectorAll("span")[2].textContent = (run.durationMs || 0) + " ms";
        row.querySelector("code").textContent = formatRelative(run.createdAt) + " · " + (run.stopReason || run.error || "complete");
        list.appendChild(row);
      });
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

    function renderVolumeChart(points) {
      const chart = $("volumeChart");
      chart.innerHTML = "";
      if (!points.length) {
        chart.innerHTML = '<span class="hint">No volume yet.</span>';
        return;
      }
      const max = Math.max(...points.map((point) => point.calls), 1);
      points.slice(-30).forEach((point) => {
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = Math.max(4, Math.round((point.calls / max) * 74)) + "px";
        bar.title = point.bucket + " · " + point.calls + " calls · " + point.items + " items · " + point.pages + " pages";
        chart.appendChild(bar);
      });
    }

    function markConfigDirty() {
      state.lastTestOk = false;
      $("testContinueBtn").disabled = true;
    }

    $("newBtn").addEventListener("click", resetCreateFlow);
    $("newBtnSecondary").addEventListener("click", resetCreateFlow);
    $("saveAdminTokenBtn").addEventListener("click", () => {
      const token = $("adminToken").value.trim();
      if (!token) {
        setAdminTokenStatus("Paste a token first.", false);
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      $("adminToken").value = "";
      hydrateAdminTokenState();
      refreshList().catch((error) => handleUiError(error, "Loading runners", { showLastError: false }));
    });
    $("clearAdminTokenBtn").addEventListener("click", () => {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      $("adminToken").value = "";
      hydrateAdminTokenState();
      setAdminTokenStatus("Token cleared.");
    });
    $("backToListBtn").addEventListener("click", () => {
      refreshList().catch((error) => handleUiError(error, "Loading runners", { showLastError: false }));
      showView("list");
    });
    $("detailsBackBtn").addEventListener("click", () => {
      refreshList().catch((error) => handleUiError(error, "Loading runners", { showLastError: false }));
      showView("list");
    });
    $("skipAiBtn").addEventListener("click", () => setWizardStep("configure"));
    $("aiContinueBtn").addEventListener("click", () => setWizardStep("configure"));
    $("configureBackBtn").addEventListener("click", () => setWizardStep("ai"));
    $("configureContinueBtn").addEventListener("click", () => {
      try {
        requireFormReady();
        setStatus("", true);
        setWizardStep("test");
      } catch (error) {
        setStatus(error.message, false);
      }
    });
    $("testBackBtn").addEventListener("click", () => setWizardStep("configure"));
    $("testContinueBtn").addEventListener("click", () => {
      if (!state.lastTestOk) {
        setStatus("Run a successful test before review.", false);
        return;
      }
      setStatus("", true);
      setWizardStep("review");
    });
    $("reviewBackBtn").addEventListener("click", () => setWizardStep("test"));
    $("refreshBtn").addEventListener("click", () => {
      const action = state.view === "details" && state.id ? openDetails(state.id) : refreshList();
      action.catch((error) => handleUiError(error, "Refresh", { showLastError: state.view === "create" }));
    });
    $("analyticsRefreshBtn").addEventListener("click", () => refreshAnalytics().catch((error) => handleUiError(error, "Loading analytics", { showLastError: false })));
    $("emailRunnerTokenBtn").addEventListener("click", () => emailRunnerToken(false).catch((error) => handleUiError(error, "Emailing runner token", { showLastError: false })));
    $("generateRunnerTokenBtn").addEventListener("click", () => emailRunnerToken(true).catch((error) => handleUiError(error, "Generating runner token", { showLastError: false })));
    $("regenerateRunnerTokenBtn").addEventListener("click", () => regenerateRunnerToken().catch((error) => handleUiError(error, "Regenerating runner token", { showLastError: false })));
    $("addStaticHeader").addEventListener("click", () => { addHeaderRow("staticHeaders"); markConfigDirty(); });
    $("addCredentialHeader").addEventListener("click", () => { addHeaderRow("credentialHeaders"); markConfigDirty(); });
    $("paginationType").addEventListener("change", () => { updatePaginationFields(); markConfigDirty(); });
    $("detectBtn").addEventListener("click", () => runDetect().catch((error) => handleUiError(error, "Auto-detect")));
    $("testBtn").addEventListener("click", () => runTest().catch((error) => handleUiError(error, "Test run")));
    $("saveBtn").addEventListener("click", () => saveRunner().catch((error) => handleUiError(error, "Saving runner")));
    $("copyBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("runUrlText").textContent);
      setStatus("Copied", true);
    });
    $("copySetupBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("claySetup").textContent || buildClaySetup($("runUrlText").textContent));
      setStatus("Setup copied", true);
    });
    $("detailCopyBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("detailRunUrlText").textContent);
      setStatus("Copied", true);
    });
    $("detailCopySetupBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("detailClaySetup").textContent || buildClaySetup($("detailRunUrlText").textContent));
      setStatus("Setup copied", true);
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
    editableIds.forEach((id) => {
      const element = $(id);
      if (element) {
        element.addEventListener("input", () => { renderValidationWarnings(); markConfigDirty(); });
        element.addEventListener("change", () => { renderValidationWarnings(); markConfigDirty(); });
      }
    });

    applyConfig(defaults);
    setHeaderRows("credentialHeaders", [{ name: "Authorization", value: "" }]);
    updateUrlShape();
    hydrateAdminTokenState();
    refreshList().catch((error) => handleUiError(error, "Loading runners", { showLastError: false }));
  </script>
</body>
</html>`;
}
