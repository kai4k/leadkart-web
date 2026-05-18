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
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const,
	detailBySlug: (slug: string) => [...tenantsKeys.all, 'by-slug', slug] as const
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

/**
 * Single tenant by slug — canonical route lookup per ADR 0038 A.3.
 * The [slug]/ route hierarchy uses this instead of the UUID lookup.
 */
export function tenantBySlugQuery(slug: string) {
	return createQuery(() => ({
		queryKey: tenantsKeys.detailBySlug(slug),
		queryFn: () => api.getTenantBySlug(slug),
		enabled: !!slug
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

/** Suspend a tenant. Optimistic: marks status=suspended immediately. */
export function suspendTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.suspendTenant(id, { reason }),
		onMutate: async ({ id }: { id: string; reason: string }) => {
			await qc.cancelQueries({ queryKey: tenantsKeys.detail(id) });
			const previous = qc.getQueryData<TenantDto>(tenantsKeys.detail(id));
			if (previous) {
				qc.setQueryData<TenantDto>(tenantsKeys.detail(id), { ...previous, status: 'suspended' });
				qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(previous.slug), {
					...previous,
					status: 'suspended'
				});
			}
			return { previous };
		},
		onError: (
			_err: unknown,
			{ id }: { id: string; reason: string },
			ctx: { previous?: TenantDto } | undefined
		) => {
			if (ctx?.previous) {
				qc.setQueryData<TenantDto>(tenantsKeys.detail(id), ctx.previous);
				qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(ctx.previous.slug), ctx.previous);
			}
		},
		onSuccess: (data: TenantDto, vars: { id: string; reason: string }) => {
			qc.setQueryData<TenantDto>(tenantsKeys.detail(vars.id), data);
			qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(data.slug), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.list() });
		}
	}));
}

/** Activate a tenant. Optimistic: marks status=active immediately. */
export function activateTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.activateTenant(id),
		onMutate: async (id: string) => {
			await qc.cancelQueries({ queryKey: tenantsKeys.detail(id) });
			const previous = qc.getQueryData<TenantDto>(tenantsKeys.detail(id));
			if (previous) {
				qc.setQueryData<TenantDto>(tenantsKeys.detail(id), { ...previous, status: 'active' });
				qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(previous.slug), {
					...previous,
					status: 'active'
				});
			}
			return { previous };
		},
		onError: (_err: unknown, id: string, ctx: { previous?: TenantDto } | undefined) => {
			if (ctx?.previous) {
				qc.setQueryData<TenantDto>(tenantsKeys.detail(id), ctx.previous);
				qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(ctx.previous.slug), ctx.previous);
			}
		},
		onSuccess: (data: TenantDto) => {
			qc.setQueryData<TenantDto>(tenantsKeys.detail(data.id), data);
			qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(data.slug), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.list() });
		}
	}));
}

/** Mark a tenant for deletion. Server returns 200+TenantDto per ADR 0038 E4. */
export function markForDeletionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.markForDeletion(id, { reason }),
		onSuccess: (data: TenantDto) => {
			qc.setQueryData<TenantDto>(tenantsKeys.detail(data.id), data);
			qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(data.slug), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.list() });
		}
	}));
}

/** Restore a marked-for-deletion tenant. Server returns 200+TenantDto per ADR 0038 E4. */
export function restoreTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.restoreTenant(id),
		onSuccess: (data: TenantDto) => {
			qc.setQueryData<TenantDto>(tenantsKeys.detail(data.id), data);
			qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(data.slug), data);
			qc.invalidateQueries({ queryKey: tenantsKeys.list() });
		}
	}));
}
