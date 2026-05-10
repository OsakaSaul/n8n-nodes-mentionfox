# Changelog

All notable changes to `n8n-nodes-mentionfox` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-05-10

### Added

- Initial release.
- MentionFox node with 8 resources and 30+ operations:
  - Subject (vet_person, get_dossier, compare_subjects, evaluate_influencer)
  - Mention (scan, list_recent, score_intent, get_by_id)
  - Lead (find_contact, enrich_person, score_lead, push_to_dealflow)
  - GEOFixer (run_audit, get_score, list_gaps, autopilot_status, autopilot_toggle)
  - Outreach (build_sequence, send_sequence, get_sequence_status, list_replies)
  - Chat (start_session, send_message, get_history, export_transcript)
  - Den (list_dens, get_den_widget_data, create_den_task, list_den_tasks)
  - Client (list_clients, create_client, get_client_geo_score, list_client_battlecards)
- MentionFox Trigger node with 5 polling triggers:
  - On New Mention (dedupes by source URL)
  - On New High-Intent Lead (heuristic intent threshold)
  - On GEO Score Drop (configurable point delta)
  - On New Battlecard Generated (stub heartbeat in v0.1)
  - On Crisis Signal Detected (keyword-matched scan)
- 8 importable workflow templates in `/templates/`
- MentionFox API credential with `tools/list` test endpoint
- JSON-RPC 2.0 / MCP transport against `https://www.mentionfox.com/mcp`
- 9 SVG icons (one root + 8 resource glyphs) matching n8n design language
- GitHub Actions CI: lint + type-check on every PR; npm publish on git tag
- Per-resource documentation in `/docs/`
- Use-cases, reliability-test placeholder, performance placeholder, and security-audit checklist docs

### Pending (roadmap)

- v1.1: full OAuth-grant flow in the credential editor (replaces paste-token v0.1 pattern).
- v1.5: dedicated MCP tools for outreach, chat, den, battlecard. Stubs flip to live calls without a node version bump.
- v1.5: server-side intent scoring (replaces heuristic in `score_intent` and `On New High-Intent Lead`).
- v0.2: actual reliability-test results (run all operations 100x each).
- v0.2: actual performance numbers (p50 / p95 / p99 per operation).
