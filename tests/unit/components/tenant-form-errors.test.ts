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
import TenantStatutoryForm from '#lib/features/tenant/components/TenantStatutoryForm.svelte';
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
				// and it is the control the server named, not a neighbour (a swapped pair of bindings would pass without this)
				expect(invalid[0].getAttribute('name')).toBe(field.replace(/^password_policy\./, ''));
				const alert = target.querySelector('[data-slot="field-error"], [role="alert"]');
				expect(alert?.textContent?.trim()).toBeTruthy();
				const describedBy = invalid[0].getAttribute('aria-describedby') ?? '';
				expect(describedBy).toContain('-error');
			});
		}
	}
});

/** What Go now sends (BFF_API_CHANGES, 44ff2b1): each refused part of the address, and the value objects, by CODE. */
const GO_CODES: [string, typeof TenantContactForm, string, string][] = [
	[
		'phone',
		TenantContactForm,
		'invalid_phone',
		'Enter the number with + and country code, for example +919876543210.'
	],
	['address.street', TenantContactForm, 'required', 'This field is required.'],
	['address.street', TenantContactForm, 'too_long', 'This is too long.'],
	['address.city', TenantContactForm, 'required', 'This field is required.'],
	['address.city', TenantContactForm, 'too_long', 'This is too long.'],
	[
		'address.city',
		TenantContactForm,
		'invalid_city',
		'This pincode does not serve this city. Check the city and the pincode.'
	],
	['address.district', TenantContactForm, 'too_long', 'This is too long.'],
	['address.state', TenantContactForm, 'required', 'This field is required.'],
	['address.state', TenantContactForm, 'too_long', 'This is too long.'],
	['address.state_code', TenantContactForm, 'too_long', 'This is too long.'],
	['address.pincode', TenantContactForm, 'required', 'This field is required.'],
	[
		'address.pincode',
		TenantContactForm,
		'invalid_pincode',
		'Enter a 6-digit PIN code that does not start with 0.'
	]
];

describe('a Go field code reads as a sentence on the control named by its key', () => {
	for (const [field, Form, code, sentence] of GO_CODES) {
		it(`${field}: ${code}`, async () => {
			component = mount(Form, {
				target,
				props: { tenant, form: { values: {}, fieldMessages: { [field]: code } } }
			});
			flushSync();
			await tick();
			await tick();
			const invalid = [...target.querySelectorAll('[aria-invalid="true"]')];
			expect(invalid.map((el) => el.getAttribute('name'))).toEqual([field]);
			expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe(sentence);
		});
	}

	it('the whole-address fallback (invalid_address) shows under the "Postal address" legend', async () => {
		component = mount(TenantContactForm, {
			target,
			props: { tenant, form: { values: {}, fieldMessages: { address: 'invalid_address' } } }
		});
		flushSync();
		await tick();
		const fieldset = target.querySelector('fieldset.stack')!;
		expect(fieldset.querySelector('legend')?.textContent).toContain('Postal address');
		const error = fieldset.querySelector('[data-slot="field-error"]');
		expect(error?.textContent?.trim()).toBe('Check the street, city, state and pincode.');
		expect(fieldset.getAttribute('aria-describedby')).toBe(error?.id);
	});

	it.each([
		['gst_number', 'invalid_gstin', 'Enter a valid 15-character GSTIN.'],
		['pan_number', 'invalid_pan', 'Enter a valid PAN, for example AAAAA9999A.'],
		[
			'drug_licence_number',
			'invalid_drug_licence',
			'Use 8 to 30 capital letters, digits, dashes, slashes or spaces, with at least one letter and one digit.'
		]
	])('statutory %s: %s', async (field, code, sentence) => {
		component = mount(TenantStatutoryForm, {
			target,
			props: { tenant, form: { values: {}, fieldMessages: { [field]: code } } }
		});
		flushSync();
		await tick();
		await tick();
		const invalid = [...target.querySelectorAll('[aria-invalid="true"]')];
		expect(invalid.map((el) => el.getAttribute('name'))).toEqual([field]);
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe(sentence);
	});
});

describe('M-6: the minimum password length allows what Go allows (8 to 128)', () => {
	it('the number input is bounded at 128', async () => {
		component = mount(TenantSecurityForm, { target, props: { tenant } });
		flushSync();
		await tick();
		const input = target.querySelector<HTMLInputElement>(
			'[name="min_length"], input[aria-valuemax]'
		);
		const max = target.querySelector('[aria-valuemax]')?.getAttribute('aria-valuemax');
		expect(input).toBeTruthy();
		expect(max).toBe('128');
	});
});
