import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, type MutationObserver } from '@tanstack/svelte-query';
import { ApiError } from '#lib/api/errors.ts';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
// Real mutation machinery against a real QueryClient; only the context lookup and the Svelte
// binding are replaced.
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc
	)
);
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', () => ({ toast: toastMock }));
const gw = vi.hoisted(() => ({
	deactivateUser: vi.fn(),
	reactivateUser: vi.fn()
}));
vi.mock('#lib/features/users/api.ts', () => gw);
vi.mock('#lib/features/users/api', () => gw);
const roleGw = vi.hoisted(() => ({
	updateRole: vi.fn(),
	deleteRole: vi.fn(),
	setRoleParent: vi.fn()
}));
vi.mock('#lib/features/roles/api.ts', () => roleGw);
vi.mock('#lib/features/roles/api', () => roleGw);
vi.mock('#lib/features/permission-requests/api.ts', () => ({}));
vi.mock('#lib/features/permission-requests/api', () => ({}));

import { createPermissionRequestMutation } from '#lib/features/permission-requests/queries.ts';
import {
	assignManagerMutation,
	assignRoleMutation,
	createUserMutation,
	removeManagerMutation,
	replacePermissionOverridesMutation,
	revokeRoleMutation,
	bulkUserStatusMutation,
	deactivateUserMutation,
	reactivateUserMutation
} from '#lib/features/users/queries.ts';
import {
	deleteRoleMutation,
	replaceRolePermissionsMutation,
	setRoleParentMutation,
	updateRoleMutation
} from '#lib/features/roles/queries.ts';

let invalidated: unknown[][];
beforeEach(() => {
	vi.clearAllMocks();
	h.qc = new QueryClient();
	invalidated = [];
	vi.spyOn(h.qc, 'invalidateQueries').mockImplementation((f) => {
		invalidated.push([...(f?.queryKey ?? [])]);
		return Promise.resolve();
	});
});

describe('mutations invalidate the keys they change (real QueryClient)', () => {
	it('deactivate: detail + list, errors stay inline', async () => {
		gw.deactivateUser.mockResolvedValue(undefined);
		const m = deactivateUserMutation() as unknown as MutationObserver<
			void,
			Error,
			{ id: string; reason: string }
		>;
		await m.mutate({ id: 'm1', reason: 'x' });
		expect(invalidated).toEqual([
			['users', 'detail', 'm1'],
			['users', 'list'],
			['users', 'membership-search']
		]);
		gw.deactivateUser.mockRejectedValue(new Error('no'));
		await m.mutate({ id: 'm1', reason: 'x' }).catch(() => {});
		expect(
			h.qc
				.getMutationCache()
				.getAll()
				.every((x) => x.meta?.skipErrorToast === true)
		).toBe(true);
	});
	it('reactivate: detail + list', async () => {
		gw.reactivateUser.mockResolvedValue(undefined);
		const m = reactivateUserMutation() as unknown as MutationObserver<void, Error, string>;
		await m.mutate('m1');
		expect(invalidated).toEqual([
			['users', 'detail', 'm1'],
			['users', 'list'],
			['users', 'membership-search']
		]);
	});
});

describe('roles mutations (real QueryClient)', () => {
	type M<V> = MutationObserver<void, Error, V>;
	it('update invalidates the roles prefix exactly once (detail is under it)', async () => {
		roleGw.updateRole.mockResolvedValue(undefined);
		const m = updateRoleMutation() as unknown as M<{ id: string; req: object }>;
		await m.mutate({ id: 'r1', req: {} });
		expect(invalidated).toEqual([['roles']]);
	});
	it('delete invalidates the whole users root (list and detail views show role names)', async () => {
		roleGw.deleteRole.mockResolvedValue(undefined);
		const m = deleteRoleMutation() as unknown as M<string>;
		await m.mutate('r1');
		expect(invalidated).toEqual([['roles'], ['users']]);
	});
	it('set-parent invalidates the roles prefix', async () => {
		roleGw.setRoleParent.mockResolvedValue(undefined);
		const m = setRoleParentMutation() as unknown as M<{ id: string; parent_role_id: null }>;
		await m.mutate({ id: 'r1', parent_role_id: null });
		expect(invalidated).toEqual([['roles']]);
	});
});

describe('m1: hooks whose consumer renders the error itself skip the global toast', () => {
	const skips = (m: unknown) =>
		(m as { options: { meta?: { skipErrorToast?: boolean } } }).options.meta?.skipErrorToast ===
		true;
	it.each([
		['createUser', () => createUserMutation(), true],
		['assignRole', () => assignRoleMutation(), true],
		['revokeRole', () => revokeRoleMutation(), true],
		['replacePermissionOverrides', () => replacePermissionOverridesMutation(), true],
		['assignManager', () => assignManagerMutation(), true],
		['removeManager (drawer)', () => removeManagerMutation({ inlineErrors: true }), true],
		['removeManager (detail tab shows nothing)', () => removeManagerMutation(), false],
		['reactivate (row action shows nothing)', () => reactivateUserMutation(), false],
		['updateRole', () => updateRoleMutation(), true],
		['replaceRolePermissions', () => replaceRolePermissionsMutation(), true],
		['setRoleParent', () => setRoleParentMutation(), true],
		['deleteRole', () => deleteRoleMutation(), true],
		['createPermissionRequest', () => createPermissionRequestMutation(), true]
	])('%s', (_n, make, expected) => {
		expect(skips(make())).toBe(expected);
	});
});

describe('bulk member status (I-2)', () => {
	const bulk = () =>
		bulkUserStatusMutation() as unknown as MutationObserver<
			{ succeeded: number; failed: number },
			Error,
			{ action: 'deactivate' | 'reactivate'; ids: string[] }
		>;

	it('settles every id when the 2nd rejects: resolves, ONE warning toast (not success), all keys invalidated', async () => {
		gw.deactivateUser
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('nope'))
			.mockResolvedValueOnce(undefined);
		const result = await bulk().mutate({ action: 'deactivate', ids: ['a', 'b', 'c'] });
		expect(result).toMatchObject({ succeeded: 2, failed: 1, failedIds: ['b'] });
		expect(toastMock.warning).toHaveBeenCalledTimes(1);
		expect(toastMock.warning.mock.calls[0]?.[0]).toBe(
			'2 deactivated, 1 failed: Something went wrong'
		);
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(invalidated).toEqual([
			['users', 'detail', 'a'],
			['users', 'detail', 'b'],
			['users', 'detail', 'c'],
			['users', 'list'],
			['users', 'membership-search']
		]);
	});
	const res = (status: number) => new Response(null, { status });
	it("the warning names the first failure's reason (the shared describer)", async () => {
		gw.deactivateUser
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(
				ApiError.fromResponse(res(403), { error: 'self_modification_forbidden', message: 'raw' })
			);
		await bulk().mutate({ action: 'deactivate', ids: ['a', 'b', 'c'] });
		expect(toastMock.warning.mock.calls[0]?.[0]).toBe(
			"2 deactivated, 1 failed: You can't make this change to your own account."
		);
	});
	it('an expired session among the failures reaches the session guard: rethrown, no summary toast', async () => {
		const expired = ApiError.fromResponse(res(401), { error: 'session_expired' });
		gw.reactivateUser.mockResolvedValueOnce(undefined).mockRejectedValueOnce(expired);
		await expect(bulk().mutate({ action: 'reactivate', ids: ['a', 'b'] })).rejects.toBe(expired);
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(toastMock.warning).not.toHaveBeenCalled();
	});
	it('an ordinary 401 (not session_expired) is only a failed row', async () => {
		gw.reactivateUser
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(ApiError.fromResponse(res(401), { error: 'something_else' }));
		await expect(bulk().mutate({ action: 'reactivate', ids: ['a', 'b'] })).resolves.toMatchObject({
			succeeded: 1,
			failed: 1
		});
	});
	it('an empty id list makes no call and shows no toast', async () => {
		await bulk().mutate({ action: 'deactivate', ids: [] });
		expect(gw.deactivateUser).not.toHaveBeenCalled();
		expect(toastMock.success).not.toHaveBeenCalled();
		expect(toastMock.warning).not.toHaveBeenCalled();
	});
	it('reactivate reports a clean count', async () => {
		gw.reactivateUser.mockResolvedValue(undefined);
		await bulk().mutate({ action: 'reactivate', ids: ['a', 'b'] });
		expect(toastMock.success).toHaveBeenCalledWith('2 reactivated', undefined);
	});
	it('rejects with the first error when every id failed (no success toast)', async () => {
		gw.reactivateUser.mockRejectedValue(new Error('all bad'));
		await expect(bulk().mutate({ action: 'reactivate', ids: ['a', 'b'] })).rejects.toThrow(
			'all bad'
		);
		expect(toastMock.success).not.toHaveBeenCalled();
	});
});
