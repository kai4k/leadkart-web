/**
 * Unified sign-in helper for e2e specs.
 *
 * signInAsTier() wires ALL the baseline mocks that every (app) route
 * needs after the Phase D/E/F migration:
 *
 *   POST /v1/auth/login                    → LoginResponse (tokens)
 *   GET  /v1/auth/me/capabilities          → CapabilitiesDto   ← CRITICAL: Sidebar + UserMenu
 *   GET  /v1/users/:membership_id          → UserDto           (own profile)
 *   GET  /v1/auth/sessions                 → { sessions: [...] }
 *   GET  /v1/tenants/:tenant_id            → TenantDto         (by ID)
 *   GET  /v1/tenants/by-slug/:slug         → TenantDto         (by slug — operator layout)
 *
 * Per-test resource mocks (list endpoints, mutations, activity logs,
 * cross-tenant lookups) are still the caller's responsibility.
 *
 * Architectural note: mocks must zod-parse cleanly. Shapes are
 * derived from src/lib/features/auth/schemas.ts.
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
	TEST_FAMILY_ID,
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
 * Sign in as the given tier + permission set and set up the baseline
 * auth + capabilities + own-profile + own-sessions + own-tenant mocks.
 * Navigates to /signin, fills credentials, clicks Sign in, and waits
 * for /dashboard.
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

	// ── Login ────────────────────────────────────────────────────────
	await page.route('**/api/v1/auth/login', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				access_token: fakeAccessToken({
					sub: personId,
					tenant_id: tenantId,
					tenant_slug: tenantSlug,
					membership_id: membershipId,
					is_platform: isPlatform,
					is_super_user: isSuperUser,
					permission: permissions
				}),
				refresh_token: fakeRefreshToken(TEST_FAMILY_ID),
				access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
				token_type: 'Bearer'
			})
		});
	});

	// ── Capabilities — MUST be present; Sidebar + UserMenu query this ─
	// NOTE: `tier` is not a backend field — deriveTier() synthesises it
	// client-side from is_platform + is_super_user + permissions.
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

	// ── Own profile (membership_id-keyed) ────────────────────────────
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

	// ── Own sessions ─────────────────────────────────────────────────
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

	// ── Own tenant (by ID) ───────────────────────────────────────────
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

	// ── Own tenant (by slug) — operator context layout uses /by-slug ──
	await page.route(`**/api/v1/tenants/by-slug/${tenantSlug}`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(fakeTenantDto({ id: tenantId, slug: tenantSlug }))
		});
	});

	// ── Execute the sign-in flow ─────────────────────────────────────
	await page.goto('/signin');
	await page.getByRole('textbox', { name: /email/i }).fill(email);
	await page.getByRole('textbox', { name: /password/i }).fill('Test1234!');
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard$/);
}
