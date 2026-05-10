import { INodeProperties } from 'n8n-workflow';

/**
 * Client resource — agency-tier client management.
 *
 * MCP tools used:
 *   list_clients        → STUB v0.1 (pending MCP tool)
 *   create_client       → STUB v0.1 (pending MCP tool)
 *   get_client_geo_score → get_geofixer_score with the client's brand_domain
 *   list_client_battlecards → STUB v0.1 (pending MCP tool)
 */
export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['client'] } },
		options: [
			{
				name: 'List Clients',
				value: 'list_clients',
				description: 'STUB v0.1: pending MCP tool',
				action: 'List your agency clients',
			},
			{
				name: 'Create Client',
				value: 'create_client',
				description: 'STUB v0.1: pending MCP tool',
				action: 'Create a new client',
			},
			{
				name: 'Get GEO Score for Client',
				value: 'get_client_geo_score',
				description: 'Wraps get_geofixer_score against the client brand domain. FREE.',
				action: 'Get client geo score',
			},
			{
				name: 'List Battlecards',
				value: 'list_client_battlecards',
				description: 'STUB v0.1: pending MCP tool',
				action: 'List client battlecards',
			},
		],
		default: 'list_clients',
	},
];

export const clientFields: INodeProperties[] = [
	{
		displayName: 'Client Name',
		name: 'client_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['create_client'] } },
	},
	{
		displayName: 'Client Domain',
		name: 'client_domain',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['create_client', 'get_client_geo_score', 'list_client_battlecards'] } },
	},
];
