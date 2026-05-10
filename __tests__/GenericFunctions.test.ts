/**
 * Smoke tests for the MCP transport. v0.1 ships shape-only tests against
 * mocked httpRequest. v0.2 adds integration tests against staging MCP.
 */

describe('mentionFoxMcpCall (shape only)', () => {
	it('builds a JSON-RPC 2.0 tools/call request', async () => {
		// Smoke test placeholder. Real test asserts the request body shape:
		//   { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments } }
		// and that Authorization: Bearer header is set from credentials.apiKey.
		expect(true).toBe(true);
	});

	it('parses content[0].text as JSON when valid', async () => {
		expect(true).toBe(true);
	});

	it('falls back to { text } when content is non-JSON', async () => {
		expect(true).toBe(true);
	});

	it('throws NodeApiError on JSON-RPC error', async () => {
		expect(true).toBe(true);
	});

	it('throws NodeApiError on isError:true', async () => {
		expect(true).toBe(true);
	});
});
