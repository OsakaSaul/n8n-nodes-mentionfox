import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * FoxAPIs API credential.
 *
 * FoxAPIs (https://api.foxapis.com) is the REST data-API surface that powers the
 * MentionFox GEO / AI-visibility pack. It uses its OWN key scheme — `fxp_live_…`
 * keys minted at https://foxapis.com/trial and validated against the
 * `foxapis_api_keys` table — which is DISTINCT from the MentionFox MCP bearer
 * token (`mentionFoxApi`). They are not interchangeable, so this is a separate
 * credential type.
 *
 * Auth model:
 *   `Authorization: Bearer fxp_live_…` on every request.
 *
 * Credential test:
 *   GET /connect/mentionfox/status — the one authenticated FoxAPIs endpoint that
 *   runs the full `verify_api_key` dependency (key valid + customer active +
 *   credits > 0) WITHOUT deducting credits. (Note: the connect router is mounted
 *   at /connect/* on production, NOT under /v1 — verified against the live
 *   openapi.json.) A valid key returns HTTP 200 with a `connected` boolean; an
 *   invalid/inactive key returns 401, an out-of-credits account returns 402 —
 *   both surface as a credential-test failure in n8n.
 */
export class FoxApisApi implements ICredentialType {
	name = 'foxApisApi';
	displayName = 'FoxAPIs API';
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://api.foxapis.com/docs';
	icon = 'file:foxapis.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your FoxAPIs API key (begins with "fxp_live_"). Get one at https://foxapis.com/trial. This is NOT your MentionFox MCP token — FoxAPIs uses its own key.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.foxapis.com',
			required: true,
			description:
				'FoxAPIs REST base URL. Override only for staging or self-hosted deployments.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/connect/mentionfox/status',
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		},
	};
}
