/**
 * TenantStore tests — Service layer behaviour against a mocked gateway
 * and a mocked session store. Verifies the load + update-then-reload
 * pattern at the orchestration level, distinct from the Zod boundary
 * tests in `schemas.test.ts`.
 *
 * Each test instantiates a fresh `TenantStore` (not the singleton) so
 * status / current state never leak across tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSessionPrincipal = vi.hoisted(() => ({
	current: { tenantId: 'tid-1' } as { tenantId: string } | null
}));

vi.mock('$lib/features/auth/stores/session.svelte', () => ({
	session: {
		get principal() {
			return mockSessionPrincipal.current;
		}
	}
}));

vi.mock('$lib/features/tenant/api', () => ({
	getTenant: vi.fn(),
	updateTenantProfile: vi.fn(),
	updateTenantStatutory: vi.fn(),
	updateTenantAdminContact: vi.fn(),
	updateTenantSettings: vi.fn(),
	updateTenantDisplayPreferences: vi.fn()
}));

import * as gateway from '$lib/features/tenant/api';
import { TenantStore } from '$lib/features/tenant/stores/tenant.svelte';
import type { Tenant } from '$lib/features/tenant/types';

const FIXTURE: Tenant = {
	id: 'tid-1',
	slug: 'acme-pharma',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	admin_email: 'admin@acme.test',
	status: 'active',
	created_at: '2026-01-15T10:30:00Z',
	admin_address: { city: 'Mumbai', state_code: '27' },
	password_policy: {
		min_length: 12,
		require_uppercase: true,
		require_lowercase: true,
		require_digit: true,
		require_symbol: false,
		max_failed_attempts: 5,
		lockout_minutes: 15
	}
};

const mocked = vi.mocked(gateway);

beforeEach(() => {
	vi.clearAllMocks();
	mockSessionPrincipal.current = { tenantId: 'tid-1' };
});

describe('TenantStore.load', () => {
	it('transitions idle → ready and populates current on success', async () => {
		mocked.getTenant.mockResolvedValueOnce(FIXTURE);
		const store = new TenantStore();
		expect(store.status).toBe('idle');

		await store.load();

		expect(mocked.getTenant).toHaveBeenCalledWith('tid-1');
		expect(store.status).toBe('ready');
		expect(store.current).toEqual(FIXTURE);
	});

	it('transitions to error and rethrows on gateway failure', async () => {
		const boom = new Error('500 internal');
		mocked.getTenant.mockRejectedValueOnce(boom);
		const store = new TenantStore();

		await expect(store.load()).rejects.toBe(boom);
		expect(store.status).toBe('error');
		expect(store.current).toBeNull();
	});

	it('throws when the session has no tenantId', async () => {
		mockSessionPrincipal.current = null;
		const store = new TenantStore();
		await expect(store.load()).rejects.toThrow(/authenticated session/i);
		expect(mocked.getTenant).not.toHaveBeenCalled();
	});
});

describe('TenantStore mutators', () => {
	it('updateProfile PATCHes then reloads to capture server-canonicalised state', async () => {
		mocked.updateTenantProfile.mockResolvedValueOnce(undefined);
		const after: Tenant = { ...FIXTURE, legal_name: 'Acme Pharmaceuticals' };
		mocked.getTenant.mockResolvedValueOnce(after);

		const store = new TenantStore();
		await store.updateProfile({ legal_name: 'Acme Pharmaceuticals', display_name: 'Acme' });

		expect(mocked.updateTenantProfile).toHaveBeenCalledWith('tid-1', {
			legal_name: 'Acme Pharmaceuticals',
			display_name: 'Acme'
		});
		expect(mocked.getTenant).toHaveBeenCalledWith('tid-1');
		expect(store.current?.legal_name).toBe('Acme Pharmaceuticals');
		expect(store.status).toBe('ready');
	});

	it('updateStatutory propagates a gateway failure without reloading', async () => {
		const boom = new Error('422 invalid');
		mocked.updateTenantStatutory.mockRejectedValueOnce(boom);
		const store = new TenantStore();

		await expect(
			store.updateStatutory({ gst_number: 'BAD', pan_number: '', drug_licence_number: '' })
		).rejects.toBe(boom);
		expect(mocked.getTenant).not.toHaveBeenCalled();
	});

	it('updateAdminContact, updateSettings, updateDisplayPreferences each PATCH+reload', async () => {
		mocked.updateTenantAdminContact.mockResolvedValueOnce(undefined);
		mocked.updateTenantSettings.mockResolvedValueOnce(undefined);
		mocked.updateTenantDisplayPreferences.mockResolvedValueOnce(undefined);
		mocked.getTenant.mockResolvedValue(FIXTURE);

		const store = new TenantStore();
		await store.updateAdminContact({ phone: '+91999', address: {} });
		await store.updateSettings({ password_policy: FIXTURE.password_policy });
		await store.updateDisplayPreferences({
			locale: 'en-IN',
			time_zone: 'Asia/Kolkata',
			date_format: 'dd-MM-yyyy',
			currency: 'INR'
		});

		expect(mocked.updateTenantAdminContact).toHaveBeenCalledOnce();
		expect(mocked.updateTenantSettings).toHaveBeenCalledOnce();
		expect(mocked.updateTenantDisplayPreferences).toHaveBeenCalledOnce();
		expect(mocked.getTenant).toHaveBeenCalledTimes(3);
	});
});

describe('TenantStore.reset', () => {
	it('clears current and returns status to idle', async () => {
		mocked.getTenant.mockResolvedValueOnce(FIXTURE);
		const store = new TenantStore();
		await store.load();
		expect(store.status).toBe('ready');

		store.reset();

		expect(store.current).toBeNull();
		expect(store.status).toBe('idle');
	});
});
