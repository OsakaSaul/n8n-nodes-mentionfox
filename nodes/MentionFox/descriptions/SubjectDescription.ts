import { INodeProperties } from 'n8n-workflow';

/**
 * Subject resource — vetting, dossiers, comparisons, influencer evaluation.
 *
 * MCP tools used:
 *   vet_person      → get_entrepreneur_report (founder vetting, 200cr) +
 *                     get_investor_report (investor vetting, 30cr).
 *                     Operation parameter `subject_type` picks which.
 *   compare_subjects → compare_people (15cr typical for 3-way).
 *   get_dossier     → get_dossier (30cr cold / FREE on cache hit).
 *   evaluate_influencer → STUB. No dedicated MCP tool yet — falls through
 *                         to get_dossier with a recommendation tag in the
 *                         output so downstream nodes know it's a proxy.
 *                         Pending dedicated tool in MentionFox MCP v1.5.
 */
export const subjectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['subject'] } },
		options: [
			{
				name: 'Vet Person',
				value: 'vet_person',
				description:
					'Generate a single-page founder or investor vetting report. Charges 30 (investor) or 200 (founder) credits when a report returns; ambiguous names return a candidate list for free.',
				action: 'Vet a founder or investor',
			},
			{
				name: 'Compare Subjects',
				value: 'compare_subjects',
				description:
					'Side-by-side comparison of 2-5 people across 23 dimensions. 5 credits per cached profile, free if fewer than 2 cached.',
				action: 'Compare 2 to 5 subjects',
			},
			{
				name: 'Get Dossier',
				value: 'get_dossier',
				description:
					'Full multi-section dossier — 60+ sections of intel. 30 credits cold, FREE on cache hit.',
				action: 'Get full dossier on a subject',
			},
			{
				name: 'Evaluate Influencer',
				value: 'evaluate_influencer',
				description:
					'STUB v0.1: proxies to get_dossier with influencer-fit annotation. Dedicated influencer-eval tool pending MentionFox MCP v1.5.',
				action: 'Evaluate influencer fit',
			},
		],
		default: 'get_dossier',
	},
];

const fieldName: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	required: true,
	description: 'Natural-language person name. The tool returns a candidate list (FREE) if 2+ profiles match.',
};

const fieldPersonId: INodeProperties = {
	displayName: 'Person ID (Optional)',
	name: 'person_id',
	type: 'string',
	default: '',
	description: 'UUID lock-in after disambiguation. Use this once you know which candidate you want.',
};

export const subjectFields: INodeProperties[] = [
	// vet_person
	{
		displayName: 'Subject Type',
		name: 'subject_type',
		type: 'options',
		options: [
			{ name: 'Founder / Entrepreneur', value: 'founder' },
			{ name: 'Investor / VC / Angel', value: 'investor' },
		],
		default: 'founder',
		description:
			'Founder = 12-section due diligence report (200cr). Investor = single-page snapshot (30cr).',
		displayOptions: { show: { resource: ['subject'], operation: ['vet_person'] } },
	},
	{ ...fieldName, displayOptions: { show: { resource: ['subject'], operation: ['vet_person'] } } },
	{
		...fieldPersonId,
		displayOptions: { show: { resource: ['subject'], operation: ['vet_person'] } },
	},
	{
		displayName: 'Company / Firm Hint',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Disambiguation hint when name is ambiguous.',
		displayOptions: { show: { resource: ['subject'], operation: ['vet_person'] } },
	},

	// get_dossier
	{ ...fieldName, displayOptions: { show: { resource: ['subject'], operation: ['get_dossier'] } } },
	{
		...fieldPersonId,
		displayOptions: { show: { resource: ['subject'], operation: ['get_dossier'] } },
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'Summary (Most Actionable)', value: 'summary' },
			{ name: 'Full (Every Populated Section)', value: 'full' },
		],
		default: 'summary',
		displayOptions: { show: { resource: ['subject'], operation: ['get_dossier'] } },
	},
	{
		displayName: 'Force Refresh',
		name: 'refresh',
		type: 'boolean',
		default: false,
		description: 'Whether to force a fresh enrichment instead of reading cache (charges 30cr).',
		displayOptions: { show: { resource: ['subject'], operation: ['get_dossier'] } },
	},

	// compare_subjects
	{
		displayName: 'People to Compare',
		name: 'people',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, minValue: 2, maxValue: 5 },
		default: { values: [{ name: '' }, { name: '' }] },
		description: 'Provide 2 to 5 people. Each may use either a name or a person_id UUID.',
		options: [
			{
				name: 'values',
				displayName: 'Person',
				values: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Person ID', name: 'person_id', type: 'string', default: '' },
				],
			},
		],
		displayOptions: { show: { resource: ['subject'], operation: ['compare_subjects'] } },
	},
	{
		displayName: 'Comparison Context',
		name: 'context',
		type: 'string',
		default: '',
		description: 'Optional context shaping the comparison framing (e.g. "investment targets", "speaker candidates").',
		displayOptions: { show: { resource: ['subject'], operation: ['compare_subjects'] } },
	},

	// evaluate_influencer (stub)
	{
		...fieldName,
		displayOptions: { show: { resource: ['subject'], operation: ['evaluate_influencer'] } },
	},
	{
		displayName: 'Brand / Topic Context',
		name: 'brand_context',
		type: 'string',
		default: '',
		description: 'The brand or topic you are evaluating fit for. Passed through as an evaluation hint.',
		displayOptions: { show: { resource: ['subject'], operation: ['evaluate_influencer'] } },
	},
];
