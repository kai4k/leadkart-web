/**
 * Mock-server control plane client.
 *
 * Tests push fixtures into the Go-side mock (port 9999) via these helpers
 * before navigating. The BFF then hits the mock for every server-to-server
 * call, so what reaches the browser is identical to a real backend response.
 *
 * Every fixture is validated against Go's generated contract at registration
 * (see ./contract.ts): a fixture Go could not send throws here.
 *
 * Always call `resetMock()` in beforeEach to clear state from prior tests.
 */

import { assertFixtures } from './contract.ts';

const MOCK_BASE = process.env.MOCK_BASE ?? 'http://localhost:9999';

export interface MockFixture {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** Exact path, or path ending in `*` for prefix match. */
	path: string;
	status: number;
	body?: unknown;
	headers?: Record<string, string>;
	/** Serve this fixture for its first N hits only, then fall back to the previous one. */
	times?: number;
}

export async function resetMock(): Promise<void> {
	await fetch(`${MOCK_BASE}/_mock/reset`, { method: 'POST' });
}

export async function registerMock(fixture: MockFixture): Promise<void> {
	assertFixtures([fixture]);
	await fetch(`${MOCK_BASE}/_mock/register`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(fixture)
	});
}

export async function registerMocks(fixtures: MockFixture[]): Promise<void> {
	assertFixtures(fixtures);
	await fetch(`${MOCK_BASE}/_mock/registerMany`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(fixtures)
	});
}

export async function listMockCalls(): Promise<
	Array<{
		method: string;
		path: string;
		/** The raw query string, `?a=b` (empty when there is none). */
		query: string;
		body: string;
		authorization: string | null;
		'x-tenant-id': string | null;
		/** What the BFF sent as the caller's address: exactly one IP on every call. */
		'x-forwarded-for': string | null;
		at: number;
	}>
> {
	const resp = await fetch(`${MOCK_BASE}/_mock/calls`);
	return resp.json();
}

/** Calls the mock could not answer (no fixture registered): the BFF asked Go for something the test never described. */
export async function listUnregisteredCalls(): Promise<Array<{ method: string; path: string }>> {
	const resp = await fetch(`${MOCK_BASE}/_mock/unregistered`);
	return resp.json();
}
