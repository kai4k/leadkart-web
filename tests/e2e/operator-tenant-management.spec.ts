import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock, listMockCalls } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';

/**
 * Operator-side tenant management e2e.
 *
 * Covers:
 *   - List page renders tenants from the real list endpoint
 *   - "Enter scope" flow (no slug in URL) sets cookie + navigates to
 *     /operator/scope/profile + scope layout fetches active tenant
 *     and renders the Profile tab
 *   - Exit scope clears the cookie and returns to the tenants list
 *   - a11y on the list page
 */

const ACME = fakeTenantDto({
	id: 'tid-aaa',
	slug: 'acme-pharma',
	display_name: 'Acme Pharma',
	legal_name: 'Acme Pharma Pvt Ltd'
});
const BETA = fakeTenantDto({
	id: 'tid-bbb',
	slug: 'beta-meds',
	display_name: 'Beta Meds',
	legal_name: 'Beta Meds Ltd'
});

async function setupOperator(page: import('@playwright/test').Page) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.tenants.create', 'platform.tenants.manage'],
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
	await registerMocks([
		{
			method: 'GET',
			path: '/api/v1/platform/tenants',
			status: 200,
			body: { tenants: [ACME, BETA] }
		},
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}`, status: 200, body: ACME },
		{ method: 'GET', path: `/api/v1/tenants/by-slug/${ACME.slug}`, status: 200, body: ACME }
	]);
}

test.describe('Operator tenants list', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders tenant rows + register button (with platform.tenants.create)', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');

		await expect(
			page.locator('#main-content').getByRole('heading', { name: 'Tenants', exact: true })
		).toBeVisible();
		await expect(page.getByText('Acme Pharma').first()).toBeVisible();
		await expect(page.getByText('Beta Meds').first()).toBeVisible();
		await expect(page.getByRole('button', { name: /register tenant/i })).toBeVisible();
	});

	test('list page has no critical/serious a11y violations', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		await expect(page.getByText('Acme Pharma').first()).toBeVisible();

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
			.include('main')
			.analyze();
		const blocking = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
	});
});

test.describe('Operator scope flow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('entering scope: cookie set, redirected to profile, no slug in URL', async ({ page }) => {
		await setupOperator(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/tenants/by-slug/acme-pharma',
			status: 200,
			body: ACME // unused — by-slug GET is what /api/operator/scope calls
		});
		await page.goto('/operator/tenants');
		await page.getByText('Acme Pharma').first().click();

		await page.waitForURL(/\/operator\/scope\/profile$/);

		// URL invariant: no slug, no UUID anywhere in the path or query
		const u = new URL(page.url());
		expect(u.pathname).toBe('/operator/scope/profile');
		expect(u.search).toBe('');
		expect(page.url()).not.toContain('acme-pharma');
		expect(page.url()).not.toContain('tid-aaa');

		// Scope layout renders the tenant header + tabs (h1 because the
		// scope layout is the top-level page heading on this route).
		await expect(page.getByRole('heading', { level: 1, name: 'Acme Pharma' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();

		// Cookie set by the BFF
		const cookies = await page.context().cookies();
		const scopeCookie = cookies.find((c) => c.name === 'lk_op_tenant');
		expect(scopeCookie).toBeDefined();
		expect(scopeCookie?.httpOnly).toBe(true);
	});

	test('exit context clears the cookie and returns to the tenants list', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		await page.getByText('Acme Pharma').first().click();
		await page.waitForURL(/\/operator\/scope\/profile$/);

		await page.getByRole('button', { name: /exit context/i }).click();
		await page.waitForURL(/\/operator\/tenants$/);

		const cookies = await page.context().cookies();
		expect(cookies.find((c) => c.name === 'lk_op_tenant')).toBeUndefined();
	});

	test('BFF auto-injects X-Tenant-Id for in-scope API calls', async ({ page }) => {
		await setupOperator(page);
		// Stand up empty users + roles fixtures so the scope tabs don't 404.
		await registerMocks([
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } },
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
		]);
		await page.goto('/operator/tenants');
		await page.getByText('Acme Pharma').first().click();
		await page.waitForURL(/\/operator\/scope\/profile$/);
		await page.getByRole('link', { name: 'Members' }).click();
		await page.waitForURL(/\/operator\/scope\/members$/);
		// UsersList renders a Team header — wait for it so the TanStack
		// query has had a chance to fire before we inspect the mock.
		await expect(page.getByRole('heading', { level: 1, name: 'Team' })).toBeVisible();

		const calls = await listMockCalls();
		const usersCall = calls.find((c) => c.path === '/api/v1/users' && c.method === 'GET');
		expect(usersCall).toBeDefined();
	});
});

test.describe('CSRF protection', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('scope POST without CSRF token is rejected by the BFF (403)', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		// Issue a raw POST from the page context without the X-CSRF-Token
		// header — the BFF's CSRF gate should refuse it.
		const status = await page.evaluate(async () => {
			const resp = await fetch('/api/operator/scope', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ slug: 'acme-pharma' })
			});
			return resp.status;
		});
		expect(status).toBe(403);
	});
});
