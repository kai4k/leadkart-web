import { expect, test } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Tier-aware shell smoke tests + auth negative paths.
 *
 *   Positive:
 *     Platform tier  → Dashboard, Tenants, Account
 *     Tenant admin   → Dashboard, Tenant Settings, Team, Roles, Account
 *     Tenant user    → Dashboard, Account
 *   Negative:
 *     Invalid credentials surface a form error, no navigation
 *     Capabilities 500 redirects back to /signin (auth guard bails safe)
 *     Unauthenticated visit to (app)/* redirects to /signin?next=…
 *   Invariant:
 *     No tenant identifier in user-facing URL after sign-in
 */
test.describe('Role-aware shell — happy paths', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Platform SuperAdmin sees Operator Dashboard + platform nav', async ({ page }) => {
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
		await signInAsTier(page, { tier: 'platform-super' });
		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(sidebar.getByRole('link', { name: 'Tenants' })).toBeVisible({ timeout: 100 });
	});

	test('No tenant identifier in user-facing URL after sign-in', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		expect(page.url()).not.toContain(TEST_TENANT_ID);
		expect(page.url()).not.toContain('acme');
		expect(new URL(page.url()).pathname).toBe('/dashboard');
	});
});

test.describe('Auth negative paths', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('invalid credentials: stays on /signin and shows error', async ({ page }) => {
		// Go returns 401 with ProblemDetails body
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/login',
			status: 401,
			body: { code: 'invalid_credentials', message: 'Invalid email or password' }
		});

		await page.goto('/signin');
		await page.getByRole('textbox', { name: /email/i }).fill('wrong@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Stays on /signin (URL unchanged)
		await expect(page).toHaveURL(/\/signin$/);
		// Error alert visible (svelte-i18n key auth.errors.invalidCredentials)
		await expect(page.getByRole('alert')).toBeVisible();
	});

	test('unauthenticated visit to (app)/dashboard redirects to /signin?next=', async ({ page }) => {
		await page.goto('/dashboard');
		await page.waitForURL(/\/signin\?next=%2Fdashboard/);
		await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
	});

	test('capabilities 500 from Go: signed-in user redirected to /signin', async ({ page }) => {
		// Login succeeds, capabilities then 500 — auth guard treats as
		// unrecoverable + redirects rather than rendering a broken shell.
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 200,
				body: {
					access_token: 'eyJhbGciOiJIUzI1NiJ9.fake.sig',
					refresh_token: 'eyJhbGciOiJIUzI1NiJ9.fake.sig',
					access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
					token_type: 'Bearer'
				}
			},
			{
				method: 'GET',
				path: '/api/v1/auth/me/capabilities',
				status: 500,
				body: { code: 'internal_error', message: 'something exploded' }
			}
		]);
		await page.goto('/signin');
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('Test1234!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/signin/);
	});
});
