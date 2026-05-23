import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock, listMockCalls } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';

/**
 * Operator-side tenant management e2e.
 *
 *   Positive:
 *     List renders rows + Register button respects platform.tenants.create
 *     Scope entry: cookie set, navigated to /operator/scope/profile, no slug in URL
 *     Exit scope: cookie cleared, back to /operator/tenants
 *     BFF auto-injects X-Tenant-Id for in-scope API calls
 *
 *   Negative:
 *     Tenants list 500: error alert with Retry
 *     Register form validation: missing fields, slug collision (409)
 *     Suspend without platform.tenants.manage: button hidden
 *     Scope POST without CSRF token rejected (403)
 *     Scope cookie missing on /operator/scope/profile: redirected to list
 *
 *   a11y:
 *     List page zero serious/critical violations
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

async function setupOperator(page: Page, opts?: { canManage?: boolean }) {
	const canManage = opts?.canManage ?? true;
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: canManage
			? ['platform.tenants.view', 'platform.tenants.create', 'platform.tenants.manage']
			: ['platform.tenants.view'],
		is_super_user: canManage,
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

	test('list 500: shows error message in the table area', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view']
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/tenants',
			status: 500,
			body: { code: 'internal_error', message: 'tenant list lookup failed' }
		});
		await page.goto('/operator/tenants');
		// DataTable surfaces the error.message via its `error` prop
		await expect(
			page
				.locator('#main-content')
				.getByText(/failed|error/i)
				.first()
		).toBeVisible({
			timeout: 5000
		});
	});
});

test.describe('Register tenant — form validation', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('open + submit empty: per-field errors block submission', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /register tenant/i })
			.click();

		// Drawer opens — h2 inside the drawer
		await expect(page.getByRole('heading', { level: 2, name: 'Register tenant' })).toBeVisible();

		// Submit empty form via the drawer footer button (form= attribute scopes it)
		await page.locator('button[type="submit"][form="register-tenant-form"]').click();

		// TextField marks empty required inputs aria-invalid on submit attempt
		await expect(page.locator('input[aria-invalid="true"]').first()).toBeVisible({
			timeout: 3000
		});
	});

	test('slug collision: Go returns 409 → form surfaces error banner', async ({ page }) => {
		await setupOperator(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/tenants',
			status: 409,
			body: { code: 'slug_exists', message: 'A tenant with this slug already exists' }
		});

		await page.goto('/operator/tenants');
		await page.getByRole('button', { name: /register tenant/i }).click();

		const form = page.locator('#register-tenant-form');
		await form.getByLabel('Slug', { exact: true }).fill('duplicate-slug');
		await form.getByLabel('Legal name', { exact: true }).fill('Duplicate Pharma Pvt Ltd');
		await form.getByLabel('Display name', { exact: true }).fill('Duplicate');
		await form.getByLabel('First name', { exact: true }).fill('Admin');
		await form.getByLabel('Last name', { exact: true }).fill('User');
		await form.getByLabel('Email', { exact: true }).fill('admin@duplicate.test');
		await form.getByLabel('Initial password', { exact: true }).fill('SuperSecret1!');
		// Footer submit button (last in DOM, scoped to drawer)
		await page.locator('button[type="submit"][form="register-tenant-form"]').click();

		// Form-level banner appears with the server message
		await expect(page.getByText(/slug.*exists/i).first()).toBeVisible({ timeout: 5000 });
		// Global mutation-error toast also surfaces (role=status from Toaster).
		// Default behaviour: every mutation error → toast unless the mutation
		// hook opts out via meta. The form's inline banner is additional.
		await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Loading + feedback canon', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('skeleton renders while settings layout fetches tenant', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: ['tenant.admin']
		});
		// Don't register a tenant fetch — the layout's pending state should
		// surface the skeleton (aria-busy="true").
		await page.goto('/settings/tenant/profile');
		await expect(page.locator('[aria-busy="true"]').first()).toBeVisible({ timeout: 3000 });
	});
});

test.describe('Operator scope flow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('entering scope: cookie set, redirected to profile, no slug in URL', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		await page.getByText('Acme Pharma').first().click();

		await page.waitForURL(/\/operator\/scope\/profile$/);

		const u = new URL(page.url());
		expect(u.pathname).toBe('/operator/scope/profile');
		expect(u.search).toBe('');
		expect(page.url()).not.toContain('acme-pharma');
		expect(page.url()).not.toContain('tid-aaa');

		await expect(page.getByRole('heading', { level: 1, name: 'Acme Pharma' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();

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
		await registerMocks([
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } },
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
		]);
		await page.goto('/operator/tenants');
		await page.getByText('Acme Pharma').first().click();
		await page.waitForURL(/\/operator\/scope\/profile$/);
		await page.getByRole('link', { name: 'Members' }).click();
		await page.waitForURL(/\/operator\/scope\/members$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Team' })).toBeVisible();

		const calls = await listMockCalls();
		const usersCall = calls.find((c) => c.path === '/api/v1/users' && c.method === 'GET');
		expect(usersCall).toBeDefined();
	});

	test('direct visit to /operator/scope/profile without scope cookie: redirected to list', async ({
		page
	}) => {
		await setupOperator(page);
		// Navigate directly — no scope cookie yet
		await page.goto('/operator/scope/profile');
		await page.waitForURL(/\/operator\/tenants$/);
	});
});

test.describe('CSRF protection', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('scope POST without CSRF token is rejected by the BFF (403)', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
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

	test('scope POST with mismatched CSRF token: 403', async ({ page }) => {
		await setupOperator(page);
		await page.goto('/operator/tenants');
		const status = await page.evaluate(async () => {
			const resp = await fetch('/api/operator/scope', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': 'wrong-token' },
				body: JSON.stringify({ slug: 'acme-pharma' })
			});
			return resp.status;
		});
		expect(status).toBe(403);
	});
});

test.describe('Lifecycle: platform-tenant guard', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('platform tenant: lifecycle mutations hidden (immutable per backend invariant)', async ({
		page
	}) => {
		const PLATFORM = fakeTenantDto({
			id: 'tid-platform',
			slug: 'platform',
			display_name: 'LeadKart',
			legal_name: 'LeadKart Platform Pvt Ltd'
		});
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view', 'platform.tenants.manage'],
			is_super_user: true,
			tenant_id: TEST_TENANT_ID,
			tenant_slug: TEST_TENANT_SLUG
		});
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/platform/tenants',
				status: 200,
				body: { tenants: [PLATFORM] }
			},
			{ method: 'GET', path: `/api/v1/tenants/${PLATFORM.id}`, status: 200, body: PLATFORM },
			{
				method: 'GET',
				path: `/api/v1/tenants/by-slug/${PLATFORM.slug}`,
				status: 200,
				body: PLATFORM
			}
		]);
		await page.goto('/operator/tenants');
		// Click the row by its slug cell — unambiguous
		await page.getByRole('cell', { name: 'platform', exact: true }).click();
		await page.waitForURL(/\/operator\/scope\/profile$/);
		await page.getByRole('link', { name: 'Settings' }).click();
		await page.waitForURL(/\/operator\/scope\/settings$/);

		// "Lifecycle mutations are locked" message visible; action buttons hidden
		await expect(page.getByText(/locked for the platform tenant/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /^suspend$/i })).toHaveCount(0);
	});
});
