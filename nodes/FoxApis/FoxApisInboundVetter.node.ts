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
 * FoxAPIs: Inbound Vetter
 *
 * Vet an inbound lead / applicant / cold reply BEFORE you respond. An inbound
 * arrives (form submission, inbound email, calendar booking) and this node turns
 * the few fields you have — email | domain | name (+optional company) — into a
 * one-shot vetting summary so a human (or an agent) can decide whether to engage.
 *
 * Two real FoxAPIs legs are combined (both confirmed live against
 * api.foxapis.com, openapi.json):
 *
 *   PERSON leg — POST /v1/enrich_person   (reuses the Lead Enricher mapping)
 *     body: { name (required), company?, title?, linkedin_url?, twitter_handle?,
 *             domain?, mode: "light" | "deep" }
 *     -> { success, profile: { full_name, title, overall_confidence, employer,
 *          emails:[{email,verified}], phones, employment_history, education,
 *          identity_verification: { confidence_score, ... }, ... }, credits_used }
 *
 *   COMPANY leg — POST /v1/generate_sales_dossier   (the real company-intel route)
 *     body: { ad_hoc_domain (required), seller_context? }
 *     -> { success: true, dossier: { ...sourced company intel... }, credits_used: 30 }
 *     The company leg only runs when a domain is supplied (typed, or derived from
 *     a work email). It is optional and is omitted (not faked) when no domain is
 *     available, with `company_leg_skipped` flagged in the output.
 *
 * Auth: Authorization: Bearer fxp_live_…  (foxApisApi credential, shared).
 *
 * SIGNALS / CONFIDENCE — derived only from real fields the API returns; nothing
 * is invented. We surface, clearly labelled:
 *   - seniority:  inferred from the resolved title (founder/exec/manager/ic/unknown)
 *   - identity_confidence:  identity_verification.confidence_score (0-100, real)
 *   - email_verified:  any returned email marked verified === true (real)
 *   - overall_confidence:  enrich_person overall_confidence (real, 0-1)
 *   - vetting_confidence:  a transparent 0-100 blend of the real identity +
 *       overall confidence + email-verification signal. Labelled as derived; if
 *       the person leg returns nothing it is null (we never fabricate a score).
 *
 * The mapper is defensive — enrich_person and the dossier are declared untyped in
 * openapi.json and evolve upstream — so it reads field aliases and always
 * preserves `raw` (both legs verbatim), mirroring the Lead Enricher / AI
 * Visibility nodes.
 */
export class FoxApisInboundVetter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoxAPIs: Inbound Vetter',
		name: 'foxApisInboundVetter',
		icon: 'file:icons/foxapis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Vet: " + ($parameter["name"] || $parameter["email"] || $parameter["domain"])}}',
		description:
			'Vet an inbound lead or applicant (email / domain / name) before you reply — person enrichment + company intel + derived risk/seniority signals.',
		defaults: { name: 'Inbound Vetter' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'foxApisApi', required: true }],
		properties: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Saul Fleischman',
				description:
					'Full name from the inbound. Best identity anchor; if blank, the local part of the email is used as a fallback name.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'saul@mentionfox.com',
				description:
					'Inbound email address. The domain is extracted (when not a free webmail provider) to anchor the person match and drive the company-intel leg.',
			},
			{
				displayName: 'Company Domain',
				name: 'domain',
				type: 'string',
				default: '',
				placeholder: 'mentionfox.com',
				description:
					'Company apex domain. If given (or derived from a work email), the company-intel leg runs. Leave blank to vet the person only.',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				placeholder: 'MentionFox',
				description: 'Company name hint — disambiguates common names and lifts person confidence',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'Founder & CEO',
				description: 'Job title hint, if the inbound stated one',
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
			{
				displayName: 'Include Company Intel',
				name: 'includeCompany',
				type: 'boolean',
				default: true,
				description:
					'Whether to run the company-intel leg (POST /v1/generate_sales_dossier) when a domain is present. Costs extra FoxAPIs credits. Turn off to vet the person only.',
			},
			{
				displayName: 'Seller / Vetting Context',
				name: 'sellerContext',
				type: 'string',
				default: '',
				placeholder: 'B2B SaaS — we vet inbound demo requests for fit',
				description:
					'Optional context passed to the company-intel leg to focus the dossier on what matters for your vetting decision',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const rawName = (this.getNodeParameter('name', i, '') as string).trim();
				const email = (this.getNodeParameter('email', i, '') as string).trim();
				const typedDomain = (this.getNodeParameter('domain', i, '') as string).trim();
				const company = (this.getNodeParameter('company', i, '') as string).trim();
				const title = (this.getNodeParameter('title', i, '') as string).trim();
				const mode = this.getNodeParameter('mode', i, 'light') as string;
				const includeCompany = this.getNodeParameter('includeCompany', i, true) as boolean;
				const sellerContext = (this.getNodeParameter('sellerContext', i, '') as string).trim();

				// Derive a usable name: typed name, else the email local part.
				const emailDomain = domainFromEmail(email);
				const name = rawName || nameFromEmail(email);
				if (!name) {
					throw new NodeOperationError(
						this.getNode(),
						'Provide at least a name or an email to vet.',
						{ itemIndex: i },
					);
				}

				// Domain to use for the company leg: typed wins, else the work-email domain.
				const domain = typedDomain || emailDomain;

				// ── PERSON leg — POST /v1/enrich_person ──────────────────────────
				const personBody: IDataObject = { name, mode };
				if (company) personBody.company = company;
				if (domain) personBody.domain = domain;
				if (title) personBody.title = title;
				const personResp = await foxApisRequest.call(
					this,
					'POST',
					'/v1/enrich_person',
					personBody,
				);
				const person = mapEnrichment(name, personResp);

				// ── COMPANY leg — POST /v1/generate_sales_dossier ────────────────
				let company_intel: IDataObject | null = null;
				let company_leg_skipped: string | null = null;
				let companyResp: IDataObject | null = null;
				if (!includeCompany) {
					company_leg_skipped = 'disabled';
				} else if (!domain) {
					company_leg_skipped = 'no_domain'; // free webmail / no domain → no fabrication
				} else {
					const companyBody: IDataObject = { ad_hoc_domain: domain };
					if (sellerContext) companyBody.seller_context = sellerContext;
					companyResp = await foxApisRequest.call(
						this,
						'POST',
						'/v1/generate_sales_dossier',
						companyBody,
					);
					company_intel = mapDossier(domain, companyResp);
				}

				// ── SIGNALS — derived only from real returned fields ─────────────
				const signals = deriveSignals(person);

				const summary = {
					subject: { name: person.name, email: person.email || email || null, domain: domain || null },
					person,
					company_intel,
					company_leg_skipped,
					signals,
					vetting_confidence: signals.vetting_confidence,
					recommended_action: signals.recommended_action,
					raw: {
						enrich_person: personResp,
						generate_sales_dossier: companyResp,
					},
				};

				returnData.push({ json: summary, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ──────────────────────────────────────────────────────────────────────
// Helpers (shared philosophy with FoxApisLeadEnricher: defensive, preserve raw)
// ──────────────────────────────────────────────────────────────────────

const FREE_WEBMAIL = new Set([
	'gmail.com',
	'googlemail.com',
	'yahoo.com',
	'ymail.com',
	'hotmail.com',
	'outlook.com',
	'live.com',
	'icloud.com',
	'me.com',
	'aol.com',
	'proton.me',
	'protonmail.com',
	'gmx.com',
	'mail.com',
	'zoho.com',
	'yandex.com',
]);

function domainFromEmail(email: string): string {
	const at = email.indexOf('@');
	if (at < 0) return '';
	const dom = email.slice(at + 1).trim().toLowerCase();
	if (!dom || FREE_WEBMAIL.has(dom)) return '';
	return dom;
}

function nameFromEmail(email: string): string {
	const at = email.indexOf('@');
	if (at <= 0) return '';
	const local = email.slice(0, at);
	const parts = local
		.split(/[._\-+]/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
	return parts.join(' ');
}

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

function unwrapValue(v: unknown): unknown {
	if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as IDataObject)) {
		return (v as IDataObject).value;
	}
	return v;
}

/**
 * Person mapper — identical contract to FoxApisLeadEnricher.mapEnrichment so the
 * `person` block here matches the Lead Enricher node 1:1.
 */
function mapEnrichment(inputName: string, response: IDataObject): IDataObject {
	const success = response.success !== false;
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
	};
}

/**
 * Company mapper — generate_sales_dossier returns { success, dossier, credits_used }.
 * The dossier is dynamic JSON, so we surface a few common fields by alias and
 * keep the whole dossier under `dossier`. `raw` for the company leg lives at the
 * top level of the node output.
 */
function mapDossier(domain: string, response: IDataObject): IDataObject {
	const success = response.success !== false;
	const dossier = asObject(firstDefined(response, ['dossier', 'data']) ?? response);

	const name = firstDefined(dossier, [
		'company_name',
		'name',
		'companyName',
		'legal_name',
	]);
	const summary = firstDefined(dossier, ['summary', 'overview', 'description', 'about']);
	const website =
		firstDefined(dossier, ['website', 'url', 'domain']) || (domain ? `https://${domain}` : null);

	return {
		domain: domain || null,
		name: typeof name === 'string' ? name : name ?? null,
		summary: typeof summary === 'string' ? summary : summary ?? null,
		website,
		credits_used: response.credits_used ?? null,
		found: success && Object.keys(dossier).length > 0,
		dossier,
	};
}

/**
 * Risk / seniority signals — derived strictly from real returned fields, each
 * clearly labelled. Nothing is invented; absence yields null/unknown.
 */
function deriveSignals(person: IDataObject): IDataObject {
	const title = typeof person.title === 'string' ? (person.title as string) : '';
	const seniority = inferSeniority(title);

	const identityConfidence =
		typeof person.identity_confidence === 'number'
			? (person.identity_confidence as number)
			: null; // 0-100
	const overall =
		typeof person.confidence === 'number' ? (person.confidence as number) : null; // 0-1
	const emailVerified = person.verified === true;
	const found = person.found === true;

	// vetting_confidence: transparent 0-100 blend of the REAL signals only.
	//   - identity confidence (already 0-100)            weight 0.5
	//   - overall enrich confidence (scaled to 0-100)    weight 0.35
	//   - +/- a small, bounded bump for email verification (real boolean)
	// Null when the person leg returned nothing to score (no fabrication).
	let vetting_confidence: number | null = null;
	if (found && (identityConfidence !== null || overall !== null)) {
		let score = 0;
		let weight = 0;
		if (identityConfidence !== null) {
			score += identityConfidence * 0.5;
			weight += 0.5;
		}
		if (overall !== null) {
			score += overall * 100 * 0.35;
			weight += 0.35;
		}
		// Normalise by the weights actually present, then apply the verified bump.
		let normalised = weight > 0 ? score / weight : 0;
		normalised += emailVerified ? 10 : 0;
		vetting_confidence = Math.max(0, Math.min(100, Math.round(normalised)));
	}

	// Recommended action — a plain mapping off the derived confidence + seniority.
	let recommended_action = 'review_manually';
	if (!found) {
		recommended_action = 'low_signal_verify_before_reply';
	} else if (vetting_confidence !== null && vetting_confidence >= 75) {
		recommended_action = 'high_confidence_engage';
	} else if (vetting_confidence !== null && vetting_confidence < 45) {
		recommended_action = 'low_confidence_verify';
	}

	return {
		seniority, // founder | executive | manager | individual_contributor | unknown
		title: title || null,
		identity_confidence: identityConfidence, // real, 0-100 (or null)
		overall_confidence: overall, // real, 0-1 (or null)
		email_verified: emailVerified, // real boolean
		person_found: found,
		vetting_confidence, // DERIVED, 0-100, labelled (or null when not scorable)
		vetting_confidence_basis:
			'derived: 0.5*identity_confidence + 0.35*(overall_confidence*100) + 10 if a verified email exists; null when the person leg returns nothing',
		recommended_action,
	};
}

function inferSeniority(title: string): string {
	const t = title.toLowerCase();
	if (!t) return 'unknown';
	if (/(founder|co-?founder|owner|partner)\b/.test(t)) return 'founder';
	if (/\b(ceo|cto|cfo|coo|cmo|cpo|ciso|chief|president|vp|vice president|head of|director)\b/.test(t))
		return 'executive';
	if (/\b(manager|lead|principal|staff)\b/.test(t)) return 'manager';
	return 'individual_contributor';
}
