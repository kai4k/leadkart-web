import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
	fakeLoginResponse,
	TEST_TENANT_ID,
	TEST_MEMBERSHIP_ID,
	TEST_FAMILY_ID
} from './helpers/fake-jwt';

/**
 * Account self-service e2e — slice 1 acceptance gate.
 *
 * Three scenarios:
 *   1. Profile edit round-trip — change designation, save, reload, value persists.
 *   2. Sessions view — landing on /sessions shows the active "This device" badge.
 *   3. a11y — axe finds no serious/critical violations on the profile page.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for the
 * endpoints the flow exercises:
 *
 *   POST  /api/v1/auth/login                          → {tokens}
 *   GET   /api/v1/tenants/{tid}                       → minimal TenantDto (sidebar)
 *   GET   /api/v1/users/{mid}                         → UserDto
 *   PATCH /api/v1/users/{mid}/profile                 → 204; mutates fixture
 *   GET   /api/v1/auth/sessions                       → { sessions: [...] }
 *
 * Sign-in helper inlined here; promote to a shared fixture once a
 * second test file also needs it (Rule of Three — one caller = inline).
 *
 * a11y scope is restricted to <main> — the AppShell Sidebar has a
 * pre-existing `--color-fg-subtle` contrast issue on section titles
 * (tracked in a separate issue; see a11y.spec.ts for rationale).
 */

const MEMBERSHIP_ID = TEST_MEMBERSHIP_ID;
const TENANT_ID = TEST_TENANT_ID;

const BASE_USER_DTO = {
	membership_id: MEMBERSHIP_ID,
	person_id: '00000000-0000-0000-0000-000000000a01',
	tenant_id: TENANT_ID,
	email: 'user@acme.test',
	first_name: 'Alice',
	last_name: 'Tester',
	status: 'active',
	designation: 'Sales Executive',
	department: 'Sales',
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

async function signIn(page: Page): Promise<void> {
	await page.goto('/signin');
	await page.getByRole('textbox', { name: 'Email' }).fill('user@acme.test');
	await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery-staple');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(/\/dashboard$/);
}

async function mockTenantFetch(page: Page): Promise<void> {
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
}

test.describe('Account self-service', () => {
	test('profile round-trip: edit designation, save, reload, persists', async ({ page }) => {
		// Mutable fixture — the PATCH handler updates it so the
		// post-mutation silent-refresh returns the new value.
		let userState = { ...BASE_USER_DTO };

		await page.route('**/api/v1/auth/login', async (route: Route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(fakeLoginResponse())
			});
		});

		await mockTenantFetch(page);

		await page.route(`**/api/v1/users/${MEMBERSHIP_ID}`, async (route: Route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(userState)
				});
			} else {
				await route.continue();
			}
		});

		await page.route(`**/api/v1/users/${MEMBERSHIP_ID}/profile`, async (route: Route) => {
			if (route.request().method() === 'PATCH') {
				const body = route.request().postDataJSON() as {
					designation: string;
					department: string;
					status_message: string;
				};
				userState = { ...userState, ...body };
				await route.fulfill({ status: 204 });
			} else {
				await route.continue();
			}
		});

		await signIn(page);
		await page.goto('/settings/account/profile');

		const designation = page.getByLabel('Designation');
		await expect(designation).toBeVisible();

		const newValue = `E2E-Tester-${Date.now()}`;
		await designation.fill(newValue);
		await page.getByRole('button', { name: 'Save changes' }).click();

		// Success alert (role=alert; axe best-practice: aria-live=polite)
		await expect(page.getByRole('alert')).toContainText('Profile updated');

		// Reload — profile.load() is called again; mock returns mutated fixture.
		await page.reload();
		await expect(page.getByLabel('Designation')).toHaveValue(newValue);
	});

	test('sessions: list shows the active session as "This device"', async ({ page }) => {
		await page.route('**/api/v1/auth/login', async (route: Route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(fakeLoginResponse())
			});
		});

		await mockTenantFetch(page);

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

		// activeFamilyId in the sessions store is decoded from the refresh
		// token's `fam` claim. fakeLoginResponse() now mints a proper refresh
		// JWT via fakeRefreshToken() with fam = TEST_FAMILY_ID, so the
		// sessions list entry with that family_id gets the "This device" badge.
		await page.route('**/api/v1/auth/sessions', async (route: Route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						sessions: [
							{
								family_id: TEST_FAMILY_ID,
								tenant_id: TENANT_ID,
								device_label: 'Chrome on Windows',
								created_at: new Date().toISOString(),
								last_used_at: new Date().toISOString()
							}
						]
					})
				});
			} else {
				await route.continue();
			}
		});

		await signIn(page);
		await page.goto('/settings/account/sessions');

		await expect(page.getByRole('heading', { name: 'Active sessions' })).toBeVisible();
		await expect(page.getByText('This device')).toBeVisible();
	});

	test('a11y: profile page has no serious/critical violations', async ({ page }) => {
		await page.route('**/api/v1/auth/login', async (route: Route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(fakeLoginResponse())
			});
		});

		await mockTenantFetch(page);

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

		await signIn(page);
		await page.goto('/settings/account/profile');
		await expect(page.getByLabel('Designation')).toBeVisible();

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
