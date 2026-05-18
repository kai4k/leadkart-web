/**
 * TanStack Query hooks for the operator people surface.
 *
 * NOTE: The backend does not yet expose GET /v1/platform/persons (list).
 * Until it ships, the list surface uses direct UUID lookup (lookupById
 * approach from OperatorPeopleStore). The queries here handle detail +
 * memberships, and mutations. Once the backend ships the list endpoint,
 * add personListQuery() following the same pattern.
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';

// ── Query key factory ──────────────────────────────────────────────

export const peopleKeys = {
	all: ['persons'] as const,
	detail: (id: string) => [...peopleKeys.all, 'detail', id] as const,
	memberships: (id: string) => [...peopleKeys.all, 'memberships', id] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/** Single person by ID — operator-scoped (platform.users.view). */
export function personDetailQuery(personId: string) {
	return createQuery(() => ({
		queryKey: peopleKeys.detail(personId),
		queryFn: () => api.getPerson(personId),
		enabled: !!personId
	}));
}

/** Cross-tenant memberships for a person — operator-scoped. */
export function personMembershipsQuery(personId: string) {
	return createQuery(() => ({
		queryKey: peopleKeys.memberships(personId),
		queryFn: () => api.listPersonMemberships(personId),
		enabled: !!personId
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────

/** Globally suspend a person across all tenants. */
export function globalSuspendMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.globalSuspend(id, { reason }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: peopleKeys.detail(vars.id) });
			toast('success', 'Person globally suspended');
		}
	}));
}

/** Lift an existing global suspension. */
export function liftGlobalSuspensionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.liftGlobalSuspension(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: peopleKeys.detail(id) });
			toast('success', 'Suspension lifted');
		}
	}));
}

/** Irreversibly anonymise a Person (DPDP). */
export function anonymisePersonMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.anonymisePerson(id, { reason }),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: peopleKeys.detail(vars.id) });
			toast('success', 'Person anonymised');
		}
	}));
}
