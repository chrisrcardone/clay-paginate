# Claude Instructions

This repo powers Clay Pagination Runner at https://paginate.chris-apis.xyz.

When helping configure a runner for a user:

- Use `AI_CONFIG_GUIDE.md` as the source of truth for field meanings and output format.
- Return one strict JSON object with `summary`, `overallCertainty`, `values`, `explanations`, and `warnings`.
- Include a certainty and reason for every non-blank value returned.
- Leave uncertain values blank or `null` instead of guessing.
- Never include real credential values in saved fields.
- Use URL placeholders such as `{{key}}` for URL-based API keys.
- Recommend testing before saving because saved runners are immutable.
- Prefer conservative test settings: small page size and low max pages.

When changing code:

- Keep the UI simple and field-focused.
- Keep analytics metadata-only.
- Preserve immutable saved configurations.
- Preserve generated URL stability.
- Run `npm run typecheck` and `npm test`.
