import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
	query: undefined as undefined | (() => Record<string, unknown>),
	list: undefined as undefined | Record<string, unknown>
}));
vi.mock('@tanstack/svelte-query', () => ({
	createQuery: (fn: () => Record<string, unknown>) => {
		h.query = fn;
		return {};
	}
}));
vi.mock('#lib/hooks/index.ts', () => ({
	createInfiniteList: (o: Record<string, unknown>) => {
		h.list = o;
		return {};
	}
}));
vi.mock('#lib/api/mutations.ts', () => ({ createResourceMutation: vi.fn() }));
const gw = vi.hoisted(() => ({ getPermissionRequest: vi.fn(), listPermissionRequests: vi.fn() }));
vi.mock('#lib/features/permission-requests/api.ts', () => gw);
vi.mock('#lib/features/permission-requests/api', () => gw);

import {
	permissionRequestDetailQuery,
	permissionRequestsInfiniteQuery
} from '#lib/features/permission-requests/queries.ts';

beforeEach(() => vi.clearAllMocks());

describe('permissionRequestDetailQuery reads its id through a getter (one observer per component)', () => {
	it('follows the getter without being re-created', () => {
		let id = 'a';
		permissionRequestDetailQuery(() => id);
		expect(h.query!().queryKey).toEqual(['permission-requests', 'detail', 'a']);
		id = 'b';
		expect(h.query!().queryKey).toEqual(['permission-requests', 'detail', 'b']);
		id = '';
		expect(h.query!().enabled).toBe(false);
	});
});

describe('permissionRequestsInfiniteQuery (m10: every page is reachable)', () => {
	it('keys on the role getter and threads the cursor to the gateway', async () => {
		let role: 'requester' | 'approver' = 'requester';
		permissionRequestsInfiniteQuery(() => role);
		const key = h.list!.queryKey as () => unknown[];
		expect(key()).toEqual(['permission-requests', 'list', 'requester']);
		role = 'approver';
		expect(key()).toEqual(['permission-requests', 'list', 'approver']);

		gw.listPermissionRequests.mockResolvedValue({ items: [], has_more: false });
		const signal = new AbortController().signal;
		await (h.list!.queryFn as (c: unknown) => Promise<unknown>)({ cursor: 'c2', signal });
		expect(gw.listPermissionRequests).toHaveBeenCalledWith(
			{ role: 'approver', cursor: 'c2' },
			signal
		);
	});
});
