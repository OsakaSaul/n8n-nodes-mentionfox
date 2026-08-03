import { INodeProperties } from 'n8n-workflow';

/**
 * Report — the two long-form documents, plus the exporter.
 *
 * These already existed inside Subject → Vet Person as a type toggle. They are
 * first-class here because they are what people come for, and a toggle buried
 * in another operation is not how anyone finds a flagship deliverable. The old
 * path still works; nothing was removed.
 */
export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['report'] } },
		options: [
			{
				name: 'Founder Vetting Report',
				value: 'founder_report',
				description:
					'Investment-grade 12-section due-diligence document on a founder — exit history, cap table, burn and runway, reputation',
				action: 'Generate a founder vetting report',
			},
			{
				name: 'Investor Snapshot',
				value: 'investor_report',
				description:
					'One-page founder-side read on a VC or angel — stage fit, trajectory, strengths, risk flags, and pitch or skip',
				action: 'Generate an investor snapshot',
			},
			{
				name: 'Export Report',
				value: 'export_report',
				description: 'Turn cached research into a downloadable HTML, PDF or Markdown file',
				action: 'Export a report',
			},
		],
		default: 'founder_report',
	},
];

export const reportFields: INodeProperties[] = [
	// ── Founder Vetting Report ──
	{
		displayName: 'Founder Name',
		name: 'report_name',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['report'], operation: ['founder_report'] } },
		description: 'Natural-language founder name. Provide either this or a Person ID.',
	},
	{
		displayName: 'Company',
		name: 'report_company',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['report'], operation: ['founder_report'] } },
		description: 'Current or past company — a disambiguation hint when the name is ambiguous',
	},
	// ── Investor Snapshot ──
	{
		displayName: 'Investor Name',
		name: 'report_investor_name',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['report'], operation: ['investor_report'] } },
		description: 'Natural-language investor name. Provide either this or a Person ID.',
	},
	{
		displayName: 'Firm',
		name: 'report_firm',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['report'], operation: ['investor_report'] } },
		description: 'Firm name — a disambiguation hint when the name is ambiguous',
	},
	// ── Shared by both reports ──
	{
		displayName: 'Person ID',
		name: 'report_person_id',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['report'], operation: ['founder_report', 'investor_report'] } },
		description: 'UUID lock-in after disambiguation. Provide either this or a name.',
	},
	// ── Export ──
	{
		displayName: 'Report Type',
		name: 'export_report_type',
		type: 'options',
		options: [
			{ name: 'Candidate Eval', value: 'candidate-eval' },
			{ name: 'Compare', value: 'compare' },
			{ name: 'Dossier', value: 'dossier' },
			{ name: 'Influencer Eval', value: 'influencer-eval' },
			{ name: 'Outfoxer', value: 'outfoxer' },
		],
		default: 'dossier',
		required: true,
		displayOptions: { show: { resource: ['report'], operation: ['export_report'] } },
		description: 'Which kind of cached research to render',
	},
	{
		displayName: 'Report ID',
		name: 'export_report_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['report'], operation: ['export_report'] } },
		description:
			'For a dossier: the person profile ID. For a comparison: comma-separated names. Otherwise the report row ID.',
	},
	{
		displayName: 'Format',
		name: 'export_format',
		type: 'options',
		options: [
			{ name: 'HTML', value: 'html' },
			{ name: 'Markdown', value: 'markdown' },
			{ name: 'PDF', value: 'pdf' },
		],
		default: 'pdf',
		displayOptions: { show: { resource: ['report'], operation: ['export_report'] } },
		description: 'PDF opens a print dialog for one-click save; HTML is a styled page; Markdown is plain text',
	},
];
