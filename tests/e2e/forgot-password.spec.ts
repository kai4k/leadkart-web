import { expect, test } from '@playwright/test';
import { resetMock, registerMock } from './helpers/mock';

/**
 * Forgot password (reset-with-old-password) e2e — /reset-password
 *
 *   Positive:
 *     Signin page surfaces "Forgot password?" link → navigates to /reset-password
 *     Form renders all four fields + back-to-signin link
 *     Submit happy path: 204 → success alert + redirect to /signin
 *
 *   Negative:
 *     Mismatched confirm: inline cross-field error, no POST fires
 *     Weak new_password (<8 chars): Zod field error, no POST fires
 *     Wrong old password (401): top banner with invalid-credentials message
 *     Breached new password (422 password_breached): inline field error
 *     New == old (422 password_same): inline field error
 *     Rate-limited (429): top banner with throttle notice
 *
 *   Flow:
 *     Public route — no auth required. Anonymous visitor can reach it.
 */

test.describe('Forgot password — discovery', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Signin page links to /reset-password', async ({ page }) => {
		await page.goto('/signin');
		const link = page.getByRole('link', { name: /forgot password/i });
		await expect(link).toBeVisible();
		await link.click();
		await page.waitForURL(/\/reset-password$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Reset password' })).toBeVisible();
	});

	test('Reset page is public — accessible without auth', async ({ page }) => {
		await page.goto('/reset-password');
		await expect(page).toHaveURL(/\/reset-password$/);
		// Form fields present
		await expect(page.getByLabel(/^email/i)).toBeVisible();
		await expect(page.getByLabel(/^current password/i)).toBeVisible();
		await expect(page.getByLabel(/^new password/i)).toBeVisible();
		await expect(page.getByLabel(/confirm/i)).toBeVisible();
		// Back-to-signin link present
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
	});
});

test.describe('Forgot password — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: 204 → success alert + redirects to /signin', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-with-old-password',
			status: 204
		});

		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('Sh1ny.NewOne!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne!');
		await page.getByRole('button', { name: /reset password/i }).click();

		// Success alert appears
		await expect(page.getByText(/password reset/i)).toBeVisible({ timeout: 5000 });
		// Then redirects to /signin (2s setTimeout)
		await page.waitForURL(/\/signin$/, { timeout: 5000 });
	});
});

test.describe('Forgot password — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('mismatched confirm: cross-field error, no POST fires', async ({ page }) => {
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('Sh1ny.NewOne!');
		await page.getByLabel(/confirm/i).fill('TypoIn.Confirm!1');
		await page.getByRole('button', { name: /reset password/i }).click();

		// The confirm field surfaces an error; form stays on the page
		await expect(page.getByText(/passwords don't match/i)).toBeVisible({ timeout: 3000 });
		await expect(page).toHaveURL(/\/reset-password$/);
	});

	test('weak new password (<8 chars): Zod field error, no POST', async ({ page }) => {
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('short');
		await page.getByLabel(/confirm/i).fill('short');
		await page.getByRole('button', { name: /reset password/i }).click();

		// Zod schema rejects new_password length — field error renders
		await expect(page.locator('input[aria-invalid="true"]').first()).toBeVisible({
			timeout: 3000
		});
		await expect(page).toHaveURL(/\/reset-password$/);
	});

	test('401 invalid_credentials: top banner with email/password message', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-with-old-password',
			status: 401,
			body: {
				code: 'invalid_credentials',
				message: 'Email or current password is incorrect'
			}
		});
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('WrongOld!');
		await page.getByLabel(/^new password/i).fill('Sh1ny.NewOne!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne!');
		await page.getByRole('button', { name: /reset password/i }).click();

		// Banner alert surfaces — stays on page
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/reset-password$/);
	});

	test('422 password_breached: inline new-password field error', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-with-old-password',
			status: 422,
			body: {
				code: 'password_breached',
				message: 'Password appears in HIBP'
			}
		});
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('PasswordIn.HIBP!');
		await page.getByLabel(/confirm/i).fill('PasswordIn.HIBP!');
		await page.getByRole('button', { name: /reset password/i }).click();

		// Inline field error under New password
		await expect(page.getByText(/breach lists/i)).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/reset-password$/);
	});

	test('422 password_same: inline new-password field error', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-with-old-password',
			status: 422,
			body: {
				code: 'password_same',
				message: 'New password must differ from current'
			}
		});
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('Old.Password!1');
		await page.getByLabel(/confirm/i).fill('Old.Password!1');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByText(/must differ/i)).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/reset-password$/);
	});

	test('429 rate_limited: top banner with throttle notice', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-with-old-password',
			status: 429,
			body: {
				code: 'rate_limited',
				message: 'Too many attempts'
			}
		});
		await page.goto('/reset-password');
		await page.getByLabel(/^email/i).fill('user@acme.test');
		await page.getByLabel(/^current password/i).fill('Old.Password!1');
		await page.getByLabel(/^new password/i).fill('Sh1ny.NewOne!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByText(/too many attempts/i)).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/reset-password$/);
	});
});
