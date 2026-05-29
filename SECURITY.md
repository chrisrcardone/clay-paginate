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

API credentials should be provided as temporary test headers in the UI or configured in Clay's HTTP API header authentication. Saved static headers reject common credential header names.

If an API requires a URL credential, use a `{{placeholder}}` in the saved target URL and pass the value as a query parameter on the generated `https://paginate.chris-apis.xyz/<config-id>` URL. Placeholder values are substituted in memory only and are removed from normal query passthrough.

Upstream errors are returned to the caller with their full body content for debugging, but only a short coarse error label and status metadata are stored in analytics.

## Deployment access

The app is designed for a trusted deployment path. If the configuration UI should not be publicly writable, put `https://paginate.chris-apis.xyz` behind Cloudflare Access or another edge access rule. The Clay-facing generated URLs under `https://paginate.chris-apis.xyz/<config-id>` must remain reachable by Clay, because Clay authenticates to the upstream API through pass-through headers or URL placeholders.
