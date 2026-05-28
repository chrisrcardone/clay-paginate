# Clay Pagination Runner

Cloudflare Worker that lets Clay call APIs without native pagination support. Configure a runner in the web UI, test it with temporary credentials, save the pagination behavior in D1, then use the generated `/run/:id` URL in Clay.

The project is intentionally small and open source so the request flow is easy to audit.

Live Worker: `https://clay-pagination-runner.boston-ma.workers.dev`

## What gets stored

The Worker stores target URL, method, headers that are safe to persist, pass-through header names, result path, and pagination behavior. Test credentials are not stored. Clay should send the upstream API credential header on each request, and the Worker forwards only the configured pass-through headers.

Analytics are metadata-only and stored against each configuration: run mode, status, page count, item count, duration, upstream status code, timestamp, and coarse error code. The Worker does not persist Clay headers, query params, request bodies, upstream URLs, upstream response bodies, or returned rows.

## Configuration uniqueness

Saved configurations are unique by normalized target URL plus HTTP method. For example, `GET https://data.g2.com/api/v1/vendors` can only exist once, while `POST https://data.g2.com/api/v1/vendors` can be saved as a separate configuration.

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

`ADMIN_TOKEN` protects the UI and config APIs. The `/run/:id` endpoint is intentionally available to Clay without the admin token.

## Privacy model

- Keep API tokens out of saved static headers.
- Put test tokens in Test credentials only.
- Configure Clay's HTTP header authentication for production calls.
- Only configured pass-through header names are forwarded upstream.
- Runtime analytics never store call payloads or returned data.

## Clay usage

Use the generated `/run/:id` URL as the HTTP Sourcing URL. Configure Clay's header token authentication for the upstream API credential. Any query parameters Clay appends to the generated URL are merged into the upstream request before pagination runs.
