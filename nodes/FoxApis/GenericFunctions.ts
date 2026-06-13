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
 * Thin REST wrapper for the FoxAPIs GEO / AI-visibility pack.
 *
 * FoxAPIs speaks plain JSON over HTTPS at https://api.foxapis.com (routes under
 * /v1). Each GEO endpoint takes a small JSON body and returns a structured
 * scorecard. Auth is a `fxp_live_…` bearer key injected by the `foxApisApi`
 * credential's `authenticate` block — we call `httpRequestWithAuthentication`
 * so the community-nodes ruleset is satisfied (no manual Authorization header)
 * and the base URL is read from the credential.
 *
 * Errors: FoxAPIs returns FastAPI-style `{ "detail": "…" }` with 401 (bad key),
 * 402 (out of credits), 422 (bad body). We re-throw as NodeApiError so n8n gets
 * clean "Continue On Fail" semantics + a readable error UI.
 */
export async function foxApisRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
): Promise<IDataObject> {
	const credentials = (await this.getCredentials('foxApisApi')) as IDataObject;
	const baseUrl = ((credentials.baseUrl as string) || 'https://api.foxapis.com').replace(/\/$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		json: true,
	};
	if (method !== 'GET' && Object.keys(body).length > 0) {
		options.body = body;
	}

	try {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'foxApisApi',
			options,
		)) as IDataObject;
		return (response as IDataObject) || {};
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
			message: `FoxAPIs request failed: ${method} ${path}`,
		});
	}
}
