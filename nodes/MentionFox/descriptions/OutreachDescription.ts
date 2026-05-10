import { INodeProperties } from 'n8n-workflow';

/**
 * Outreach resource.
 *
 * No dedicated MCP tools yet for outreach. v0.1 surfaces these as
 * structured stubs that return "pending MentionFox MCP tool" plus the
 * existing dashboard URL. v1.1 of this node ships once the MCP outreach
 * tools land in MentionFox.
 *
 * Stubs return shape:
 *   { status: 'stub_pending_mcp_tool', tool: '<name>', dashboard_url: '...', echo: <args> }
 *
 * Why we still ship the operations: workflow templates 3 + 7 reference
 * outreach. Surfacing the operation slot lets users wire workflows now;
 * MentionFox flips real implementations on once tools land — no node
 * version bump needed.
 */
export const outreachOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['outreach'] } },
		options: [
			{
				name: 'Build Sequence',
				value: 'build_sequence',
				description: 'STUB v0.1: pending MCP outreach tools. Returns dashboard URL for now.',
				action: 'Build outreach sequence',
			},
			{
				name: 'Send Sequence',
				value: 'send_sequence',
				description: 'STUB v0.1: pending MCP outreach tools.',
				action: 'Send outreach sequence',
			},
			{
				name: 'Get Sequence Status',
				value: 'get_sequence_status',
				description: 'STUB v0.1: pending MCP outreach tools.',
				action: 'Get sequence status',
			},
			{
				name: 'List Replies',
				value: 'list_replies',
				description: 'STUB v0.1: pending MCP outreach tools.',
				action: 'List sequence replies',
			},
		],
		default: 'build_sequence',
	},
];

export const outreachFields: INodeProperties[] = [
	{
		displayName: 'Recipient Name',
		name: 'recipient_name',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['outreach'], operation: ['build_sequence', 'send_sequence'] } },
	},
	{
		displayName: 'Recipient Email',
		name: 'recipient_email',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['outreach'], operation: ['build_sequence', 'send_sequence'] } },
	},
	{
		displayName: 'Sequence Template',
		name: 'sequence_template',
		type: 'string',
		default: '',
		description: 'Existing sequence template name in your MentionFox account.',
		displayOptions: { show: { resource: ['outreach'], operation: ['build_sequence', 'send_sequence'] } },
	},
	{
		displayName: 'Personalisation Context',
		name: 'context',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Why you are reaching out — Reddit thread URL, mutual contact, conference, etc.',
		displayOptions: { show: { resource: ['outreach'], operation: ['build_sequence'] } },
	},
	{
		displayName: 'Sequence ID',
		name: 'sequence_id',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['outreach'], operation: ['get_sequence_status', 'list_replies'] } },
	},
];
