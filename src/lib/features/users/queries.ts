/**
 * TanStack Query hooks for tenant user management.
 *
 * Pattern mirrors operator/tenants/queries.ts. All server-state for
 * the users feature flows through these hooks. Class-stores remain
 * for client-state (UI flags, ephemeral form data).
 *
 * Scope: when tenantId is provided, gateway calls inject X-Tenant-Id
 * via the withTenant() scoped client — used by the operator route
 * /operator/tenants/[slug]/members. When absent, the default client
 * is used and the backend scopes responses to the caller's JWT tenant.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import type { CreateUserRequest, ReplacePermissionOverridesRequest } from './types';

// ── Query key factory ──────────────────────────────────────────────

export const usersKeys = {
	all: ['users'] as const,
	list: (tenantId?: string) => [...usersKeys.all, 'list', tenantId ?? 'self'] as const,
	detail: (id: string, tenantId?: string) =>
		[...usersKeys.all, 'detail', id, tenantId ?? 'self'] as const,
	roles: (tenantId?: string) => ['roles', 'catalog', tenantId ?? 'self'] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/**
 * User list for the active tenant scope.
 * When tenantId is set, injects X-Tenant-Id via the scoped gateway
 * (operator viewing another tenant's roster).
 */
export function usersListQuery(tenantId?: string) {
	return createQuery(() => ({
		queryKey: usersKeys.list(tenantId),
		queryFn: () => (tenantId ? api.listUsersScoped(tenantId) : api.listUsers())
	}));
}

/** Role catalogue for the active tenant scope. */
export function rolesCatalogQuery(tenantId?: string) {
	return createQuery(() => ({
		queryKey: usersKeys.roles(tenantId),
		queryFn: () => api.listRoles()
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────

/** Create a new user (member). Invalidates the list on success. */
export function createUserMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateUserRequest) => api.createUser(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: usersKeys.list(tenantId) });
			toast('success', 'Member added');
		}
	}));
}

/** Deactivate a user membership. Invalidates list + detail on success. */
export function deactivateUserMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.deactivateUser(id, { reason }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.list(tenantId) });
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id, tenantId) });
			toast('success', 'Member deactivated');
		}
	}));
}

/** Reactivate a deactivated user membership. */
export function reactivateUserMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.reactivateUser(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: usersKeys.list(tenantId) });
			qc.invalidateQueries({ queryKey: usersKeys.detail(id, tenantId) });
			toast('success', 'Member reactivated');
		}
	}));
}

/** Unlock a locked user account. */
export function unlockUserMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.unlockUser(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(id, tenantId) });
			toast('success', 'Account unlocked');
		}
	}));
}

/** Assign a role to a user membership. */
export function assignRoleMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
			api.assignRole(id, { role_id: roleId }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id, tenantId) });
			qc.invalidateQueries({ queryKey: usersKeys.list(tenantId) });
			toast('success', 'Role assigned');
		}
	}));
}

/** Revoke a role from a user membership. */
export function revokeRoleMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, roleId }: { id: string; roleId: string }) => api.revokeRole(id, roleId),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id, tenantId) });
			qc.invalidateQueries({ queryKey: usersKeys.list(tenantId) });
			toast('success', 'Role revoked');
		}
	}));
}

/** Replace all permission overrides for a user membership. */
export function replacePermissionOverridesMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: ReplacePermissionOverridesRequest }) =>
			api.replacePermissionOverrides(id, body),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id, tenantId) });
			toast('success', 'Permission overrides saved');
		}
	}));
}

/** Assign a manager to a user membership. */
export function assignManagerMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, managerId }: { id: string; managerId: string }) =>
			api.assignManager(id, { manager_id: managerId }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(vars.id, tenantId) });
			toast('success', 'Manager assigned');
		}
	}));
}

/** Remove the manager from a user membership. */
export function removeManagerMutation(tenantId?: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.removeManager(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: usersKeys.detail(id, tenantId) });
			toast('success', 'Manager removed');
		}
	}));
}
