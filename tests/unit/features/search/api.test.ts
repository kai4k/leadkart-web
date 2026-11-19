import { afterEach, describe, expect, it, vi } from 'vitest';
import { omniSearch } from '#lib/features/search/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('search gateway', () => {
	it('sends q, limit and a single comma-joined include (search_http.go splitCSV)', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ persons: [], tenants: [], has_partial: false }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		const kinds = ['persons', 'tenants'];
		await omniSearch({ q: 'acme', limit: 5, include: kinds.join(',') });
		expect(fetchMock.mock.calls[0]![0]).toBe(
			'/api/v1/search?q=acme&limit=5&include=persons%2Ctenants'
		);
	});
});
