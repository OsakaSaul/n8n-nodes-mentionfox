import { INodeProperties } from 'n8n-workflow';

/**
 * Source Check — the flagship operation, and the first thing a new user meets.
 *
 * One input: whatever you were sent. A pitch, a name, an email address, a link.
 * Out comes one of four fixed verdicts, each claim paired with the public
 * register that confirmed or contradicted it.
 */
export const sourceCheckOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['sourceCheck'] } },
		options: [
			{
				name: 'Verify a Person or Company',
				value: 'source_check',
				description:
					'Is this person who they say they are? Their stated credentials are checked against the public registers that govern them, and you get one of four verdicts with every claim sourced',
				action: 'Verify a person or company against public registers',
			},
		],
		default: 'source_check',
	},
];

export const sourceCheckFields: INodeProperties[] = [
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['sourceCheck'], operation: ['source_check'] } },
		description:
			'The pitch, name, email address or link naming the person to check. Paste it whole — the claims are read out of it, so more context means more claims checked.',
		placeholder: 'Paste the whole email, DM or pitch here',
	},
	{
		displayName: 'Name',
		name: 'sc_name',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['sourceCheck'], operation: ['source_check'] } },
		description: "The subject's name, if it is not obvious from the input",
	},
	{
		displayName: 'Title',
		name: 'sc_title',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['sourceCheck'], operation: ['source_check'] } },
		description: 'The role or credential they state, if it is not obvious from the input',
	},
	{
		displayName: 'Employer',
		name: 'sc_employer',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['sourceCheck'], operation: ['source_check'] } },
		description: 'The organisation they say they are with, if it is not obvious from the input',
	},
];
