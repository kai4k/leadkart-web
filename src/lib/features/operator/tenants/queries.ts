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
import { NotFoundError } from '$lib/api/errors';
import { toast } from '$ui';
import type { RegisterTenantRequest, TenantDto } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 *
 * Cache-seeding: after fetch, populate the per-tenant detail + by-slug
 * cache entries so navigating into a tenant from the list resolves
 * INSTANTLY from cache — no second round-trip needed. This is the
 * canonical pattern (Stripe, GitHub, Linear, Vercel): populate
 * downstream caches at the upstream fetch point.
 */
export function tenantsListQuery() {
	const qc = useQueryClient();
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: async () => {
			const result = await api.listTenants();
			for (const tenant of result.tenants) {
				qc.setQueryData<TenantDto>(tenantsKeys.detail(tenant.id), tenant);
				qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(tenant.slug), tenant);
			}
			return result;
		}
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
 * Single tenant by slug OR UUID — canonical route lookup per ADR 0038 A.3.
 *
 * Resolution order (cheapest first):
 *   1. Try the by-slug cache — populated by tenantsListQuery when the
 *      operator visits /operator/tenants. Instant; no network.
 *   2. Scan the list cache for a tenant matching by slug. Also instant.
 *   3. UUID input → GET /v1/tenants/{id} (stable endpoint).
 *   4. Slug input → GET /v1/tenants/by-slug/{slug} (ADR 0038 A.3 — not yet
 *      shipped on the backend; falls back to null on 404 so the layout
 *      can render a graceful fallback).
 *
 * `retry: false` — avoids hammering a not-yet-shipped endpoint.
 */
export function tenantBySlugQuery(key: string) {
	const qc = useQueryClient();
	const isUuid = UUID_RE.test(key);
	return createQuery(() => ({
		queryKey: tenantsKeys.detailBySlug(key),
		queryFn: async (): Promise<TenantDto | null> => {
			// Cache-first: if the list has been loaded, find this tenant
			// in the cached collection. No network call needed.
			const cachedList = qc.getQueryData<{ tenants: TenantDto[] }>(tenantsKeys.list());
			if (cachedList?.tenants) {
				const hit = cachedList.tenants.find((t) => t.slug === key || t.id === key);
				if (hit) {
					// Backfill the per-detail caches so subsequent lookups
					// resolve directly via tenantDetailQuery too.
					qc.setQueryData<TenantDto>(tenantsKeys.detail(hit.id), hit);
					return hit;
				}
			}
			// Cache miss — go to the network.
			if (isUuid) {
				return await api.getTenant(key);
			}
			try {
				return await api.getTenantBySlug(key);
			} catch (err) {
				if (err instanceof NotFoundError) {
					// Slug-lookup endpoint not yet shipped (ADR 0038 A.3 pending),
					// OR the slug genuinely doesn't match any tenant.
					// Return null so the layout renders a graceful fallback.
					return null;
				}
				throw err;
			}
		},
		enabled: !!key,
		retry: false
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
			toast('success', 'Tenant suspended', {
				action: {
					label: 'Undo',
					onClick: async () => {
						const restored = await api.activateTenant(vars.id);
						qc.setQueryData<TenantDto>(tenantsKeys.detail(vars.id), restored);
						qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(restored.slug), restored);
						qc.invalidateQueries({ queryKey: tenantsKeys.list() });
					}
				},
				duration: 10_000
			});
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
			toast('success', 'Tenant marked for deletion', {
				action: {
					label: 'Undo',
					onClick: async () => {
						const restored = await api.restoreTenant(data.id);
						qc.setQueryData<TenantDto>(tenantsKeys.detail(data.id), restored);
						qc.setQueryData<TenantDto>(tenantsKeys.detailBySlug(restored.slug), restored);
						qc.invalidateQueries({ queryKey: tenantsKeys.list() });
					}
				},
				duration: 10_000
			});
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
