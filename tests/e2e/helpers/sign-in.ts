// Unified sign-in helper for e2e specs.
//
// BFF MIGRATION NOTE (2026-05-20):
// The auth architecture has migrated to a BFF model. The SvelteKit Node
// server now acts as the BFF — browser calls POST /auth/login (BFF) which
// makes a server-to-server fetch to Go and sets httpOnly cookies.
//
// Playwright's page.route() only intercepts browser-context requests.
// Server-side fetch calls (BFF to Go) are NOT interceptable by page.route().
// This means the previous approach of mocking /api/v1/auth/login via
// page.route() no longer works.
//
// REQUIRED FIX (tracked, not yet implemented):
// E2e tests need a mock Go API server that the BFF can call server-to-server.
// Recommended approach: run a lightweight HTTP mock server (e.g. msw/node)
// on GO_API_URL before tests start. Set GO_API_URL=http://localhost:9999
// in the playwright webServer env. The mock server returns fixture responses.
//
// CURRENT STATUS: e2e tests will fail because the BFF calls Go internally
// and there is no mock Go server. All e2e specs that relied on mocking
// /api/v1/auth/login or /api/v1/* via page.route() need to be rewritten
// to use a server-side mock. This is tracked work, not part of this PR.
//
// The BFF endpoint /auth/login itself IS mockable at the browser level
// since the BROWSER calls it directly (page.route('**/auth/login', ...)).
// However, the BFF's subsequent capabilities SSR fetch is still server-side.

import type { Page } from '@playwright/test';
import {
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

/**
 * Sign in as the given tier + permission set and set up baseline mocks.
 *
 * PARTIAL IMPLEMENTATION — see file-level note above.
 * This helper mocks browser-visible BFF endpoints but cannot mock
 * the BFF's server-to-server Go API calls. Tests will fail until a
 * mock Go server is wired into the playwright webServer config.
 */
export async function signInAsTier(page: Page, opts: SignInOpts): Promise<void> {
	const tenantId = opts.tenant_id ?? TEST_TENANT_ID;
	const tenantSlug = opts.tenant_slug ?? TEST_TENANT_SLUG;
	const membershipId = opts.membership_id ?? TEST_MEMBERSHIP_ID;
	const personId = opts.person_id ?? TEST_PERSON_ID;
	const email = opts.email ?? 'test@example.com';
	const isPlatform = opts.tier === 'platform-super' || opts.tier === 'platform-staff';
	const isSuperUser = opts.is_super_user ?? opts.tier === 'platform-super';
	const permissions = opts.permissions ?? [];

	// Mock the browser-visible BFF login endpoint
	await page.route('**/auth/login', async (route) => {
		if (route.request().method() !== 'POST') {
			await route.continue();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true })
		});
	});

	// NOTE: The routes below use page.route on /api/v1/* URLs.
	// These go through the BFF proxy which calls Go server-to-server.
	// page.route() cannot intercept server-side fetch — these mocks
	// will NOT work without a mock Go server at GO_API_URL.

	await page.route('**/api/v1/auth/me/capabilities', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeCapabilitiesResponse({
					permissions,
					is_platform: isPlatform,
					is_super_user: isSuperUser,
					tenant_id: tenantId,
					tenant_slug: tenantSlug,
					membership_id: membershipId,
					email
				})
			)
		});
	});

	await page.route(`**/api/v1/users/${membershipId}`, async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(
					fakeUserDto({
						membership_id: membershipId,
						person_id: personId,
						tenant_id: tenantId,
						email
					})
				)
			});
		} else {
			await route.continue();
		}
	});

	await page.route('**/api/v1/auth/sessions', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					sessions: [fakeSessionDto({ tenant_id: tenantId })]
				})
			});
		} else {
			await route.continue();
		}
	});

	await page.route(`**/api/v1/tenants/${tenantId}`, async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(fakeTenantDto({ id: tenantId, slug: tenantSlug }))
			});
		} else {
			await route.continue();
		}
	});

	await page.route(`**/api/v1/tenants/by-slug/${tenantSlug}`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(fakeTenantDto({ id: tenantId, slug: tenantSlug }))
		});
	});

	// Navigate and sign in
	await page.goto('/signin');
	await page.getByRole('textbox', { name: /email/i }).fill(email);
	await page.getByRole('textbox', { name: /password/i }).fill('Test1234!');
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard$/);
}
