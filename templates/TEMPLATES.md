# Ready-to-run n8n templates

Twelve importable workflows for the **MentionFox + FoxAPIs** n8n nodes. Each file in
this folder is valid n8n workflow JSON — open n8n → **Workflows → Import from File**
(or paste the JSON) and you have a working starting point. Every template carries a
top **sticky note** (use case, setup, where to get keys, credit cost) and **per-node
notes**.

## Credentials & keys — read once

Two separate credentials power these workflows. They are **not** interchangeable:

| Credential (n8n) | What it is | Where to get it | Spends |
| --- | --- | --- | --- |
| **FoxAPIs API** (`foxApisApi`) | Your FoxAPIs API key, begins `fxp_live_…` | **foxapis.com** | **FoxAPIs credits** |
| **MentionFox API** (`mentionFoxApi`) | Your MentionFox connection token | **mentionfox.com/connect** | MentionFox account credits |
| **RiteKit Client ID** (Generic / Query Auth) | RiteKit `client_id` (query param) | your RiteKit account | RiteKit plan |

The nodes are MentionFox-branded, but all the **paid data work** (enrich, find email,
vet, AI-visibility) authenticates with the **FoxAPIs API key from foxapis.com** and
spends **FoxAPIs credits**. The cross-platform mention scan uses the MentionFox
connection token. After importing, open each node and pick your saved credential where
you see a `REPLACE_WITH_…` placeholder.

### Verified FoxAPIs routes & costs (confirmed against the live API source)

| Node op | Route | Cost |
| --- | --- | --- |
| Scan / List / Multi-keyword scan | MCP `scan_for_mentions` | **3 credits per source** scanned (List Recent = **FREE**) |
| Lead Enricher / Enrich Author | `POST /v1/enrich_person` | **100** (Light) / **150** (Deep) |
| Find Email | `POST /v1/find_email` | **100** on a match / **0** when no email |
| Inbound Vetter (person leg) | `POST /v1/enrich_person` | **100** |
| Inbound Vetter (company leg) | `POST /v1/generate_sales_dossier` | **30** (only when a work domain is present) |
| AI Visibility — check | `POST /v1/geo/check` | **30** |
| AI Visibility — share of voice | `POST /v1/geo/share-of-voice` | **100** (only with competitors) |
| AI Visibility — gaps | `POST /v1/geo/gaps` | **50** (opt-in) |
| AI Visibility — citation rate | `POST /v1/geo/citation-rate` | **50** (opt-in) |

RiteKit (template 6, verified from the RiteKit api-docs apiary):
`GET https://api.ritekit.com/v1/stats/hashtag-suggestions?text=…&client_id=…`.

> **No auto-send.** Every outreach/social step in these templates ends at a **draft or
> a Slack/Discord approval** — nothing is posted or emailed automatically.

Pricing & credits: https://mentionfox.com/pricing

---

## The templates

### 1 · Brand Mention → Slack Alert
`01-brand-mention-slack-alert.json`
- **Use case:** Get pinged in Slack the moment your brand/topic is mentioned anywhere.
- **Nodes:** MentionFox Trigger (on_new_mention) → Slack.
- **Credits:** scan **3 cr/source** per poll. Slack free.
- **Setup:** set Topic + poll cadence; connect Slack; activate.

### 2 · Mention → Enrich Author → Google Sheet Lead List
`02-mention-enrich-author-sheet.json`
- **Use case:** Turn everyone who mentions you into an enriched lead row.
- **Nodes:** MentionFox Trigger → FoxAPIs Lead Enricher → Google Sheets (append).
- **Credits:** scan 3 cr/source + **enrich 100 cr** per mention.
- **Setup:** Topic; FoxAPIs key on the enricher; pick Sheet + tab.

### 3 · Inbound Lead Webhook → Find Email + Enrich → Airtable
`03-inbound-lead-find-email-enrich-airtable.json`
- **Use case:** A form/CRM/site posts a lead; you get a verified email + full profile in Airtable.
- **Nodes:** Webhook → FoxAPIs Find Email → FoxAPIs Lead Enricher → Airtable (create).
- **Credits:** **find email 100 cr (0 on miss)** + **enrich 100 cr** ≈ 200 cr/lead.
- **Setup:** copy webhook URL into your form; FoxAPIs key; pick Base + Table.

### 4 · Daily AI-Visibility Check → Score-Drop Alert
`04-daily-ai-visibility-drop-alert.json`
- **Use case:** Know the day your brand stops being recommended by ChatGPT/Perplexity/Gemini/Grok.
- **Nodes:** Schedule → FoxAPIs AI Visibility Monitor → Code (compare vs last run) → IF → Slack.
- **Credits:** geo check **30 cr** + share-of-voice **100 cr** ≈ 130 cr/day.
- **Setup:** Brand domain + competitors; FoxAPIs key; Slack channel.

### 5 · Competitor Mention → Vet Company → Slack Digest
`05-competitor-mention-vet-company-digest.json`
- **Use case:** When people discuss a competitor, vet who they are and digest it to Slack.
- **Nodes:** MentionFox Trigger (Topic = competitor) → FoxAPIs Inbound Vetter → Aggregate → Slack.
- **Credits:** scan 3 cr/source + vet (**enrich 100** + **dossier 30**) per mention.
- **Setup:** competitor Topic; FoxAPIs key + vetting context; Slack channel.

### 6 · Mention → Draft Reply + RiteKit Hashtags → Slack Approval
`06-mention-draft-reply-hashtags-slack-approval.json`
- **Use case:** Draft a reply with on-trend hashtags and send it to Slack for a human to post. **No auto-post.**
- **Nodes:** MentionFox Trigger → Set (draft) → HTTP RiteKit hashtag-suggestions → Code → Slack.
- **Credits:** scan 3 cr/source. Hashtags billed by **RiteKit** (no FoxAPIs credits).
- **Setup:** Topic; RiteKit Query-Auth credential (`client_id`); Slack channel.

### 7 · High-Follower Author → Enrich → Priority Ping
`07-high-follower-author-enrich-priority-ping.json`
- **Use case:** Only enrich + fast-ping when an influential author (big audience) mentions you.
- **Nodes:** MentionFox Trigger → IF (follower floor) → FoxAPIs Lead Enricher → Slack.
- **Credits:** scan 3 cr/source; **enrich 100/150 cr** runs only past the follower floor.
- **Setup:** Topic; follower threshold; FoxAPIs key; priority Slack channel.

### 8 · Weekly Mentions Digest → Sheet + Email Draft
`08-weekly-mentions-digest-sheet-email-draft.json`
- **Use case:** A Monday roundup: log all mentions to a Sheet and draft a summary email. **Draft only.**
- **Nodes:** Schedule (weekly) → MentionFox (List Recent) → Code → Google Sheets + Gmail (draft).
- **Credits:** **FREE** — List Recent costs 0.
- **Setup:** weekly schedule; Sheet + tab; Gmail draft recipient/subject.

### 9 · Mention → Enrich → Fit Score → Route Hot Leads
`09-mention-enrich-fit-score-route-hot.json`
- **Use case:** Score each mention's author for fit and route hot ones to a Hot tab.
- **Nodes:** MentionFox Trigger → FoxAPIs Lead Enricher → Code (fit score) → IF → Sheets (Hot / All).
- **Credits:** scan 3 cr/source + **enrich 100 cr** per mention.
- **Setup:** Topic; FoxAPIs key; Sheet with `Hot` and `All` tabs.

### 10 · Scheduled Multi-Keyword Scan → Dedupe → Airtable
`10-scheduled-multi-keyword-scan-dedupe-airtable.json`
- **Use case:** Watch several keywords on a schedule; store only new, deduped mentions.
- **Nodes:** Schedule → Code (keywords) → MentionFox (Scan) → Code (flatten) → Code (dedupe) → Airtable.
- **Credits:** **3 cr × sources × keywords** per run.
- **Setup:** keyword list; sources; MentionFox token; Airtable Base + Table.

### 11 · Crisis Signal → Immediate Slack + Discord Page *(bonus)*
`11-crisis-signal-immediate-page.json`
- **Use case:** Page on-call the instant a mention contains a crisis keyword.
- **Nodes:** MentionFox Trigger (on_crisis_signal_detected) → Slack + Discord.
- **Credits:** scan **3 cr/source** per poll (scope sources tightly on a fast cadence).
- **Setup:** Topic + crisis keywords; short poll interval; Slack channel + Discord webhook.

### 12 · Inbound Applicant/Lead Vetter → Slack Approval Card *(bonus)*
`12-inbound-applicant-vetter-slack-approval.json`
- **Use case:** Vet an applicant/demo request and post a Slack approval card. Human decides.
- **Nodes:** Form Trigger → FoxAPIs Inbound Vetter → IF (recommended action) → Slack (approve / review).
- **Credits:** **enrich 100** + **dossier 30** (when a work domain is present).
- **Setup:** share form URL (or swap a Webhook); FoxAPIs key; Slack channel.

---

## Verify the templates

```bash
node scripts/verify-templates.js
```

Parses every file, checks the `nodes` / `connections` structure, node fields,
connection referential integrity, the presence of a trigger + setup sticky note, and
guards the credential-naming rule. Exits non-zero on any failure.
