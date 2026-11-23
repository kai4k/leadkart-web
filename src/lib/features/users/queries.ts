/**
 * TanStack Query hooks for tenant user management.
 *
 * Scope: the BFF auto-injects X-Tenant-Id from the lk_op_tenant cookie
 * when the operator is inside /operator/scope/*. The frontend never
 * sees or passes the tenant identifier — every call here is the
 * scope-agnostic gateway function.
 *
 * Cache discipline: see `#lib/api/mutations.ts` (mutations invalidate, no
 * DTO is written into the cache, the global MutationCache toasts errors).
 */
import type { OneShot } from '#lib/utils/one-shot.ts';
import { createQuery } from '@tanstack/svelte-query';
import { createResourceMutation } from '#lib/api/mutations.ts';
import { queryRoots } from '#lib/api/query-keys.ts';
import * as api from './api';
import type { UserStatusFilter } from './api';
import { bulkSetStatus } from './service';
import { bulkSummary } from './view-models';
import type {
	BulkStatusAction,
	CreateUserRequest,
	ReplacePermissionOverridesRequest
} from './types';

const usersKeys = {
	all: queryRoots.users,
	/** `list()` is the prefix of every status read, so one invalidation reaches Active, Inactive and All. */
	list: (status?: UserStatusFilter) =>
		status ? ([...usersKeys.all, 'list', status] as const) : ([...usersKeys.all, 'list'] as const),
	detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
	membershipSearch: (q: string) => [...usersKeys.all, 'membership-search', q] as const,
	/** The prefix of every picker search: a status change makes them stale (an inactive member is not offered). */
	membershipSearches: () => [...usersKeys.all, 'membership-search'] as const
};

/**
 * Typeahead search for memberships in the current tenant. Used by the
 * lead reassignment Combobox. Gated by `memberSearchReady` (2 to 100 characters, as Go counts them) so the picker
 * doesn't blast the API on every keystroke. TanStack's stale-time
 * cache + `placeholderData: keepPreviousData` deliver the implicit
 * debounce — re-issuing the same key while typing returns instantly
 * from cache and only the trailing distinct query lands a request.
 */
export function membershipSearchQuery(getQuery: () => string) {
	return createQuery(() => {
		const q = getQuery().trim();
		return {
			queryKey: usersKeys.membershipSearch(q),
			queryFn: ({ signal }) => api.searchMembers(q, signal),
			enabled: api.memberSearchReady(q),
			staleTime: 30_000
		};
	});
}

const usersListOptions = (status: UserStatusFilter) => ({
	queryKey: usersKeys.list(status),
	queryFn: ({ signal }: { signal: AbortSignal }) => api.listAllUsers(status, signal)
});

/** Every member with `status` (default active: the roster other screens read) — `data: UserDto[]`. */
export function usersListQuery(
	enabled: () => boolean = () => true,
	getStatus: () => UserStatusFilter = () => 'active'
) {
	return createQuery(() => ({
		...usersListOptions(getStatus()),
		enabled: enabled(),
		select: (r) => r.items
	}));
}

/** The tenant's active / inactive member counts (the first page of the same read); `undefined` until it lands. */
export function usersStatusCountsQuery(getStatus: () => UserStatusFilter = () => 'active') {
	return createQuery(() => ({ ...usersListOptions(getStatus()), select: (r) => r.counts }));
}

/** True when the page cap stopped the read, so `usersListQuery` data is incomplete (same cache entry). */
export function usersListTruncatedQuery(getStatus: () => UserStatusFilter = () => 'active') {
	return createQuery(() => ({ ...usersListOptions(getStatus()), select: (r) => r.truncated }));
}

/** Single-membership detail — GET /v1/users/{membershipId}. */
export function userDetailQuery(getId: () => string) {
	return createQuery(() => {
		const id = getId();
		return {
			queryKey: usersKeys.detail(id),
			queryFn: ({ signal }) => api.getUser(id, signal),
			enabled: Boolean(id)
		};
	});
}

export function createUserMutation() {
	return createResourceMutation({
		// the variables hold a one-shot holder: the typed password does not stay in the mutation cache
		fn: (req: OneShot<CreateUserRequest>) => api.createUser(req.take()),
		invalidate: () => [usersKeys.list()],
		successToast: 'Member added',
		inlineErrors: true
	});
}

export function deactivateUserMutation() {
	return createResourceMutation({
		fn: ({ id, reason }: { id: string; reason: string }) => api.deactivateUser(id, { reason }),
		invalidate: ({ id }) => [
			usersKeys.detail(id),
			usersKeys.list(),
			usersKeys.membershipSearches()
		],
		successToast: 'Member deactivated',
		inlineErrors: true
	});
}

export function reactivateUserMutation() {
	return createResourceMutation({
		fn: (id: string) => api.reactivateUser(id),
		invalidate: (id) => [usersKeys.detail(id), usersKeys.list(), usersKeys.membershipSearches()],
		successToast: 'Member reactivated'
	});
}

/**
 * Bulk deactivate/reactivate over many ids as ONE mutation: one summary toast, one invalidation.
 * Rejects (global error toast) only when every id failed; a partial failure toasts a warning.
 */
export function bulkUserStatusMutation() {
	return createResourceMutation({
		fn: ({ action, ids }: { action: BulkStatusAction; ids: readonly string[] }) =>
			bulkSetStatus(action, ids),
		invalidate: ({ ids }) => [
			...ids.map(usersKeys.detail),
			usersKeys.list(),
			usersKeys.membershipSearches()
		],
		successToast: ({ action }, result) => bulkSummary(action, result),
		// A partial failure is not a clean success.
		successToastVariant: (_vars, result) => (result.failed > 0 ? 'warning' : 'success')
	});
}

export function assignRoleMutation() {
	return createResourceMutation({
		fn: ({ id, roleId }: { id: string; roleId: string }) => api.assignRole(id, { role_id: roleId }),
		refreshesCapabilities: true,
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Role assigned',
		inlineErrors: true
	});
}

export function revokeRoleMutation() {
	return createResourceMutation({
		fn: ({ id, roleId }: { id: string; roleId: string }) => api.revokeRole(id, roleId),
		refreshesCapabilities: true,
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Role revoked',
		inlineErrors: true
	});
}

export function replacePermissionOverridesMutation() {
	return createResourceMutation({
		fn: ({ id, body }: { id: string; body: ReplacePermissionOverridesRequest }) =>
			api.replacePermissionOverrides(id, body),
		refreshesCapabilities: true,
		invalidate: ({ id }) => [usersKeys.detail(id)],
		successToast: 'Permission overrides saved',
		inlineErrors: true
	});
}

export function assignManagerMutation() {
	return createResourceMutation({
		fn: ({ id, managerId }: { id: string; managerId: string }) =>
			api.assignManager(id, { manager_id: managerId }),
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Manager assigned',
		inlineErrors: true
	});
}

/** `inlineErrors`: the caller renders the failure itself (the drawer does; the detail tab does not). */
export function removeManagerMutation({ inlineErrors = false }: { inlineErrors?: boolean } = {}) {
	return createResourceMutation({
		fn: (id: string) => api.removeManager(id),
		invalidate: (id) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Manager removed',
		inlineErrors
	});
}
