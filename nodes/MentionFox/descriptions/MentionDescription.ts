import { INodeProperties } from 'n8n-workflow';

/**
 * Mention resource.
 *
 * MCP tools used:
 *   scan          → scan_for_mentions (3cr per source)
 *   list_recent   → get_my_recent_research (FREE) — filtered to mentions
 *   score_intent  → STUB. No dedicated MCP tool yet. Falls through to
 *                   scan_for_mentions and tags with intent heuristic.
 *                   Pending dedicated MCP tool in v1.5.
 *   get_by_id     → STUB. No dedicated by-id MCP tool exposed.
 *                   Pending MentionFox MCP v1.5.
 */
export const mentionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['mention'] } },
		options: [
			{
				name: 'Scan for Mentions',
				value: 'scan',
				description: 'Real-time scan across 50+ social platforms in the last 24 hours. 3 credits per source scanned.',
				action: 'Scan platforms for mentions',
			},
			{
				name: 'List Recent',
				value: 'list_recent',
				description: 'List recent research / mention activity for your account. FREE.',
				action: 'List recent mentions',
			},
			{
				name: 'Score Intent',
				value: 'score_intent',
				description: 'STUB v0.1: proxies to scan_for_mentions with intent heuristic. Pending dedicated MCP tool.',
				action: 'Score mention intent',
			},
			{
				name: 'Get by ID',
				value: 'get_by_id',
				description: 'STUB v0.1: pending dedicated MCP tool. Returns a structured "not implemented" payload for v0.1.',
				action: 'Get mention by ID',
			},
		],
		default: 'scan',
	},
];

export const mentionFields: INodeProperties[] = [
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		default: '',
		required: true,
		description: 'Brand, topic, or person to scan for',
		displayOptions: { show: { resource: ['mention'], operation: ['scan', 'score_intent'] } },
	},
	{
		displayName: 'Sources',
		name: 'sources',
		type: 'string',
		default: '',
		description: 'Optional comma-separated source filter (default = all 50+). Examples: reddit,twitter,hackernews,producthunt.',
		displayOptions: { show: { resource: ['mention'], operation: ['scan', 'score_intent'] } },
	},
	{
		displayName: 'Hours Back',
		name: 'hours_back',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 24 },
		default: 24,
		displayOptions: { show: { resource: ['mention'], operation: ['scan', 'score_intent'] } },
	},
	{
		displayName: 'Intent Threshold (Score Intent Only)',
		name: 'intent_threshold',
		type: 'number',
		typeOptions: { minValue: 0, maxValue: 100 },
		default: 60,
		description: 'Mentions scoring at or above this value are flagged as high-intent. Heuristic — not yet a server-side score.',
		displayOptions: { show: { resource: ['mention'], operation: ['score_intent'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 50,
		displayOptions: { show: { resource: ['mention'], operation: ['list_recent'] } },
	},
	{
		displayName: 'Mention ID',
		name: 'mention_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['mention'], operation: ['get_by_id'] } },
	},
];
