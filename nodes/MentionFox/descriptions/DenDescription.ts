import { INodeProperties } from 'n8n-workflow';

/**
 * Den resource — FoxDen widget data + tasks.
 *
 * Den-specific MCP tools are pending in MentionFox. v0.1 surfaces these as
 * stubs returning Den dashboard URLs. The 27-Den persona system lives in
 * MentionFox; the MCP-side Den read tools are slated for v1.5.
 */
export const denOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['den'] } },
		options: [
			{
				name: 'List Dens',
				value: 'list_dens',
				description: 'STUB v0.1: pending Den MCP tools. Returns Den catalog dashboard URL.',
				action: 'List active dens',
			},
			{
				name: 'Get Widget Data',
				value: 'get_den_widget_data',
				description: 'STUB v0.1: pending Den MCP tools',
				action: 'Get den widget data',
			},
			{
				name: 'Create Task',
				value: 'create_den_task',
				description: 'STUB v0.1: pending Den MCP tools',
				action: 'Create a den task',
			},
			{
				name: 'List Tasks',
				value: 'list_den_tasks',
				description: 'STUB v0.1: pending Den MCP tools',
				action: 'List den tasks',
			},
		],
		default: 'list_dens',
	},
];

export const denFields: INodeProperties[] = [
	{
		displayName: 'Den Persona',
		name: 'persona',
		type: 'string',
		default: '',
		description: 'Den persona slug — e.g. founder, recruiter, investor, journalist',
		displayOptions: {
			show: { resource: ['den'], operation: ['get_den_widget_data', 'create_den_task', 'list_den_tasks'] },
		},
	},
	{
		displayName: 'Widget Slug',
		name: 'widget_slug',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['den'], operation: ['get_den_widget_data'] } },
	},
	{
		displayName: 'Task Title',
		name: 'task_title',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['den'], operation: ['create_den_task'] } },
	},
	{
		displayName: 'Task Body',
		name: 'task_body',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { resource: ['den'], operation: ['create_den_task'] } },
	},
	{
		displayName: 'Source URL',
		name: 'source_url',
		type: 'string',
		default: '',
		description: 'Origin of the task — FoxChat conversation URL, mention URL, etc',
		displayOptions: { show: { resource: ['den'], operation: ['create_den_task'] } },
	},
];
