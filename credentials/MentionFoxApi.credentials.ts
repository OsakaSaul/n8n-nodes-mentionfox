import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * MentionFox API credential.
 *
 * Auth model (v0.2):
 *   Paste an API key from https://mentionfox.com/connect. Keys start with
 *   `mf_pat_`, do not expire, and keep working until you revoke them — so a
 *   workflow you build once keeps running.
 *
 *   Before v0.2 this field took an OAuth access token, which expired 24 hours
 *   after it was pasted and left every scheduled workflow dead by morning. Those
 *   tokens are still accepted by the server, so an existing credential keeps
 *   working until it lapses; replace it with a key and the problem goes away.
 *
 * Credential test:
 *   POSTs a JSON-RPC 2.0 `tools/list` to the MCP endpoint. Success = HTTP 200
 *   plus a `result.tools` array. A revoked key, an expired legacy token or a
 *   network failure all surface as a credential-test failure in n8n's UI.
 */
export class MentionFoxApi implements ICredentialType {
	name = 'mentionFoxApi';
	displayName = 'MentionFox API';
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://mentionfox.com/help/n8n';
	icon = 'file:mentionfox.svg' as const;

	properties: INodeProperties[] = [
		{
			// The field name stays `apiKey` so credentials saved by v0.1.x keep
			// resolving — only what you paste into it has changed.
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'mf_pat_...',
			description:
				'Long-lived API key from https://mentionfox.com/connect (starts with mf_pat_). It does not expire and works until you revoke it. Legacy 24-hour OAuth tokens are still accepted, but will stop working a day after you paste them.',
		},
		{
			displayName: 'MCP Endpoint',
			name: 'baseUrl',
			type: 'string',
			default: 'https://mentionfox.com/mcp',
			required: true,
			description:
				'MentionFox MCP server URL. Override only for staging or self-hosted deployments.',
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
			url: '',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: {
				jsonrpc: '2.0',
				id: 'n8n-cred-test',
				method: 'tools/list',
				params: {},
			},
			json: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'result.tools',
					value: undefined,
					message:
						'Key accepted but no tools list returned. Check that your key is still active at https://mentionfox.com/connect.',
				},
			},
		],
	};
}
