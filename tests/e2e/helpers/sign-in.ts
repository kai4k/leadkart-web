/**
 * Sign-in helper for e2e specs.
 *
 * Pushes fixtures to the Go mock for the auth flow + baseline (app)
 * loads, then drives the signin form. After this returns the user is
 * on /dashboard with cookies set and capabilities baked into the page.
 *
 * Usage pattern in specs:
 *
 *   test.beforeEach(async () => { await resetMock(); });
 *
 *   test('something', async ({ page }) => {
 *     await signInAsTier(page, { tier: 'platform-super', permissions: [...] });
 *     // register additional fixtures specific to this test here:
 *     await registerMock({ method: 'GET', path: '/api/v1/...', status: 200, body: ... });
 *     await page.goto('/...');
 *   });
 */

import type { Page } from '@playwright/test';
import {
	fakeAccessToken,
	fakeRefreshToken,
	fakeCapabilitiesResponse,
	fakeUserDto,
	fakeSessionDto,
	fakeTenantDto,
	TEST_TENANT_ID,
	TEST_TENANT_SLUG,
	TEST_MEMBERSHIP_ID,
	TEST_PERSON_ID,
	type Tier,
	type Permission
} from './fake-jwt';
import { registerMocks } from './mock';

export interface SignInOpts {
	tier: Tier;
	permissions?: Permission[];
	is_super_user?: boolean;
	tenant_id?: string;
	tenant_slug?: string;
	membership_id?: string;
	person_id?: string;
	email?: string;
}

export async function signInAsTier(page: Page, opts: SignInOpts): Promise<void> {
	const tenantId = opts.tenant_id ?? TEST_TENANT_ID;
	const tenantSlug = opts.tenant_slug ?? TEST_TENANT_SLUG;
	const membershipId = opts.membership_id ?? TEST_MEMBERSHIP_ID;
	const personId = opts.person_id ?? TEST_PERSON_ID;
	const email = opts.email ?? 'test@example.com';
	const isPlatform = opts.tier === 'platform-super' || opts.tier === 'platform-staff';
	const isSuperUser = opts.is_super_user ?? opts.tier === 'platform-super';
	const permissions = opts.permissions ?? [];

	const claimOverrides = {
		is_platform: isPlatform,
		is_super_user: isSuperUser,
		tenant_id: tenantId,
		tenant_slug: tenantSlug,
		membership_id: membershipId,
		sub: personId,
		permission: permissions
	};

	const capabilities = fakeCapabilitiesResponse({
		permissions,
		is_platform: isPlatform,
		is_super_user: isSuperUser,
		tenant_id: tenantId,
		tenant_slug: tenantSlug,
		membership_id: membershipId,
		person_id: personId,
		email
	});

	const user = fakeUserDto({
		membership_id: membershipId,
		person_id: personId,
		tenant_id: tenantId,
		email
	});
	const tenant = fakeTenantDto({ id: tenantId, slug: tenantSlug });
	const session = fakeSessionDto({ tenant_id: tenantId });

	await registerMocks([
		{
			method: 'POST',
			path: '/api/v1/auth/login',
			status: 200,
			body: {
				access_token: fakeAccessToken(claimOverrides),
				refresh_token: fakeRefreshToken(),
				access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
				token_type: 'Bearer'
			}
		},
		{ method: 'GET', path: '/api/v1/auth/me/capabilities', status: 200, body: capabilities },
		{ method: 'GET', path: `/api/v1/users/${membershipId}`, status: 200, body: user },
		{ method: 'GET', path: '/api/v1/auth/sessions', status: 200, body: { sessions: [session] } },
		{ method: 'GET', path: `/api/v1/tenants/${tenantId}`, status: 200, body: tenant },
		// Slug lookup is now the canonical filter form `GET /v1/tenants?slug=…`
		// (ADR 0052) returning ListTenantsResponse. The mock-server matches on
		// pathname only — both the bare GET and the slug-filter GET land here.
		{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [tenant] } }
	]);

	await page.goto('/signin');
	await page.getByRole('textbox', { name: /email/i }).fill(email);
	await page.getByRole('textbox', { name: /password/i }).fill('Test1234!');
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard$/);
}
