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
 * FoxAPIs: Lead Enricher
 *
 * Resolves a name (plus any hint you have — company, domain, LinkedIn, Twitter,
 * title) into a verified contact + identity record via the FoxAPIs enrichment
 * pack, the same multi-source resolver that backs MentionFox person dossiers.
 *
 * Real endpoint used (confirmed live against api.foxapis.com, v1.5 enrichment):
 *   POST /v1/enrich_person
 *     body: { name (required), company?, title?, linkedin_url?, twitter_handle?,
 *             domain?, mode: "light" | "deep" }
 *     auth: Authorization: Bearer fxp_live_…  (foxApisApi credential)
 *
 * Live response shape (verified 2026-06-13):
 *   {
 *     success: true,
 *     profile: {
 *       full_name, title, overall_confidence,
 *       employer: { value, confidence, ... },
 *       linkedin_url, twitter_url, twitter_handle, github_url, instagram_url, ...,
 *       emails: [{ email, verified }],
 *       phones: [{ phone }],
 *       employment_history: [...], education: [...],
 *       identity_verification: { confidence, confidence_score, sources_found, ... },
 *       enriched_at, enrichment_mode, source_count
 *     },
 *     credits_used: 100  // 150 in "deep" mode
 *   }
 *
 * Output shape (always — flattened for "new row → enrich → append"):
 *   {
 *     name, email, title, company, confidence,
 *     emails: [string], phone, links: { linkedin, twitter, github, instagram, ... },
 *     verified: boolean,            // any email marked verified
 *     identity_confidence,          // identity_verification.confidence_score (0-100)
 *     enrichment_mode, credits_used,
 *     found: boolean,               // success && a profile came back
 *     raw                           // verbatim upstream payload — never dropped
 *   }
 *
 * The mapper is defensive: enrich_person is declared untyped in openapi.json and
 * the upstream profile shape evolves, so we read a set of field aliases and always
 * preserve `raw`, mirroring the AI Visibility Monitor node's philosophy.
 */
export class FoxApisLeadEnricher implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoxAPIs: Lead Enricher',
		name: 'foxApisLeadEnricher',
		icon: 'file:icons/foxapis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Enrich: " + $parameter["name"]}}',
		description:
			'Resolve a person (name + any hint) to verified contact info, title, company and social links via the FoxAPIs enrichment pack.',
		defaults: { name: 'Lead Enricher' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'foxApisApi', required: true }],
		properties: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Saul Fleischman',
				description: 'Full name of the person to enrich (the only required input)',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				placeholder: 'MentionFox',
				description: 'Company name hint — disambiguates common names and lifts confidence',
			},
			{
				displayName: 'Company Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'mentionfox.com',
				description: 'Company apex domain — used to pattern-guess and verify work emails',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'Founder & CEO',
				description: 'Job title hint to disambiguate the right person',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				placeholder: 'https://www.linkedin.com/in/…',
				description: 'Known LinkedIn profile URL to anchor the match',
			},
			{
				displayName: 'Twitter / X Handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
				placeholder: '@osakasaul',
				description: 'Known Twitter / X handle to anchor the match',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Light (Contact + Identity)', value: 'light' },
					{ name: 'Deep (Full Behavioral Profile)', value: 'deep' },
				],
				default: 'light',
				description:
					'Light resolves contact + identity (cheaper). Deep adds the full behavioral profile (more FoxAPIs credits).',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const name = (this.getNodeParameter('name', i) as string).trim();
				if (!name) {
					throw new NodeOperationError(this.getNode(), 'Name is required.', { itemIndex: i });
				}

				const body: IDataObject = { name };
				const company = (this.getNodeParameter('company', i, '') as string).trim();
				const domain = (this.getNodeParameter('domain', i, '') as string).trim();
				const title = (this.getNodeParameter('title', i, '') as string).trim();
				const linkedinUrl = (this.getNodeParameter('linkedinUrl', i, '') as string).trim();
				const twitterHandle = (this.getNodeParameter('twitterHandle', i, '') as string).trim();
				const mode = this.getNodeParameter('mode', i, 'light') as string;

				if (company) body.company = company;
				if (domain) body.domain = domain;
				if (title) body.title = title;
				if (linkedinUrl) body.linkedin_url = linkedinUrl;
				if (twitterHandle) body.twitter_handle = twitterHandle;
				body.mode = mode;

				const response = await foxApisRequest.call(this, 'POST', '/v1/enrich_person', body);
				const mapped = mapEnrichment(name, response);
				returnData.push({ json: mapped, pairedItem: { item: i } });
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

function asObject(v: unknown): IDataObject {
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as IDataObject) : {};
}

function asArray(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

function firstDefined(obj: IDataObject, keys: string[]): unknown {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
	}
	return undefined;
}

/**
 * Some upstream fields are either a plain scalar or a {value, confidence}
 * envelope (e.g. `employer`, `title` inside employment_history). Unwrap to scalar.
 */
function unwrapValue(v: unknown): unknown {
	if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as IDataObject)) {
		return (v as IDataObject).value;
	}
	return v;
}

function mapEnrichment(inputName: string, response: IDataObject): IDataObject {
	const success = response.success !== false;
	// The profile may be at `profile`, `person`, `data`, or be the response itself.
	const profile = asObject(firstDefined(response, ['profile', 'person', 'data']) ?? response);

	const emailEntries = asArray(profile.emails).map((e) => asObject(e));
	const emails = emailEntries
		.map((e) => (typeof e.email === 'string' ? (e.email as string) : ''))
		.filter(Boolean);
	const verified = emailEntries.some((e) => e.verified === true);
	const primaryEmail =
		(emailEntries.find((e) => e.verified === true)?.email as string) || emails[0] || null;

	const phoneEntries = asArray(profile.phones).map((p) => asObject(p));
	const phones = phoneEntries
		.map((p) => (typeof p.phone === 'string' ? (p.phone as string) : ''))
		.filter(Boolean);

	const links: IDataObject = {};
	const linkFields: Array<[string, string[]]> = [
		['linkedin', ['linkedin_url']],
		['twitter', ['twitter_url', 'twitter_handle']],
		['github', ['github_url']],
		['instagram', ['instagram_url']],
		['facebook', ['facebook_url']],
		['youtube', ['youtube_url']],
		['crunchbase', ['crunchbase_url']],
		['medium', ['medium_url']],
		['mastodon', ['mastodon_url']],
		['wikipedia', ['wikipedia_url']],
	];
	for (const [key, aliases] of linkFields) {
		const v = firstDefined(profile, aliases);
		if (typeof v === 'string' && v) links[key] = v;
	}

	const company = unwrapValue(firstDefined(profile, ['employer', 'company', 'current_company']));
	const title = unwrapValue(firstDefined(profile, ['title', 'job_title', 'current_title']));
	const confidence = firstDefined(profile, ['overall_confidence', 'confidence']) ?? null;

	const identity = asObject(profile.identity_verification);
	const identityConfidence =
		(firstDefined(identity, ['confidence_score', 'score']) as number | undefined) ?? null;

	const found = success && (emails.length > 0 || Object.keys(links).length > 0 || !!company);

	return {
		name: (firstDefined(profile, ['full_name', 'name']) as string) || inputName,
		email: primaryEmail,
		title: typeof title === 'string' ? title : title ?? null,
		company: typeof company === 'string' ? company : company ?? null,
		confidence,
		emails,
		phone: phones[0] || null,
		phones,
		links,
		verified,
		identity_confidence: identityConfidence,
		enrichment_mode: profile.enrichment_mode ?? null,
		credits_used: response.credits_used ?? null,
		found,
		raw: response,
	};
}
