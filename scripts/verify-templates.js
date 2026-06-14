#!/usr/bin/env node
/**
 * Template integrity check for /templates.
 *
 * For every *.json workflow it asserts the shape n8n needs to import a workflow,
 * then prints a pass/fail tally. Exits non-zero on any failure so CI / the build
 * gate can block a broken template.
 *
 * Checks per file:
 *   - parses as JSON
 *   - has a string `name`
 *   - has `nodes` (array, >= 2 entries) and `connections` (object)
 *   - every node has id, name, type, typeVersion, position[2]
 *   - node names are unique
 *   - at least one trigger / webhook / form / schedule node (an entry point)
 *   - at least one sticky note (the required top setup note)
 *   - every connection source name is a real node
 *   - every connection target node is a real node
 *   - no MentionFox data node is mislabelled (guards the "FoxAPIs key" auth rule:
 *     the string "MentionFox API key" must never appear in a template)
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'templates');
const files = fs
	.readdirSync(dir)
	.filter((f) => f.endsWith('.json'))
	.sort();

let pass = 0;
let fail = 0;
const failures = [];

const TRIGGER_HINTS = ['trigger', 'webhook', 'formtrigger', 'schedule', 'cron'];

for (const file of files) {
	const full = path.join(dir, file);
	const raw = fs.readFileSync(full, 'utf8');
	const problems = [];
	let wf;

	try {
		wf = JSON.parse(raw);
	} catch (e) {
		failures.push(`${file}: invalid JSON — ${e.message}`);
		fail++;
		continue;
	}

	if (typeof wf.name !== 'string' || !wf.name.trim()) problems.push('missing string "name"');
	if (!Array.isArray(wf.nodes)) problems.push('missing "nodes" array');
	if (wf.connections === null || typeof wf.connections !== 'object' || Array.isArray(wf.connections))
		problems.push('missing "connections" object');

	if (Array.isArray(wf.nodes)) {
		if (wf.nodes.length < 2) problems.push('fewer than 2 nodes');

		const names = new Set();
		let hasTrigger = false;
		let hasSticky = false;

		for (const [idx, node] of wf.nodes.entries()) {
			const tag = `node[${idx}]${node && node.name ? ` "${node.name}"` : ''}`;
			if (!node || typeof node !== 'object') {
				problems.push(`${tag} is not an object`);
				continue;
			}
			if (!node.id) problems.push(`${tag} missing id`);
			if (!node.name) problems.push(`${tag} missing name`);
			if (!node.type) problems.push(`${tag} missing type`);
			if (node.typeVersion === undefined) problems.push(`${tag} missing typeVersion`);
			if (!Array.isArray(node.position) || node.position.length !== 2)
				problems.push(`${tag} missing position[2]`);

			if (node.name) {
				if (names.has(node.name)) problems.push(`duplicate node name "${node.name}"`);
				names.add(node.name);
			}

			const type = String(node.type || '').toLowerCase();
			if (TRIGGER_HINTS.some((h) => type.includes(h)) && !type.includes('stickynote'))
				hasTrigger = true;
			if (type.includes('stickynote')) hasSticky = true;
		}

		if (!hasTrigger) problems.push('no trigger/entry-point node');
		if (!hasSticky) problems.push('no sticky note (required setup note)');

		// Connection referential integrity.
		if (wf.connections && typeof wf.connections === 'object') {
			for (const [src, conn] of Object.entries(wf.connections)) {
				if (!names.has(src)) problems.push(`connection source "${src}" is not a node`);
				const outs = (conn && conn.main) || [];
				for (const branch of outs) {
					for (const link of branch || []) {
						if (link && link.node && !names.has(link.node))
							problems.push(`connection target "${link.node}" is not a node`);
					}
				}
			}
		}
	}

	if (/MentionFox API key/i.test(raw))
		problems.push('contains the banned phrase "MentionFox API key" (use "FoxAPIs API key")');

	if (problems.length) {
		fail++;
		failures.push(`${file}:\n    - ${problems.join('\n    - ')}`);
	} else {
		pass++;
	}
}

console.log(`\nTemplate verification — ${files.length} file(s) in /templates\n`);
if (failures.length) {
	console.log('FAILURES:');
	for (const f of failures) console.log(`  ✗ ${f}`);
	console.log('');
}
console.log(`PASS: ${pass}    FAIL: ${fail}\n`);

process.exit(fail === 0 ? 0 : 1);
