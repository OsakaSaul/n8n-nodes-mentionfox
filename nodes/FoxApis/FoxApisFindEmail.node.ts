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
 * FoxAPIs: Find Email
 *
 * Turns a company website (plus an optional person name) into a discoverable,
 * verified work email via the FoxAPIs contact-triangulation pack — the same
 * resolver that backs MentionFox outreach.
 *
 * Real endpoint used (confirmed live against api.foxapis.com — routes_light.py):
 *   POST /v1/find_email
 *     body: { website (required), name? }
 *     auth: Authorization: Bearer fxp_live_…  (foxApisApi credential)
 *     billing: 100 credits on a real match; 0 credits when no email is found.
 *
 * Live response shape (sanitized for the user):
 *   {
 *     success: boolean,
 *     email: string | null,
 *     ...(verification / source fields when present),
 *     credits_used: 100 | 0
 *   }
 *
 * Output shape (always — flattened for "list of names → find email → CRM"):
 *   {
 *     website, name,
 *     email,                  // best discovered email, or null
 *     emails: [string],       // all candidates when the API returns several
 *     verified: boolean,      // any candidate marked verified
 *     found: boolean,         // success && an email came back
 *     credits_used,           // 100 on match, 0 on no-email (real billing)
 *     raw                     // verbatim upstream payload — never dropped
 *   }
 *
 * The mapper is defensive — find_email's payload is declared untyped upstream —
 * so it reads a set of field aliases and always preserves `raw`, mirroring the
 * Lead Enricher / Inbound Vetter / AI Visibility nodes.
 */
export class FoxApisFindEmail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoxAPIs: Find Email',
		name: 'foxApisFindEmail',
		icon: 'file:icons/foxapis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Find email: " + ($parameter["name"] || $parameter["website"])}}',
		description:
			'Find a verified work email for a person at a company domain via the FoxAPIs contact-triangulation pack. Charges only on a real match.',
		defaults: { name: 'Find Email' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'foxApisApi', required: true }],
		properties: [
			{
				displayName: 'Company Website / Domain',
				name: 'website',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'mentionfox.com',
				description:
					'Company website or apex domain to triangulate the email against (the only required input). A full URL is accepted; the domain is what matters.',
			},
			{
				displayName: 'Person Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Saul Fleischman',
				description:
					'Full name of the person whose email you want. Optional but strongly recommended — without it the search resolves a generic / role address for the domain when one is discoverable.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const website = (this.getNodeParameter('website', i) as string).trim();
				if (!website) {
					throw new NodeOperationError(this.getNode(), 'Company Website / Domain is required.', {
						itemIndex: i,
					});
				}
				const name = (this.getNodeParameter('name', i, '') as string).trim();

				const body: IDataObject = { website };
				if (name) body.name = name;

				const response = await foxApisRequest.call(this, 'POST', '/v1/find_email', body);
				const mapped = mapFindEmail(website, name, response);
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
// Helpers (shared philosophy with the other FoxAPIs nodes: defensive, keep raw)
// ──────────────────────────────────────────────────────────────────────

function asArray(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

function firstDefined(obj: IDataObject, keys: string[]): unknown {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
	}
	return undefined;
}

function mapFindEmail(website: string, name: string, response: IDataObject): IDataObject {
	const success = response.success !== false;

	// Primary email: the top-level `email`, or the first of an `emails` array.
	const topEmail = firstDefined(response, ['email', 'work_email', 'verified_email']);

	// Some payloads return a list of candidates under `emails` / `candidates`.
	const candidateEntries = asArray(firstDefined(response, ['emails', 'candidates']));
	const emails: string[] = [];
	let anyVerified = false;
	for (const entry of candidateEntries) {
		if (typeof entry === 'string') {
			if (entry) emails.push(entry);
		} else if (entry && typeof entry === 'object') {
			const e = entry as IDataObject;
			const addr = firstDefined(e, ['email', 'address', 'value']);
			if (typeof addr === 'string' && addr) emails.push(addr);
			if (e.verified === true) anyVerified = true;
		}
	}
	if (typeof topEmail === 'string' && topEmail && !emails.includes(topEmail)) {
		emails.unshift(topEmail);
	}

	const primaryEmail = (typeof topEmail === 'string' && topEmail ? topEmail : emails[0]) || null;

	// Verification: explicit boolean if present, else any verified candidate.
	const topVerified = response.verified === true || response.email_verified === true;
	const verified = topVerified || anyVerified;

	const found = success && !!primaryEmail;

	return {
		website,
		name: name || null,
		email: primaryEmail,
		emails,
		verified,
		found,
		credits_used: response.credits_used ?? null,
		raw: response,
	};
}
