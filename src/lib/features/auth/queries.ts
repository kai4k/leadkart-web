/**
 * Auth feature query hooks.
 *
 * myCapabilitiesQuery — server-driven capability discovery per ADR 0038 N1.
 * Calls GET /v1/auth/me/capabilities; Zod-parses at the boundary.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery } from '@tanstack/svelte-query';
import * as api from './api';
import type { Capabilities } from './api';

export { type Capabilities };

export const capabilitiesKey = ['me', 'capabilities'] as const;

/**
 * Returns a TanStack Query for the current user's capability set.
 *
 * staleTime: 5 min — capabilities rarely change mid-session; background
 * refetch on window focus still fires to pick up permission updates.
 * gcTime: 30 min — keeps the result warm across route navigations.
 */
export function myCapabilitiesQuery() {
	return createQuery(() => ({
		queryKey: capabilitiesKey,
		queryFn: () => api.getMyCapabilities(),
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
 *   const canSuspend = $derived(hasCapability(caps.data, 'platform.tenants.manage'));
 */
export function hasCapability(caps: Capabilities | undefined, permission: string): boolean {
	if (!caps) return false;
	if (caps.is_super_user) return true;
	return caps.permissions.includes(permission);
}
