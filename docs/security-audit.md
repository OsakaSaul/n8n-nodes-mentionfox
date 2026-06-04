# Security audit checklist

**Status**: v0.1 audit. v0.2 will add results from a third-party review.

## Credential handling

- [x] Bearer token stored as n8n credential `password` (encrypted at rest by n8n's standard credential store).
- [x] Token never logged or printed in node output.
- [x] Token only sent in `Authorization: Bearer` header — never in URL params, query strings, or request bodies.
- [x] No `console.log` of credentials anywhere in `nodes/` or `credentials/`.
- [x] Credential test endpoint hits `tools/list` — does not echo the token in any error path.

## Data handling

- [x] Node operates as pass-through; no caching of MCP responses inside n8n.
- [x] All tool inputs flow from user-defined node parameters → MCP `arguments` field. No string concatenation that could lead to injection.
- [x] User-provided strings (name, topic, etc.) are passed as JSON values, not interpolated into URLs.
- [x] Trigger dedupe state lives in `staticData` (workflow-scoped, n8n's standard pattern). Never stored externally.

## Network

- [x] HTTPS-only (`https://mentionfox.com/mcp`).
- [x] Default endpoint cannot be changed without explicit credential edit.
- [x] No third-party CDN / external script loading.

## Stub responses

- [x] Stub responses include only the input arguments and a dashboard URL — no token, no internal state, no secrets.

## Input validation

- [x] Required `name` OR `person_id` enforced at dispatch layer (throws `NodeOperationError` if both missing).
- [x] Numeric ranges enforced via `typeOptions: { minValue, maxValue }` on n8n number params.
- [x] Source filter strings are split on commas and trimmed — no eval, no shell, no SQL.

## Error handling

- [x] HTTP errors → `NodeApiError` with no token leakage in description.
- [x] JSON-RPC -32001 (auth) propagates as HTTP 401.
- [x] JSON-RPC -32002 (rate limit) propagates as HTTP 429.
- [x] Tool-level `isError: true` propagates with the upstream message in `description`, NOT the raw response object.
- [x] `continueOnFail` honored — error becomes `{ json: { error: message } }` per item.

## Outstanding items for v0.2

- [ ] Third-party review (Trail of Bits or similar)
- [ ] Static analysis (Semgrep, CodeQL) integrated into CI
- [ ] Dependency audit (`npm audit` clean) automated in CI
- [ ] Subresource integrity for any future inline-loaded resources (currently none)
- [ ] Token rotation documentation in README

## Reporting a vulnerability

Email saul@mentionfox.com with subject `[SECURITY] n8n-nodes-mentionfox`. We aim for first response within 48 hours.

For coordinated disclosure of issues affecting MentionFox MCP server itself (not this node), use the same address with subject `[SECURITY] MentionFox MCP`.
