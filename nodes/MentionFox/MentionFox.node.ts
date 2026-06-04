import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { mentionFoxMcpCall } from './GenericFunctions';

import {
	subjectOperations,
	subjectFields,
} from './descriptions/SubjectDescription';
import { mentionOperations, mentionFields } from './descriptions/MentionDescription';
import { leadOperations, leadFields } from './descriptions/LeadDescription';
import { geoFixerOperations, geoFixerFields } from './descriptions/GeoFixerDescription';
import { outreachOperations, outreachFields } from './descriptions/OutreachDescription';
import { chatOperations, chatFields } from './descriptions/ChatDescription';
import { denOperations, denFields } from './descriptions/DenDescription';
import { clientOperations, clientFields } from './descriptions/ClientDescription';

/**
 * Programmatic-style n8n node for MentionFox + FoxAPIs.
 *
 * Resources × Operations: 8 × ~4 = 30+ operations.
 * All operations transit the MentionFox MCP server at https://mentionfox.com/mcp
 * via JSON-RPC 2.0 `tools/call`. Operations whose MCP tool is not yet shipped
 * fall through as structured stubs (status: 'stub_pending_mcp_tool') so workflow
 * authors can wire them now and the implementation flips on once tools land.
 *
 * Stub strategy: rather than hide unimplemented surface, we surface it with
 * a clear flag in the output. n8n workflow templates 3 + 7 reference stub
 * operations — the templates work today against the stub responses (echoing
 * arguments + dashboard URLs), and improve transparently when MCP catches up.
 */
export class MentionFox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MentionFox',
		name: 'mentionFox',
		icon: 'file:icons/mentionfox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'OSINT, dossiers, mention scanning, lead enrichment, GEOFixer scoring, and pipeline watch via MentionFox.',
		defaults: { name: 'MentionFox' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'mentionFoxApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Chat', value: 'chat', description: 'FoxChat sessions (stubs in v0.1)' },
					{ name: 'Client', value: 'client', description: 'Agency client management' },
					{ name: 'Den', value: 'den', description: 'FoxDen widgets + tasks (stubs in v0.1)' },
					{ name: 'GEOFixer', value: 'geoFixer', description: 'GEO/AEO scoring + audit + gaps' },
					{ name: 'Lead', value: 'lead', description: 'Find / enrich / score / push to dealflow' },
					{ name: 'Mention', value: 'mention', description: 'Scan platforms, list recent, score intent' },
					{ name: 'Outreach', value: 'outreach', description: 'Sequences (stubs in v0.1)' },
					{ name: 'Subject', value: 'subject', description: 'Vetting, dossiers, comparisons, influencer eval' },
				],
				default: 'subject',
			},
			...subjectOperations,
			...subjectFields,
			...mentionOperations,
			...mentionFields,
			...leadOperations,
			...leadFields,
			...geoFixerOperations,
			...geoFixerFields,
			...outreachOperations,
			...outreachFields,
			...chatOperations,
			...chatFields,
			...denOperations,
			...denFields,
			...clientOperations,
			...clientFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				const responseData = await dispatch.call(this, resource, operation, i);
				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// Stub helper — used for every operation whose MCP tool is pending. Returns
// a structured response so downstream nodes can branch on `status`.
function stubResponse(tool: string, args: IDataObject, dashboardUrl: string): IDataObject {
	return {
		status: 'stub_pending_mcp_tool',
		tool,
		dashboard_url: dashboardUrl,
		echo: args,
		message: `Operation "${tool}" surfaces in the MentionFox dashboard today; a dedicated MCP tool is on the roadmap. v0.1 of this n8n node returns the dashboard URL plus your input arguments unchanged so you can wire the workflow now and have it light up automatically once the MCP tool ships.`,
	};
}

async function dispatch(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject> {
	switch (resource) {
		case 'subject':
			return runSubject.call(this, operation, i);
		case 'mention':
			return runMention.call(this, operation, i);
		case 'lead':
			return runLead.call(this, operation, i);
		case 'geoFixer':
			return runGeoFixer.call(this, operation, i);
		case 'outreach':
			return runOutreach.call(this, operation, i);
		case 'chat':
			return runChat.call(this, operation, i);
		case 'den':
			return runDen.call(this, operation, i);
		case 'client':
			return runClient.call(this, operation, i);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
	}
}

// ──────────────────────────────────────────────────────────────────────
// Subject
// ──────────────────────────────────────────────────────────────────────
async function runSubject(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	if (op === 'vet_person') {
		const subjectType = this.getNodeParameter('subject_type', i) as string;
		const args = pickPersonArgs.call(this, i, ['name', 'person_id', 'company']);
		const tool = subjectType === 'investor' ? 'get_investor_report' : 'get_entrepreneur_report';
		return mentionFoxMcpCall.call(this, tool, args);
	}
	if (op === 'get_dossier') {
		const args: IDataObject = pickPersonArgs.call(this, i, ['name', 'person_id']);
		const refresh = this.getNodeParameter('refresh', i, false) as boolean;
		const format = this.getNodeParameter('format', i, 'summary') as string;
		if (refresh) args.refresh = true;
		if (format) args.format = format;
		return mentionFoxMcpCall.call(this, 'get_dossier', args);
	}
	if (op === 'compare_subjects') {
		const peopleParam = this.getNodeParameter('people', i, { values: [] }) as IDataObject;
		const peopleVals = ((peopleParam.values as IDataObject[]) || [])
			.map((p) => {
				const obj: IDataObject = {};
				if (p.name) obj.name = p.name;
				if (p.person_id) obj.person_id = p.person_id;
				return obj;
			})
			.filter((p) => p.name || p.person_id);
		const context = this.getNodeParameter('context', i, '') as string;
		const args: IDataObject = { people: peopleVals };
		if (context) args.context = context;
		return mentionFoxMcpCall.call(this, 'compare_people', args);
	}
	if (op === 'evaluate_influencer') {
		// Stub: proxies to get_dossier. Annotate output so downstream can branch.
		const args = pickPersonArgs.call(this, i, ['name']);
		const brandContext = this.getNodeParameter('brand_context', i, '') as string;
		const dossier = await mentionFoxMcpCall.call(this, 'get_dossier', { ...args, format: 'summary' });
		return {
			status: 'stub_proxied_to_get_dossier',
			tool: 'evaluate_influencer',
			brand_context: brandContext,
			dossier,
			note: 'v0.1 proxies to get_dossier. Influencer-fit scoring tool slated for MentionFox MCP v1.5.',
		};
	}
	throw new NodeOperationError(this.getNode(), `Unknown subject operation: ${op}`, { itemIndex: i });
}

// ──────────────────────────────────────────────────────────────────────
// Mention
// ──────────────────────────────────────────────────────────────────────
async function runMention(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	if (op === 'scan') {
		const topic = this.getNodeParameter('topic', i) as string;
		const sourcesRaw = (this.getNodeParameter('sources', i, '') as string).trim();
		const hoursBack = this.getNodeParameter('hours_back', i, 24) as number;
		const args: IDataObject = { topic, hours_back: hoursBack };
		if (sourcesRaw) args.sources = sourcesRaw.split(',').map((s) => s.trim()).filter(Boolean);
		return mentionFoxMcpCall.call(this, 'scan_for_mentions', args);
	}
	if (op === 'list_recent') {
		const limit = this.getNodeParameter('limit', i, 10) as number;
		return mentionFoxMcpCall.call(this, 'get_my_recent_research', { limit });
	}
	if (op === 'score_intent') {
		const topic = this.getNodeParameter('topic', i) as string;
		const intentThreshold = this.getNodeParameter('intent_threshold', i, 60) as number;
		const sourcesRaw = (this.getNodeParameter('sources', i, '') as string).trim();
		const hoursBack = this.getNodeParameter('hours_back', i, 24) as number;
		const args: IDataObject = { topic, hours_back: hoursBack };
		if (sourcesRaw) args.sources = sourcesRaw.split(',').map((s) => s.trim()).filter(Boolean);
		const scan = await mentionFoxMcpCall.call(this, 'scan_for_mentions', args);
		return {
			status: 'stub_proxied_to_scan_for_mentions',
			tool: 'score_intent',
			intent_threshold: intentThreshold,
			scan,
			note: 'v0.1 proxies to scan_for_mentions. Server-side intent scoring tool slated for MentionFox MCP v1.5; downstream nodes should compute heuristic scores from sentiment + keywords for now.',
		};
	}
	if (op === 'get_by_id') {
		const mentionId = this.getNodeParameter('mention_id', i) as string;
		return stubResponse('mention.get_by_id', { mention_id: mentionId }, 'https://mentionfox.com/dashboard/mentions');
	}
	throw new NodeOperationError(this.getNode(), `Unknown mention operation: ${op}`, { itemIndex: i });
}

// ──────────────────────────────────────────────────────────────────────
// Lead
// ──────────────────────────────────────────────────────────────────────
async function runLead(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	if (op === 'find_contact' || op === 'enrich_person') {
		const args = pickPersonArgs.call(this, i, ['name', 'person_id', 'company']);
		return mentionFoxMcpCall.call(this, 'enrich_person', args);
	}
	if (op === 'score_lead') {
		const args = pickPersonArgs.call(this, i, ['name', 'person_id', 'company']);
		const enrichment = await mentionFoxMcpCall.call(this, 'enrich_person', args);
		return {
			status: 'stub_proxied_to_enrich_person',
			tool: 'score_lead',
			enrichment,
			note: 'v0.1 proxies to enrich_person. Server-side intent / lead scoring tool slated for MentionFox MCP v1.5.',
		};
	}
	if (op === 'push_to_dealflow') {
		const lead_data: IDataObject = {
			name: this.getNodeParameter('lead_name', i) as string,
		};
		const email = this.getNodeParameter('lead_email', i, '') as string;
		const company = this.getNodeParameter('lead_company', i, '') as string;
		const sourceContext = this.getNodeParameter('source_context', i, '') as string;
		const notes = this.getNodeParameter('notes', i, '') as string;
		if (email) lead_data.email = email;
		if (company) lead_data.company = company;
		if (sourceContext) lead_data.source_context = sourceContext;
		const args: IDataObject = { lead_data };
		if (notes) args.notes = notes;
		return mentionFoxMcpCall.call(this, 'save_to_my_pipeline', args);
	}
	throw new NodeOperationError(this.getNode(), `Unknown lead operation: ${op}`, { itemIndex: i });
}

// ──────────────────────────────────────────────────────────────────────
// GEOFixer
// ──────────────────────────────────────────────────────────────────────
async function runGeoFixer(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	const brandDomain = this.getNodeParameter('brand_domain', i) as string;
	if (op === 'run_audit') {
		const wait = this.getNodeParameter('wait_for_completion', i, false) as boolean;
		const depth = this.getNodeParameter('scan_depth', i, 'light') as string;
		return mentionFoxMcpCall.call(this, 'run_geofixer_audit', {
			brand_domain: brandDomain,
			wait_for_completion: wait,
			scan_depth: depth,
		});
	}
	if (op === 'get_score') {
		const args: IDataObject = { brand_domain: brandDomain };
		const personaId = this.getNodeParameter('persona_id', i, '') as string;
		const llm = this.getNodeParameter('llm', i, '') as string;
		if (personaId) args.persona_id = personaId;
		if (llm) args.llm = llm;
		return mentionFoxMcpCall.call(this, 'get_geofixer_score', args);
	}
	if (op === 'list_gaps') {
		const n = this.getNodeParameter('n', i, 5) as number;
		return mentionFoxMcpCall.call(this, 'get_geofixer_top_actions', { brand_domain: brandDomain, n });
	}
	if (op === 'autopilot_status') {
		return stubResponse('geoFixer.autopilot_status', { brand_domain: brandDomain }, `https://mentionfox.com/dashboard/geofixer?brand=${encodeURIComponent(brandDomain)}`);
	}
	if (op === 'autopilot_toggle') {
		const enabled = this.getNodeParameter('autopilot_enabled', i, false) as boolean;
		return stubResponse('geoFixer.autopilot_toggle', { brand_domain: brandDomain, autopilot_enabled: enabled }, `https://mentionfox.com/dashboard/geofixer?brand=${encodeURIComponent(brandDomain)}`);
	}
	throw new NodeOperationError(this.getNode(), `Unknown geoFixer operation: ${op}`, { itemIndex: i });
}

// ──────────────────────────────────────────────────────────────────────
// Outreach (stubs in v0.1)
// ──────────────────────────────────────────────────────────────────────
async function runOutreach(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	const args: IDataObject = {};
	if (op === 'build_sequence' || op === 'send_sequence') {
		args.recipient_name = this.getNodeParameter('recipient_name', i, '') as string;
		args.recipient_email = this.getNodeParameter('recipient_email', i, '') as string;
		args.sequence_template = this.getNodeParameter('sequence_template', i, '') as string;
		if (op === 'build_sequence') args.context = this.getNodeParameter('context', i, '') as string;
	} else {
		args.sequence_id = this.getNodeParameter('sequence_id', i, '') as string;
	}
	return stubResponse(`outreach.${op}`, args, 'https://mentionfox.com/dashboard/outreach');
}

// ──────────────────────────────────────────────────────────────────────
// Chat (stubs)
// ──────────────────────────────────────────────────────────────────────
async function runChat(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	const args: IDataObject = {};
	if (op === 'start_session' || op === 'get_history' || op === 'export_transcript') {
		args.site_id = this.getNodeParameter('site_id', i, '') as string;
	}
	if (op === 'send_message' || op === 'get_history' || op === 'export_transcript') {
		args.session_id = this.getNodeParameter('session_id', i, '') as string;
	}
	if (op === 'send_message') {
		args.message = this.getNodeParameter('message', i, '') as string;
	}
	return stubResponse(`chat.${op}`, args, 'https://getfoxchat.com/dashboard');
}

// ──────────────────────────────────────────────────────────────────────
// Den (stubs)
// ──────────────────────────────────────────────────────────────────────
async function runDen(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	const args: IDataObject = {};
	if (op !== 'list_dens') {
		args.persona = this.getNodeParameter('persona', i, '') as string;
	}
	if (op === 'get_den_widget_data') {
		args.widget_slug = this.getNodeParameter('widget_slug', i, '') as string;
	}
	if (op === 'create_den_task') {
		args.task_title = this.getNodeParameter('task_title', i, '') as string;
		args.task_body = this.getNodeParameter('task_body', i, '') as string;
		args.source_url = this.getNodeParameter('source_url', i, '') as string;
	}
	return stubResponse(`den.${op}`, args, 'https://mentionfox.com/dashboard/my-den');
}

// ──────────────────────────────────────────────────────────────────────
// Client
// ──────────────────────────────────────────────────────────────────────
async function runClient(this: IExecuteFunctions, op: string, i: number): Promise<IDataObject> {
	if (op === 'get_client_geo_score') {
		const brandDomain = this.getNodeParameter('client_domain', i) as string;
		return mentionFoxMcpCall.call(this, 'get_geofixer_score', { brand_domain: brandDomain });
	}
	const args: IDataObject = {};
	if (op === 'create_client') {
		args.client_name = this.getNodeParameter('client_name', i) as string;
		args.client_domain = this.getNodeParameter('client_domain', i) as string;
	}
	if (op === 'list_client_battlecards') {
		args.client_domain = this.getNodeParameter('client_domain', i, '') as string;
	}
	return stubResponse(`client.${op}`, args, 'https://mentionfox.com/dashboard/clients');
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
function pickPersonArgs(this: IExecuteFunctions, i: number, fields: string[]): IDataObject {
	const out: IDataObject = {};
	for (const f of fields) {
		const v = this.getNodeParameter(f, i, '') as string;
		if (v && v.trim()) out[f] = v.trim();
	}
	if (!out.name && !out.person_id) {
		throw new NodeOperationError(this.getNode(), 'Provide either a Name or a Person ID.', { itemIndex: i });
	}
	return out;
}
