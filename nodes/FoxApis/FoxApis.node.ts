import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { foxApisRequest } from './GenericFunctions';

/**
 * FoxAPIs: AI Visibility Monitor
 *
 * Calls the FoxAPIs GEO pack (https://api.foxapis.com/v1/geo/*) — the same
 * multi-LLM AI-visibility engine that backs MentionFox GEOFixer — and folds the
 * results into a single normalized scorecard tuned for n8n triggers.
 *
 * Real endpoints used (confirmed live against api.foxapis.com, v1.4.0):
 *   POST /v1/geo/check           { domain }                       — overall recommend / per-LLM
 *   POST /v1/geo/share-of-voice  { domain, competitors[] }        — competitive standing
 *   POST /v1/geo/gaps            { domain }                       — prompts the brand is missing from
 *   POST /v1/geo/citation-rate   { domain }                       — per-LLM citation frequency
 *
 * Output shape (always):
 *   {
 *     brand, checked_at,
 *     overall: { recommended_anywhere, recommended_count, llm_count, share_of_voice_pct },
 *     per_llm: { <llm>: { recommended, rank, competitor_comparison } },
 *     slipped:   boolean,   // brand recommended by NO measured LLM  → fire alert
 *     overtaken: boolean,   // a competitor outranks the brand somewhere → fire alert
 *     gaps, citation_rate,  // included when requested
 *     raw: { check, share_of_voice, gaps, citation_rate }   // verbatim upstream payloads
 *   }
 *
 * The normalizer is defensive: the upstream geo-quick-check payload has evolved,
 * so we read a set of plausible field aliases and always preserve `raw` so no
 * data is lost if the upstream shape shifts.
 */
export class FoxApis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoxAPIs: AI Visibility Monitor',
		name: 'foxApis',
		icon: 'file:icons/foxapis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{"AI visibility: " + $parameter["brand"]}}',
		description:
			'Check whether ChatGPT, Perplexity, Gemini and Grok recommend your brand vs competitors, via the FoxAPIs GEO pack.',
		defaults: { name: 'AI Visibility Monitor' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'foxApisApi', required: true }],
		properties: [
			{
				displayName: 'Brand Domain',
				name: 'brand',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'mentionfox.com',
				description: 'Apex domain of the brand to measure (e.g. "mentionfox.com")',
			},
			{
				displayName: 'Competitors',
				name: 'competitors',
				type: 'string',
				default: '',
				placeholder: 'brand24.com, mention.com, brandwatch.com',
				description:
					'Comma-separated competitor domains. When set, the node also runs share-of-voice and sets the "overtaken" flag.',
			},
			{
				displayName: 'Prompts (Optional)',
				name: 'prompts',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'best social listening tool\nalternatives to brandwatch',
				description:
					'Optional newline- or comma-separated buyer prompts to bias the scan. Passed through to FoxAPIs as "prompts"; the GEO engine uses its own prompt set when omitted.',
			},
			{
				displayName: 'LLM Set',
				name: 'llms',
				type: 'multiOptions',
				options: [
					{ name: 'ChatGPT', value: 'chatgpt' },
					{ name: 'Perplexity', value: 'perplexity' },
					{ name: 'Gemini', value: 'gemini' },
					{ name: 'Grok', value: 'grok' },
				],
				default: ['chatgpt', 'perplexity', 'gemini', 'grok'],
				description:
					'Which LLMs to report on. Filters the per-LLM breakdown the GEO engine returns; an empty selection reports all measured LLMs.',
			},
			{
				displayName: 'Include Gaps',
				name: 'includeGaps',
				type: 'boolean',
				default: false,
				description: 'Whether to also fetch the buyer prompts the brand is missing from (extra FoxAPIs credits)',
			},
			{
				displayName: 'Include Citation Rate',
				name: 'includeCitationRate',
				type: 'boolean',
				default: false,
				description: 'Whether to also fetch per-LLM citation frequency (extra FoxAPIs credits)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const brand = (this.getNodeParameter('brand', i) as string).trim();
				if (!brand) {
					throw new NodeOperationError(this.getNode(), 'Brand Domain is required.', {
						itemIndex: i,
					});
				}
				const competitors = splitList(this.getNodeParameter('competitors', i, '') as string);
				const prompts = splitList(this.getNodeParameter('prompts', i, '') as string);
				const llms = (this.getNodeParameter('llms', i, []) as string[]) || [];
				const includeGaps = this.getNodeParameter('includeGaps', i, false) as boolean;
				const includeCitationRate = this.getNodeParameter(
					'includeCitationRate',
					i,
					false,
				) as boolean;

				const checkBody: IDataObject = { domain: brand };
				if (prompts.length) checkBody.prompts = prompts;
				const check = await foxApisRequest.call(this, 'POST', '/v1/geo/check', checkBody);

				let shareOfVoice: IDataObject | undefined;
				if (competitors.length) {
					const sovBody: IDataObject = { domain: brand, competitors };
					if (prompts.length) sovBody.prompts = prompts;
					shareOfVoice = await foxApisRequest.call(
						this,
						'POST',
						'/v1/geo/share-of-voice',
						sovBody,
					);
				}

				let gaps: IDataObject | undefined;
				if (includeGaps) {
					gaps = await foxApisRequest.call(this, 'POST', '/v1/geo/gaps', { domain: brand });
				}

				let citationRate: IDataObject | undefined;
				if (includeCitationRate) {
					citationRate = await foxApisRequest.call(this, 'POST', '/v1/geo/citation-rate', {
						domain: brand,
					});
				}

				const scorecard = buildScorecard(
					brand,
					llms,
					check,
					shareOfVoice,
					gaps,
					citationRate,
				);
				returnData.push({ json: scorecard, pairedItem: { item: i } });
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

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function splitList(raw: string): string[] {
	return (raw || '')
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function asObject(v: unknown): IDataObject {
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as IDataObject) : {};
}

function firstDefined(obj: IDataObject, keys: string[]): unknown {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null) return obj[k];
	}
	return undefined;
}

function toBool(v: unknown): boolean | undefined {
	if (typeof v === 'boolean') return v;
	if (typeof v === 'string') {
		const s = v.toLowerCase();
		if (['yes', 'true', 'recommended', 'present', 'cited'].includes(s)) return true;
		if (['no', 'false', 'absent', 'missing', 'not_recommended'].includes(s)) return false;
	}
	if (typeof v === 'number') return v > 0;
	return undefined;
}

function toRank(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string') {
		const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

/**
 * Find the per-LLM breakdown inside a geo-check payload regardless of whether
 * the upstream nests it under `per_llm`, `llms`, `models`, `results`, or returns
 * a top-level map keyed by LLM name.
 */
function extractPerLlm(check: IDataObject): IDataObject {
	const candidate = firstDefined(check, ['per_llm', 'llms', 'models', 'results', 'breakdown']);
	const map = asObject(candidate);
	if (Object.keys(map).length) return map;
	// Fallback: scan top-level keys that look like LLM names.
	const known = ['chatgpt', 'gpt', 'openai', 'perplexity', 'gemini', 'google', 'grok', 'claude', 'deepseek', 'mistral'];
	const out: IDataObject = {};
	for (const k of Object.keys(check)) {
		if (known.some((n) => k.toLowerCase().includes(n))) out[k] = check[k];
	}
	return out;
}

function buildScorecard(
	brand: string,
	llmFilter: string[],
	check: IDataObject,
	shareOfVoice: IDataObject | undefined,
	gaps: IDataObject | undefined,
	citationRate: IDataObject | undefined,
): IDataObject {
	const perLlmRaw = extractPerLlm(check);
	const perLlm: IDataObject = {};
	let recommendedCount = 0;
	let llmCount = 0;
	let anyOvertaken = false;

	const wanted = (name: string) =>
		llmFilter.length === 0 ||
		llmFilter.some((f) => name.toLowerCase().includes(f) || f.includes(name.toLowerCase()));

	for (const name of Object.keys(perLlmRaw)) {
		if (!wanted(name)) continue;
		const entry = asObject(perLlmRaw[name]);
		const recommended = toBool(
			firstDefined(entry, ['recommended', 'present', 'cited', 'mentioned', 'recommends']),
		);
		const rank = toRank(firstDefined(entry, ['rank', 'position', 'placement']));
		const competitorComparison =
			firstDefined(entry, ['competitor_comparison', 'competitors', 'beaten_by', 'outranked_by']) ?? null;

		if (Array.isArray(competitorComparison) && competitorComparison.length > 0) {
			anyOvertaken = true;
		}

		llmCount += 1;
		if (recommended === true) recommendedCount += 1;

		perLlm[name] = {
			recommended: recommended ?? null,
			rank,
			competitor_comparison: competitorComparison,
		};
	}

	// Share-of-voice: pull a brand percentage + detect any competitor leading.
	const sov = asObject(shareOfVoice);
	const sovPct = toRank(
		firstDefined(sov, ['share_of_voice', 'share_of_voice_pct', 'brand_share', 'sov', 'sov_pct']),
	);
	const sovBrandShare =
		typeof sovPct === 'number' ? sovPct : null;
	const leader = firstDefined(sov, ['leader', 'top_brand', 'winner']);
	if (typeof leader === 'string' && leader && !leader.toLowerCase().includes(brand.toLowerCase())) {
		anyOvertaken = true;
	}

	const recommendedAnywhere = recommendedCount > 0;
	// "slipped" = measured at least one LLM but recommended by none.
	const slipped = llmCount > 0 && recommendedCount === 0;

	const result: IDataObject = {
		brand,
		checked_at: new Date().toISOString(),
		overall: {
			recommended_anywhere: recommendedAnywhere,
			recommended_count: recommendedCount,
			llm_count: llmCount,
			share_of_voice_pct: sovBrandShare,
		},
		per_llm: perLlm,
		slipped,
		overtaken: anyOvertaken,
		raw: {
			check,
			...(shareOfVoice ? { share_of_voice: shareOfVoice } : {}),
			...(gaps ? { gaps } : {}),
			...(citationRate ? { citation_rate: citationRate } : {}),
		},
	};

	if (gaps) result.gaps = firstDefined(asObject(gaps), ['gaps', 'missing_prompts', 'queries']) ?? gaps;
	if (citationRate)
		result.citation_rate =
			firstDefined(asObject(citationRate), ['citation_rate', 'rates', 'per_llm']) ?? citationRate;

	return result;
}
