import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeLoginResponse, TEST_TENANT_ID, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Tenant roles management e2e — slice 3 acceptance gate.
 *
 * Two scenarios:
 *   1. Empty state renders on /settings/roles.
 *   2. a11y — axe finds no serious/critical violations on the roles page.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                          → {tokens}
 *   GET   /api/v1/tenants/{tid}                       → minimal TenantDto (sidebar)
 *   GET   /api/v1/users/{mid}                         → UserDto (profile/sidebar)
 *   GET   /api/v1/users                               → { users: [] }
 *   GET   /api/v1/roles                               → { roles: [] } (empty list)
 *
 * Sign-in helper mirrors tenant-user-management.spec.ts.
 * Principal carries identity.roles.* so the /settings/roles load
 * guard (hasPermission identity.roles.view) passes.
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

async function signInAsRolesAdmin(page: Page): Promise<void> {
	// Mock login — principal carries all four role-management permissions
	// so the /settings/roles load guard (hasPermission identity.roles.view) passes.
	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeLoginResponse({
					permission: [
						'identity.roles.view',
						'identity.roles.create',
						'identity.roles.update',
						'identity.roles.delete'
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

	// Users list — RolesList loads users for member counts.
	await page.route('**/api/v1/users', async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ users: [] })
			});
		} else {
			await route.continue();
		}
	});

	// Roles catalogue — empty list exercises the empty-state path.
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

test.describe('Tenant roles management', () => {
	test('roles page: empty state renders', async ({ page }) => {
		await signInAsRolesAdmin(page);
		await page.goto('/settings/roles');

		// Page heading is present
		await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();

		// Empty-state copy
		await expect(page.getByText(/no roles yet/i)).toBeVisible();
	});

	test('roles page: a11y serious/critical clean', async ({ page }) => {
		await signInAsRolesAdmin(page);
		await page.goto('/settings/roles');

		// Wait for the empty-state to confirm load completed (no spinner)
		await expect(page.getByText(/no roles yet/i)).toBeVisible();

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
