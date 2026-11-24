/**
 * TanStack Query hooks for the roles feature.
 *
 * Scope: the BFF auto-injects X-Tenant-Id from the lk_op_tenant cookie
 * when the operator is inside /operator/scope/*. The frontend never
 * sees or passes the tenant identifier.
 *
 * Cache discipline: see `#lib/api/mutations.ts`.
 */
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createResourceMutation } from '#lib/api/mutations.ts';
import { queryRoots } from '#lib/api/query-keys.ts';
import * as api from './api';
import type { ListRolesResponse, UpdateRoleRequest } from './types';

const rolesKeys = {
	all: queryRoots.roles,
	list: () => [...rolesKeys.all, 'list'] as const,
	detail: (id: string) => [...rolesKeys.all, 'detail', id] as const
};

export function rolesListQuery() {
	return createQuery(() => ({
		queryKey: rolesKeys.list(),
		queryFn: ({ signal }) => api.listRoles(signal)
	}));
}

export function roleDetailQuery(getRoleId: () => string) {
	return createQuery(() => {
		const roleId = getRoleId();
		return {
			queryKey: rolesKeys.detail(roleId),
			queryFn: ({ signal }) => api.getRole(roleId, signal),
			enabled: Boolean(roleId)
		};
	});
}

export function updateRoleMutation() {
	return createResourceMutation({
		fn: ({ id, req }: { id: string; req: UpdateRoleRequest }) => api.updateRole(id, req),
		// `all` is a prefix of `detail`: invalidating both cancels and restarts the detail refetch.
		refreshesCapabilities: true,
		invalidate: () => [rolesKeys.all],
		successToast: 'Role updated',
		inlineErrors: true
	});
}

export function replaceRolePermissionsMutation() {
	return createResourceMutation({
		fn: ({ id, permissions }: { id: string; permissions: string[] }) =>
			api.replaceRolePermissions(id, { permissions }),
		refreshesCapabilities: true,
		invalidate: ({ id }) => [rolesKeys.detail(id), rolesKeys.list()],
		successToast: 'Permissions saved',
		inlineErrors: true
	});
}

/**
 * "Delete" on screen; the server makes the role inactive (ADR 0073). The response is the updated role, so the
 * cache is written from it: the role leaves the active list (no refetch) and its detail entry is dropped.
 * Holders are untouched (Go refuses while an active member holds the role), so no users or capabilities refresh.
 */
export function deleteRoleMutation() {
	const qc = useQueryClient();
	return createResourceMutation({
		fn: (id: string) => api.deactivateRole(id),
		invalidate: () => [],
		onSuccess: (_id, role) => {
			qc.setQueryData<ListRolesResponse>(rolesKeys.list(), (list) => {
				if (!list) return list;
				const counts = list.status_counts;
				return {
					...list,
					roles: list.roles.filter((r) => r.id !== role.id),
					status_counts: counts
						? { active: Math.max(0, counts.active - 1), inactive: counts.inactive + 1 }
						: counts
				};
			});
			qc.removeQueries({ queryKey: rolesKeys.detail(role.id) });
		},
		successToast: 'Role deleted',
		inlineErrors: true
	});
}

export function setRoleParentMutation() {
	return createResourceMutation({
		fn: ({ id, parent_role_id }: { id: string; parent_role_id: string | null }) =>
			api.setRoleParent(id, { parent_role_id }),
		refreshesCapabilities: true,
		invalidate: () => [rolesKeys.all],
		successToast: ({ parent_role_id }) =>
			parent_role_id ? 'Parent role set' : 'Parent role cleared',
		inlineErrors: true
	});
}
