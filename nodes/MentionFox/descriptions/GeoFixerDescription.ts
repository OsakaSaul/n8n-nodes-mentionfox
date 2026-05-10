import { INodeProperties } from 'n8n-workflow';

/**
 * GEOFixer resource — GEO/AEO visibility scoring across LLMs.
 *
 * MCP tools used:
 *   run_audit        → run_geofixer_audit
 *   get_score        → get_geofixer_score
 *   list_gaps        → get_geofixer_top_actions
 *   autopilot_status → STUB v0.1 — pending MCP tool surface.
 *   autopilot_toggle → STUB v0.1 — pending MCP tool surface.
 */
export const geoFixerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['geoFixer'] } },
		options: [
			{
				name: 'Autopilot Status',
				value: 'autopilot_status',
				description: 'STUB v0.1: pending dedicated MCP tool. Returns "not implemented" structured payload.',
				action: 'Get autopilot status',
			},
			{
				name: 'Autopilot Toggle',
				value: 'autopilot_toggle',
				description: 'STUB v0.1: pending dedicated MCP tool. Returns "not implemented" structured payload.',
				action: 'Toggle GEO autopilot',
			},
			{
				name: 'Get Score',
				value: 'get_score',
				description: 'Get current GEO/AEO visibility score with per-LLM and per-persona breakdown. FREE.',
				action: 'Get GEO score',
			},
			{
				name: 'List Gaps',
				value: 'list_gaps',
				description: 'Get the top N concrete actions to improve GEO/AEO visibility. FREE.',
				action: 'List GEO improvement gaps',
			},
			{
				name: 'Run Audit',
				value: 'run_audit',
				description: 'Trigger a fresh GEO/AEO scan across ChatGPT, Gemini, Claude, Perplexity. FREE for paid GEOFixer subscribers.',
				action: 'Run GEO audit',
			},
		],
		default: 'get_score',
	},
];

export const geoFixerFields: INodeProperties[] = [
	{
		displayName: 'Brand Domain',
		name: 'brand_domain',
		type: 'string',
		default: '',
		required: true,
		description: 'Apex domain of the brand (e.g. "mentionfox.com"). Matched against your clients.',
		displayOptions: {
			show: {
				resource: ['geoFixer'],
				operation: ['run_audit', 'get_score', 'list_gaps', 'autopilot_status', 'autopilot_toggle'],
			},
		},
	},
	{
		displayName: 'Persona ID (Optional)',
		name: 'persona_id',
		type: 'string',
		default: '',
		description: 'Restrict the breakdown to a single persona UUID',
		displayOptions: { show: { resource: ['geoFixer'], operation: ['get_score'] } },
	},
	{
		displayName: 'LLM Filter',
		name: 'llm',
		type: 'options',
		options: [
			{ name: 'All', value: '' },
			{ name: 'ChatGPT', value: 'chatgpt' },
			{ name: 'Claude', value: 'claude' },
			{ name: 'Gemini', value: 'gemini' },
			{ name: 'Perplexity', value: 'perplexity' },
		],
		default: '',
		displayOptions: { show: { resource: ['geoFixer'], operation: ['get_score'] } },
	},
	{
		displayName: 'Top N Actions',
		name: 'n',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 25 },
		default: 5,
		displayOptions: { show: { resource: ['geoFixer'], operation: ['list_gaps'] } },
	},
	{
		displayName: 'Wait for Completion',
		name: 'wait_for_completion',
		type: 'boolean',
		default: false,
		description: 'Whether to poll until scan completes (max 90s) and return new score. Otherwise returns audit_id.',
		displayOptions: { show: { resource: ['geoFixer'], operation: ['run_audit'] } },
	},
	{
		displayName: 'Scan Depth',
		name: 'scan_depth',
		type: 'options',
		options: [
			{ name: 'Light (~10 Prompts × 4 LLMs)', value: 'light' },
			{ name: 'Deep (~30 Prompts × 4 LLMs)', value: 'deep' },
		],
		default: 'light',
		displayOptions: { show: { resource: ['geoFixer'], operation: ['run_audit'] } },
	},
	{
		displayName: 'Enable Autopilot',
		name: 'autopilot_enabled',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['geoFixer'], operation: ['autopilot_toggle'] } },
	},
];
