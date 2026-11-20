/**
 * Auth feature query hooks.
 *
 * myProfileQuery      — caller's own membership profile (GET /v1/users/:id).
 * mySessionsQuery     — caller's active session families.
 * revokeSessionMutation, revokeOtherSessionsMutation.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { queryRoots } from '#lib/api/query-keys.ts';
import { useOptimisticMutation } from '#lib/hooks/index.ts';
import * as api from './api';
import type { SessionDto } from './types';

const profileKey = (membershipId: string) => ['me', 'profile', membershipId] as const;
const sessionsKey = queryRoots.mySessions;

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
