/**
 * The tenant feature's server gateway: the one place that knows Go's /v1/tenants/{id} paths,
 * parses the response with the generated schema, and sends the FULL-REPLACE PATCH bodies.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';

const goFetch = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/go.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goFetch
}));

import {
	loadTenant,
	ownTenantId,
	patchTenant,
	TENANT_SECTIONS,
	type TenantSection
} from '#lib/features/tenant/server.ts';

const TENANT = {
	id: '00000000-0000-4000-8000-000000000001',
	slug: 'acme',
	legal_name: 'Acme Pharma',
	display_name: 'Acme',
	status: 'active',
	created_at: '2026-01-15T10:30:00Z',
	admin_address: { street: '1 Main Rd' },
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
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const cookies = { get: () => 'tok' } as never;
const ID = TENANT.id;

beforeEach(() => {
	goFetch.mockReset();
});

describe('loadTenant', () => {
	it('GETs /v1/tenants/{id}, parses with the generated schema and returns the tenant', async () => {
		goFetch.mockResolvedValue(json(TENANT));
		const r = await loadTenant(cookies, ID);
		expect(r).toMatchObject({ status: 'ok', tenant: { slug: 'acme' } });
		expect(goFetch).toHaveBeenCalledWith(cookies, `/v1/tenants/${ID}`, { scoped: true });
	});

	it('own-tenant callers can opt out of the operator scope header', async () => {
		goFetch.mockResolvedValue(json(TENANT));
		await loadTenant(cookies, ID, { scoped: false });
		expect(goFetch).toHaveBeenCalledWith(cookies, `/v1/tenants/${ID}`, { scoped: false });
	});

	it('a 404 is a result, not an exception (the scope layout clears its cookie on it)', async () => {
		goFetch.mockResolvedValue(json({ error: 'not_found' }, 404));
		expect(await loadTenant(cookies, ID)).toEqual({ status: 'not_found' });
	});

	it('any other non-2xx is an error page with Go status', async () => {
		goFetch.mockResolvedValue(json({ error: 'forbidden' }, 403));
		await expect(loadTenant(cookies, ID)).rejects.toMatchObject({ status: 403 });
	});

	it('a body that is not the contract is a 502, never cast and passed on', async () => {
		goFetch.mockResolvedValue(json({ id: 'not-a-uuid' }));
		await expect(loadTenant(cookies, ID)).rejects.toMatchObject({ status: 502 });
	});

	it('a stalled Go is a 504', async () => {
		goFetch.mockImplementation(() => {
			throw new DOMException('slow', 'TimeoutError');
		});
		await expect(loadTenant(cookies, ID)).rejects.toMatchObject({ status: 504 });
	});

	it('lets an error()/redirect() thrown by goFetch through', async () => {
		goFetch.mockImplementation(() => {
			throw error(503, 'renew');
		});
		await expect(loadTenant(cookies, ID)).rejects.toMatchObject({ status: 503 });
	});
});

describe('ownTenantId', () => {
	it('is the access token principal tenant, and sends a signed-out caller to /signin', () => {
		expect(() => ownTenantId({ get: () => undefined } as never)).toThrowError(
			expect.objectContaining({ status: 303, location: '/signin' })
		);
	});
});

/** One full body per section: every field Go requires, blank as ''. */
const FULL_BODIES: Record<TenantSection, { sent: unknown; keys: string[] }> = {
	profile: {
		sent: { legal_name: 'Acme', display_name: 'A' },
		keys: ['legal_name', 'display_name']
	},
	statutory: {
		sent: { gst_number: '', pan_number: '', drug_licence_number: '' },
		keys: ['gst_number', 'pan_number', 'drug_licence_number']
	},
	'admin-contact': {
		sent: {
			phone: '',
			address: { street: '', city: '', district: '', state: '', state_code: '', pincode: '' }
		},
		keys: ['phone', 'address']
	},
	settings: {
		sent: {
			password_policy: {
				min_length: 12,
				require_uppercase: true,
				require_lowercase: false,
				require_digit: true,
				require_symbol: false,
				max_failed_attempts: 5,
				lockout_minutes: 15
			}
		},
		keys: ['password_policy']
	},
	'display-preferences': {
		sent: { locale: '', time_zone: '', date_format: '', currency: '' },
		keys: ['locale', 'time_zone', 'date_format', 'currency']
	}
};

describe('patchTenant', () => {
	it.each(Object.keys(FULL_BODIES) as TenantSection[])(
		'%s: PATCHes the section path with every field, blank as an empty string',
		async (section) => {
			goFetch.mockResolvedValue(new Response(null, { status: 204 }));
			// A sparse input (what an old caller or a form without the field would send).
			const sparse =
				section === 'admin-contact'
					? { address: { street: '' } }
					: section === 'settings'
						? FULL_BODIES.settings.sent
						: {};
			const call = await patchTenant(cookies, ID, section, sparse as never);
			expect(call).toMatchObject({ ok: true });
			const [, path, init] = goFetch.mock.calls[0] as [unknown, string, Record<string, unknown>];
			expect(path).toBe(`/v1/tenants/${ID}/${section}`);
			expect(init.method).toBe('PATCH');
			expect(init.scoped).toBe(false);
			const body = JSON.parse(init.body as string) as Record<string, unknown>;
			expect(Object.keys(body).sort()).toEqual([...FULL_BODIES[section].keys].sort());
			for (const v of Object.values(body)) expect(v).not.toBeNull();
			if (section === 'admin-contact') {
				expect(Object.keys(body.address as object).sort()).toEqual(
					['city', 'district', 'pincode', 'state', 'state_code', 'street'].sort()
				);
				expect(body.phone).toBe('');
			}
			if (section !== 'settings' && section !== 'admin-contact') {
				for (const v of Object.values(body)) expect(v).toBe('');
			}
		}
	);

	it('sends a complete body unchanged', async () => {
		goFetch.mockResolvedValue(new Response(null, { status: 204 }));
		await patchTenant(cookies, ID, 'profile', FULL_BODIES.profile.sent as never);
		const init = goFetch.mock.calls[0]![2] as { body: string };
		expect(JSON.parse(init.body)).toEqual(FULL_BODIES.profile.sent);
	});

	it('keeps the form on an outage: the same failure the other form actions use', async () => {
		goFetch.mockImplementation(() => {
			throw new TypeError('fetch failed');
		});
		expect(await patchTenant(cookies, ID, 'profile', FULL_BODIES.profile.sent as never)).toEqual({
			ok: false,
			status: 502,
			key: 'auth.errors.upstreamUnavailable'
		});
	});

	it('hands a Go refusal back for the action to map', async () => {
		goFetch.mockResolvedValue(json({ error: 'forbidden' }, 403));
		const call = await patchTenant(cookies, ID, 'profile', FULL_BODIES.profile.sent as never);
		expect(call).toMatchObject({ ok: true });
		expect(call.ok && call.resp.status).toBe(403);
	});

	it('every section has a validating schema', () => {
		for (const s of Object.keys(FULL_BODIES) as TenantSection[]) {
			expect(TENANT_SECTIONS[s].schema.safeParse).toBeTypeOf('function');
		}
	});
});
