import { expect, test, type Page, type Route } from '@playwright/test';
import { fakeAccessToken, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Tier-aware shell smoke tests.
 *
 * Verifies that the /dashboard router + the Sidebar nav filter
 * branch correctly on the principal claims (`is_platform`,
 * `is_super_user`, `permission[]`) decoded from the access token.
 *
 * Three personas exercised:
 *
 *   - Platform SuperAdmin   — is_platform + is_super_user
 *   - Tenant Admin          — permission ['tenant.admin']
 *   - Tenant User (default) — no special claims
 *
 * Each test mounts /signin, mocks /api/v1/auth/login to return a JWT
 * carrying the persona's claims, signs in, and asserts the rendered
 * /dashboard variant + a couple of distinctive sidebar entries.
 */

async function mockLoginAs(
	page: Page,
	persona: 'platform-super' | 'tenant-admin' | 'tenant-user'
): Promise<void> {
	const claims = (() => {
		switch (persona) {
			case 'platform-super':
				return {
					is_platform: true,
					is_super_user: true,
					tenant_slug: 'platform',
					permission: []
				};
			case 'tenant-admin':
				return { is_platform: false, is_super_user: false, permission: ['tenant.admin'] };
			case 'tenant-user':
				return {
					is_platform: false,
					is_super_user: false,
					permission: ['crm.leads.view']
				};
		}
	})();

	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				access_token: fakeAccessToken(claims),
				refresh_token: 'fake-refresh-token',
				access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
				token_type: 'Bearer'
			})
		});
	});

	// Tenant fetch (Tenant Admin dashboard touches it; mock for all 3
	// to keep the harness uniform — wasted bytes are cheaper than
	// per-persona branching).
	await page.route(`**/api/v1/tenants/${TEST_TENANT_ID}`, async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: TEST_TENANT_ID,
					slug: 'acme',
					legal_name: 'Acme',
					display_name: 'Acme',
					admin_email: 'admin@acme.test',
					status: 'active',
					created_at: '2026-01-15T10:30:00Z',
					admin_address: {},
					password_policy: {
						min_length: 8,
						require_uppercase: false,
						require_lowercase: false,
						require_digit: false,
						require_symbol: false,
						max_failed_attempts: 5,
						lockout_minutes: 15
					}
				})
			});
		} else {
			await route.continue();
		}
	});
}

async function signIn(page: Page): Promise<void> {
	await page.goto('/signin');
	await page.getByRole('textbox', { name: 'Email' }).fill('user@acme.test');
	await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery-staple');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(/\/dashboard$/);
}

test.describe('Role-aware shell', () => {
	test('Platform SuperAdmin sees Operator Dashboard + platform sidebar', async ({ page }) => {
		await mockLoginAs(page, 'platform-super');
		await signIn(page);

		// Dashboard variant
		await expect(page.getByRole('heading', { level: 1, name: 'Operator Dashboard' })).toBeVisible();
		await expect(page.getByText('SuperAdmin', { exact: false })).toBeVisible();
		await expect(page.getByText('Tenants total')).toBeVisible();
		await expect(page.getByText('Lead verification queue')).toBeVisible();

		// Sidebar: PLATFORM_NAV entries present
		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Lead Marketplace' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Verification Queue' })).toBeVisible();

		// Sidebar: tenant-tier entries absent
		await expect(sidebar.getByRole('link', { name: 'Inventory' })).toHaveCount(0);
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toHaveCount(0);
	});

	test('Tenant Admin sees Tenant Dashboard + admin sidebar', async ({ page }) => {
		await mockLoginAs(page, 'tenant-admin');
		await signIn(page);

		await expect(page.getByRole('heading', { level: 1, name: 'Tenant Dashboard' })).toBeVisible();
		// The "Admin" pill in the dashboard header (not the sidebar's
		// "Administration" section title — use exact match to disambiguate).
		await expect(page.getByText('Admin', { exact: true })).toBeVisible();
		await expect(page.getByText('Lead credits')).toBeVisible();
		await expect(page.getByText('Team active')).toBeVisible();

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toBeVisible();
		// Admin has tenant.admin perm; sees the admin section. crm.leads.view
		// not granted → Leads entry hidden.
		await expect(sidebar.getByRole('link', { name: 'Leads' })).toHaveCount(0);

		// Sidebar: platform-tier entries absent
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toHaveCount(0);
		await expect(sidebar.getByRole('link', { name: 'Verification Queue' })).toHaveCount(0);
	});

	test('Tenant User sees My Dashboard + minimal sidebar', async ({ page }) => {
		await mockLoginAs(page, 'tenant-user');
		await signIn(page);

		await expect(page.getByRole('heading', { level: 1, name: 'My Dashboard' })).toBeVisible();
		await expect(page.getByText('My active leads')).toBeVisible();

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'My Leads' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'My Tasks' })).toBeVisible();

		// No tenant-admin entries
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toHaveCount(0);
		await expect(sidebar.getByRole('link', { name: 'Team' })).toHaveCount(0);
		// No platform entries
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toHaveCount(0);
	});
});
