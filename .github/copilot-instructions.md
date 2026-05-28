# Copilot Instructions

Clay Pagination Runner is a Cloudflare Worker with a plain HTML UI and D1 storage.

Keep changes conservative:

- Prefer simple TypeScript modules.
- Keep UI copy inline and practical for non-technical users.
- Do not add credential storage.
- Do not persist request bodies, query params, headers, upstream URLs, response rows, or upstream error bodies.
- Preserve immutable configs and stable generated URLs.
- Run `npm run typecheck` and `npm test` before shipping.

For AI-generated runner configuration help, use `AI_CONFIG_GUIDE.md`.
