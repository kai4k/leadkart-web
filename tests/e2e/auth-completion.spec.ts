import { expect, test, type Page, type Route } from '@playwright/test';
import { fakeLoginResponse, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * End-to-end coverage for the four remaining auth flows:
 *
 *   /forgot-password           POST /api/v1/auth/request-password-reset
 *   /reset-password?token=…    POST /api/v1/auth/reset-password
 *   /confirm-email-change?token=…  POST /api/v1/auth/confirm-email-change
 *   /settings/account/security
 *     ├─ Change password       POST /api/v1/auth/change-password
 *     └─ Change email          POST /api/v1/auth/request-email-change
 *
 * leadkart-go isn't running in CI, so each test sets up Playwright
 * route handlers that return the expected status codes per the
 * leadkart-go handler contracts.
 */

const TENANT_ID = TEST_TENANT_ID;

const TENANT_FIXTURE = {
	id: TENANT_ID,
	slug: 'acme',
	legal_name: 'Acme',
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

async function mockSignIn(page: Page): Promise<void> {
	await page.route('**/api/v1/auth/login', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(fakeLoginResponse())
		});
	});
	await page.route(`**/api/v1/tenants/${TENANT_ID}`, async (route: Route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(TENANT_FIXTURE)
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

test.describe('Auth completion — happy paths', () => {
	test('forgot password — submit + neutral success Alert', async ({ page }) => {
		await page.route('**/api/v1/auth/request-password-reset', async (route: Route) => {
			await route.fulfill({ status: 204 });
		});

		await page.goto('/forgot-password');
		await page.getByRole('textbox', { name: 'Email' }).fill('user@acme.test');
		await page.getByRole('button', { name: 'Send reset link' }).click();

		await expect(page.getByRole('alert')).toContainText(
			"If that account exists, we've sent a password reset link"
		);
	});

	test('reset password — token in URL, submit, redirect to /signin', async ({ page }) => {
		await page.route('**/api/v1/auth/reset-password', async (route: Route) => {
			await route.fulfill({ status: 204 });
		});

		await page.goto('/reset-password?token=fake.reset.token');
		await page.getByLabel('New password', { exact: true }).fill('NewPassword42!');
		await page.getByLabel('Confirm new password').fill('NewPassword42!');
		await page.getByRole('button', { name: 'Reset password' }).click();

		await page.waitForURL(/\/signin$/);
	});

	test('reset password — missing token → banner + recovery link', async ({ page }) => {
		await page.goto('/reset-password');

		await expect(page.getByRole('alert')).toContainText('missing its token');
		await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
	});

	test('change password — happy path clears fields + success Alert', async ({ page }) => {
		await mockSignIn(page);
		await page.route('**/api/v1/auth/change-password', async (route: Route) => {
			await route.fulfill({ status: 204 });
		});

		await page.goto('/settings/account/security');
		await page.getByLabel('Current password', { exact: true }).fill('OldPassword42!');
		await page.getByLabel('New password', { exact: true }).fill('NewerPassword42!');
		await page.getByLabel('Confirm new password').fill('NewerPassword42!');
		await page.getByRole('button', { name: 'Update password' }).click();

		await expect(page.getByRole('alert')).toContainText('Password updated');
		// All three fields should be cleared post-success.
		await expect(page.getByLabel('Current password', { exact: true })).toHaveValue('');
	});

	test('change email — happy path shows neutral success copy', async ({ page }) => {
		await mockSignIn(page);
		await page.route('**/api/v1/auth/request-email-change', async (route: Route) => {
			await route.fulfill({ status: 204 });
		});

		await page.goto('/settings/account/security');
		await page.getByLabel('New email', { exact: true }).fill('new@acme.test');
		await page.getByRole('button', { name: 'Send confirmation link' }).click();

		await expect(page.getByRole('alert')).toContainText('Confirmation link sent');
	});

	test('confirm email change — explicit-click confirm + success', async ({ page }) => {
		await page.route('**/api/v1/auth/confirm-email-change', async (route: Route) => {
			await route.fulfill({ status: 204 });
		});

		await page.goto('/confirm-email-change?token=fake.email.token');
		await page.getByRole('button', { name: 'Confirm email change' }).click();

		await expect(page.getByRole('alert')).toContainText('Email updated');
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
	});
});
