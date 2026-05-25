import { expect, test } from '@playwright/test';
import { resetMock, registerMock } from './helpers/mock';

/**
 * Forgot password (email-link reset) e2e.
 *
 *   /forgot-password  — user enters email, BFF POSTs to Go's
 *                       /api/v1/auth/request-password-reset. Go ALWAYS
 *                       returns 204 (Auth0/Okta canon — defeats account
 *                       enumeration).
 *   /reset-password   — user lands here from the email link with ?token=…;
 *                       enters new password + confirm; BFF POSTs to Go's
 *                       /api/v1/auth/reset-password.
 *
 * Coverage:
 *   Discovery: signin link → /forgot-password; both pages public.
 *   Forgot (positive): 204 → identical success copy regardless of whether
 *     the email was registered.
 *   Reset (positive): valid token + matching passwords → 204 → /signin.
 *   Reset (negative): missing token, mismatched confirm, weak new password,
 *     400 invalid_token, 422 password_breached, 422 password_same.
 */

test.describe('Forgot password — discovery', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Signin page links to /forgot-password', async ({ page }) => {
		await page.goto('/signin');
		const link = page.getByRole('link', { name: /forgot password/i });
		await expect(link).toBeVisible();
		await link.click();
		await page.waitForURL(/\/forgot-password$/);
		await expect(
			page.getByRole('heading', { level: 1, name: /forgot your password/i })
		).toBeVisible();
	});

	test('Forgot page is public — accessible without auth', async ({ page }) => {
		await page.goto('/forgot-password');
		await expect(page).toHaveURL(/\/forgot-password$/);
		await expect(page.getByLabel(/email/i)).toBeVisible();
	});

	test('Reset page is public — accessible with token', async ({ page }) => {
		await page.goto('/reset-password?token=any');
		await expect(page).toHaveURL(/\/reset-password/);
		await expect(page.getByLabel(/new password/i).first()).toBeVisible();
		await expect(page.getByLabel(/confirm/i)).toBeVisible();
	});
});

test.describe('Forgot password — request', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: 204 → success alert', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/request-password-reset',
			status: 204
		});
		await page.goto('/forgot-password');
		await page.getByLabel(/email/i).fill('user@acme.test');
		await page.getByRole('button', { name: /send reset link/i }).click();
		await expect(
			page.getByText(/we've sent a password-reset link|that email is registered/i)
		).toBeVisible({ timeout: 5000 });
	});

	test('invalid email format: client-side field error, no POST fires', async ({ page }) => {
		await page.goto('/forgot-password');
		await page.getByLabel(/email/i).fill('not-an-email');
		await page.getByRole('button', { name: /send reset link/i }).click();
		await expect(page.locator('input[aria-invalid="true"]').first()).toBeVisible({
			timeout: 3000
		});
	});
});

test.describe('Reset password — confirm', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: token + strong password → 204 → redirect to /signin', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 204
		});
		await page.goto('/reset-password?token=valid-token-here');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('Sh1ny.NewOne.Strong!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne.Strong!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByText(/password reset/i)).toBeVisible({ timeout: 5000 });
		await page.waitForURL(/\/signin$/, { timeout: 5000 });
	});

	test('missing token: surfaces "request a new one" instead of form', async ({ page }) => {
		await page.goto('/reset-password');
		await expect(
			page.getByText(/expects a reset token|use the link from your email/i)
		).toBeVisible();
		await expect(page.getByRole('link', { name: /request a new reset link/i })).toBeVisible();
	});

	test('mismatched confirm: cross-field error, no POST', async ({ page }) => {
		await page.goto('/reset-password?token=t');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('Sh1ny.NewOne.Strong!');
		await page.getByLabel(/confirm/i).fill('Different.One.Strong!');
		await page.getByRole('button', { name: /reset password/i }).click();
		await expect(page.getByText(/passwords don't match/i)).toBeVisible({ timeout: 3000 });
	});

	test('weak new password (<12 chars): Zod field error, no POST', async ({ page }) => {
		await page.goto('/reset-password?token=t');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('shortpw');
		await page.getByLabel(/confirm/i).fill('shortpw');
		await page.getByRole('button', { name: /reset password/i }).click();
		await expect(page.locator('input[aria-invalid="true"]').first()).toBeVisible({
			timeout: 3000
		});
	});

	test('400 invalid_token: top banner', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 400,
			body: { code: 'invalid_token', message: 'Token is invalid' }
		});
		await page.goto('/reset-password?token=expired');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('Sh1ny.NewOne.Strong!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne.Strong!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/reset-password/);
	});

	test('422 password_breached: inline new-password field error', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 422,
			body: { code: 'password_breached', message: 'Password appears in HIBP' }
		});
		await page.goto('/reset-password?token=t');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('PasswordInHIBP.Long!');
		await page.getByLabel(/confirm/i).fill('PasswordInHIBP.Long!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByText(/breach lists/i)).toBeVisible({ timeout: 5000 });
	});

	test('422 password_same: inline new-password field error', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 422,
			body: { code: 'password_same', message: 'New password must differ' }
		});
		await page.goto('/reset-password?token=t');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('Old.Password.Long!');
		await page.getByLabel(/confirm/i).fill('Old.Password.Long!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByText(/must differ/i)).toBeVisible({ timeout: 5000 });
	});
});
