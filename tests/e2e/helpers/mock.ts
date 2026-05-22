/**
 * Mock-server control plane client.
 *
 * Tests push fixtures into the Go-side mock (port 9999) via these helpers
 * before navigating. The BFF then hits the mock for every server-to-server
 * call, so what reaches the browser is identical to a real backend response.
 *
 * Always call `resetMock()` in beforeEach to clear state from prior tests.
 */

const MOCK_BASE = process.env.MOCK_BASE ?? 'http://localhost:9999';

export interface MockFixture {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** Exact path, or path ending in `*` for prefix match. */
	path: string;
	status: number;
	body?: unknown;
	headers?: Record<string, string>;
}

export async function resetMock(): Promise<void> {
	await fetch(`${MOCK_BASE}/_mock/reset`, { method: 'POST' });
}

export async function registerMock(fixture: MockFixture): Promise<void> {
	await fetch(`${MOCK_BASE}/_mock/register`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(fixture)
	});
}

export async function registerMocks(fixtures: MockFixture[]): Promise<void> {
	await fetch(`${MOCK_BASE}/_mock/registerMany`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(fixtures)
	});
}

export async function listMockCalls(): Promise<
	Array<{ method: string; path: string; body: string; at: number }>
> {
	const resp = await fetch(`${MOCK_BASE}/_mock/calls`);
	return resp.json();
}
