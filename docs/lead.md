# Lead resource

Find verified contact info, enrich, score, and push to your MentionFox Dealflow pipeline.

## Operations

### find_contact / enrich_person

Aliased pair — both call the same MCP tool. Returns full_name, company, title, verified emails, phones, profile URLs, summary.

| Field | Required | Notes |
|---|---|---|
| Name | yes if no `person_id` | |
| Person ID | yes if no `name` | |
| Company | no | Disambiguation hint |

**Cost**: 5 credits per call.
**MCP tool**: `enrich_person`.

### score_lead (stub-proxy in v0.1)

Proxies to `enrich_person`. Server-side intent / lead scoring tool slated for MentionFox MCP v1.5.

### push_to_dealflow

Append-only — never modifies or deletes existing leads.

| Field | Required | Notes |
|---|---|---|
| Lead Name | yes | |
| Lead Email | no | |
| Lead Company | no | |
| Source Context | no | Where you found the lead |
| Notes | no | |

**Cost**: FREE.
**MCP tool**: `save_to_my_pipeline`.
