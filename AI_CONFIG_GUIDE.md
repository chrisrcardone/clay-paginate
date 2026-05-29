# AI Configuration Guide

Use this guide when helping a non-technical user configure Clay Pagination Runner from API documentation.

Production app: https://paginate.chris-apis.xyz

## Goal

Return one strict JSON object that the user can paste into the app. The app parses that object, fills the provided values, clears untouched defaults that were not provided by the AI, tests the upstream API, saves an immutable runner configuration, and gives Clay one stable URL:

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
- `Max pages`: Production safety cap, not a sample size. Use a value high enough to collect all pages, usually `250`, or up to `1000` for large result sets. The runner stops automatically when there is no next page.
- `Page size`: Use the largest documented page size unless the docs warn against it. Larger page sizes reduce API calls and make full pagination more reliable.
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

Safety, rate, and shaping:

- `Stop conditions`: Keep `stopOnEmptyPage` and `stopOnRepeatedNext` true unless docs prove otherwise. Use optional `maxDurationMs` or `maxResponseBytes` for especially large APIs.
- `Rate limit`: Use `retryAttempts: 2`, transient retry statuses `[408,429,500,502,503,504]`, `respectRetryAfter: true`, and the default timeout unless docs give stricter limits.
- `Response shape`: Use `raw` unless the API is JSON:API and flattening `attributes` will clearly make Clay easier. Use `select` only when the user knows the exact fields Clay needs.

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

Return strict JSON only. Do not wrap it in markdown and do not add prose outside the object.

For every non-blank value, include an explanation with `certainty` of `high`, `medium`, or `low`. If the docs do not confirm a value, use `null` or an empty string instead of guessing, then explain the uncertainty in `warnings`.

Treat current form defaults as examples only. Do not copy defaults into the output unless the API documentation or user goal confirms them. If the docs URL conflicts with a default, prefer the docs value or leave the field blank with a warning.

```json
{
  "summary": "One sentence explaining the selected endpoint and pagination method.",
  "overallCertainty": "high",
  "values": {
    "name": "G2 Buyer Stream v2 API",
    "method": "GET",
    "targetUrl": "https://data.g2.com/api/v1/ahoy/remote-event-streams",
    "resultPath": "data",
    "responseMode": "array",
    "maxItems": null,
    "pagination": {
      "type": "jsonapi",
      "maxPages": 250,
      "pageSize": 100,
      "pageParam": "page[number]",
      "pageSizeParam": "page[size]",
      "startPage": 1,
      "nextLinkPath": "links.next",
      "totalPagesPath": "meta.page_count",
      "offsetParam": null,
      "limitParam": null,
      "startOffset": null,
      "cursorParam": null,
      "nextCursorPath": null,
      "initialCursor": null
    },
    "passThroughHeaders": ["authorization"],
    "staticHeaders": [
      { "name": "Content-Type", "value": "application/vnd.api+json" }
    ],
    "bodyTemplate": "",
    "stopConditions": {
      "stopOnEmptyPage": true,
      "stopOnRepeatedNext": true,
      "stopOnDuplicateItemId": false,
      "itemIdPath": "id",
      "maxDurationMs": null,
      "maxResponseBytes": null
    },
    "rateLimit": {
      "delayMs": 0,
      "retryAttempts": 2,
      "retryStatuses": [408, 429, 500, 502, 503, 504],
      "respectRetryAfter": true,
      "timeoutMs": 25000
    },
    "responseShape": {
      "mode": "raw",
      "fields": []
    },
    "testQueryParams": "",
    "testCredentialHeaders": [
      { "name": "Authorization", "value": "" }
    ]
  },
  "explanations": {
    "targetUrl": {
      "certainty": "high",
      "reason": "The docs identify this as the list endpoint for the requested data."
    },
    "resultPath": {
      "certainty": "high",
      "reason": "Example responses put returned records under the top-level data array."
    },
    "pagination": {
      "certainty": "high",
      "reason": "The docs show JSON:API page[number]/page[size] params and links.next."
    },
    "auth": {
      "certainty": "high",
      "reason": "The API uses bearer auth, so only the authorization header name should be saved as pass-through."
    }
  },
  "warnings": [
    "Replace test credential placeholders in the app before running the test."
  ]
}
```

## Reliability Checklist

- Prefer documented pagination params over guessed params.
- Use a high enough `Max pages` cap to capture all expected pages.
- Use the largest documented page size unless the API warns against it.
- Confirm `Results path` points to an array.
- Confirm the first test returns expected records and not an error envelope.
- Confirm next-page URLs or cursors are redacted and do not expose secrets.
- Save only after a successful test.
