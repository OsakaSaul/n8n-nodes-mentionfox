# Subject resource

The Subject resource handles vetting, dossiers, comparisons, and influencer evaluation.

## Operations

### vet_person

Generates a single-page (investor) or 12-section (founder) vetting report.

| Field | Required | Notes |
|---|---|---|
| Subject Type | yes | `founder` (200cr) or `investor` (30cr) |
| Name | yes if no `person_id` | Natural-language name |
| Person ID | yes if no `name` | UUID lock-in after disambiguation |
| Company / Firm Hint | no | Disambiguation hint |

**Disambiguation**: ambiguous names return a candidate list at zero credits. Re-call with `person_id` to lock in.

**MCP tool**: `get_entrepreneur_report` (founder) or `get_investor_report` (investor).

### get_dossier

Full multi-section dossier — career, network, reputation, public writing, recent news, key topics.

| Field | Required | Notes |
|---|---|---|
| Name | yes if no `person_id` | |
| Person ID | yes if no `name` | |
| Format | no | `summary` (default) or `full` |
| Force Refresh | no | Skip cache, charge 30cr |

**Cost**: 30 credits cold path, FREE on cache hit.
**MCP tool**: `get_dossier`.

### compare_subjects

Side-by-side comparison of 2-5 people across 23 dimensions (DISC, MBTI, communication, trajectory, network density, press footprint, etc).

| Field | Required | Notes |
|---|---|---|
| People to Compare | yes | 2-5 entries; each provides `name` or `person_id` |
| Comparison Context | no | Frames the comparison (e.g. "investment targets") |

**Cost**: 5 credits per cached profile.
**MCP tool**: `compare_people`.

### evaluate_influencer (stub in v0.1)

Currently proxies to `get_dossier` and tags the output with the brand context. Dedicated influencer-fit scoring tool slated for MentionFox MCP v1.5.

| Field | Required | Notes |
|---|---|---|
| Name | yes | |
| Brand / Topic Context | no | Surfaces in stub output for downstream nodes |
