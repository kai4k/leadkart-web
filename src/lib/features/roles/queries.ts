/**
 * TanStack Query hooks for the roles feature.
 *
 * Mirrors the pattern from operator/tenants/queries.ts and users/queries.ts.
 * All server-state for roles flows through these hooks.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import type { CreateRoleRequest, UpdateRoleRequest, RoleDto } from './types';

// ── Query key factory ──────────────────────────────────────────────

export const rolesKeys = {
	all: ['roles'] as const,
	list: () => [...rolesKeys.all, 'list'] as const,
	detail: (id: string) => [...rolesKeys.all, 'detail', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/** Full role list for the caller's tenant. */
export function rolesListQuery() {
	return createQuery(() => ({
		queryKey: rolesKeys.list(),
		queryFn: () => api.listRoles()
	}));
}

/** Single role by ID. */
export function roleDetailQuery(roleId: string) {
	return createQuery(() => ({
		queryKey: rolesKeys.detail(roleId),
		queryFn: () => api.getRole(roleId),
		enabled: !!roleId
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────

/** Create a new role. Invalidates the list on success. */
export function createRoleMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateRoleRequest) => api.createRole(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: rolesKeys.all });
			toast('success', 'Role created');
		}
	}));
}

/** Update a role's name / hierarchy level. Uses setQueryData for instant
 *  hydration when server returns 200+RoleDto (E4), falls back to invalidate. */
export function updateRoleMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, req }: { id: string; req: UpdateRoleRequest }) => api.updateRole(id, req),
		onSuccess: (data: RoleDto | void, vars: { id: string; req: UpdateRoleRequest }) => {
			if (data) qc.setQueryData<RoleDto>(rolesKeys.detail(vars.id), data);
			else qc.invalidateQueries({ queryKey: rolesKeys.detail(vars.id) });
			qc.invalidateQueries({ queryKey: rolesKeys.list() });
			toast('success', 'Role updated');
		}
	}));
}

/** Replace all permissions on a role. */
export function replaceRolePermissionsMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
			api.replaceRolePermissions(id, { permissions }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: rolesKeys.detail(vars.id) });
			toast('success', 'Permissions saved');
		}
	}));
}

/** Grant a single permission to a role. */
export function grantRolePermissionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, permission }: { id: string; permission: string }) =>
			api.grantRolePermission(id, { permission }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: rolesKeys.detail(vars.id) });
			toast('success', 'Permission granted');
		}
	}));
}

/** Revoke a single permission from a role. */
export function revokeRolePermissionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, permission }: { id: string; permission: string }) =>
			api.revokeRolePermission(id, { permission }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: rolesKeys.detail(vars.id) });
			toast('success', 'Permission revoked');
		}
	}));
}

/** Delete a role. Invalidates the list on success. */
export function deleteRoleMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteRole(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: rolesKeys.all });
			toast('success', 'Role deleted');
		}
	}));
}
