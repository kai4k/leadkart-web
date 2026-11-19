import { afterEach, describe, expect, it, vi } from 'vitest';
import { listPermissionRequests } from '#lib/features/permission-requests/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('permission-requests gateway', () => {
	it('sends page_size (not limit) and returns a Page', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ requests: [], has_more: true, next_cursor: 'c2' }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		const page = await listPermissionRequests({ role: 'approver', page_size: 20 });
		expect(fetchMock.mock.calls[0]![0]).toBe(
			'/api/v1/permission-requests?role=approver&page_size=20'
		);
		expect(page).toEqual({ items: [], has_more: true, next_cursor: 'c2' });
	});
});
