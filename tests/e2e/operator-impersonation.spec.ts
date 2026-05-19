import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
	fakeLoginResponse,
	fakeCapabilitiesResponse,
	TEST_TENANT_ID,
	TEST_MEMBERSHIP_ID
} from './helpers/fake-jwt';

/**
 * Operator impersonation e2e — slice 6 acceptance gate.
 *
 * Two scenarios:
 *   1. ImpersonateModal opens from the tenants list + submits → banner renders.
 *   2. a11y — axe finds no serious/critical violations on the list page with banner.
 *
 * The leadkart-go backend is NOT running in CI, so each test sets up
 * Playwright route handlers that return canned responses for:
 *
 *   POST  /api/v1/auth/login                                  → tokens (platform principal)
 *   GET   /api/v1/tenants/{tid}                               → minimal TenantDto
 *   GET   /api/v1/users/{mid}                                 → UserDto
 *   POST  /api/v1/platform/impersonation/sessions             → { session_id, expires_at_utc }
 *   GET   /api/v1/platform/impersonation/sessions             → { sessions: [ImpersonationSessionDto] }
 *   DELETE /api/v1/platform/impersonation/sessions/{id}       → 204
 *
 * Principal carries `platform.tenants.view` + `platform.tenants.create`
 * + `is_platform: true` so the /operator/tenants guard passes and the
 * Impersonate button renders.
 */

const MEMBERSHIP_ID = TEST_MEMBERSHIP_ID;
const TENANT_ID = TEST_TENANT_ID;
const SESSION_ID = 'sess-e2e-test-001';
const EXPIRES_AT = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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

const IMPERSONATION_SESSION_DTO = {
	session_id: SESSION_ID,
	operator_id: '00000000-0000-0000-0000-000000000a01',
	target_tenant_id: TENANT_ID,
	reason: 'Investigating billing discrepancy reported by user',
	created_at: new Date().toISOString(),
	expires_at: EXPIRES_AT
};

async function signInAsPlatformOperator(page: Page): Promise<void> {
	// Mock login — platform principal with operator permissions.
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

	// Capabilities — Sidebar + UserMenu query this on every (app) route.
	await page.route('**/api/v1/auth/me/capabilities', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				fakeCapabilitiesResponse({
					permissions: ['platform.tenants.view', 'platform.tenants.create'],
					is_platform: true,
					is_super_user: true,
					tenant_id: TENANT_ID,
					tenant_slug: 'leadkart-platform',
					email: 'operator@leadkart.io'
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

	// Impersonation sessions — GET (reconcile on mount + after start)
	// Initially returns empty list (no active session); after POST returns the new session.
	let sessionStarted = false;
	await page.route('**/api/v1/platform/impersonation/sessions', async (route: Route) => {
		const method = route.request().method();
		if (method === 'POST') {
			sessionStarted = true;
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ session_id: SESSION_ID, expires_at_utc: EXPIRES_AT })
			});
		} else if (method === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					sessions: sessionStarted ? [IMPERSONATION_SESSION_DTO] : []
				})
			});
		} else if (method === 'DELETE') {
			sessionStarted = false;
			await route.fulfill({ status: 204 });
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

test.describe('Operator impersonation', () => {
	test('ImpersonateModal opens from tenant row + submits + banner renders', async ({ page }) => {
		await signInAsPlatformOperator(page);
		await page.goto('/operator/tenants');

		// Trigger a tenant lookup so rows appear
		await page.getByRole('textbox', { name: /tenant id or slug/i }).fill(TENANT_ID);
		await page.getByRole('button', { name: /look up/i }).click();

		// Wait for the tenant card row to appear
		await expect(page.getByRole('link', { name: /leadkart/i }).first()).toBeVisible();

		// Click the Impersonate button on the first row
		await page.getByRole('button', { name: /impersonate leadkart/i }).click();

		// Modal should be open — check for the dialog heading
		await expect(page.getByRole('heading', { name: /impersonate leadkart/i })).toBeVisible();

		// Warning alert should be visible
		await expect(page.getByText(/every action is auditable/i)).toBeVisible();

		// Fill in a valid reason (≥10 chars)
		await page
			.getByRole('textbox', { name: /reason/i })
			.fill('Investigating billing discrepancy reported by user');

		// Submit
		await page.getByRole('button', { name: /start impersonation/i }).click();

		// After success the modal should close and the banner should appear
		await expect(page.getByRole('status', { name: /active impersonation session/i })).toBeVisible({
			timeout: 5000
		});

		// Banner should show the tenant ID
		await expect(page.getByRole('status')).toContainText(TENANT_ID);

		// End impersonation button should be present in the banner
		await expect(page.getByRole('button', { name: /end impersonation/i })).toBeVisible();
	});

	test('operator tenants page with banner: a11y serious/critical clean', async ({ page }) => {
		await signInAsPlatformOperator(page);

		// Seed localStorage with an active session so the banner renders on load.
		// We mock the GET /sessions to return the session immediately.
		await page.evaluate(({ key, sessionId }) => localStorage.setItem(key, sessionId), {
			key: 'leadkart-impersonation-session',
			sessionId: SESSION_ID
		});

		await page.goto('/operator/tenants');

		// Wait for the banner to render (reconcile() will confirm the session via GET)
		await expect(page.getByRole('status', { name: /active impersonation session/i })).toBeVisible({
			timeout: 5000
		});

		// a11y scan — restrict to main; sidebar has a pre-existing contrast issue tracked separately.
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
