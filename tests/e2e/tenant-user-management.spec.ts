import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeLoginResponse, TEST_TENANT_ID, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Tenant user management e2e — slice 2 acceptance gate.
 *
 * Two scenarios:
 *   1. Empty state renders + Add member drawer opens on click.
 *   2. a11y — axe finds no serious/critical violations on the users page.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                          → {tokens}
 *   GET   /api/v1/tenants/{tid}                       → minimal TenantDto (sidebar)
 *   GET   /api/v1/users/{mid}                         → UserDto (profile/sidebar)
 *   GET   /api/v1/users                               → { users: [] } (empty list)
 *   POST  /api/v1/users                               → 201 { person_id, membership_id, person_existed: false }
 *   GET   /api/v1/roles                               → { roles: [] }
 *
 * Sign-in helper follows the pattern in account-self-service.spec.ts.
 * Principal carries identity.users.* + identity.roles.assign so the
 * /settings/users load guard passes.
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
	email: 'admin@acme.test',
	first_name: 'Admin',
	last_name: 'User',
	status: 'active',
	designation: 'Tenant Administrator',
	department: 'Administration',
	status_message: '',
	joined_at: '2026-01-15T10:30:00Z',
	left_at: null,
	reports_to: null,
	role_ids: []
};

const MINIMAL_TENANT = {
	id: TENANT_ID,
	slug: 'acme',
	legal_name: 'Acme Pharma Pvt Ltd',
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
};

async function signInAsAdmin(page: Page): Promise<void> {
	// Mock login — principal carries all four user-management permissions
	// so the /settings/users load guard (hasPermission identity.users.view) passes.
	// JWT claim is `permission` (array); fakeLoginResponse forwards overrides
	// to fakeAccessToken which spreads them into the JWT payload.
	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeLoginResponse({
					permission: [
						'identity.users.view',
						'identity.users.create',
						'identity.users.deactivate',
						'identity.roles.assign'
					]
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

	// Users list — GET returns empty roster; POST returns new-member response.
	await page.route('**/api/v1/users', async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ users: [] })
			});
		} else if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					person_id: 'p_new',
					membership_id: 'm_new',
					person_existed: false
				})
			});
		} else {
			await route.continue();
		}
	});

	// Roles catalogue — UsersStore.load() fetches this in parallel with the
	// users list. Empty list exercises the no-catalogue case.
	await page.route('**/api/v1/roles', async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ roles: [] })
			});
		} else {
			await route.continue();
		}
	});

	await page.goto('/signin');
	await page.getByRole('textbox', { name: 'Email' }).fill('admin@acme.test');
	await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery-staple');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(/\/dashboard$/);
}

test.describe('Tenant user management', () => {
	test('users page: empty state renders + Add member drawer opens', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings/users');

		// Empty-state heading and copy
		await expect(page.getByRole('heading', { name: /team/i })).toBeVisible();
		await expect(page.getByText(/no team members yet/i)).toBeVisible();

		// Clicking the empty-state "Add member" button opens the Create User drawer
		await page
			.getByRole('button', { name: /add member/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: /add team member/i })).toBeVisible();
	});

	test('users page: a11y serious/critical clean', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings/users');

		// Wait for the empty-state to confirm load completed (no spinner)
		await expect(page.getByText(/no team members yet/i)).toBeVisible();

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
