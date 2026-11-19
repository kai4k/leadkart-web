/**
 * Auth feature query hooks.
 *
 * myCapabilitiesQuery — server-driven capability discovery per ADR 0038 N1.
 * myProfileQuery      — caller's own membership profile (GET /v1/users/:id).
 * mySessionsQuery     — caller's active session families.
 * revokeSessionMutation, revokeOtherSessionsMutation.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { page } from '$app/state';
import { useOptimisticMutation } from '#lib/hooks/index.ts';
import * as api from './api';
import type { SessionDto } from './types';
import type { Capabilities } from './capabilities';
export { hasCapability } from './capabilities';

export const capabilitiesKey = ['me', 'capabilities'] as const;
const profileKey = (membershipId: string) => ['me', 'profile', membershipId] as const;
const sessionsKey = ['me', 'sessions'] as const;

// ── Capabilities ───────────────────────────────────────────────────

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
		queryFn: ({ signal }) => api.getMyCapabilities(signal),
		// SSR-bootstrapped initial data from the (app) root layout server load.
		// On first render this is baked into the page HTML — no loading skeleton,
		// no network call needed before the nav renders. TanStack treats
		// initialDataUpdatedAt=0 as stale and fires a background refetch to
		// pick up any permission changes that happened mid-session.
		initialData: () => (page.data as { capabilities?: Capabilities }).capabilities,
		initialDataUpdatedAt: 0,
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		retry: 1
	}));
}

// ── Profile ────────────────────────────────────────────────────────

/**
 * Caller's own membership profile. membershipId comes from the session
 * principal (injected by the layout or caller).
 */
export function myProfileQuery(getMembershipId: () => string) {
	return createQuery(() => {
		const membershipId = getMembershipId();
		return {
			queryKey: profileKey(membershipId),
			queryFn: ({ signal }) => api.getMyProfile(membershipId, signal),
			enabled: Boolean(membershipId),
			staleTime: 2 * 60_000
		};
	});
}

// ── Sessions ───────────────────────────────────────────────────────

/** Caller's active session families. */
export function mySessionsQuery() {
	return createQuery(() => ({
		queryKey: sessionsKey,
		queryFn: ({ signal }) => api.listSessions(signal),
		staleTime: 60_000
	}));
}

/** Revoke a single session family. Optimistic: removes it from the list immediately. */
export function revokeSessionMutation() {
	const qc = useQueryClient();
	return useOptimisticMutation<string, void, { previous?: SessionDto[] }>({
		fn: (familyId) => api.revokeSession(familyId),
		cancelKeys: () => [sessionsKey],
		onMutate: () => ({ previous: qc.getQueryData<SessionDto[]>(sessionsKey) }),
		applyOptimistic: (familyId, { previous }) => {
			if (previous) {
				qc.setQueryData<SessionDto[]>(
					sessionsKey,
					previous.filter((s) => s.family_id !== familyId)
				);
			}
		},
		rollback: (_familyId, { previous }) => {
			if (previous) qc.setQueryData<SessionDto[]>(sessionsKey, previous);
		},
		invalidate: () => [sessionsKey],
		successToast: 'Session revoked'
	});
}

/**
 * Revoke every session family except `keepFamilyId` (the caller's own, when known).
 * The id travels in the variables: `mutate({ keepFamilyId })`.
 */
export function revokeOtherSessionsMutation() {
	const qc = useQueryClient();
	return useOptimisticMutation<
		{ keepFamilyId: string | null },
		{ revoked_count: number },
		{ previous?: SessionDto[] }
	>({
		fn: () => api.revokeOtherSessions('user_revoked_others'),
		cancelKeys: () => [sessionsKey],
		onMutate: () => ({ previous: qc.getQueryData<SessionDto[]>(sessionsKey) }),
		applyOptimistic: ({ keepFamilyId }, { previous }) => {
			if (previous && keepFamilyId) {
				qc.setQueryData<SessionDto[]>(
					sessionsKey,
					previous.filter((s) => s.family_id === keepFamilyId)
				);
			}
		},
		rollback: (_vars, { previous }) => {
			if (previous) qc.setQueryData<SessionDto[]>(sessionsKey, previous);
		},
		invalidate: () => [sessionsKey],
		successToast: (_vars, { revoked_count }) =>
			revoked_count > 0
				? `Signed out ${revoked_count} other device${revoked_count === 1 ? '' : 's'}`
				: 'No other sessions to revoke'
	});
}
