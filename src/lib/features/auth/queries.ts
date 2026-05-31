/**
 * Auth feature query hooks.
 *
 * myCapabilitiesQuery — server-driven capability discovery per ADR 0038 N1.
 * myProfileQuery      — caller's own membership profile (GET /v1/users/:id).
 * mySessionsQuery     — caller's active session families.
 * updateMyProfileMutation, revokeSessionMutation, revokeOtherSessionsMutation.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { page } from '$app/state';
import { toast } from '$ui';
import * as api from './api';
import type { UpdateProfileRequest, SessionDto } from './types';
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
		queryFn: () => api.getMyCapabilities(),
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
export function myProfileQuery(membershipId: string) {
	return createQuery(() => ({
		queryKey: profileKey(membershipId),
		queryFn: () => api.getMyProfile(membershipId),
		enabled: Boolean(membershipId),
		staleTime: 2 * 60_000
	}));
}

/** PATCH the caller's profile and invalidate the cached profile. */
export function updateMyProfileMutation(membershipId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (patch: UpdateProfileRequest) => api.updateMyProfile(membershipId, patch),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: profileKey(membershipId) });
			toast.success('Profile updated');
		}
	}));
}

// ── Sessions ───────────────────────────────────────────────────────

/** Caller's active session families. */
export function mySessionsQuery() {
	return createQuery(() => ({
		queryKey: sessionsKey,
		queryFn: () => api.listSessions(),
		staleTime: 60_000
	}));
}

/** Revoke a single session family. Optimistic: removes from list immediately. */
export function revokeSessionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (familyId: string) => api.revokeSession(familyId),
		onMutate: async (familyId: string) => {
			await qc.cancelQueries({ queryKey: sessionsKey });
			const previous = qc.getQueryData<SessionDto[]>(sessionsKey);
			if (previous) {
				qc.setQueryData<SessionDto[]>(
					sessionsKey,
					previous.filter((s) => s.family_id !== familyId)
				);
			}
			return { previous };
		},
		onError: (_err: unknown, _vars: string, ctx: { previous?: SessionDto[] } | undefined) => {
			if (ctx?.previous) qc.setQueryData<SessionDto[]>(sessionsKey, ctx.previous);
		},
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: sessionsKey });
			toast.success('Session revoked');
		}
	}));
}

/** Revoke all other session families. Returns the count of revoked sessions. */
export function revokeOtherSessionsMutation(currentFamilyId: string | null) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.revokeOtherSessions('user_revoked_others'),
		onMutate: async () => {
			await qc.cancelQueries({ queryKey: sessionsKey });
			const previous = qc.getQueryData<SessionDto[]>(sessionsKey);
			if (previous && currentFamilyId) {
				qc.setQueryData<SessionDto[]>(
					sessionsKey,
					previous.filter((s) => s.family_id === currentFamilyId)
				);
			}
			return { previous };
		},
		onError: (_err: unknown, _vars: void, ctx: { previous?: SessionDto[] } | undefined) => {
			if (ctx?.previous) qc.setQueryData<SessionDto[]>(sessionsKey, ctx.previous);
		},
		onSuccess: ({ revoked_count }) => {
			void qc.invalidateQueries({ queryKey: sessionsKey });
			if (revoked_count > 0) {
				toast.success(`Signed out ${revoked_count} other device${revoked_count === 1 ? '' : 's'}`);
			} else {
				toast.success('No other sessions to revoke');
			}
		}
	}));
}
