# Client resource

Agency-tier client management.

## Operations

### list_clients (stub in v0.1)

### create_client (stub in v0.1)

| Field | Required | Notes |
|---|---|---|
| Client Name | yes | |
| Client Domain | yes | |

### get_client_geo_score

Wraps `get_geofixer_score` against the client brand domain.

| Field | Required | Notes |
|---|---|---|
| Client Domain | yes | |

**Cost**: FREE.
**MCP tool**: `get_geofixer_score`.

### list_client_battlecards (stub in v0.1)

| Field | Required | Notes |
|---|---|---|
| Client Domain | no | |
