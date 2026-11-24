/**
 * TanStack Query hooks for the operator people surface.
 */
import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
import * as api from './api';
import { createResourceMutation } from '#lib/api/mutations.ts';

// ── Query key factory ──────────────────────────────────────────────

const peopleKeys = {
	all: ['persons'] as const,
	search: (q: string) => [...peopleKeys.all, 'search', q] as const,
	detail: (id: string) => [...peopleKeys.all, 'detail', id] as const,
	memberships: (id: string) => [...peopleKeys.all, 'memberships', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/** What the search box may send: Go reads 2 to 100 characters of `q`. */
export const PERSON_SEARCH_MIN = 2;

/**
 * Persons that match a search: email or name. Go has no "list every person" route, so nothing is
 * asked until there is a query of at least 2 characters (`GET /v1/search?include=persons`).
 */
export function personsSearchQuery(getQuery: () => string) {
	return createQuery(() => {
		const q = getQuery();
		return {
			queryKey: peopleKeys.search(q),
			queryFn: ({ signal }) => api.searchPersons(q, signal),
			enabled: q.length >= PERSON_SEARCH_MIN,
			placeholderData: keepPreviousData,
			staleTime: 30_000
		};
	});
}

/** Single person by ID, created once: the id is read each time the query runs (platform.users.view). */
export function personDetailQuery(personId: () => string) {
	return createQuery(() => ({
		queryKey: peopleKeys.detail(personId()),
		queryFn: () => api.getPerson(personId()),
		enabled: Boolean(personId())
	}));
}

/** Cross-tenant memberships for a person, created once — operator-scoped. */
export function personMembershipsQuery(personId: () => string) {
	return createQuery(() => ({
		queryKey: peopleKeys.memberships(personId()),
		queryFn: () => api.listPersonMemberships(personId()),
		enabled: Boolean(personId())
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────

/** Globally suspend a person across all tenants. inlineErrors: the dialog shows the failure. */
export function globalSuspendMutation() {
	return createResourceMutation({
		fn: ({ id, reason }: { id: string; reason: string }) => api.globalSuspend(id, { reason }),
		invalidate: ({ id }) => [peopleKeys.detail(id)],
		successToast: 'Person globally suspended',
		inlineErrors: true
	});
}

/** Lift an existing global suspension. */
export function liftGlobalSuspensionMutation() {
	return createResourceMutation({
		fn: (id: string) => api.liftGlobalSuspension(id),
		invalidate: (id) => [peopleKeys.detail(id)],
		successToast: 'Suspension lifted'
	});
}
