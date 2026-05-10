import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
	NodeApiError,
} from 'n8n-workflow';
import type { JsonObject } from 'n8n-workflow';

/**
 * Generic JSON-RPC 2.0 / MCP `tools/call` wrapper.
 *
 * The MentionFox MCP server speaks JSON-RPC 2.0 over a single POST endpoint.
 * Successful tool calls return:
 *   { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '<stringified>' }], isError: false } }
 * Tool-level errors return isError:true (still HTTP 200) with the failure
 * message in `content[0].text`.
 * Auth / quota / wire errors return JSON-RPC `error` with codes -32001 / -32002.
 *
 * Why we wrap and re-throw as NodeApiError: n8n surfaces NodeApiError with the
 * proper "Continue On Fail" semantics + a clean error UI. Treating MCP errors
 * as standard HTTP errors would lose the structured error code + upgrade_url.
 */
export async function mentionFoxMcpCall(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
	toolName: string,
	args: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('mentionFoxApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://www.mentionfox.com/mcp';
	const token = credentials.apiKey as string;

	const requestId = `n8n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	const options: IHttpRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: baseUrl,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: {
			jsonrpc: '2.0',
			id: requestId,
			method: 'tools/call',
			params: {
				name: toolName,
				arguments: args,
			},
		},
		json: true,
	};

	let response: IDataObject;
	try {
		response = (await this.helpers.httpRequest(options)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
			message: `MentionFox MCP request failed for tool "${toolName}"`,
		});
	}

	// Wire-protocol error (auth, quota, rate-limit, unknown method).
	if (response.error) {
		const err = response.error as IDataObject;
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: `MentionFox tool "${toolName}" rejected: ${(err.message as string) || 'unknown error'}`,
			description: err.data ? JSON.stringify(err.data) : undefined,
			httpCode: err.code === -32001 ? '401' : err.code === -32002 ? '429' : undefined,
		});
	}

	const result = (response.result as IDataObject) || {};
	const content = (result.content as IDataObject[]) || [];
	const isError = result.isError === true;
	const text = (content[0]?.text as string) || '';

	let payload: IDataObject = {};
	if (text) {
		try {
			payload = JSON.parse(text) as IDataObject;
		} catch {
			payload = { text } as IDataObject;
		}
	}

	if (isError) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: `MentionFox tool "${toolName}" returned isError`,
			description: text || 'Tool reported failure with no message.',
		});
	}

	// Some MentionFox tools return ambiguity payloads with status='candidates_found'
	// — the calling node hands those back as data; do NOT throw.
	return payload;
}

/**
 * `tools/list` lookup — useful for credential test introspection and for
 * dynamic loadOptions where the available tool set may grow over time.
 */
export async function mentionFoxToolsList(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<IDataObject[]> {
	const credentials = await this.getCredentials('mentionFoxApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://www.mentionfox.com/mcp';
	const token = credentials.apiKey as string;

	const options: IHttpRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: baseUrl,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: {
			jsonrpc: '2.0',
			id: `n8n-tools-list-${Date.now()}`,
			method: 'tools/list',
			params: {},
		},
		json: true,
	};

	const response = (await this.helpers.httpRequest(options)) as IDataObject;
	const result = (response.result as IDataObject) || {};
	return ((result.tools as IDataObject[]) || []) as IDataObject[];
}
