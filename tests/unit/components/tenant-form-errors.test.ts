import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

vi.mock('$app/forms', () => ({
	enhance: () => ({ destroy() {} }),
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/navigation', () => ({
	goto: async () => {},
	invalidate: async () => {},
	beforeNavigate: () => {}
}));
vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp' }, form: null } }));
vi.mock('$features/auth', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	session: { can: () => true }
}));

import TenantContactForm from '#lib/features/tenant/components/TenantContactForm.svelte';
import TenantDisplayPreferencesForm from '#lib/features/tenant/components/TenantDisplayPreferencesForm.svelte';
import TenantSecurityForm from '#lib/features/tenant/components/TenantSecurityForm.svelte';
import type { Tenant } from '#lib/features/tenant/types.ts';

const tenant = {
	id: '00000000-0000-4000-8000-000000000001',
	slug: 'acme',
	legal_name: 'Acme',
	display_name: 'Acme',
	status: 'active',
	created_at: '2026-01-01T00:00:00Z',
	admin_phone: '9999999999',
	admin_address: {
		street: 's',
		city: 'c',
		district: 'd',
		state: 'st',
		state_code: '07',
		pincode: '110001'
	},
	password_policy: {
		min_length: 8,
		require_uppercase: true,
		require_lowercase: true,
		require_digit: true,
		require_symbol: true,
		max_failed_attempts: 5,
		lockout_minutes: 15
	},
	locale: 'en-IN',
	time_zone: 'Asia/Kolkata',
	date_format: 'dd-MM-yyyy',
	currency: 'INR'
} as Tenant;

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

const CASES = [
	{
		name: 'TenantContactForm',
		Form: TenantContactForm,
		fields: [
			'phone',
			'address.street',
			'address.city',
			'address.district',
			'address.state',
			'address.state_code',
			'address.pincode'
		]
	},
	{
		name: 'TenantDisplayPreferencesForm',
		Form: TenantDisplayPreferencesForm,
		fields: ['locale', 'time_zone', 'date_format', 'currency']
	},
	{
		name: 'TenantSecurityForm',
		Form: TenantSecurityForm,
		fields: [
			'password_policy.min_length',
			'password_policy.require_uppercase',
			'password_policy.require_lowercase',
			'password_policy.require_digit',
			'password_policy.require_symbol'
		]
	}
] as const;

describe('the tenant settings forms show a server error on the field it names', () => {
	for (const { name, Form, fields } of CASES) {
		for (const field of fields) {
			it(`${name}: ${field}`, async () => {
				component = mount(Form, {
					target,
					props: {
						tenant,
						form: { values: {}, fieldMessages: { [field]: 'form.invalid' } }
					}
				});
				flushSync();
				await tick();
				await tick();
				const invalid = [...target.querySelectorAll('[aria-invalid="true"]')];
				expect(invalid, 'one control marked invalid').toHaveLength(1);
				const alert = target.querySelector('[data-slot="field-error"], [role="alert"]');
				expect(alert?.textContent?.trim()).toBeTruthy();
				const describedBy = invalid[0].getAttribute('aria-describedby') ?? '';
				expect(describedBy).toContain('-error');
			});
		}
	}
});
