/**
 * TanStack Query hooks for the roles feature.
 *
 * Scope: the BFF auto-injects X-Tenant-Id from the lk_op_tenant cookie
 * when the operator is inside /operator/scope/*. The frontend never
 * sees or passes the tenant identifier.
 *
 * Cache discipline: see `#lib/api/mutations.ts`.
 */
import { createQuery } from '@tanstack/svelte-query';
import { createResourceMutation } from '#lib/api/mutations.ts';
import * as api from './api';
import type { UpdateRoleRequest } from './types';

const rolesKeys = {
	all: ['roles'] as const,
	list: () => [...rolesKeys.all, 'list'] as const,
	detail: (id: string) => [...rolesKeys.all, 'detail', id] as const
};

export function rolesListQuery() {
	return createQuery(() => ({
		queryKey: rolesKeys.list(),
		queryFn: ({ signal }) => api.listRoles(signal)
	}));
}

export function roleDetailQuery(roleId: string) {
	return createQuery(() => ({
		queryKey: rolesKeys.detail(roleId),
		queryFn: ({ signal }) => api.getRole(roleId, signal),
		enabled: Boolean(roleId)
	}));
}

export function updateRoleMutation() {
	return createResourceMutation({
		fn: ({ id, req }: { id: string; req: UpdateRoleRequest }) => api.updateRole(id, req),
		invalidate: ({ id }) => [rolesKeys.detail(id), rolesKeys.all],
		successToast: 'Role updated'
	});
}

export function replaceRolePermissionsMutation() {
	return createResourceMutation({
		fn: ({ id, permissions }: { id: string; permissions: string[] }) =>
			api.replaceRolePermissions(id, { permissions }),
		invalidate: ({ id }) => [rolesKeys.detail(id), rolesKeys.list()],
		successToast: 'Permissions saved'
	});
}

export function deleteRoleMutation() {
	return createResourceMutation({
		fn: (id: string) => api.deleteRole(id),
		invalidate: () => [rolesKeys.all],
		successToast: 'Role deleted'
	});
}

export function setRoleParentMutation() {
	return createResourceMutation({
		fn: ({ id, parent_role_id }: { id: string; parent_role_id: string | null }) =>
			api.setRoleParent(id, { parent_role_id }),
		invalidate: () => [rolesKeys.all],
		successToast: ({ parent_role_id }) =>
			parent_role_id ? 'Parent role set' : 'Parent role cleared'
	});
}
