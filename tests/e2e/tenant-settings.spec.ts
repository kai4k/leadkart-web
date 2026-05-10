import { expect, test, type Route } from '@playwright/test';
import { fakeLoginResponse, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * End-to-end happy path for the Tenant Settings feature.
 *
 *   signin → /dashboard → click Settings → /settings/tenant/profile →
 *   edit Display name → Save → verify success Alert + reloaded
 *   tenant snapshot reflects the new value.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                    → {tokens + ids}
 *   GET   /api/v1/tenants/{tid}                 → TenantDto
 *   PATCH /api/v1/tenants/{tid}/profile         → 204; mutates fixture
 *
 * The fixture is mutated in-place by the PATCH handler so the
 * subsequent GET (the store reloads after every mutator) returns the
 * canonicalised values — same contract the real server provides.
 */

const TENANT_ID = TEST_TENANT_ID;

const BASE_TENANT = {
	id: TENANT_ID,
	slug: 'acme-pharma',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	admin_email: 'admin@acme.test',
	status: 'active',
	created_at: '2026-01-15T10:30:00Z',
	admin_address: {},
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

test.describe('Tenant Settings — happy path', () => {
	test('signin → settings → edit profile → save', async ({ page }) => {
		// Mutable fixture — the PATCH handler updates it so the
		// post-mutation reload picks up the new values.
		let tenantState = { ...BASE_TENANT };

		await page.route('**/api/v1/auth/login', async (route: Route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				// Sign in as a tenant admin — Tenant Settings sidebar link
				// is gated on the `tenant.admin` permission claim after
				// feat/role-aware-shell.
				body: JSON.stringify(fakeLoginResponse({ permission: ['tenant.admin'] }))
			});
		});

		await page.route(`**/api/v1/tenants/${TENANT_ID}`, async (route: Route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(tenantState)
				});
			} else {
				await route.continue();
			}
		});

		await page.route(`**/api/v1/tenants/${TENANT_ID}/profile`, async (route: Route) => {
			if (route.request().method() === 'PATCH') {
				const body = route.request().postDataJSON() as {
					legal_name: string;
					display_name: string;
				};
				tenantState = {
					...tenantState,
					legal_name: body.legal_name,
					display_name: body.display_name
				};
				await route.fulfill({ status: 204 });
			} else {
				await route.continue();
			}
		});

		// 1. Sign in
		await page.goto('/signin');
		await page.getByRole('textbox', { name: 'Email' }).fill('admin@acme.test');
		await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery-staple');
		await page.getByRole('button', { name: 'Sign in' }).click();

		// 2. Land on dashboard, then navigate to Tenant Settings via the
		//    sidebar nav. Sidebar.svelte renders the entry under the
		//    Administration section as "Tenant Settings" (the nav got
		//    tier-split in feat/role-aware-shell — separate label from
		//    the also-now-visible "Account & Security").
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.getByRole('link', { name: 'Tenant Settings' }).click();

		// 3. /settings/tenant redirects to /profile (default tab).
		await expect(page).toHaveURL(/\/settings\/tenant\/profile$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Acme' })).toBeVisible();

		// 4. Edit Display name and save.
		const displayName = page.getByLabel('Display name');
		await displayName.fill('Acme Pharmaceuticals');
		await page.getByRole('button', { name: 'Save changes' }).click();

		// 5. Success Alert appears (role=alert, aria-live=polite).
		await expect(page.getByRole('alert')).toContainText('Profile updated');

		// 6. Header reflects the post-PATCH reload — the store re-GET
		//    surfaced the fixture's new display_name into the heading.
		await expect(
			page.getByRole('heading', { level: 1, name: 'Acme Pharmaceuticals' })
		).toBeVisible();
	});
});
