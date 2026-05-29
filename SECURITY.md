# Security and Privacy Notes

This project is designed to be auditable and intentionally small.

## Stored data

The D1 database stores:

- Saved runner configuration: target URL, HTTP method, result path, pagination settings, non-secret static headers, pass-through header names, and optional static body template.
- Metadata-only analytics: run mode, success/error status, page count, item count, duration, upstream status code, stop reason, retry count, timestamp, and coarse error code.

The D1 database does not store:

- Clay request headers or credential values
- Clay query parameters
- Clay request bodies
- Upstream page URLs generated during a run
- Upstream response rows or response bodies
- Full upstream error bodies
- Page-by-page debug traces from tests

## Credentials

Admin APIs require `x-admin-token` and fail closed when `ADMIN_TOKEN` is not configured. The UI stores that admin token only in the operator's browser local storage. Public runner URLs remain separate from admin APIs so Clay can call them directly.

API credentials should be provided as temporary test headers in the UI or configured in Clay's HTTP API header authentication. Saved static headers are allowlisted for non-secret headers only. Credential-looking body templates are rejected.

If an API requires a URL credential, use a `{{placeholder}}` in the saved target URL and pass the value as a query parameter on the generated `https://paginate.chris-apis.xyz/<config-id>` URL. Placeholder values are substituted in memory only and are removed from normal query passthrough.

Upstream errors are returned to the caller with their full body content for debugging, but only a short coarse error label and status metadata are stored in analytics.

## Network controls

- Upstream target URLs must use HTTPS.
- Loopback, private, link-local, `.local`, and `.internal` upstream hosts are blocked.
- Optional `ALLOWED_UPSTREAM_HOSTS` can restrict saved/tested upstreams to an explicit host allowlist.
- JSON:API and Link-header next links are pinned to the original upstream host. Cross-host next links stop the run before pass-through credentials are sent.
- Optional `ALLOWED_RUN_CIDRS` can restrict public runner execution to Clay static IP CIDRs or other trusted caller ranges.
- Admin token calls can still execute runner URLs for operator smoke testing.

The HTML shell includes `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`. JSON endpoints do not emit wildcard CORS headers.

## Deployment access

The app is designed for a trusted deployment path. Put `https://paginate.chris-apis.xyz` behind Cloudflare Access or another edge access rule for the UI/admin surface when possible. The Clay-facing generated URLs under `https://paginate.chris-apis.xyz/<config-id>` must remain reachable by Clay, because Clay authenticates to the upstream API through pass-through headers or URL placeholders. Prefer `ALLOWED_RUN_CIDRS` with Clay's static IP ranges for those public runner URLs.
