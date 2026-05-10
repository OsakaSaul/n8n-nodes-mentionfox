# GEOFixer resource

GEO/AEO visibility scoring across ChatGPT, Gemini, Claude, and Perplexity.

## Operations

### run_audit

Triggers a fresh GEO/AEO scan.

| Field | Required | Notes |
|---|---|---|
| Brand Domain | yes | Apex domain, matched against your clients |
| Wait for Completion | no | Polls inline up to 90s; otherwise returns audit_id |
| Scan Depth | no | `light` (~10 prompts × 4 LLMs) or `deep` (~30 × 4) |

**Cost**: FREE for paid GEOFixer subscribers (covered by per-day credit budget on the subscription).
**MCP tool**: `run_geofixer_audit`.

### get_score

| Field | Required | Notes |
|---|---|---|
| Brand Domain | yes | |
| Persona ID | no | Restrict to single persona UUID |
| LLM Filter | no | `chatgpt`, `gemini`, `claude`, `perplexity`, or all |

**Cost**: FREE.
**MCP tool**: `get_geofixer_score`.

### list_gaps

| Field | Required | Notes |
|---|---|---|
| Brand Domain | yes | |
| Top N Actions | no | 1-25, default 5 |

**Cost**: FREE.
**MCP tool**: `get_geofixer_top_actions`.

### autopilot_status / autopilot_toggle (stubs in v0.1)

Pending dedicated MCP tools.
