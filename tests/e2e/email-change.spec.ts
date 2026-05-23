import { expect, test } from '@playwright/test';
import { resetMock, registerMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * Email-change flow:
 *   Authenticated form at /settings/account/security → POST /v1/auth/request-email-change
 *   → Go emails a token to the NEW address.
 *   Public /confirm-email-change?token=… consumes the token via POST
 *   /v1/auth/confirm-email-change → 204.
 */

test.describe('Email change — request (authenticated)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: 204 → success copy explains the two-step nature', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/request-email-change',
			status: 204
		});
		await page.goto('/settings/account/security');

		// The Change-email card has its own "New email" label
		const emailInput = page
			.locator('section, div')
			.filter({ hasText: /change email/i })
			.locator('input[type="email"]')
			.first()
			.or(page.getByLabel(/new email/i));

		await emailInput.fill('new@example.com');
		await page.getByRole('button', { name: /send confirmation link/i }).click();
		await expect(page.getByText(/check your new inbox|isn't applied until/i)).toBeVisible({
			timeout: 5000
		});
	});

	test('409 email in use: top banner', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/request-email-change',
			status: 409,
			body: { code: 'email_in_use', message: 'Email already in use' }
		});
		await page.goto('/settings/account/security');

		await page.getByLabel(/new email/i).fill('taken@example.com');
		await page.getByRole('button', { name: /send confirmation link/i }).click();
		await expect(page.getByText(/already in use/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Email change — confirm (public)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: ?token=… → 204 → success surface', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/confirm-email-change',
			status: 204
		});
		await page.goto('/confirm-email-change?token=signed.email.token');
		await expect(page.getByText(/email updated/i)).toBeVisible({ timeout: 5000 });
	});

	test('missing token: surfaces the "use the link from your email" warning', async ({ page }) => {
		await page.goto('/confirm-email-change');
		await expect(
			page.getByText(/expects a confirmation token|link from your email/i)
		).toBeVisible();
	});

	test('400 invalid_token: error alert', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/confirm-email-change',
			status: 400,
			body: { code: 'invalid_token', message: 'Token is invalid' }
		});
		await page.goto('/confirm-email-change?token=expired');
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
	});
});
