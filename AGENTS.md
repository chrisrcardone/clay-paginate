# Agent Notes

This project is for non-technical users configuring paginated APIs for Clay HTTP Sourcing.

## User Experience Principles

- Keep the form self-explanatory.
- Put guidance inline near the relevant fields.
- Never require users to understand Worker internals.
- Make testing feel safe and obvious.
- Keep AI-assisted setup pasteable: strict JSON object in, clear applied values and certainty back to the user.
- Treat saved runner URLs as production dependencies.

## Safety Invariants

- Do not store API credentials.
- Do not store Clay call payloads or upstream response data.
- Do not store page debug traces, auto-detect responses, shaped rows, or upstream error bodies.
- Do not allow saved configs to be edited or deleted through the app.
- Keep analytics metadata-only.
- Return full upstream error bodies to the caller, but never persist them.

## Verification

Before shipping changes:

```sh
npm run typecheck
npm test
```

For deployment smoke tests, verify:

- `GET https://paginate.chris-apis.xyz/`
- `POST https://paginate.chris-apis.xyz/api/test`
- `POST https://paginate.chris-apis.xyz/api/configs`
- `GET https://paginate.chris-apis.xyz/<config-id>?key=...`
- `GET https://paginate.chris-apis.xyz/api/configs/<config-id>/analytics`

Clean up smoke configs from D1 after remote tests.
