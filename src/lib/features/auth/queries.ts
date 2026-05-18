/**
 * Auth feature query hooks.
 *
 * myCapabilitiesQuery — bridge surface for server-driven capability discovery.
 *
 * TODAY: synthesizes the capability set from JWT claims via tier.ts.
 * The query wraps synchronous derivation in the TanStack Query cache so
 * the adoption path is clean — when backend ships
 * GET /v1/auth/me/capabilities (ADR 0038 N1), only the queryFn changes.
 *
 * Components should consume `myCapabilitiesQuery()` instead of importing
 * `session.principal` + `tier.ts` directly. Adoption is a follow-up —
 * this commit plants the hook; migration is incremental.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery } from '@tanstack/svelte-query';
import { session } from './stores/session.svelte';
import { tierOf } from './tier';
import type { PrincipalTier } from './tier';

export const capabilitiesKey = ['me', 'capabilities'] as const;

export type Capabilities = {
	tier: PrincipalTier;
	permissions: ReadonlyArray<string>;
	isPlatform: boolean;
	isSuperUser: boolean;
	tenantId: string | null;
	tenantSlug: string | null;
};

/**
 * Returns a TanStack Query for the current user's capability set.
 *
 * staleTime: 5 min — capabilities rarely change mid-session; background
 * refetch on window focus still fires to pick up permission updates.
 * gcTime: 30 min — keeps the result warm across route navigations.
 *
 * TODO(backend N1): replace queryFn body with:
 *   return api.getMyCapabilities();
 * when GET /v1/auth/me/capabilities ships.
 */
export function myCapabilitiesQuery() {
	return createQuery(() => ({
		queryKey: capabilitiesKey,
		queryFn: async (): Promise<Capabilities> => {
			// TODO(backend N1): replace with api.getMyCapabilities() once shipped.
			// This synthesizes the capability set from JWT claims — same data,
			// different source. Swap is a one-line change when backend ships.
			const principal = session.principal;
			return {
				tier: tierOf(principal),
				permissions: principal?.permissions ?? [],
				isPlatform: principal?.isPlatform ?? false,
				isSuperUser: principal?.isSuperUser ?? false,
				tenantId: principal?.tenantId ?? null,
				tenantSlug: principal?.tenantSlug ?? null
			};
		},
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000
	}));
}

/**
 * Convenience helper — readable by components that just need a boolean
 * for a single permission check.
 *
 * Usage:
 *   const caps = myCapabilitiesQuery();
 *   const canSuspend = $derived(
 *     caps.data?.isSuperUser || (caps.data?.permissions ?? []).includes('platform.tenants.manage')
 *   );
 *
 * This pattern replaces direct `hasPermission(session.principal, perm)` calls.
 * Migration is a follow-up — adoption is incremental.
 */
export function hasCapability(caps: Capabilities | undefined, permission: string): boolean {
	if (!caps) return false;
	if (caps.isSuperUser) return true;
	return caps.permissions.includes(permission);
}
