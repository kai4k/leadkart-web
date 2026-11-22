/**
 * TanStack Query hooks for the operator-side tenant surface.
 *
 * Cache discipline (TanStack canon):
 *   - Mutations invalidate the list; auto-refetch repopulates.
 *   - No manual cross-query setQueryData seeding.
 *   - No optimistic rollback dance — invalidate + refetch is simpler
 *     and the network round-trip is fast enough to skip.
 *   - Toasts in the mutation hook, not the calling component.
 *   - Lifecycle calls answer 204; inside the scope tree the layout's tenant comes
 *     from a server load, so the lifecycle helper also runs `refreshAll()` there.
 *
 * Active-tenant resolution is now server-side: the /operator/scope/*
 * layout reads the lk_op_tenant cookie and fetches the canonical
 * TenantDto via +layout.server.ts. There is no client-side
 * tenantBySlugQuery — the slug never appears in a browser URL.
 */
import type { OneShot } from '#lib/utils/one-shot.ts';
import { createQuery } from '@tanstack/svelte-query';
import { refreshAll } from '$app/navigation';
import { createResourceMutation } from '#lib/api/mutations.ts';
import { isOperatorScopePath } from '#lib/api/scope-header.ts';
import { queryRoots } from '#lib/api/query-keys.ts';
import * as api from './api';
import type { RegisterTenantRequest } from './types';

const tenantsKeys = {
	all: queryRoots.tenants,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

export function tenantsListQuery() {
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: ({ signal }) => api.listTenants(signal)
	}));
}

export function registerTenantMutation() {
	return createResourceMutation({
		// the variables hold a one-shot holder: the admin's password does not stay in the mutation cache
		fn: (req: OneShot<RegisterTenantRequest>) => api.registerTenant(req.take()),
		invalidate: () => [tenantsKeys.all],
		successToast: 'Tenant registered',
		// CreateTenantDrawer shows the error in its form banner.
		inlineErrors: true
	});
}

/**
 * Shared by the four lifecycle hooks: invalidate the tenants tree and, inside the operator
 * scope tree (where the tenant comes from a server load), reload that server data.
 */
function lifecycleMutation<TVars extends { id: string } | string>(
	fn: (vars: TVars) => Promise<void>,
	successToast: string,
	inlineErrors = false
) {
	return createResourceMutation({
		fn,
		invalidate: () => [tenantsKeys.all],
		successToast,
		inlineErrors,
		onSuccess: () => (isOperatorScopePath(window.location.pathname) ? refreshAll() : undefined)
	});
}

export function suspendTenantMutation() {
	return lifecycleMutation(
		({ id, reason }: { id: string; reason: string }) => api.suspendTenant(id, { reason }),
		'Tenant suspended',
		true
	);
}

export function activateTenantMutation() {
	return lifecycleMutation((id: string) => api.activateTenant(id), 'Tenant activated');
}

export function markForDeletionMutation() {
	return lifecycleMutation(
		({ id, reason }: { id: string; reason: string }) => api.markForDeletion(id, { reason }),
		'Tenant marked for deletion',
		true
	);
}

export function restoreTenantMutation() {
	return lifecycleMutation((id: string) => api.restoreTenant(id), 'Tenant restored');
}
