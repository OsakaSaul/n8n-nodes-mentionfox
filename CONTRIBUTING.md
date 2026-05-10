# Contributing to n8n-nodes-mentionfox

Thanks for contributing. This is a community-maintained n8n node for MentionFox.

## Setting up your environment

```bash
git clone https://github.com/OsakaSaul/n8n-nodes-mentionfox.git
cd n8n-nodes-mentionfox
npm install
npm run build
```

To run inside a local n8n instance:

```bash
# In ~/.n8n/custom (create if missing)
cd ~/.n8n/custom
npm link n8n-nodes-mentionfox
# Restart n8n
n8n start
```

The node will appear under **MentionFox** in the node palette.

## Lint + type-check

```bash
npm run lint
npm run lintfix     # auto-fix
npm run build       # type-check via tsc
```

The `prepublishOnly` script runs the strict eslint preset including `n8n-nodes-base/community-package-json-name-still-default`.

## Adding a new operation

1. Edit the relevant `nodes/MentionFox/descriptions/<Resource>Description.ts` to add the operation choice + fields.
2. Add the dispatch branch in `nodes/MentionFox/MentionFox.node.ts` under the resource's `run<Resource>` function.
3. If the operation maps to an existing MentionFox MCP tool, call `mentionFoxMcpCall.call(this, '<tool_name>', args)`. If the MCP tool is pending, return `stubResponse('<resource>.<op>', args, '<dashboard_url>')`.
4. Bump the version in `package.json` + add a `CHANGELOG.md` entry.
5. If the operation is interesting in a workflow, add a template under `/templates/`.

## Adding a new trigger

Triggers live in `nodes/MentionFox/MentionFoxTrigger.node.ts`. Add the new `triggerType` option, the relevant fields (with `displayOptions`), then the `poll<TriggerName>` function.

Cursor / dedupe state lives in `staticData` (per workflow node); cap arrays at 500 entries to avoid unbounded growth.

## Submitting to the n8n verified community packages list

See [`docs/n8n-pr.md`](./docs/n8n-pr.md) for the canonical steps.

Short version:

1. Confirm the package builds, lints, and runs in a fresh n8n instance.
2. Confirm npm publish works (`npm publish --access public`).
3. Open a PR against [n8n-io/n8n](https://github.com/n8n-io/n8n) per their community-nodes process — usually a small docs / registry entry. Link the PR back here in the issues tracker.

## Code style

- Prettier (config in `.prettierrc.js`)
- Tabs, single quotes, semicolons, trailing commas everywhere.
- Comments explain *why*, not *what* — favour terse code with one comment block over verbose inline comments.

## License

Contributions are licensed under MIT (same as the project).
