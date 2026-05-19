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
import { toast } from '$ui';
import * as api from './api';
import type { UpdateProfileRequest, SessionDto, SessionPrincipal } from './types';
import { session } from './stores/session.svelte';
import type { Capabilities } from './capabilities';
// Pure helpers — re-exported so components can import from one place
export { hasCapability, type Capabilities } from './capabilities';

/**
 * Synthesise a Capabilities snapshot from JWT claims already in the
 * session store. This is the SOURCE-OF-TRUTH fallback for nav / route-
 * guard rendering — capabilities-endpoint enrichment (first_name,
 * last_name, full roles[]) is a CONVENIENCE on top, not a prerequisite.
 *
 * Pattern source: Auth0, Stripe, Linear all derive client-side gating
 * from JWT claims; the management API call merely enriches. If the
 * network call fails, the JWT-derived caps still drive the UI.
 */
function capabilitiesFromPrincipal(p: SessionPrincipal | null): Capabilities | undefined {
	if (!p) return undefined;
	return {
		person_id: p.personId,
		membership_id: p.membershipId,
		tenant_id: p.tenantId,
		tenant_slug: p.tenantSlug ?? '',
		email: p.email,
		first_name: '',
		last_name: '',
		is_platform: p.isPlatform ?? false,
		is_super_user: p.isSuperUser ?? false,
		permissions: p.permissions ?? [],
		roles: []
	};
}

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
		// JWT-derived caps render the nav / route guards INSTANTLY,
		// before the network call resolves. If the call fails, this
		// fallback stays in place so the UI never breaks because of a
		// missing or slow capabilities endpoint.
		initialData: () => capabilitiesFromPrincipal(session.principal),
		// `initialData` populates the cache as if it were fetched at the
		// epoch (initialDataUpdatedAt = 0), so a stale check on first
		// render triggers the real fetch to refine the data.
		initialDataUpdatedAt: 0,
		// Same staleTime as before — caps rarely change mid-session.
		staleTime: 5 * 60_000,
		gcTime: 30 * 60_000,
		// If the network call fails, fall back to JWT-derived caps
		// rather than removing the user's nav. The query's `data` stays
		// the initialData snapshot; `isError` is still true so
		// components that care can show a quiet "couldn't refresh" hint.
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
		enabled: !!membershipId,
		staleTime: 2 * 60_000
	}));
}

/** PATCH the caller's profile and invalidate the cached profile. */
export function updateMyProfileMutation(membershipId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (patch: UpdateProfileRequest) => api.updateMyProfile(membershipId, patch),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: profileKey(membershipId) });
			toast('success', 'Profile updated');
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
			qc.invalidateQueries({ queryKey: sessionsKey });
			toast('success', 'Session revoked');
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
			qc.invalidateQueries({ queryKey: sessionsKey });
			if (revoked_count > 0) {
				toast(
					'success',
					`Signed out ${revoked_count} other device${revoked_count === 1 ? '' : 's'}`
				);
			} else {
				toast('success', 'No other sessions to revoke');
			}
		}
	}));
}
