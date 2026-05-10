import { INodeProperties } from 'n8n-workflow';

/**
 * Chat resource — FoxChat session bridge.
 *
 * No dedicated MCP tools for FoxChat sessions yet. v0.1 surfaces these as
 * structured stubs returning the FoxChat dashboard pointer. v1.2 lands
 * once FoxChat MCP tools ship (FoxChat is on a separate Supabase project,
 * vidkocepbgjlintvruvq).
 */
export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['chat'] } },
		options: [
			{
				name: 'Start Session',
				value: 'start_session',
				description: 'STUB v0.1: pending FoxChat MCP tools. Returns FoxChat dashboard URL.',
				action: 'Start a chat session',
			},
			{
				name: 'Send Message',
				value: 'send_message',
				description: 'STUB v0.1: pending FoxChat MCP tools.',
				action: 'Send chat message',
			},
			{
				name: 'Get History',
				value: 'get_history',
				description: 'STUB v0.1: pending FoxChat MCP tools.',
				action: 'Get chat history',
			},
			{
				name: 'Export Transcript',
				value: 'export_transcript',
				description: 'STUB v0.1: pending FoxChat MCP tools.',
				action: 'Export transcript',
			},
		],
		default: 'start_session',
	},
];

export const chatFields: INodeProperties[] = [
	{
		displayName: 'Site ID',
		name: 'site_id',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['chat'], operation: ['start_session', 'get_history', 'export_transcript'] } },
	},
	{
		displayName: 'Session ID',
		name: 'session_id',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['chat'], operation: ['send_message', 'get_history', 'export_transcript'] } },
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { resource: ['chat'], operation: ['send_message'] } },
	},
];
