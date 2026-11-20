import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	findInApproverQueue,
	listPermissionRequests
} from '#lib/features/permission-requests/api.ts';

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

describe('findInApproverQueue (the detail page learns can_approve from the queue, the only place Go sends it)', () => {
	const item = (id: string, can_approve: boolean) => ({
		id,
		tenant_id: '00000000-0000-4000-8000-000000000001',
		requester_membership_id: '00000000-0000-4000-8000-000000000b02',
		permission: 'crm.leads.manage',
		duration_days: 7,
		reason: 'needed for the audit',
		state: 'pending',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		can_approve
	});
	const pageBody = (requests: unknown[], next?: string) =>
		new Response(JSON.stringify({ requests, has_more: next !== undefined, next_cursor: next }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});

	it('pages through the queue until the request is found', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(pageBody([item('00000000-0000-4000-8000-0000000000a1', true)], 'c2'))
			.mockResolvedValueOnce(pageBody([item('00000000-0000-4000-8000-0000000000b1', false)]));
		vi.stubGlobal('fetch', fetchMock);
		const found = await findInApproverQueue('00000000-0000-4000-8000-0000000000b1');
		expect(found).toMatchObject({ id: '00000000-0000-4000-8000-0000000000b1', can_approve: false });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('is null when the queue does not list it (the caller has no say, so no decision controls)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(pageBody([item('00000000-0000-4000-8000-0000000000a1', true)]))
		);
		expect(await findInApproverQueue('zzz')).toBeNull();
	});
});
