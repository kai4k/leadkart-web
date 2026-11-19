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
 *     from a server load, so `reloadPageData` also runs `refreshAll()`.
 *
 * Active-tenant resolution is now server-side: the /operator/scope/*
 * layout reads the lk_op_tenant cookie and fetches the canonical
 * TenantDto via +layout.server.ts. There is no client-side
 * tenantBySlugQuery — the slug never appears in a browser URL.
 */
import { createQuery } from '@tanstack/svelte-query';
import { refreshAll } from '$app/navigation';
import { createResourceMutation } from '#lib/api/mutations.ts';
import { queryRoots } from '#lib/api/query-keys.ts';
import * as api from './api';
import type { RegisterTenantRequest } from './types';

const tenantsKeys = {
	all: queryRoots.tenants,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

/** Lifecycle hooks accept this; pass `reloadPageData` from the scope tree (server-loaded tenant). */
export interface LifecycleMutationOptions {
	reloadPageData?: boolean;
}

export function tenantsListQuery() {
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: ({ signal }) => api.listTenants(signal)
	}));
}

export function registerTenantMutation() {
	return createResourceMutation({
		fn: (req: RegisterTenantRequest) => api.registerTenant(req),
		invalidate: () => [tenantsKeys.all],
		successToast: 'Tenant registered',
		// CreateTenantDrawer shows the error in its form banner.
		inlineErrors: true
	});
}

/** Shared by the four lifecycle hooks: invalidate the tenants tree, optionally reload server data. */
function lifecycleMutation<TVars extends { id: string } | string>(
	fn: (vars: TVars) => Promise<void>,
	successToast: string,
	opts: LifecycleMutationOptions,
	inlineErrors = false
) {
	return createResourceMutation({
		fn,
		invalidate: () => [tenantsKeys.all],
		successToast,
		inlineErrors,
		onSuccess: () => (opts.reloadPageData ? refreshAll() : undefined)
	});
}

export function suspendTenantMutation(opts: LifecycleMutationOptions = {}) {
	return lifecycleMutation(
		({ id, reason }: { id: string; reason: string }) => api.suspendTenant(id, { reason }),
		'Tenant suspended',
		opts,
		true
	);
}

export function activateTenantMutation(opts: LifecycleMutationOptions = {}) {
	return lifecycleMutation((id: string) => api.activateTenant(id), 'Tenant activated', opts);
}

export function markForDeletionMutation(opts: LifecycleMutationOptions = {}) {
	return lifecycleMutation(
		({ id, reason }: { id: string; reason: string }) => api.markForDeletion(id, { reason }),
		'Tenant marked for deletion',
		opts,
		true
	);
}

export function restoreTenantMutation(opts: LifecycleMutationOptions = {}) {
	return lifecycleMutation((id: string) => api.restoreTenant(id), 'Tenant restored', opts);
}
