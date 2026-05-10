import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * MentionFox API credential.
 *
 * Auth model (v0.1):
 *   The MentionFox MCP server (https://www.mentionfox.com/mcp) accepts a
 *   bearer access token issued via the OAuth flow at https://www.mentionfox.com/connect.
 *   For n8n we ask the user to paste the token directly. v1.1 will add a
 *   full OAuth grant flow inside the credential editor.
 *
 * Credential test:
 *   POSTs a JSON-RPC 2.0 `tools/list` to the MCP endpoint. Success = HTTP 200
 *   plus a `result.tools` array. Anything else (revoked token, expired token,
 *   network failure) bubbles up as a credential-test failure in n8n's UI.
 */
export class MentionFoxApi implements ICredentialType {
	name = 'mentionFoxApi';
	displayName = 'MentionFox API';
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://www.mentionfox.com/help/n8n';
	icon = 'file:mentionfox.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Bearer Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Bearer access token from https://www.mentionfox.com/connect. v0.1 uses paste-token; v1.1 will add a full OAuth flow inside this credential.',
		},
		{
			displayName: 'MCP Endpoint',
			name: 'baseUrl',
			type: 'string',
			default: 'https://www.mentionfox.com/mcp',
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
						'Token accepted but no tools list returned. Check that your token is valid at https://www.mentionfox.com/connect.',
				},
			},
		],
	};
}
