# Mention resource

Real-time scan across 50+ social platforms (Reddit, Twitter/X, news, blogs, YouTube, forums, review sites).

## Operations

### scan

Real-time mention scan with up to 50 results.

| Field | Required | Notes |
|---|---|---|
| Topic | yes | Topic, brand, or person to scan for |
| Sources | no | Comma-separated source filter (default = all 50+) |
| Hours Back | no | 1-24, default 24 |

**Cost**: 3 credits per source scanned.
**MCP tool**: `scan_for_mentions`.

### list_recent

Lists recent research / connector activity for your account.

| Field | Required | Notes |
|---|---|---|
| Limit | no | 1-50, default 10 |

**Cost**: FREE.
**MCP tool**: `get_my_recent_research`.

### score_intent (stub-proxy in v0.1)

Proxies to `scan_for_mentions` and applies a heuristic intent score (buy-intent keyword count + sentiment boost). Server-side scoring lands in MentionFox MCP v1.5.

| Field | Required | Notes |
|---|---|---|
| Topic | yes | |
| Intent Threshold | no | 0-100, default 60 |

**Heuristic logic**: each buy-intent keyword in the mention contributes +25; positive sentiment +10, negative -10; cap at 100.

### get_by_id (stub in v0.1)

Pending dedicated MCP tool.

| Field | Required | Notes |
|---|---|---|
| Mention ID | yes | |
