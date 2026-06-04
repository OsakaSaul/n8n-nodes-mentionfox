# Outreach resource

**v0.1 status**: stubs. Dedicated outreach MCP tools (`build_sequence`, `send_sequence`, `get_sequence_status`, `list_replies`) ship in MentionFox MCP v1.5+.

The operations exist as workflow slots so you can wire them now. Each call returns:

```json
{
  "status": "stub_pending_mcp_tool",
  "tool": "outreach.build_sequence",
  "dashboard_url": "https://mentionfox.com/dashboard/outreach",
  "echo": { ... your input arguments ... }
}
```

When the MCP tools land, the n8n node flips to live calls without a version bump — your existing workflows light up automatically.

## Operations

### build_sequence

| Field | Required | Notes |
|---|---|---|
| Recipient Name | no | |
| Recipient Email | no | |
| Sequence Template | no | Existing template name |
| Personalisation Context | no | |

### send_sequence

Same fields as `build_sequence`.

### get_sequence_status / list_replies

| Field | Required | Notes |
|---|---|---|
| Sequence ID | yes | |
