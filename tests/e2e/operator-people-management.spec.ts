import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeLoginResponse, TEST_TENANT_ID, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Operator people management e2e — slice 5 acceptance gate.
 *
 * Two scenarios:
 *   1. List page renders with the info banner (no list endpoint workaround).
 *   2. a11y — axe finds no serious/critical violations on the list page.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                          → {tokens} (platform principal)
 *   GET   /api/v1/tenants/{tid}                       → minimal TenantDto (sidebar)
 *   GET   /api/v1/users/{mid}                         → UserDto (profile/sidebar)
 *
 * Principal carries `platform.users.view` + `platform.users.manage`
 * + `identity.users.anonymise` + `is_platform: true` so the
 * /operator/people load guard passes.
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

async function signInAsPlatformOperator(page: Page): Promise<void> {
	// Mock login — platform principal with people-management permissions so
	// the /operator/people load guard (hasPermission platform.users.view) passes.
	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeLoginResponse({
					is_platform: true,
					permission: ['platform.users.view', 'platform.users.manage', 'identity.users.anonymise']
				})
			)
		});
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

test.describe('Operator people management', () => {
	test('people list: info banner renders', async ({ page }) => {
		await signInAsPlatformOperator(page);
		await page.goto('/operator/people');

		// Page heading is present
		await expect(page.getByRole('heading', { name: /platform users/i })).toBeVisible();

		// Info banner re: missing list endpoint
		await expect(page.getByText(/person listing endpoint pending on the backend/i)).toBeVisible();

		// Search input and look-up button render
		await expect(page.getByPlaceholder(/person id/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /look up/i })).toBeVisible();
	});

	test('people list: a11y serious/critical clean', async ({ page }) => {
		await signInAsPlatformOperator(page);
		await page.goto('/operator/people');

		// Wait for the info banner to confirm load completed
		await expect(page.getByText(/person listing endpoint pending on the backend/i)).toBeVisible();

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
