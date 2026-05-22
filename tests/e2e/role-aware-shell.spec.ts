import { expect, test } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMock } from './helpers/mock';
import { TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Tier-aware shell smoke tests.
 *
 * Verifies the (app) layout server load picks the right tier from
 * capabilities and the Sidebar renders the matching nav catalogue
 * from src/lib/config/nav.ts.
 *
 * Three personas exercised against the locked nav surface:
 *
 *   Platform tier  → Dashboard, Tenants, Account
 *   Tenant admin   → Dashboard, Tenant Settings, Team, Roles, Account
 *   Tenant user    → Dashboard, Account
 *
 * The nav config is intentionally narrow — items only ship once their
 * routes exist (no dead links). When v0.4/v0.5 add Leads/Orders/etc.,
 * extend these assertions.
 */
test.describe('Role-aware shell', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Platform SuperAdmin sees Operator Dashboard + platform nav', async ({ page }) => {
		// Platform-stats endpoint that PlatformDashboard hits — register
		// before sign-in so the dashboard renders cleanly on first paint.
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/stats',
			status: 200,
			body: {
				tenants_total: 12,
				tenants_active: 10,
				tenants_suspended: 2,
				persons_total: 150,
				memberships_active: 120
			}
		});

		await signInAsTier(page, { tier: 'platform-super' });

		await expect(page.getByRole('heading', { level: 1, name: 'Operator Dashboard' })).toBeVisible();
		await expect(page.getByText('SuperAdmin', { exact: false })).toBeVisible();
		await expect(page.getByText('Tenants total')).toBeVisible();

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Account' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toHaveCount(0);
	});

	test('Tenant Admin sees Tenant Dashboard + admin nav', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });

		await expect(page.getByRole('heading', { level: 1, name: 'Tenant Dashboard' })).toBeVisible();

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Team' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Roles' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toHaveCount(0);
	});

	test('Tenant User sees My Dashboard + minimal nav', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });

		await expect(page.getByRole('heading', { level: 1, name: 'My Dashboard' })).toBeVisible();

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Account' })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: 'Tenant Settings' })).toHaveCount(0);
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toHaveCount(0);
	});

	test('First-paint capabilities: no skeleton, nav renders immediately', async ({ page }) => {
		// The (app)/+layout.server.ts bakes capabilities into the HTML.
		// On navigation to /dashboard, the sidebar tier-dispatch should
		// fire on the first frame — never show a fallback nav or skeleton.
		await signInAsTier(page, { tier: 'platform-super' });
		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toBeVisible({ timeout: 100 });
	});

	// Verify the principal's tenant_id is never exposed in the page URL —
	// the user is on /dashboard, not /dashboard?tenant=<id>.
	test('No tenant identifier in user-facing URL after sign-in', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		expect(page.url()).not.toContain(TEST_TENANT_ID);
		expect(page.url()).not.toContain('acme');
		expect(new URL(page.url()).pathname).toBe('/dashboard');
	});
});
