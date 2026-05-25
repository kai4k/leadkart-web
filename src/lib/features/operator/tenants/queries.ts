/**
 * TanStack Query hooks for the operator-side tenant surface.
 *
 * Cache discipline (TanStack canon):
 *   - Mutations invalidate the list; auto-refetch repopulates.
 *   - No manual cross-query setQueryData seeding.
 *   - No optimistic rollback dance — invalidate + refetch is simpler
 *     and the network round-trip is fast enough to skip.
 *   - Toasts in the mutation hook, not the calling component.
 *
 * Active-tenant resolution is now server-side: the /operator/scope/*
 * layout reads the lk_op_tenant cookie and fetches the canonical
 * TenantDto via +layout.server.ts. There is no client-side
 * tenantBySlugQuery — the slug never appears in a browser URL.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import type { RegisterTenantRequest } from './types';

export const tenantsKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

export function tenantsListQuery() {
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: () => api.listTenants()
	}));
}

export function tenantDetailQuery(tenantId: string) {
	return createQuery(() => ({
		queryKey: tenantsKeys.detail(tenantId),
		queryFn: () => api.getTenant(tenantId),
		enabled: Boolean(tenantId)
	}));
}

export function registerTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: RegisterTenantRequest) => api.registerTenant(req),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant registered');
		}
	}));
}

export function suspendTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.suspendTenant(id, { reason }),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant suspended');
		}
	}));
}

export function activateTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.activateTenant(id),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant activated');
		}
	}));
}

export function markForDeletionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.markForDeletion(id, { reason }),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant marked for deletion');
		}
	}));
}

export function restoreTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.restoreTenant(id),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant restored');
		}
	}));
}
