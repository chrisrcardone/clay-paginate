# AI Configuration Guide

Use this guide when helping a non-technical user configure Clay Pagination Runner from API documentation.

Production app: https://paginate.chris-apis.xyz

## Goal

Return exact form values that the user can paste into the app. The app tests the upstream API, saves an immutable runner configuration, and gives Clay one stable URL:

```text
https://paginate.chris-apis.xyz/<config-id>
```

Clay sends runtime credentials to that URL. The runner forwards only the configured pass-through headers and returns one combined array of all paginated results.

## Security Rules

- Never invent credential values.
- Never place credential values in static headers.
- For header auth, return pass-through header names only, such as `authorization`, `x-api-key`, or `api-key`.
- For URL API keys, put a placeholder in the target URL, such as `https://api.example.com/items?api_key={{key}}`.
- Tell the user to call the generated Clay URL with the matching query parameter, such as `?key=...`.
- Test credentials and test query params are temporary and are not saved.
- Saved configurations are immutable. The user should test before saving.

## Form Fields

Endpoint:

- `Name`: Human-readable name, for example `G2 Buyer Stream v2 API`.
- `Method`: `GET`, `POST`, `PUT`, or `PATCH`. Prefer `GET` for list endpoints when docs allow it.
- `Target URL`: Full upstream API URL. Include fixed query params required by the endpoint. Use `{{placeholder}}` for URL credentials.
- `Results path`: Dot or bracket path to the returned array. Common values: `data`, `results`, `items`, `records`, `products`.
- `Response`: Use `Array` unless the user specifically needs metadata; use `Envelope` to return `{ data, meta }`.
- `Max items`: Optional cap. Leave blank unless the user wants a hard limit.

Pagination:

- `Pagination type`: One of `jsonapi`, `page`, `offset`, `cursor`, `linkHeader`, `none`.
- `Max pages`: Use a safe test value, usually 3 to 10. The app allows up to 250.
- `Page size`: Use the documented page size. Prefer a small test value if unsure.
- `Page param`: Page number query parameter, for example `page`, `page[number]`, or `page_number`.
- `Page size param`: Page size query parameter, for example `per_page`, `limit`, or `page[size]`.
- `Start page`: Usually `1`, sometimes `0`.
- `Next link path`: JSON path to the next page URL, for example `links.next`.
- `Total pages path`: JSON path to total pages, for example `meta.page_count` or `pagination.total_pages`.
- `Offset param`: Offset query parameter, for example `offset`.
- `Limit param`: Limit query parameter, for example `limit`.
- `Start offset`: Usually `0`.
- `Cursor param`: Cursor query parameter, for example `cursor`, `after`, or `starting_after`.
- `Next cursor path`: JSON path to the next cursor, for example `meta.next_cursor` or `pagination.next_cursor`.
- `Initial cursor`: Usually blank.

Auth and test:

- `Pass-through headers`: Comma-separated header names to forward from Clay.
- `Static headers`: Non-secret headers that are safe to save, such as `Content-Type: application/json` or `Accept: application/json`.
- `Body template`: Static request body for non-GET search endpoints. Do not include credentials.
- `Suggested test query params`: Temporary query params for testing, including URL placeholders such as `key=test-key`.
- `Suggested test credential headers`: Temporary header names and example placeholders, not real secrets.

## Pagination Selection

Use `jsonapi` when docs or examples show:

- `links.next`
- `meta.page_count`
- query params like `page[number]` and `page[size]`

Use `page` when docs show:

- page numbers
- total pages
- query params like `page`, `per_page`, `page_size`, or `limit`

Use `offset` when docs show:

- `offset` and `limit`
- the next request increases offset by the page size

Use `cursor` when docs show:

- `cursor`, `after`, `starting_after`, or similar
- response fields like `next_cursor`, `end_cursor`, or `has_more`

Use `linkHeader` when docs show:

- HTTP `Link` header with `rel="next"`

Use `none` when:

- the endpoint returns all rows in one response
- the user is testing a single page only

## Output Format

Return this structure:

```text
Summary: one sentence explaining the selected endpoint and pagination method.

Form values:
- Name:
- Method:
- Target URL:
- Results path:
- Response:
- Max items:
- Pagination type:
- Max pages:
- Page size:
- Page param:
- Page size param:
- Start page:
- Next link path:
- Total pages path:
- Offset param:
- Limit param:
- Start offset:
- Cursor param:
- Next cursor path:
- Initial cursor:
- Pass-through headers:
- Static headers:
- Body template:
- Suggested test query params:
- Suggested test credential headers:

JSON config:
Return a JSON object matching the form values, without credential values.

Warnings:
List anything the user must verify in the docs before saving.
```

## Reliability Checklist

- Prefer documented pagination params over guessed params.
- Use a small `Max pages` during testing.
- Use a documented page size.
- Confirm `Results path` points to an array.
- Confirm the first test returns expected records and not an error envelope.
- Confirm next-page URLs or cursors are redacted and do not expose secrets.
- Save only after a successful test.
