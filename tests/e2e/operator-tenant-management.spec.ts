import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeLoginResponse, TEST_TENANT_ID, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Operator tenant management e2e — slice 4 acceptance gate.
 *
 * Two scenarios:
 *   1. List page renders tenant cards from the real list endpoint.
 *   2. a11y — axe finds no serious/critical violations on the list page.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                          → {tokens} (platform principal)
 *   GET   /api/v1/platform/tenants                    → ListAllTenantsResponse
 *   GET   /api/v1/tenants/{tid}                       → minimal TenantDto (sidebar)
 *   GET   /api/v1/users/{mid}                         → UserDto (profile/sidebar)
 *
 * Principal carries `platform.tenants.view` + `platform.tenants.create`
 * + `is_platform: true` so the /operator/tenants load guard passes and
 * the "Register tenant" button renders.
 *
 * a11y scope is restricted to <main> — the AppShell Sidebar has a
 * pre-existing --color-fg-subtle contrast issue on section titles
 * (tracked separately; see a11y.spec.ts for rationale).
 */

const MEMBERSHIP_ID = TEST_MEMBERSHIP_ID;
const TENANT_ID = TEST_TENANT_ID;

const BASE_USER_DTO = {
	membership_id: MEMBERSHIP_ID,
	person_id: '00000000-0000-0000-0000-000000000a01',
	tenant_id: TENANT_ID,
	email: 'operator@leadkart.io',
	first_name: 'Platform',
	last_name: 'Operator',
	status: 'active',
	designation: 'Platform Manager',
	department: 'Operations',
	status_message: '',
	joined_at: '2026-01-15T10:30:00Z',
	left_at: null,
	reports_to: null,
	role_ids: []
};

const MINIMAL_TENANT = {
	id: TENANT_ID,
	slug: 'leadkart-platform',
	legal_name: 'LeadKart Platform Pvt Ltd',
	display_name: 'LeadKart',
	admin_email: 'operator@leadkart.io',
	status: 'active',
	created_at: '2026-01-01T00:00:00Z',
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
};

const LIST_TENANTS_RESPONSE = {
	tenants: [
		{
			...MINIMAL_TENANT,
			id: 'tid-aaa',
			slug: 'acme-pharma',
			display_name: 'Acme Pharma',
			legal_name: 'Acme Pharma Pvt Ltd'
		},
		{
			...MINIMAL_TENANT,
			id: 'tid-bbb',
			slug: 'beta-meds',
			display_name: 'Beta Meds',
			legal_name: 'Beta Meds Ltd'
		}
	]
};

async function signInAsPlatformOperator(page: Page): Promise<void> {
	// Mock login — platform principal with operator permissions so the
	// /operator/tenants load guard (hasPermission platform.tenants.view) passes.
	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeLoginResponse({
					is_platform: true,
					permission: ['platform.tenants.view', 'platform.tenants.create']
				})
			)
		});
	});

	// List tenants — the real GET /v1/platform/tenants that the store calls on mount.
	await page.route('**/api/v1/platform/tenants', async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(LIST_TENANTS_RESPONSE)
			});
		} else {
			await route.continue();
		}
	});

	// Tenant fetch — AppShell sidebar triggers this on every (app) route.
	await page.route(`**/api/v1/tenants/${TENANT_ID}`, async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(MINIMAL_TENANT)
			});
		} else {
			await route.continue();
		}
	});

	// User profile fetch — AppShell / sidebar avatar triggers this.
	await page.route(`**/api/v1/users/${MEMBERSHIP_ID}`, async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(BASE_USER_DTO)
			});
		} else {
			await route.continue();
		}
	});

	await page.goto('/signin');
	await page.getByRole('textbox', { name: 'Email' }).fill('operator@leadkart.io');
	await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery-staple');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(/\/dashboard$/);
}

test.describe('Operator tenant management', () => {
	test('tenants list: renders tenant cards from real list endpoint', async ({ page }) => {
		await signInAsPlatformOperator(page);
		await page.goto('/operator/tenants');

		// Page heading is present
		await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible();

		// Tenant cards from the mocked list are rendered
		await expect(page.getByText('Acme Pharma')).toBeVisible();
		await expect(page.getByText('Beta Meds')).toBeVisible();

		// Register tenant button is visible (platform.tenants.create granted)
		await expect(page.getByRole('button', { name: /register tenant/i })).toBeVisible();
	});

	test('tenants list: a11y serious/critical clean', async ({ page }) => {
		await signInAsPlatformOperator(page);
		await page.goto('/operator/tenants');

		// Wait for the list to load
		await expect(page.getByText('Acme Pharma')).toBeVisible();

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
