# n8n-nodes-mentionfox

[![npm version](https://img.shields.io/npm/v/n8n-nodes-mentionfox.svg)](https://www.npmjs.com/package/n8n-nodes-mentionfox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

Community n8n nodes for [MentionFox](https://mentionfox.com) and FoxAPIs — social-listening triggers, people enrichment, email finding, company vetting, and AI-visibility monitoring, wired straight into your n8n workflows.

Get alerted the moment your brand, a competitor, or a buying-intent keyword is mentioned anywhere; enrich a name into a verified contact; find a work email from a domain; vet an inbound lead before you reply; and check whether AI assistants recommend you. Pipe any of it to Slack, Discord, email, Google Sheets, or your CRM.

## What you get

- **MentionFox Trigger** — a polling trigger that fires on each *new* mention of a keyword, brand, or competitor (deduped so every mention emits exactly once). Also: new high-intent leads, GEO score drops, and crisis signals. This is the one that drives alert-and-route workflows.
- **FoxAPIs: Lead Enricher** — name + any hint → verified email, title, company, and social links.
- **FoxAPIs: Find Email** — company domain (+ optional name) → verified work email. Charges only on a real match.
- **FoxAPIs: Inbound Vetter** — email / domain / name → person enrichment + company intel + derived seniority/confidence signals, before you reply.
- **FoxAPIs: AI Visibility Monitor** — is your brand recommended by AI assistants vs competitors, per assistant, with share-of-voice and gaps.
- **MentionFox node** — on-demand mention scanning across 50+ platforms, subject vetting, dossiers, comparisons, and GEO/AEO scoring (8 resources, 30+ operations) over the MentionFox MCP server.
- **12 ready-to-import workflow templates** in `/templates/`.

## Features

- **6 nodes**: 1 polling trigger node (5 trigger types) + 5 action nodes
- **MentionFox node**: 8 resources with 30+ operations over JSON-RPC 2.0 / MCP (`https://mentionfox.com/mcp`)
- **FoxAPIs nodes**: typed REST nodes over `https://api.foxapis.com` (enrich, find email, vet, AI visibility)
- **12 ready-to-import workflow templates** in `/templates/`
- **Two bearer-token credentials** (MentionFox MCP token + FoxAPIs key), each with a built-in credential test

## Installation

In your n8n instance, go to **Settings → Community Nodes** and install:

```
n8n-nodes-mentionfox
```

Or, for self-hosted n8n via npm:

```bash
npm install n8n-nodes-mentionfox
```

## Authentication

This node uses bearer-token authentication against the MentionFox MCP server.

1. Visit https://mentionfox.com/connect
2. Sign in with your MentionFox account
3. Copy the bearer access token (24-hour expiry; refresh via the same page)
4. In n8n, create a new **MentionFox API** credential and paste the token

n8n will run a credential test against `tools/list` on the MCP server. A green check confirms the token is live.

> **v0.1 note**: full OAuth-grant flow inside the credential editor is on the v1.1 roadmap. v0.1 uses paste-token for simplicity.

## Resources

| Resource | Operations |
|---|---|
| Subject | vet_person, get_dossier, compare_subjects, evaluate_influencer |
| Mention | scan, list_recent, score_intent, get_by_id |
| Lead | find_contact, enrich_person, score_lead, push_to_dealflow |
| GEOFixer | run_audit, get_score, list_gaps, autopilot_status, autopilot_toggle |
| Outreach | build_sequence, send_sequence, get_sequence_status, list_replies |
| Chat | start_session, send_message, get_history, export_transcript |
| Den | list_dens, get_den_widget_data, create_den_task, list_den_tasks |
| Client | list_clients, create_client, get_client_geo_score, list_client_battlecards |

Operations whose dedicated MCP tool is pending in v0.1 surface as transparent stubs that return the dashboard URL plus your input arguments unchanged. Workflows wired against stubs light up automatically once MentionFox MCP v1.5 ships dedicated tools — no node version bump required.

See `/docs/` for per-resource documentation.

## Triggers (5)

| Trigger | What it does |
|---|---|
| On New Mention | Polls `scan_for_mentions`, dedupes by source URL |
| On New High-Intent Lead | Polls scan + heuristic intent score (above threshold) |
| On GEO Score Drop | Polls `get_geofixer_score`, fires on N-point drops |
| On New Battlecard Generated | Polls battlecards (stub — heartbeat only in v0.1) |
| On Crisis Signal Detected | Polls scan filtered to crisis keywords; recommended faster cadence |

## Worked examples

### Example 1: Vet inbound founder leads from HubSpot

1. HubSpot Trigger fires on new contact
2. MentionFox node: `Subject` → `vet_person` (founder), pass `{{$json.firstname}} {{$json.lastname}}`
3. Slack node posts the verdict and public report URL to a channel

Import `/templates/12-inbound-applicant-vetter-slack-approval.json` to see the full wiring.

### Example 2: Daily GEO health check

1. Schedule trigger at 09:00 daily
2. MentionFox node: `GEOFixer` → `run_audit` for your domain
3. MentionFox node: `GEOFixer` → `list_gaps`, top 5
4. Notion node logs score; Slack node summarises

Import `/templates/04-daily-ai-visibility-drop-alert.json`.

### Example 3: Reddit signal to personalised outreach

1. MentionFox Trigger (`On New High-Intent Lead`) on your topic + Reddit only
2. MentionFox node: `Lead` → `find_contact`
3. MentionFox node: `Outreach` → `build_sequence` (stub in v0.1, returns dashboard URL)
4. Apollo / Instantly HTTP request to send the sequence

Import `/templates/06-mention-draft-reply-hashtags-slack-approval.json`.

## Workflow templates (12)

Full index with setup, nodes, and credit cost per template: **[`templates/TEMPLATES.md`](templates/TEMPLATES.md)**.
Import any of these via n8n's **Workflows → Import from File**:

1. `01-brand-mention-slack-alert.json` — New Mention trigger → Slack alert (the core social-listening flow)
2. `02-mention-enrich-author-sheet.json` — Mention → enrich author → Google Sheet lead list
3. `03-inbound-lead-find-email-enrich-airtable.json` — Webhook → Find Email + Enrich → Airtable
4. `04-daily-ai-visibility-drop-alert.json` — Schedule → AI Visibility → score-drop → Slack
5. `05-competitor-mention-vet-company-digest.json` — Competitor mention → Vet → Slack digest
6. `06-mention-draft-reply-hashtags-slack-approval.json` — Mention → draft reply + RiteKit hashtags → Slack approval (no auto-post)
7. `07-high-follower-author-enrich-priority-ping.json` — Big-audience author → Enrich → priority Slack ping
8. `08-weekly-mentions-digest-sheet-email-draft.json` — Weekly → Sheet log + Gmail summary draft
9. `09-mention-enrich-fit-score-route-hot.json` — Mention → Enrich → fit score → Hot/All tabs
10. `10-scheduled-multi-keyword-scan-dedupe-airtable.json` — Schedule → multi-keyword scan → dedupe → Airtable
11. `11-crisis-signal-immediate-page.json` — Crisis trigger → Slack + Discord page
12. `12-inbound-applicant-vetter-slack-approval.json` — Form → Inbound Vetter → Slack approval card

Validate them all with `node scripts/verify-templates.js`.

## Pricing transparency

MentionFox tools cost credits per call. The MentionFox node passes through the same credit charges your account would incur on the dashboard:

| Operation | Cost |
|---|---|
| vet_person (founder) | 200 credits |
| vet_person (investor) | 30 credits |
| get_dossier | 30 credits cold / FREE on cache hit |
| compare_subjects | 5 credits per cached profile |
| Mention scan | 3 credits per source |
| enrich_person | 5 credits |
| save_to_my_pipeline | FREE |
| GEOFixer (all ops) | FREE for paid GEOFixer subscribers |

Disambiguation always returns a candidate list at zero credits — you only pay when a real subject is locked in.

## Documentation

- Per-resource pages live in `/docs/`
- Use cases: `/docs/use-cases.md`
- Reliability tests: `/docs/reliability-tests.md`
- Performance: `/docs/performance.md`
- Security audit: `/docs/security-audit.md`
- Submitting to n8n's verified community list: `/docs/n8n-pr.md`

## License

[MIT](LICENSE.md)

## Author

Saul Fleischman / [MentionFox](https://mentionfox.com)

## Issues / contact

Open an issue at https://github.com/OsakaSaul/n8n-nodes-mentionfox/issues, or email saul@mentionfox.com.
