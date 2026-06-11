import {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

/**
 * MentionFox Webhook Trigger — PUSH trigger on the real MentionFox event bus.
 *
 * Unlike the polling MentionFox Trigger, this registers an outbound webhook with
 * MentionFox and fires the moment an event is delivered. The user picks one of the
 * three event types that exist today:
 *   - mention.intent          a scored mention crossed an intent threshold
 *   - geo.citation.published  a citation page went live
 *   - geo.citation.indexed    that page was submitted to IndexNow
 *
 * On activate it calls the MentionFox dealflow-api `webhook.subscribe` action with
 * n8n's webhook URL (storing the returned subscription id + signing secret in the
 * node's static data); on deactivate it calls `webhook.unsubscribe`.
 *
 * Auth contract: the subscribe/unsubscribe calls carry the credential's key as
 * `api_key`. End-to-end auth depends on the MentionFox-side FoxAPIs-key resolution
 * layer + the FOXAPIS_BRIDGE_SECRET; this node is the installable shell wired to the
 * exact contract.
 */

const DEALFLOW_API_URL = 'https://wnzxffwiiubqvcvnnjbz.supabase.co/functions/v1/dealflow-api';

export class MentionFoxWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MentionFox Webhook Trigger',
		name: 'mentionFoxWebhookTrigger',
		icon: 'file:icons/mentionfox.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow the moment a MentionFox event is pushed (via a registered webhook).',
		defaults: { name: 'MentionFox Webhook Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'mentionFoxApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				required: true,
				default: 'mention.intent',
				options: [
					{
						name: 'Mention Intent',
						value: 'mention.intent',
						description: 'A scored mention crossed an intent threshold',
					},
					{
						name: 'Citation Page Published',
						value: 'geo.citation.published',
						description: 'A citation page went live',
					},
					{
						name: 'Citation Page Indexed',
						value: 'geo.citation.indexed',
						description: 'A citation page was submitted for indexing',
					},
				],
			},
			{
				displayName: 'Minimum Intent',
				name: 'intentMin',
				type: 'number',
				default: 0,
				description: 'Only fire when intent is at least this value. Applies to Mention Intent only; 0 means no floor.',
				displayOptions: { show: { event: ['mention.intent'] } },
			},
			{
				displayName: 'Additional Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '{}',
				description: 'Optional equality filters applied to the event payload, as a JSON object',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				return Boolean(data.subscriptionId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const event = this.getNodeParameter('event') as string;
				const intentMin = this.getNodeParameter('intentMin', 0) as number;
				const filtersRaw = this.getNodeParameter('filters', '{}');
				const credentials = await this.getCredentials('mentionFoxApi');

				let filters: IDataObject = {};
				if (typeof filtersRaw === 'string') {
					try {
						filters = JSON.parse(filtersRaw || '{}') as IDataObject;
					} catch {
						filters = {};
					}
				} else if (filtersRaw && typeof filtersRaw === 'object') {
					filters = filtersRaw as IDataObject;
				}
				if (event === 'mention.intent' && intentMin > 0) filters.intent_min = intentMin;

				const response = (await this.helpers.httpRequest({
					method: 'POST',
					url: DEALFLOW_API_URL,
					body: {
						action: 'webhook.subscribe',
						api_key: credentials.apiKey,
						event_type: event,
						target_url: webhookUrl,
						filters,
					},
					json: true,
				})) as IDataObject;

				const subscription = (response.subscription as IDataObject) || {};
				if (!subscription.id) return false;

				const data = this.getWorkflowStaticData('node');
				data.subscriptionId = subscription.id;
				data.secret = subscription.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (!data.subscriptionId) return true;
				const credentials = await this.getCredentials('mentionFoxApi');
				try {
					await this.helpers.httpRequest({
						method: 'POST',
						url: DEALFLOW_API_URL,
						body: {
							action: 'webhook.unsubscribe',
							api_key: credentials.apiKey,
							subscription_id: data.subscriptionId,
						},
						json: true,
					});
				} catch {
					// Best-effort: clear local state even if the remote unsubscribe fails.
				}
				delete data.subscriptionId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		return { workflowData: [this.helpers.returnJsonArray(body as IDataObject)] };
	}
}
