# Clay Pagination Runner Skill

Use this skill when a user asks an AI assistant to configure Clay Pagination Runner from API documentation.

## What To Do

1. Read the API docs URL or attached docs file.
2. Identify the exact list/search endpoint the user needs.
3. Determine auth placement: header auth, URL key placeholder, static non-secret headers, or body.
4. Determine the result array path.
5. Determine pagination type and the exact params/paths.
6. Return one strict JSON object the app can parse.
7. Tell the user to test before saving.
8. Treat `maxPages` as a full-run safety cap, usually 250 and up to 1000 for large result sets.
9. Include production-safe stop conditions, retry/rate controls, and response shaping only when useful.

## App URL

https://paginate.chris-apis.xyz

Generated Clay URLs look like:

```text
https://paginate.chris-apis.xyz/<config-id>
```

## Do Not

- Do not invent credential values.
- Do not place secrets in saved static headers.
- Do not return markdown around the JSON object.
- Do not guess uncertain values; use `null` or an empty string and add a warning.
- Do not copy starter defaults unless the docs or user goal confirms them.
- Do not set low sample `maxPages` values unless the user explicitly asks for a sample-only runner.
- Do not disable loop protection unless docs make it necessary.
- Do not tell the user to save before testing.
- Do not omit ambiguous assumptions.
- Do not suggest editing or deleting a saved runner; saved runners are intentionally immutable.

## Output

Return a JSON object with `summary`, `overallCertainty`, `values`, `explanations`, and `warnings`. Include a `certainty` and `reason` for every non-blank value in `explanations`.

## Reference

Use `AI_CONFIG_GUIDE.md` for the complete field schema and output format.
