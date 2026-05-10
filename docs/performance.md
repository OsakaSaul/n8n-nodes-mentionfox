# Performance

**Status**: PLACEHOLDER for v0.1. Actual numbers ship in v0.2 alongside reliability test results.

## Expected latency ranges (from MentionFox MCP server-side instrumentation)

These are typical, not measured at the n8n node layer. Add ~50-200ms for the n8n → MentionFox network hop.

| Operation | Typical p50 | Typical p95 | Notes |
|---|---|---|---|
| get_dossier (cache hit) | 200ms | 500ms | FREE |
| get_dossier (cold) | 8s | 18s | 30cr; runs `enrich-person` light path |
| enrich_person | 6s | 14s | 5cr |
| scan_for_mentions | 4s | 12s | 3cr per source |
| find_journalists_covering | 5s | 14s | 10cr |
| compare_people | 800ms | 2s | reads cached profiles, mostly arithmetic |
| save_to_my_pipeline | 200ms | 600ms | FREE; single insert |
| get_my_recent_research | 300ms | 700ms | FREE |
| clarify_research_intent | 200ms | 500ms | FREE |
| export_report | 3s | 8s | 5cr; HTML render |
| get_investor_report | 30s | 70s | 30cr; 6-query Serper fan-out + Sonnet synthesis |
| get_entrepreneur_report | 3min | 5min | 200cr; 12-section synthesis |
| get_geofixer_score | 400ms | 1s | FREE; aggregate query |
| get_geofixer_top_actions | 400ms | 1s | FREE |
| run_geofixer_audit (light, no wait) | 600ms | 1.5s | FREE for paid subscribers |
| run_geofixer_audit (deep, wait) | 60s | 90s | wall-bounded at 90s |
| get_pipeline_watch_digest | 500ms | 1.2s | FREE |
| deep_dive_pipeline_company | varies | varies | proxies through entrepreneur report |

## Stub operations

All stubs return immediately (~50-150ms n8n → MCP roundtrip) since they short-circuit at the node layer.

## n8n-side overhead

- HTTP client: ~10-30ms per call
- JSON-RPC payload assembly: <5ms
- Static-data dedupe lookup (triggers): <5ms for sets up to 500 entries

## Cost-of-ownership notes

- A trigger polling at 1-minute cadence on `scan_for_mentions` with 3 sources costs roughly 9 credits/min, 540/hour — design accordingly. The default 30-minute cadence in templates 3 + 6 keeps costs predictable.
- GEOFixer triggers are FREE-friendly since `get_geofixer_score` is FREE — poll as often as you want.

## v0.2 commitments

- Real measurements (not server-side estimates) p50 / p95 / p99 per operation
- Concurrency test: 50 parallel `enrich_person` calls; document if rate limit kicks in
- Memory test: triggers running 24h with 500-entry dedupe sets
- n8n version matrix: 1.55, 1.60, 1.65, 1.70
