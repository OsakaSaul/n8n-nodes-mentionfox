# Den resource

**v0.1 status**: stubs. Den-specific MCP read tools are slated for MentionFox MCP v1.5.

The 27-Den persona system lives in MentionFox; v0.1 of this node surfaces the operation slots so workflow templates 7 (FoxChat → Den task) work today against the stub responses.

## Operations

### list_dens

Returns the Den catalog dashboard URL.

### get_den_widget_data

| Field | Required | Notes |
|---|---|---|
| Den Persona | no | e.g. `founder`, `recruiter`, `investor`, `journalist` |
| Widget Slug | no | |

### create_den_task

| Field | Required | Notes |
|---|---|---|
| Den Persona | no | |
| Task Title | yes | |
| Task Body | no | |
| Source URL | no | FoxChat URL, mention URL, etc |

### list_den_tasks

| Field | Required | Notes |
|---|---|---|
| Den Persona | no | |
