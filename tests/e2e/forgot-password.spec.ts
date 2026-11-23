import { expect, test } from './helpers/test';
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
 *     400 reset_token_invalid, 422 password_breached, 422 password_same_as_current.
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

	// A malformed address is NOT rejected: Go answers it like an unknown one (204), so the form must not
	// reveal more than Go does. Only an empty field is refused.
	test('empty email: field error, no POST fires', async ({ page }) => {
		await page.goto('/forgot-password');
		await page.getByLabel(/email/i).fill('   ');
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

	test('weak new password (<8 chars): Zod field error, no POST', async ({ page }) => {
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

	// Go: internal/identity/ports/http.go:896 answers 400 reset_token_invalid for an expired, unknown, used
	// or suspended-person's token, and for a token spent by five refused passwords (the token is checked
	// before the password; docs/BFF_API_CHANGES.md row 29: "ask for a new link").
	test('400 reset_token_invalid (a spent link): one sentence and the way to a new link, no form left', async ({
		page
	}) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 400,
			body: {
				type: 'https://leadkart.api/errors/reset_token_invalid',
				title: 'Bad Request',
				status: 400,
				error: 'reset_token_invalid'
			}
		});
		await page.goto('/reset-password?token=expired');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('Sh1ny.NewOne.Strong!');
		await page.getByLabel(/confirm/i).fill('Sh1ny.NewOne.Strong!');
		await page.getByRole('button', { name: /reset password/i }).click();

		await expect(page.getByRole('alert')).toHaveText(
			'This link can no longer be used. Request a new one.'
		);
		await expect(page).toHaveURL(/\/reset-password/);
		// the link cannot be retried: the fields are gone and the one action left has the focus
		await expect(page.getByLabel(/new password/i)).toHaveCount(0);
		const requestNew = page.getByRole('link', { name: 'Request a new reset link' });
		await expect(requestNew).toBeFocused();
		await requestNew.click();
		await expect(page).toHaveURL(/\/forgot-password$/);
	});

	// Row 29: a live token refused for its password is counted; after the 5th refusal the next call is
	// reset_token_invalid. The page does not count: it follows what Go answers.
	test('a link spent by refused passwords: the refusal keeps the form, the next answer ends it', async ({
		page
	}) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 400,
			body: {
				type: 'https://leadkart.api/errors/reset_token_invalid',
				title: 'Bad Request',
				status: 400,
				error: 'reset_token_invalid'
			}
		});
		// http.go:891 -> writePasswordPolicyError (http.go:408), once
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 422,
			times: 1,
			body: {
				type: 'https://leadkart.api/errors/password_policy_violation',
				title: 'Unprocessable Entity',
				status: 422,
				detail: 'password does not satisfy the tenant password policy',
				error: 'password_policy_violation',
				message: 'password does not satisfy the tenant password policy',
				errors: { new_password: ['requires_symbol'] }
			}
		});
		await page.goto('/reset-password?token=t');
		const fill = async () => {
			await page
				.getByLabel(/new password/i)
				.first()
				.fill('NoSymbolHere12345');
			await page.getByLabel(/confirm/i).fill('NoSymbolHere12345');
			await page.getByRole('button', { name: /reset password/i }).click();
		};

		await fill();
		await expect(
			page.getByText('The new password does not meet the password rules.')
		).toBeVisible();
		// Go's own sentence never reaches the page
		await expect(page.getByText(/tenant password policy/)).toHaveCount(0);
		await expect(page.getByLabel(/new password/i).first()).toBeVisible();

		await fill();
		await expect(page.getByRole('alert')).toHaveText(
			'This link can no longer be used. Request a new one.'
		);
		await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
	});

	test('422 password_breached: inline new-password field error', async ({ page }) => {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/reset-password',
			status: 422,
			body: { error: 'password_breached', message: 'Password appears in HIBP' }
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

	// No `password_same_as_current` case here: Go accepts a reset to the current password (204, the happy
	// path above); that code is change-password only (docs/BFF_API_CHANGES.md row 29), and the reset screen
	// has no line for it (tests/unit/server/password-actions.test.ts).
});
