import { INodeProperties } from 'n8n-workflow';

/**
 * Lead resource.
 *
 * MCP tools used:
 *   find_contact      → enrich_person (5cr) — verified contact info.
 *   enrich_person     → enrich_person (5cr) — alias of find_contact for n8n parity.
 *   score_lead        → STUB. No dedicated MCP tool. Proxies to enrich_person
 *                       and surfaces a heuristic intent score in metadata.
 *   push_to_dealflow  → save_to_my_pipeline (FREE).
 */
export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['lead'] } },
		options: [
			{
				name: 'Find Contact',
				value: 'find_contact',
				description: 'Find verified contact info — email, phone, LinkedIn — for a known person. 5 credits.',
				action: 'Find verified contact info',
			},
			{
				name: 'Enrich Person',
				value: 'enrich_person',
				description: 'Alias of find_contact. 5 credits.',
				action: 'Enrich a person',
			},
			{
				name: 'Score Lead',
				value: 'score_lead',
				description: 'STUB v0.1: proxies to enrich_person and surfaces heuristic intent score. Pending dedicated tool.',
				action: 'Score a lead',
			},
			{
				name: 'Push to Dealflow',
				value: 'push_to_dealflow',
				description: 'Save the lead to your MentionFox Dealflow pipeline. FREE.',
				action: 'Push lead to dealflow',
			},
		],
		default: 'find_contact',
	},
];

export const leadFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Natural-language person name. Returns a candidate list (FREE) if 2+ profiles match.',
		displayOptions: {
			show: { resource: ['lead'], operation: ['find_contact', 'enrich_person', 'score_lead'] },
		},
	},
	{
		displayName: 'Person ID (Optional)',
		name: 'person_id',
		type: 'string',
		default: '',
		description: 'UUID lock-in after disambiguation',
		displayOptions: {
			show: { resource: ['lead'], operation: ['find_contact', 'enrich_person', 'score_lead'] },
		},
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Company name or domain — disambiguation hint',
		displayOptions: {
			show: { resource: ['lead'], operation: ['find_contact', 'enrich_person', 'score_lead'] },
		},
	},
	// push_to_dealflow
	{
		displayName: 'Lead Name',
		name: 'lead_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['push_to_dealflow'] } },
	},
	{
		displayName: 'Lead Email',
		name: 'lead_email',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['lead'], operation: ['push_to_dealflow'] } },
	},
	{
		displayName: 'Lead Company',
		name: 'lead_company',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['lead'], operation: ['push_to_dealflow'] } },
	},
	{
		displayName: 'Source Context',
		name: 'source_context',
		type: 'string',
		default: '',
		description: 'Where you found the lead — Reddit thread, LinkedIn post, conference, etc',
		displayOptions: { show: { resource: ['lead'], operation: ['push_to_dealflow'] } },
	},
	{
		displayName: 'Notes',
		name: 'notes',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { resource: ['lead'], operation: ['push_to_dealflow'] } },
	},
];
