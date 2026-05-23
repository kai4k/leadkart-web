/**
 * TanStack Query hooks for tenant user management.
 *
 * Scope: the BFF auto-injects X-Tenant-Id from the lk_op_tenant cookie
 * when the operator is inside /operator/scope/*. The frontend never
 * sees or passes the tenant identifier — every call here is the
 * scope-agnostic gateway function.
 *
 * Cache discipline (TanStack canon):
 *   - Mutations invalidate; let auto-refetch repopulate.
 *   - No manual setQueryData cross-query seeding.
 *   - No manual optimistic rollback — UX win not worth the complexity.
 *   - Toasts live IN the mutation hook, not the calling component.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import type { CreateUserRequest, ReplacePermissionOverridesRequest } from './types';

export const usersKeys = {
	all: ['users'] as const,
	list: () => [...usersKeys.all, 'list'] as const,
	detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
	roles: () => ['roles', 'catalog'] as const
};

export function usersListQuery() {
	return createQuery(() => ({
		queryKey: usersKeys.list(),
		queryFn: () => api.listUsers()
	}));
}

export function rolesCatalogQuery() {
	return createQuery(() => ({
		queryKey: usersKeys.roles(),
		queryFn: () => api.listRoles()
	}));
}

export function createUserMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateUserRequest) => api.createUser(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: usersKeys.list() });
			toast('success', 'Member added');
		}
	}));
}

export function deactivateUserMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.deactivateUser(id, { reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: usersKeys.all });
			toast('success', 'Member deactivated');
		}
	}));
}

export function reactivateUserMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.reactivateUser(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: usersKeys.all });
			toast('success', 'Member reactivated');
		}
	}));
}

export function assignRoleMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
			api.assignRole(id, { role_id: roleId }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id) });
			toast('success', 'Role assigned');
		}
	}));
}

export function revokeRoleMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, roleId }: { id: string; roleId: string }) => api.revokeRole(id, roleId),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id) });
			toast('success', 'Role revoked');
		}
	}));
}

export function replacePermissionOverridesMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: ReplacePermissionOverridesRequest }) =>
			api.replacePermissionOverrides(id, body),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id) });
			toast('success', 'Permission overrides saved');
		}
	}));
}

export function assignManagerMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, managerId }: { id: string; managerId: string }) =>
			api.assignManager(id, { manager_id: managerId }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id) });
			toast('success', 'Manager assigned');
		}
	}));
}

export function removeManagerMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.removeManager(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(id) });
			toast('success', 'Manager removed');
		}
	}));
}
