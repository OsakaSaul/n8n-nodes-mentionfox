# Reliability tests

**Status**: PLACEHOLDER for v0.1. Actual results land in v0.2.

## Test plan

For each of the 30+ operations, run 100 calls against production MentionFox MCP and record:

- Success count (HTTP 200 + valid JSON-RPC `result.content[]` shape)
- Tool-level error count (`isError: true` in result.content)
- Wire-protocol error count (JSON-RPC `error` object)
- Network / timeout count
- Median + p95 + p99 latency
- Credit-charge accuracy (verified against `mcp_tool_invocations` table on MentionFox side)

## Test harness

```bash
# v0.2 will ship a /test/reliability/run-100x.ts script that iterates each
# operation 100 times, logs to Supabase, generates a per-operation report.
```

## Known failure modes (v0.1)

These are documented from the MentionFox MCP server side (see sonic-spotter-hq CLAUDE.md):

- **24h token expiry**: bearer tokens expire at 24h. Credential test will start failing; user must re-paste from /connect. v1.1 OAuth flow eliminates this.
- **Rate limit**: 30 calls/min/user, returns JSON-RPC code -32002. The node propagates as HTTP 429 NodeApiError.
- **Tier 1 monthly cap**: founder + investor reports share a pool (10 / 50 / 500 by tier). Returns -32001 with `pool: 'tier1'` data.
- **enrich_person separate cap**: 50 / 100 / 1000 by tier.
- **Tool timeout 25s**: tools that exceed 25s return `Tool execution failed: tool timeout (25s)`. Long-running tools (`get_entrepreneur_report` 3-5min, `run_geofixer_audit` deep) handle their own polling internally.
- **Stub operations**: every operation tagged `stub_pending_mcp_tool` returns successfully but with `status: 'stub_pending_mcp_tool'` — workflows must branch on this if they need a real result.

## v0.2 commitments

- Run all 30+ operations 100x each within a 24h window
- Document p50 / p95 / p99 latency per operation in `/docs/performance.md`
- Add Jest-based smoke test suite under `__tests__/` calling each operation against a staging MentionFox instance
- Add CI matrix testing against last 3 n8n major versions (1.55+, 1.60+, 1.65+)
