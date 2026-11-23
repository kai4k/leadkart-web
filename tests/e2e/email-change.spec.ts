import { expect, test } from './helpers/test';
import { listMockCalls, resetMock, registerMock } from './helpers/mock';
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

	test('400 invalid_email: inline field error (a taken address is a silent 204 in Go)', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/request-email-change',
			status: 400,
			body: { error: 'invalid_email', message: 'invalid email' }
		});
		await page.goto('/settings/account/security');

		await page.getByLabel(/new email/i).fill('taken@example.com');
		await page.getByRole('button', { name: /send confirmation link/i }).click();
		await expect(page.getByText('Invalid email format.')).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Email change — confirm (public)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: ?token=… → one click → 204 → success surface', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/confirm-email-change',
			status: 204
		});
		await page.goto('/confirm-email-change?token=signed.email.token');
		const confirm = page.getByRole('button', { name: /confirm new email/i });
		await expect(confirm).toBeVisible({ timeout: 5000 });
		// Opening the link spends nothing: a mail scanner that loads the page (and runs its scripts) leaves the token alone.
		const posted = async () =>
			(await listMockCalls()).filter((c) => c.path === '/api/v1/auth/confirm-email-change').length;
		expect(await posted()).toBe(0);
		await confirm.click();
		await expect(page.getByText(/email updated/i)).toBeVisible({ timeout: 5000 });
		expect(await posted()).toBe(1);
	});

	test('missing token: surfaces the "use the link from your email" warning', async ({ page }) => {
		await page.goto('/confirm-email-change');
		await expect(
			page.getByText(/expects a confirmation token|link from your email/i)
		).toBeVisible();
	});

	test('400 email_change_token_invalid: error alert', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/confirm-email-change',
			status: 400,
			body: { error: 'email_change_token_invalid', message: '' }
		});
		await page.goto('/confirm-email-change?token=expired');
		await page.getByRole('button', { name: /confirm new email/i }).click();
		await expect(page.getByText(/invalid or has expired/i)).toBeVisible({ timeout: 5000 });
	});
});
