/**
 * Tenant store — Svelte 5 class-based reactive store fused with the
 * Service layer of the Gateway → Service → ViewModel → Component
 * flow. Owns:
 *
 *   • The currently-loaded tenant snapshot (one per signed-in
 *     session) so multiple Settings forms read consistent state
 *     without each refetching.
 *   • Orchestration of the 5 update endpoints — every mutator
 *     PATCHes then re-loads to capture server-side canonicalization
 *     (e.g. the aggregate trims/normalises GST format).
 *
 * Mirrors the pattern of `features/auth/stores/session.svelte.ts`:
 * one class, $state-backed fields, exported as a module-level
 * singleton. Module-level `let foo = $state(...)` + accessor
 * functions is BANNED per CLAUDE.md (silently breaks reactivity
 * across module boundaries).
 *
 * Errors propagate to callers — components own their own error UX
 * (Alert / toast / inline field). The store tracks status only.
 */

import { session } from '$lib/features/auth/stores/session.svelte';
import {
	getTenant,
	updateTenantAdminContact,
	updateTenantDisplayPreferences,
	updateTenantProfile,
	updateTenantSettings,
	updateTenantStatutory
} from '../api';
import type {
	Tenant,
	UpdateTenantAdminContactRequest,
	UpdateTenantDisplayPreferencesRequest,
	UpdateTenantProfileRequest,
	UpdateTenantSettingsRequest,
	UpdateTenantStatutoryRequest
} from '../types';

export type TenantStatus = 'idle' | 'loading' | 'ready' | 'error';

export class TenantStore {
	current = $state<Tenant | null>(null);
	status = $state<TenantStatus>('idle');

	async load(): Promise<void> {
		const id = this.requireTenantId();
		this.status = 'loading';
		try {
			this.current = await getTenant(id);
			this.status = 'ready';
		} catch (err) {
			this.status = 'error';
			throw err;
		}
	}

	async updateProfile(body: UpdateTenantProfileRequest): Promise<void> {
		const id = this.requireTenantId();
		await updateTenantProfile(id, body);
		await this.load();
	}

	async updateStatutory(body: UpdateTenantStatutoryRequest): Promise<void> {
		const id = this.requireTenantId();
		await updateTenantStatutory(id, body);
		await this.load();
	}

	async updateAdminContact(body: UpdateTenantAdminContactRequest): Promise<void> {
		const id = this.requireTenantId();
		await updateTenantAdminContact(id, body);
		await this.load();
	}

	async updateSettings(body: UpdateTenantSettingsRequest): Promise<void> {
		const id = this.requireTenantId();
		await updateTenantSettings(id, body);
		await this.load();
	}

	async updateDisplayPreferences(body: UpdateTenantDisplayPreferencesRequest): Promise<void> {
		const id = this.requireTenantId();
		await updateTenantDisplayPreferences(id, body);
		await this.load();
	}

	reset() {
		this.current = null;
		this.status = 'idle';
	}

	private requireTenantId(): string {
		const id = session.principal?.tenantId;
		if (!id) {
			// Reaching here means a tenant-feature call slipped past the
			// (app) auth guard in routes/(app)/+layout.ts. Surface as a
			// loud error so the wiring bug is visible — components should
			// never see this in practice.
			throw new Error('tenant store called without an authenticated session');
		}
		return id;
	}
}

export const tenant = new TenantStore();
