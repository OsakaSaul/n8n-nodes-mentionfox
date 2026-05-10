# Use cases

What enterprise customers use `n8n-nodes-mentionfox` for.

## Sales / business development

- **Pre-call prep at scale**: Calendar trigger 60 min before each external meeting → MentionFox `get_dossier` → email rep a 1-page brief. Eliminates manual research; reps walk into calls warm.
- **Auto-vet inbound founder leads**: HubSpot creates a contact → MentionFox `vet_person` (founder) → Slack notification with verdict and 12-section report URL. Removes "is this person legit" from BDR queue.
- **Reddit signal to outbound**: MentionFox high-intent trigger on competitor mentions → enrich author → build personalised sequence → push to Apollo. Surfaces buyers before they fill out a contact form.

## Recruiting / HR

- **Candidate red-flag detection**: Greenhouse stage change → MentionFox `get_dossier` → conditional Slack alert if red flags found. Catches issues before final-round interviews.
- **Stealth-approach passive candidates**: Trigger on "open to work" signals → MentionFox dossier → personalised non-employer-visible outreach (via Stealth Approach drawer in MentionFox).

## Investor / VC

- **Deal sourcing pipeline**: MentionFox Pipeline Watch (`subscribe_to_pipeline_watch`) feeds daily IPO / breakout / pre-Series-A signals into n8n → Slack digest + auto-create Linear issues for diligence-worthy targets.
- **Founder DD on portfolio prospects**: New deal sourcing → MentionFox `vet_person` (founder, 200cr) → Notion logs the 12-section DD report.

## PR / communications

- **Crisis detection**: Crisis-keyword trigger → Slack page incident owner + create Linear incident + log in Datadog. 5-minute poll cadence catches breaking news before customers tag you.
- **Journalist outreach**: New product launch → MentionFox `find_journalists_covering` → enrich top 20 → personalised pitch sequence.

## Marketing / GEO + AEO

- **Daily GEO health check**: Cron at 09:00 → `run_audit` → log score in Notion → Slack summary of top 5 gaps. Surface AI-search visibility regressions within 24 hours of them happening.
- **Score-drop alerts**: GEO Score Drop trigger fires when 7-day rolling drops by 5+ points → page the GEO owner.

## Customer success

- **FoxChat handoff to Den tasks**: FoxChat conversation webhook → MentionFox `create_den_task` for the FoxDen owner. Closes the loop between automated chat and human follow-up.
- **Conference speaker comparison**: Eventbrite event ingest → `compare_subjects` across the top 3 speakers → Notion page documenting the decision rationale.

## Agency

- **Per-client GEO dashboard**: Daily cron iterates `list_clients` → `get_client_geo_score` per client → aggregate Notion page; clients see live scores, agency sees rollup.
- **Battlecard publishing**: New battlecard trigger → publish to client portal + ping account owner. (Battlecard MCP tool pending; v0.1 trigger emits heartbeat.)

## What this node specifically unlocks vs alternatives

| Alternative pattern | Why this node beats it |
|---|---|
| Generic HTTP node hitting MentionFox API | This node speaks MCP / JSON-RPC 2.0 natively, handles disambiguation candidate-list flow, surfaces credit costs in the UI, dedupes mentions in triggers, and ships 8 ready templates. |
| Zapier / Make MentionFox connector | n8n is self-hostable, no per-task pricing, full workflow logic, and you can run hundreds of mention-scan polls without breaking the bank. |
| Manual dashboard work | Workflows run 24/7. Crisis triggers fire in 5 minutes. Daily GEO checks happen even on weekends. |
