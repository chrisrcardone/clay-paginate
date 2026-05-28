# Clay Pagination Runner

Cloudflare Worker that lets Clay call APIs without native pagination support. Configure a runner in the web UI, test it with temporary credentials, save the pagination behavior in D1, then use the generated `/paginate/:id` URL in Clay.

The project is intentionally small and open source so the request flow is easy to audit.

Live Worker: `https://clay-pagination-runner.boston-ma.workers.dev`

## What gets stored

The Worker stores target URL, method, headers that are safe to persist, pass-through header names, result path, and pagination behavior. Test credentials are not stored. Clay should send the upstream API credential header on each request, and the Worker forwards only the configured pass-through headers.

Analytics are metadata-only and stored against each configuration: run mode, status, page count, item count, duration, upstream status code, timestamp, and coarse error code. The Worker does not persist Clay headers, query params, request bodies, upstream URLs, upstream response bodies, upstream error bodies, or returned rows.

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
https://your-worker.example.com/paginate/<config-id>?key=api-key-goes-here
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
npm run db:migrate:remote
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

`ADMIN_TOKEN` protects the UI and config APIs. The `/paginate/:id` endpoint is intentionally available to Clay without the admin token.

## Privacy model

- Keep API tokens out of saved static headers.
- Put test tokens in Test credentials only.
- Configure Clay's HTTP header authentication for production calls.
- Use URL placeholders for APIs that require URL API keys.
- Only configured pass-through header names are forwarded upstream.
- Runtime analytics never store call payloads or returned data.

## Clay usage

Use the generated `/paginate/:id` URL as the HTTP Sourcing URL. Configure Clay's header token authentication for header-based upstream API credentials. Any non-placeholder query parameters Clay appends to the generated URL are merged into the upstream request before pagination runs.
