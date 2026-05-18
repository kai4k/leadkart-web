/**
 * TanStack Query hooks for the operator-side tenant surface.
 *
 * Pattern reference for Phase B: all server-state for this feature
 * flows through these hooks. Components import the hook they need;
 * the QueryClient handles caching, background refresh, and invalidation.
 *
 * Cache key hierarchy:
 *   ['tenants']                     — root scope for invalidateQueries
 *   ['tenants', 'list']             — full list (GET /v1/platform/tenants)
 *   ['tenants', 'detail', id]       — single tenant by UUID
 *
 * NOTE: OperatorTenantsStore is NOT deleted in this commit — the
 * detail page still uses it. Migration is incremental: list + create +
 * mutate hooks land here; detail-page migration is a follow-up slice.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import type { RegisterTenantRequest, TenantDto } from './types';

// ── Query key factory ──────────────────────────────────────────────────

export const tenantsKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────────

/**
 * Full tenant list — operator scope (GET /v1/platform/tenants).
 * Operator JWT with `is_platform=true` sees all tenants; no header override
 * needed for this call (list is not tenant-scoped).
 */
export function tenantsListQuery() {
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: () => api.listTenants()
	}));
}

/**
 * Single tenant by UUID.
 * `enabled: !!tenantId` — skips the query when called without an ID
 * (avoids a spurious /v1/tenants/undefined request).
 */
export function tenantDetailQuery(tenantId: string) {
	return createQuery(() => ({
		queryKey: tenantsKeys.detail(tenantId),
		queryFn: () => api.getTenant(tenantId),
		enabled: !!tenantId
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────────

/** Register a new tenant. On success, invalidates the full list. */
export function registerTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: RegisterTenantRequest) => api.registerTenant(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	}));
}

/** Suspend a tenant. Uses setQueryData for instant hydration when the
 *  server returns 200+TenantDto (E4), falls back to invalidate for 204. */
export function suspendTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.suspendTenant(id, { reason }),
		onSuccess: (data: TenantDto | void, vars: { id: string; reason: string }) => {
			if (data) qc.setQueryData<TenantDto>(tenantsKeys.detail(vars.id), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	}));
}

/** Activate a tenant. Uses setQueryData when server returns 200+TenantDto. */
export function activateTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.activateTenant(id),
		onSuccess: (data: TenantDto | void, id: string) => {
			if (data) qc.setQueryData<TenantDto>(tenantsKeys.detail(id), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	}));
}

/** Mark a tenant for deletion. Uses setQueryData when server returns 200+TenantDto. */
export function markForDeletionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.markForDeletion(id, { reason }),
		onSuccess: (data: TenantDto | void, vars: { id: string; reason: string }) => {
			if (data) qc.setQueryData<TenantDto>(tenantsKeys.detail(vars.id), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	}));
}

/** Restore a marked-for-deletion tenant. Uses setQueryData when server returns 200+TenantDto. */
export function restoreTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.restoreTenant(id),
		onSuccess: (data: TenantDto | void, id: string) => {
			if (data) qc.setQueryData<TenantDto>(tenantsKeys.detail(id), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
		}
	}));
}
