# Security and Privacy Notes

This project is designed to be auditable and intentionally small.

## Stored data

The D1 database stores:

- Saved runner configuration: target URL, HTTP method, result path, pagination settings, non-secret static headers, pass-through header names, and optional static body template.
- Metadata-only analytics: run mode, success/error status, page count, item count, duration, upstream status code, and coarse error code.

The D1 database does not store:

- Clay request headers or credential values
- Clay query parameters
- Clay request bodies
- Upstream page URLs generated during a run
- Upstream response rows or response bodies

## Credentials

API credentials should be provided as temporary test headers in the UI or configured in Clay's HTTP API header authentication. Saved static headers reject common credential header names.

## Admin access

Set `ADMIN_TOKEN` as a Cloudflare Worker secret. The UI and configuration APIs require `x-admin-token` when this secret is present. The Clay-facing `/run/:id` endpoint does not require `ADMIN_TOKEN`, because Clay authenticates to the upstream API through pass-through headers.
