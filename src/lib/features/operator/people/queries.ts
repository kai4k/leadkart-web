/**
 * TanStack Query hooks for the operator people surface.
 */
import { createQuery } from '@tanstack/svelte-query';
import * as api from './api';
import type { PersonListParams } from './api';
import { createResourceMutation } from '#lib/api/mutations.ts';

// ── Query key factory ──────────────────────────────────────────────

const peopleKeys = {
	all: ['persons'] as const,
	list: (params?: PersonListParams) => [...peopleKeys.all, 'list', params ?? {}] as const,
	detail: (id: string) => [...peopleKeys.all, 'detail', id] as const,
	memberships: (id: string) => [...peopleKeys.all, 'memberships', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/** Persons list with optional search — operator-scoped (platform.users.view). */
export function personsListQuery(params?: PersonListParams) {
	return createQuery(() => ({
		queryKey: peopleKeys.list(params),
		queryFn: () => api.listPersons(params),
		enabled: true,
		staleTime: 30_000
	}));
}

/** Single person by ID — operator-scoped (platform.users.view). */
export function personDetailQuery(personId: string) {
	return createQuery(() => ({
		queryKey: peopleKeys.detail(personId),
		queryFn: () => api.getPerson(personId),
		enabled: Boolean(personId)
	}));
}

/** Cross-tenant memberships for a person — operator-scoped. */
export function personMembershipsQuery(personId: string) {
	return createQuery(() => ({
		queryKey: peopleKeys.memberships(personId),
		queryFn: () => api.listPersonMemberships(personId),
		enabled: Boolean(personId)
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

/** Irreversibly anonymise a Person (DPDP). inlineErrors: the dialog shows the failure. */
export function anonymisePersonMutation() {
	return createResourceMutation({
		fn: ({ id, reason }: { id: string; reason: string }) => api.anonymisePerson(id, { reason }),
		invalidate: ({ id }) => [peopleKeys.detail(id)],
		successToast: 'Person anonymised',
		inlineErrors: true
	});
}
