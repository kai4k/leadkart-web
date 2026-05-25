/**
 * TanStack Query hooks for the tenant-self feature.
 *
 * All server state flows through these hooks. tenantSelfQuery fetches
 * the caller's own tenant; the five update mutations PATCH and then
 * invalidate the cache so the query layer re-fetches canonical state.
 *
 * API note: @tanstack/svelte-query v6 uses Accessor<Options> — options
 * must be wrapped in a function `() => ({ ... })`. Results are Svelte 5
 * reactive state accessed directly (no `$` prefix needed).
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { toast } from '$ui';
import * as api from './api';
import type {
	Tenant,
	UpdateTenantProfileRequest,
	UpdateTenantStatutoryRequest,
	UpdateTenantAdminContactRequest,
	UpdateTenantSettingsRequest,
	UpdateTenantDisplayPreferencesRequest
} from './types';

// ── Query key factory ──────────────────────────────────────────────

export const tenantSelfKeys = {
	all: ['tenant-self'] as const,
	detail: (tenantId: string) => [...tenantSelfKeys.all, tenantId] as const
};

// ── Query hooks ────────────────────────────────────────────────────

/**
 * The caller's own tenant — GET /v1/tenants/:tenantId.
 * tenantId is the JWT claim; passed by the layout from the session.
 */
export function tenantSelfQuery(tenantId: string) {
	return createQuery(() => ({
		queryKey: tenantSelfKeys.detail(tenantId),
		queryFn: () => api.getTenant(tenantId),
		enabled: Boolean(tenantId),
		staleTime: 2 * 60_000
	}));
}

// ── Mutation hooks ─────────────────────────────────────────────────

/** PATCH /v1/tenants/:id/profile — legal_name + display_name. */
export function updateTenantProfileMutation(tenantId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: UpdateTenantProfileRequest) => api.updateTenantProfile(tenantId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantSelfKeys.detail(tenantId) });
			toast('success', 'Profile saved');
		}
	}));
}

/** PATCH /v1/tenants/:id/statutory — GST / PAN / drug licence. */
export function updateTenantStatutoryMutation(tenantId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: UpdateTenantStatutoryRequest) => api.updateTenantStatutory(tenantId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantSelfKeys.detail(tenantId) });
			toast('success', 'Statutory IDs saved');
		}
	}));
}

/** PATCH /v1/tenants/:id/admin-contact — phone + address. */
export function updateTenantAdminContactMutation(tenantId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: UpdateTenantAdminContactRequest) =>
			api.updateTenantAdminContact(tenantId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantSelfKeys.detail(tenantId) });
			toast('success', 'Contact details saved');
		}
	}));
}

/** PATCH /v1/tenants/:id/settings — password policy. */
export function updateTenantSettingsMutation(tenantId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: UpdateTenantSettingsRequest) => api.updateTenantSettings(tenantId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantSelfKeys.detail(tenantId) });
			toast('success', 'Settings saved');
		}
	}));
}

/** PATCH /v1/tenants/:id/display-preferences — locale / tz / date / currency. */
export function updateTenantDisplayPreferencesMutation(tenantId: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: UpdateTenantDisplayPreferencesRequest) =>
			api.updateTenantDisplayPreferences(tenantId, body),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: tenantSelfKeys.detail(tenantId) });
			toast('success', 'Display preferences saved');
		}
	}));
}

export type { Tenant };
