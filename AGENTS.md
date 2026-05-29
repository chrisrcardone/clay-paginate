# Agent Notes

This project is for non-technical users configuring paginated APIs for Clay HTTP Sourcing.

## User Experience Principles

- Keep the flow list-first and drop-dead simple: saved runners, Create New Runner, details.
- Preserve the guided steps: AI Setup, Configure, Test, Review & Save.
- Keep the form self-explanatory.
- Put guidance inline near the relevant fields.
- Never require users to understand Worker internals.
- Make testing feel safe and obvious.
- Keep AI-assisted setup pasteable: strict JSON object in, clear applied values and certainty back to the user.
- Require a successful test before saving an immutable runner.
- Treat saved runner URLs as production dependencies.

## Safety Invariants

- Keep admin APIs protected by fail-closed `ADMIN_TOKEN` auth.
- Keep public runner URLs separate from admin APIs; use `ALLOWED_RUN_CIDRS` for Clay static IP restrictions.
- Keep upstream URL validation in place: HTTPS only, private-host blocking, and optional host allowlisting.
- Keep next-link host pinning so pass-through credentials never follow a cross-host pagination link.
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
