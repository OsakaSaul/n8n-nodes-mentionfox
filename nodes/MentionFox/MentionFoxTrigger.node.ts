import {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeConnectionType,
} from 'n8n-workflow';

import { mentionFoxMcpCall } from './GenericFunctions';

/**
 * MentionFox Trigger node — 5 polling triggers in one selectable node.
 *
 * Trigger types:
 *   1. on_new_mention                 — scan_for_mentions, dedupe by source_url
 *   2. on_new_high_intent_lead        — proxies to scan_for_mentions + filter
 *                                       (intent threshold heuristic; server-side
 *                                       lead-intent score pending MCP v1.5)
 *   3. on_geo_score_drop              — get_geofixer_score, fires on N-point drop
 *   4. on_new_battlecard_generated    — STUB v0.1 (battlecard MCP tool pending)
 *   5. on_crisis_signal_detected      — scan_for_mentions filtered to crisis
 *                                       keywords; lower default poll interval
 *
 * Cursor / dedupe: each trigger stores its own checkpoint in `staticData`.
 * - mention triggers: Set of seen `source_url` values, capped at 500.
 * - geo score trigger: last observed `overall_score` per brand_domain.
 * - battlecard trigger: last observed timestamp.
 *
 * Stub triggers still poll on schedule and emit a heartbeat payload — wiring
 * downstream nodes works today; the implementation flips on once MCP catches
 * up. This is the same pattern the main MentionFox node uses for stubs.
 */
export class MentionFoxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MentionFox Trigger',
		name: 'mentionFoxTrigger',
		icon: 'file:icons/mentionfox.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerType"]}}',
		description: 'Polls MentionFox for new mentions, high-intent leads, GEO score drops, battlecards, or crisis signals.',
		defaults: { name: 'MentionFox Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [{ name: 'mentionFoxApi', required: true }],
		properties: [
			{
				displayName: 'Trigger Type',
				name: 'triggerType',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'On New Mention', value: 'on_new_mention', description: 'Fires when a new mention matches the scoped query.' },
					{ name: 'On New High-Intent Lead', value: 'on_new_high_intent_lead', description: 'Fires when scan turns up a mention scoring above intent threshold.' },
					{ name: 'On GEO Score Drop', value: 'on_geo_score_drop', description: 'Fires when 7-day rolling GEO score drops by N or more points.' },
					{ name: 'On New Battlecard Generated', value: 'on_new_battlecard_generated', description: 'STUB v0.1 — battlecard MCP tool pending.' },
					{ name: 'On Crisis Signal Detected', value: 'on_crisis_signal_detected', description: 'Fires on crisis-keyword matches in mention scan. Recommended faster poll cadence.' },
				],
				default: 'on_new_mention',
			},
			// Shared scope fields
			{
				displayName: 'Topic / Keyword',
				name: 'topic',
				type: 'string',
				default: '',
				required: true,
				description: 'Brand, topic, or person to monitor.',
				displayOptions: {
					show: { triggerType: ['on_new_mention', 'on_new_high_intent_lead', 'on_crisis_signal_detected'] },
				},
			},
			{
				displayName: 'Sources',
				name: 'sources',
				type: 'string',
				default: '',
				description: 'Optional comma-separated source filter. Examples: reddit,twitter,hackernews.',
				displayOptions: {
					show: { triggerType: ['on_new_mention', 'on_new_high_intent_lead', 'on_crisis_signal_detected'] },
				},
			},
			{
				displayName: 'Hours Back per Poll',
				name: 'hours_back',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 24 },
				default: 1,
				displayOptions: {
					show: { triggerType: ['on_new_mention', 'on_new_high_intent_lead', 'on_crisis_signal_detected'] },
				},
			},
			{
				displayName: 'Intent Threshold (0-100)',
				name: 'intent_threshold',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 60,
				displayOptions: { show: { triggerType: ['on_new_high_intent_lead'] } },
			},
			{
				displayName: 'Brand Domain',
				name: 'brand_domain',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { triggerType: ['on_geo_score_drop', 'on_new_battlecard_generated'] } },
			},
			{
				displayName: 'Drop Threshold (Points)',
				name: 'drop_threshold',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 5,
				displayOptions: { show: { triggerType: ['on_geo_score_drop'] } },
			},
			{
				displayName: 'Crisis Keywords',
				name: 'crisis_keywords',
				type: 'string',
				default: 'lawsuit,outage,breach,scandal,layoff,bankruptcy',
				description: 'Comma-separated keywords. Mentions containing any of these are flagged as crisis signals.',
				displayOptions: { show: { triggerType: ['on_crisis_signal_detected'] } },
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const triggerType = this.getNodeParameter('triggerType') as string;
		const staticData = this.getWorkflowStaticData('node');

		switch (triggerType) {
			case 'on_new_mention':
				return pollNewMention.call(this, staticData);
			case 'on_new_high_intent_lead':
				return pollHighIntentLead.call(this, staticData);
			case 'on_geo_score_drop':
				return pollGeoScoreDrop.call(this, staticData);
			case 'on_new_battlecard_generated':
				return pollBattlecard.call(this, staticData);
			case 'on_crisis_signal_detected':
				return pollCrisisSignal.call(this, staticData);
			default:
				return null;
		}
	}
}

async function pollNewMention(
	this: IPollFunctions,
	staticData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const topic = this.getNodeParameter('topic') as string;
	const sourcesRaw = (this.getNodeParameter('sources', '') as string).trim();
	const hoursBack = this.getNodeParameter('hours_back', 1) as number;
	const args: IDataObject = { topic, hours_back: hoursBack };
	if (sourcesRaw) args.sources = sourcesRaw.split(',').map((s) => s.trim()).filter(Boolean);

	const result = await mentionFoxMcpCall.call(this, 'scan_for_mentions', args);
	const mentions = ((result.mentions as IDataObject[]) || (result.results as IDataObject[]) || []) as IDataObject[];

	const seen = (staticData.seen as string[]) || [];
	const seenSet = new Set(seen);
	const fresh: IDataObject[] = [];
	for (const m of mentions) {
		const key = String(m.source_url || m.url || `${m.source_platform}:${m.found_at}:${(m.content as string || '').slice(0, 60)}`);
		if (!seenSet.has(key)) {
			fresh.push(m);
			seenSet.add(key);
		}
	}
	staticData.seen = Array.from(seenSet).slice(-500); // cap at 500

	if (fresh.length === 0) return null;
	return [fresh.map((m) => ({ json: m }))];
}

async function pollHighIntentLead(
	this: IPollFunctions,
	staticData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const topic = this.getNodeParameter('topic') as string;
	const sourcesRaw = (this.getNodeParameter('sources', '') as string).trim();
	const hoursBack = this.getNodeParameter('hours_back', 1) as number;
	const threshold = this.getNodeParameter('intent_threshold', 60) as number;
	const args: IDataObject = { topic, hours_back: hoursBack };
	if (sourcesRaw) args.sources = sourcesRaw.split(',').map((s) => s.trim()).filter(Boolean);

	const result = await mentionFoxMcpCall.call(this, 'scan_for_mentions', args);
	const mentions = ((result.mentions as IDataObject[]) || (result.results as IDataObject[]) || []) as IDataObject[];

	// Heuristic intent score: presence of buy-intent keywords + sentiment.
	// Server-side scoring lands in MCP v1.5; until then this lives here.
	const buyIntentKeywords = ['looking for', 'recommend', 'best', 'alternative', 'switching from', 'budget', 'price', 'demo', 'trial', 'help me find'];
	const seen = (staticData.seen as string[]) || [];
	const seenSet = new Set(seen);
	const fresh: IDataObject[] = [];

	for (const m of mentions) {
		const content = String(m.content || '').toLowerCase();
		const sentiment = String(m.sentiment || 'neutral');
		const matchScore = buyIntentKeywords.filter((kw) => content.includes(kw)).length * 25;
		const sentimentBoost = sentiment === 'positive' ? 10 : sentiment === 'negative' ? -10 : 0;
		const score = Math.min(100, matchScore + sentimentBoost);
		if (score < threshold) continue;
		const key = String(m.source_url || m.url || `${m.source_platform}:${m.found_at}`);
		if (seenSet.has(key)) continue;
		fresh.push({ ...m, intent_score: score, intent_score_method: 'heuristic_v0_1' });
		seenSet.add(key);
	}
	staticData.seen = Array.from(seenSet).slice(-500);
	if (fresh.length === 0) return null;
	return [fresh.map((m) => ({ json: m }))];
}

async function pollGeoScoreDrop(
	this: IPollFunctions,
	staticData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const brandDomain = this.getNodeParameter('brand_domain') as string;
	const dropThreshold = this.getNodeParameter('drop_threshold', 5) as number;

	const result = await mentionFoxMcpCall.call(this, 'get_geofixer_score', { brand_domain: brandDomain });
	const currentScore = Number(result.overall_score || result.score || 0);

	const lastByBrand = (staticData.last_score_by_brand as Record<string, number>) || {};
	const previous = lastByBrand[brandDomain];
	lastByBrand[brandDomain] = currentScore;
	staticData.last_score_by_brand = lastByBrand;

	if (previous === undefined) return null; // first poll, no comparison yet
	const delta = previous - currentScore;
	if (delta < dropThreshold) return null;

	return [[{
		json: {
			brand_domain: brandDomain,
			previous_score: previous,
			current_score: currentScore,
			drop: delta,
			threshold: dropThreshold,
			full_score_response: result,
			detected_at: new Date().toISOString(),
		},
	}]];
}

async function pollBattlecard(
	this: IPollFunctions,
	staticData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	// Battlecard MCP tool is pending. v0.1 emits one heartbeat on first poll
	// and then returns null forever, so the trigger is wired but quiet. v1.1
	// of this node hooks the real MCP tool in here and keeps the public name.
	if (staticData.heartbeat_emitted) return null;
	staticData.heartbeat_emitted = true;
	const brandDomain = this.getNodeParameter('brand_domain', '') as string;
	return [[{
		json: {
			status: 'stub_pending_mcp_tool',
			tool: 'on_new_battlecard_generated',
			brand_domain: brandDomain,
			heartbeat: true,
			note: 'v0.1 emits a single heartbeat on first poll. Subsequent polls return nothing until the battlecard MCP tool ships in MentionFox v1.5+. After that, this trigger fires once per new battlecard.',
		},
	}]];
}

async function pollCrisisSignal(
	this: IPollFunctions,
	staticData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const topic = this.getNodeParameter('topic') as string;
	const sourcesRaw = (this.getNodeParameter('sources', '') as string).trim();
	const hoursBack = this.getNodeParameter('hours_back', 1) as number;
	const keywordsRaw = this.getNodeParameter('crisis_keywords', '') as string;
	const keywords = keywordsRaw.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);

	const args: IDataObject = { topic, hours_back: hoursBack };
	if (sourcesRaw) args.sources = sourcesRaw.split(',').map((s) => s.trim()).filter(Boolean);

	const result = await mentionFoxMcpCall.call(this, 'scan_for_mentions', args);
	const mentions = ((result.mentions as IDataObject[]) || (result.results as IDataObject[]) || []) as IDataObject[];

	const seen = (staticData.seen as string[]) || [];
	const seenSet = new Set(seen);
	const crisis: IDataObject[] = [];

	for (const m of mentions) {
		const content = String(m.content || '').toLowerCase();
		const matched = keywords.filter((kw) => content.includes(kw));
		if (matched.length === 0) continue;
		const key = String(m.source_url || m.url || `${m.source_platform}:${m.found_at}`);
		if (seenSet.has(key)) continue;
		crisis.push({ ...m, crisis_keywords_matched: matched, urgency: 'high' });
		seenSet.add(key);
	}
	staticData.seen = Array.from(seenSet).slice(-500);
	if (crisis.length === 0) return null;
	return [crisis.map((m) => ({ json: m }))];
}
