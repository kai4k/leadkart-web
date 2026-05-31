/**
 * TanStack Query hooks for audit activity endpoints.
 */
import { createQuery } from '@tanstack/svelte-query';
import * as api from './api';
import type { ActivityParams } from './api';

const activityKeys = {
	tenant: (tenantId: string, params?: ActivityParams) =>
		['activity', 'tenant', tenantId, params ?? {}] as const,
	person: (personId: string, params?: ActivityParams) =>
		['activity', 'person', personId, params ?? {}] as const,
	me: (params?: ActivityParams) => ['activity', 'me', params ?? {}] as const
};

export function tenantActivityQuery(tenantId: string, params?: ActivityParams) {
	return createQuery(() => ({
		queryKey: activityKeys.tenant(tenantId, params),
		queryFn: () => api.listTenantActivity(tenantId, params),
		enabled: Boolean(tenantId),
		staleTime: 60_000
	}));
}

export function personActivityQuery(personId: string, params?: ActivityParams) {
	return createQuery(() => ({
		queryKey: activityKeys.person(personId, params),
		queryFn: () => api.listPersonActivity(personId, params),
		enabled: Boolean(personId),
		staleTime: 60_000
	}));
}

export function myActivityQuery(params?: ActivityParams) {
	return createQuery(() => ({
		queryKey: activityKeys.me(params),
		queryFn: () => api.listMyActivity(params),
		staleTime: 60_000
	}));
}
