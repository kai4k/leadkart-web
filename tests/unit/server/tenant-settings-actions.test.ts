/**
 * The five tenant-settings actions: authorise (the exact permission Go's route needs) BEFORE any
 * write, validate, send the FULL body through the tenant gateway, map Go's answer.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { P } from '#lib/features/auth/permissions.ts';
import { caps } from '../../support/go-personas.ts';

const goFetch = vi.hoisted(() => vi.fn());
const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/go.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goFetch
}));
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope: () => ({ state: 'none' }),
	scopeFingerprint: (r: { state: string }) => r.state
}));
vi.mock('$api/jwt', () => ({ decodeJwtPrincipal: () => ({ tenantId: 't-1' }) }));
vi.mock('#lib/server/cookies.ts', () => ({
	ACCESS_COOKIE: () => 'lk_access',
	sessionRenewalPending: () => false
}));

import { saveTenantSection } from '../../../src/routes/(app)/settings/tenant/_actions.ts';
import { TENANT_SECTION_PERMISSION } from '#lib/config/tenant-sections.ts';
import { actions as profile } from '../../../src/routes/(app)/settings/tenant/profile/+page.server.ts';
import { actions as statutory } from '../../../src/routes/(app)/settings/tenant/statutory/+page.server.ts';
import { actions as contact } from '../../../src/routes/(app)/settings/tenant/contact/+page.server.ts';
import { actions as preferences } from '../../../src/routes/(app)/settings/tenant/preferences/+page.server.ts';
import { actions as security } from '../../../src/routes/(app)/settings/tenant/security/+page.server.ts';

const cookies = { get: () => 'token' } as never;
const route = { id: '/(app)/settings/tenant/profile' };
const form = (fields: Record<string, string>) =>
	({
		request: new Request('http://x/', {
			method: 'POST',
			body: new URLSearchParams({ scope_context: 'none', ...fields })
		}),
		cookies,
		route
	}) as never;
const run = (a: { default?: unknown }, fields: Record<string, string>) =>
	(a.default as (e: never) => Promise<unknown>)(form(fields));

interface SectionCase {
	name: string;
	actions: { default?: unknown };
	path: string;
	permission: string;
	fields: Record<string, string>;
	sent: unknown;
}
const SECTIONS: SectionCase[] = [
	{
		name: 'profile',
		actions: profile,
		path: '/v1/tenants/t-1/profile',
		permission: P.identityTenantsUpdate,
		fields: { legal_name: 'Acme Pharma', display_name: 'Acme' },
		sent: { legal_name: 'Acme Pharma', display_name: 'Acme' }
	},
	{
		name: 'statutory',
		actions: statutory,
		path: '/v1/tenants/t-1/statutory',
		permission: P.identityTenantsUpdate,
		fields: { gst_number: '27AAAPL1234C1Z1' },
		sent: { gst_number: '27AAAPL1234C1Z1', pan_number: '', drug_licence_number: '' }
	},
	{
		name: 'admin-contact',
		actions: contact,
		path: '/v1/tenants/t-1/admin-contact',
		permission: P.identityTenantsUpdate,
		fields: { phone: '+919999900000', 'address.pincode': '400076' },
		sent: {
			phone: '+919999900000',
			address: {
				street: '',
				city: '',
				district: '',
				state: '',
				state_code: '',
				pincode: '400076'
			}
		}
	},
	{
		name: 'display-preferences',
		actions: preferences,
		path: '/v1/tenants/t-1/display-preferences',
		permission: P.identityTenantsUpdate,
		fields: {
			locale: 'en-IN',
			time_zone: 'Asia/Kolkata',
			date_format: 'dd-MM-yyyy',
			currency: 'INR'
		},
		sent: { locale: 'en-IN', time_zone: 'Asia/Kolkata', date_format: 'dd-MM-yyyy', currency: 'INR' }
	},
	{
		name: 'settings',
		actions: security,
		path: '/v1/tenants/t-1/settings',
		permission: P.identityTenantsUpdateSettings,
		fields: {
			min_length: '12',
			require_uppercase: 'on',
			max_failed_attempts: '5',
			lockout_minutes: '15'
		},
		sent: {
			password_policy: {
				min_length: 12,
				require_uppercase: true,
				require_lowercase: false,
				require_digit: false,
				require_symbol: false,
				max_failed_attempts: 5,
				lockout_minutes: 15
			}
		}
	}
];

beforeEach(() => {
	goFetch.mockReset();
	loadCapabilities.mockReset();
});

describe.each(SECTIONS)('$name action', ({ actions, path, permission, fields, sent }) => {
	it('is refused without the exact permission, keeps the form, and makes no Go call', async () => {
		// Holds every OTHER tenant permission, and tenant.admin, but not the one this route needs.
		const others = Object.values(TENANT_SECTION_PERMISSION).filter((p) => p !== permission);
		loadCapabilities.mockResolvedValue(
			caps([P.identityTenantsView, 'tenant.admin', ...others.filter((p) => p !== permission)])
		);
		const r = await run(actions, fields);
		expect(r).toMatchObject({ status: 403, data: { formErrorKey: 'auth.errors.forbidden' } });
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('holding it, PATCHes the full body at the section path', async () => {
		loadCapabilities.mockResolvedValue(caps([permission]));
		goFetch.mockResolvedValue(new Response(null, { status: 204 }));
		expect(await run(actions, fields)).toEqual({ success: true });
		expect(goFetch).toHaveBeenCalledTimes(1);
		const [, p, init] = goFetch.mock.calls[0] as [
			unknown,
			string,
			{ method: string; body: string }
		];
		expect(p).toBe(path);
		expect(init.method).toBe('PATCH');
		expect(JSON.parse(init.body)).toEqual(sent);
	});
});

describe('the permission per section is what Go requires', () => {
	it('only the password policy needs update_settings', () => {
		expect(TENANT_SECTION_PERMISSION).toEqual({
			profile: 'identity.tenants.update',
			statutory: 'identity.tenants.update',
			'admin-contact': 'identity.tenants.update',
			'display-preferences': 'identity.tenants.update',
			settings: 'identity.tenants.update_settings'
		});
	});
});

describe('saveTenantSection answers', () => {
	const call = (payload = { legal_name: 'Acme', display_name: 'A' }) =>
		saveTenantSection('profile')(form(payload));
	beforeEach(() => {
		loadCapabilities.mockResolvedValue(caps([P.identityTenantsUpdate]));
	});

	it('invalid input is a 422 with field errors and no Go call', async () => {
		const r = await call({ legal_name: '', display_name: 'A' });
		expect(r).toMatchObject({
			status: 422,
			data: { fieldMessages: { legal_name: expect.any(String) } }
		});
		expect(goFetch).not.toHaveBeenCalled();
	});

	it("Go's 422 field errors (nested keys dotted) land on the form's fields", async () => {
		goFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					error: 'validation_failed',
					errors: { gst_number: ['GST number is not valid'], 'address.pincode': ['bad pincode'] }
				}),
				{ status: 422, headers: { 'content-type': 'application/json' } }
			)
		);
		const r = await call();
		expect(r).toMatchObject({
			status: 422,
			data: {
				fieldMessages: { gst_number: 'GST number is not valid', 'address.pincode': 'bad pincode' }
			}
		});
	});

	it('a Go refusal speaks an i18n key, never Go text', async () => {
		goFetch.mockResolvedValue(
			new Response(JSON.stringify({ error: 'forbidden', detail: 'RAW BACKEND TEXT' }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			})
		);
		const r = await call();
		expect(r).toMatchObject({
			status: 403,
			data: { formErrorKey: 'errors.code.forbidden' }
		});
		expect(JSON.stringify(r)).not.toContain('RAW BACKEND TEXT');
	});

	it('answers a Go redirect (never followed) with a 502 failure, not a crash', async () => {
		goFetch.mockResolvedValue(
			new Response(null, { status: 302, headers: { location: 'https://elsewhere/' } })
		);
		expect(await call()).toMatchObject({ status: 502 });
	});

	it('keeps the form on a Go outage', async () => {
		goFetch.mockImplementation(() => {
			throw new TypeError('fetch failed');
		});
		expect(await call()).toMatchObject({
			status: 502,
			data: { formErrorKey: 'auth.errors.upstreamUnavailable' }
		});
	});
});

describe('the section permission table covers exactly the gateway sections', () => {
	it('has the keys of TENANT_SECTIONS', async () => {
		const { TENANT_SECTIONS } = await import('$features/tenant/server');
		expect(Object.keys(TENANT_SECTION_PERMISSION).sort()).toEqual(
			Object.keys(TENANT_SECTIONS).sort()
		);
	});
});
