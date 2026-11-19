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
import { createQuery } from '@tanstack/svelte-query';
import { createResourceMutation } from '#lib/api/mutations.ts';
import * as api from './api';
import type { CreateUserRequest, ReplacePermissionOverridesRequest } from './types';

const usersKeys = {
	all: ['users'] as const,
	list: () => [...usersKeys.all, 'list'] as const,
	detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
	membershipSearch: (q: string) => [...usersKeys.all, 'membership-search', q] as const
};

/**
 * Typeahead search for memberships in the current tenant. Used by the
 * lead reassignment Combobox. Gated by `q.length >= 2` so the picker
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
			queryFn: () => api.searchMemberships(q),
			enabled: q.length >= 2,
			staleTime: 30_000
		};
	});
}

const usersListOptions = () => ({
	queryKey: usersKeys.list(),
	queryFn: ({ signal }: { signal: AbortSignal }) => api.listAllUsers(signal)
});

/** Every active member (all pages) — `data: UserDto[]`. */
export function usersListQuery() {
	return createQuery(() => ({ ...usersListOptions(), select: (r) => r.items }));
}

/** True when the page cap stopped the read, so `usersListQuery` data is incomplete (same cache entry). */
export function usersListTruncatedQuery() {
	return createQuery(() => ({ ...usersListOptions(), select: (r) => r.truncated }));
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
		fn: (req: CreateUserRequest) => api.createUser(req),
		invalidate: () => [usersKeys.list()],
		successToast: 'Member added'
	});
}

export function deactivateUserMutation() {
	return createResourceMutation({
		fn: ({ id, reason }: { id: string; reason: string }) => api.deactivateUser(id, { reason }),
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Member deactivated',
		inlineErrors: true
	});
}

export function reactivateUserMutation() {
	return createResourceMutation({
		fn: (id: string) => api.reactivateUser(id),
		invalidate: (id) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Member reactivated'
	});
}

export function assignRoleMutation() {
	return createResourceMutation({
		fn: ({ id, roleId }: { id: string; roleId: string }) => api.assignRole(id, { role_id: roleId }),
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Role assigned'
	});
}

export function revokeRoleMutation() {
	return createResourceMutation({
		fn: ({ id, roleId }: { id: string; roleId: string }) => api.revokeRole(id, roleId),
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Role revoked'
	});
}

export function replacePermissionOverridesMutation() {
	return createResourceMutation({
		fn: ({ id, body }: { id: string; body: ReplacePermissionOverridesRequest }) =>
			api.replacePermissionOverrides(id, body),
		invalidate: ({ id }) => [usersKeys.detail(id)],
		successToast: 'Permission overrides saved'
	});
}

export function assignManagerMutation() {
	return createResourceMutation({
		fn: ({ id, managerId }: { id: string; managerId: string }) =>
			api.assignManager(id, { manager_id: managerId }),
		invalidate: ({ id }) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Manager assigned'
	});
}

export function removeManagerMutation() {
	return createResourceMutation({
		fn: (id: string) => api.removeManager(id),
		invalidate: (id) => [usersKeys.detail(id), usersKeys.list()],
		successToast: 'Manager removed'
	});
}
