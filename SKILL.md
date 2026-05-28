# Clay Pagination Runner Skill

Use this skill when a user asks an AI assistant to configure Clay Pagination Runner from API documentation.

## What To Do

1. Read the API docs URL or attached docs file.
2. Identify the exact list/search endpoint the user needs.
3. Determine auth placement: header auth, URL key placeholder, static non-secret headers, or body.
4. Determine the result array path.
5. Determine pagination type and the exact params/paths.
6. Return field-by-field values for the app.
7. Tell the user to test before saving.

## App URL

https://paginate.chris-apis.xyz

Generated Clay URLs look like:

```text
https://paginate.chris-apis.xyz/<config-id>
```

## Do Not

- Do not invent credential values.
- Do not place secrets in saved static headers.
- Do not tell the user to save before testing.
- Do not omit ambiguous assumptions.
- Do not suggest editing or deleting a saved runner; saved runners are intentionally immutable.

## Reference

Use `AI_CONFIG_GUIDE.md` for the complete field schema and output format.
