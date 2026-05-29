# Clay Pagination Runner

Cloudflare Worker that lets Clay call APIs without native pagination support. Configure a runner in the web UI, test it with temporary credentials, save the pagination behavior in D1, then use the generated `/<config-id>` URL in Clay.

The project is intentionally small and open source so the request flow is easy to audit.

Production app: `https://paginate.chris-apis.xyz`

GitHub repo: `https://github.com/chrisrcardone/clay-paginate`

## AI-assisted setup

The app opens with saved runners sorted by Clay call volume. Create New Runner starts a four-step guided flow:

1. AI Setup
2. Configure
3. Test
4. Review & Save

The AI Setup step accepts an API docs URL, uploaded or pasted docs text, and a user goal. Copy the generated prompt into Claude, ChatGPT, or another AI. The prompt asks the AI to return one strict JSON object with runner values, field explanations, certainty, and warnings. Paste that object back into the app to fill the form and move into Configure.

When an AI object is applied, the app fills only the values the AI returned. Any untouched starter defaults that the AI did not return are cleared so users can see what still needs a confirmed value before testing or saving.

The Test step can auto-detect pagination from one first response, then run a real temporary test with page-by-page debug trace. Test credentials, query params, traces, and response samples are never saved. Review & Save requires a successful test because saved runners are immutable.

AI assistants can also use these repo files directly:

- `AI_CONFIG_GUIDE.md`: field meanings, pagination selection rules, and the expected output format.
- `SKILL.md`: compact skill instructions for configuring runners.
- `CLAUDE.md`: Claude-specific project guidance.
- `AGENTS.md`: implementation and safety invariants for coding agents.

## What gets stored

The Worker stores target URL, method, headers that are safe to persist, pass-through header names, result path, pagination behavior, stop conditions, rate-limit controls, and response shaping rules. Test credentials are not stored. Clay should send the upstream API credential header on each request, and the Worker forwards only the configured pass-through headers.

Analytics are metadata-only and stored against each configuration: run mode, status, page count, item count, duration, upstream status code, stop reason, retry count, timestamp, and coarse error code. The Worker does not persist Clay headers, query params, request bodies, upstream URLs, upstream response bodies, upstream error bodies, page traces, test samples, or returned rows.

When an upstream API returns an error, the Worker returns the full upstream body to the caller. That body is never stored.

## Configuration uniqueness

Saved configurations are unique by normalized target URL plus HTTP method. For example, `GET https://data.g2.com/api/v1/vendors` can only exist once, while `POST https://data.g2.com/api/v1/vendors` can be saved as a separate configuration.

Saved configurations are immutable. Once a runner is saved, its name, URL, method, headers, body template, result path, and pagination behavior cannot be edited or deleted. Create a new runner for changes so live Clay workflows keep their URLs and behavior.

## URL placeholders

Use `{{placeholder_name}}` in the upstream target URL when an API key must live in the URL:

```text
https://api-end-point.com/call?api={{key}}
```

Then call the generated Clay URL with the matching query parameter:

```text
https://paginate.chris-apis.xyz/<config-id>?key=api-key-goes-here
```

The Worker substitutes `key` into the upstream URL in memory and removes it from normal query forwarding. Placeholder values are never stored in D1 analytics.

## G2 starter settings

- Target URL: `https://data.g2.com/api/v1/ahoy/remote-event-streams`
- Method: `GET`
- Static header: `Content-Type: application/vnd.api+json`
- Pass-through header: `authorization`
- Results path: `data`
- Pagination: `JSON next link`
- Page param: `page[number]`
- Page size param: `page[size]`
- Page size: `25` for G2 BuyerIntent::EventStreams, or `100` for most other G2 list endpoints
- Next link path: `links.next`
- Total pages path: `meta.page_count`

G2 v1 documents `page[size]` and `page[number]` pagination, with list results under `data` and next page URLs under `links.next`.

## Local setup

```sh
npm install
npm run db:migrate:local
npm run dev
```

Open the local Wrangler URL, create/test a runner, then save it.

## Deploy setup

```sh
npx wrangler d1 create clay-pagination-runner-db
```

Copy the returned `database_id` into `wrangler.jsonc`, then run:

```sh
npx wrangler secret put ADMIN_TOKEN
npm run db:migrate:remote
npm run deploy
```

The Worker is configured to serve the UI at `https://paginate.chris-apis.xyz`. Generated Clay URLs use `https://paginate.chris-apis.xyz/<config-id>`.

Admin APIs fail closed unless `ADMIN_TOKEN` is configured. Paste the same token into the app's Admin token field to list, test, create, and inspect runners. The public `/<config-id>` Clay run URLs do not require the admin token by default because Clay needs to call them directly.

Optional production hardening:

- `RUNNER_AUTH_TOKEN`: shared token for Clay calls to generated runner URLs. When set, Clay must send `x-clay-paginate-token: <token>` on each runner request. This is separate from upstream API auth and is never forwarded to the upstream API.
- `ALLOWED_RUN_CIDRS`: comma-separated CIDRs allowed to call public runner URLs. Use this only when the Clay surface you are using has static IP support, for example `203.0.113.10/32,203.0.113.11/32`.
- Runner access can use static IP, runner header auth, or both. If both `ALLOWED_RUN_CIDRS` and `RUNNER_AUTH_TOKEN` are configured, either a matching caller IP or a valid `x-clay-paginate-token` is enough. Admin token calls still bypass this for operator smoke tests.
- `ALLOWED_UPSTREAM_HOSTS`: comma-separated upstream host allowlist, supporting exact hosts and wildcards like `data.g2.com,*.example.com`.
- Cloudflare Access: recommended for the UI/admin surface. Keep generated runner URLs reachable by Clay, then protect those URLs with `RUNNER_AUTH_TOKEN`, `ALLOWED_RUN_CIDRS`, or both.

## Privacy model

- Keep API tokens out of saved static headers.
- Put test tokens in Test credentials only.
- Configure Clay's HTTP header authentication for production calls.
- Use URL placeholders for APIs that require URL API keys.
- Only configured pass-through header names are forwarded upstream.
- Runtime analytics never store call payloads or returned data.

## Reliability model

- Saved runner URLs are immutable and stable.
- The runner caps pagination with `maxPages` and optional `maxItems`; `maxPages` is a safety cap, not a requested page count, and pagination stops naturally when the API has no next page.
- Upstream URLs must use HTTPS and cannot target loopback, private, link-local, `.local`, or `.internal` hosts.
- JSON:API and Link-header next links are pinned to the original upstream host; cross-host next links stop the run before credentials can be forwarded.
- Default response-size protection caps runs at 10 MB unless configured lower or higher within the Worker limit.
- GET page fetches retry short transient failures such as 429 and 5xx.
- Stop conditions protect against empty-page loops, repeated next links or cursors, duplicate item IDs, max duration, and max response size.
- Rate controls support page delays, retry attempts, retry statuses, `Retry-After`, and per-page timeout.
- Test responses include an ephemeral page-by-page trace with redacted URLs; traces are never stored.
- The auto-detect button fetches one first page, suggests result and pagination paths, and does not save the response.
- Response shaping can return full items, flatten JSON:API `attributes`, or select named fields for Clay.
- Upstream errors return full body content to Clay for debugging, but are not stored.
- Remote smoke tests should be cleaned from D1 after verification.

## Clay usage

Use the generated `https://paginate.chris-apis.xyz/<config-id>` URL as the HTTP Sourcing URL. Configure Clay's header token authentication for header-based upstream API credentials. Any non-placeholder query parameters Clay appends to the generated URL are merged into the upstream request before pagination runs. After saving, open the runner details screen for the Clay setup copy block, immutable configuration details, metadata-only analytics, and recent run summaries.

If the deployment has `RUNNER_AUTH_TOKEN` enabled, add this Clay request header alongside any upstream credential headers:

```text
x-clay-paginate-token: <runner token>
```

Do not add `x-clay-paginate-token` to the runner's pass-through headers. It authenticates Clay to this Worker only and is stripped before upstream requests.
