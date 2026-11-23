import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMock, listMockCalls } from './helpers/mock';
import { fakeUserDto, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Account self-service e2e — /settings/account/{profile,security,sessions,activity}
 *
 *   Positive:
 *     Security: change password form renders + happy path
 *     Sessions: list renders + revoke single + revoke others
 *
 *   Negative:
 *     Change password 401 (wrong current password): inline error
 *     Sessions list 500: error alert
 */

async function signInForAccount(page: Page) {
	await signInAsTier(page, { tier: 'tenant-user' });
	// signInAsTier already mocked GET /v1/users/:membershipId + /v1/auth/sessions
}

test.describe('Account security — change password', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders change-password form', async ({ page }) => {
		await signInForAccount(page);
		await page.goto('/settings/account/security');
		await expect(page.getByRole('heading', { level: 2, name: 'Change password' })).toBeVisible();
	});

	// Go: 204 and every session of the person is revoked, this one included (leadkart-go 44ff2b16
	// internal/identity/ports/http.go handleChangePassword; docs/BFF_API_CHANGES.md row 24). Owner's ruling:
	// after a password change the person signs in again.
	test('successful change: 204 → signed out, /signin says the password was changed, the new one signs in', async ({
		page,
		context
	}) => {
		await signInForAccount(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/change-password',
			status: 204
		});
		await page.goto('/settings/account/security');
		await expect(
			page.getByText(/signed out on every device and sign in again with the new password/)
		).toBeVisible();
		await page.getByLabel(/current password/i).fill('OldP@ssw0rd!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('N3wP@ssw0rd!');
		await page.getByLabel(/confirm/i).fill('N3wP@ssw0rd!');
		await page.getByRole('button', { name: /change password|update password/i }).click();

		await page.waitForURL(/\/signin$/, { timeout: 5000 });
		await expect(
			page.getByRole('status').filter({
				hasText: 'Your password was changed. Sign in with your new password.'
			})
		).toBeVisible();
		const names = (await context.cookies()).map((c) => c.name);
		for (const gone of ['lk_access', 'lk_refresh', 'lk_csrf', 'lk_mcp', 'lk_signin_notice'])
			expect(names, gone).not.toContain(gone);
		const calls = await listMockCalls();
		expect(calls.filter((c) => c.path === '/api/v1/auth/change-password')).toHaveLength(1);
		expect(calls.filter((c) => c.path === '/api/v1/auth/refresh')).toHaveLength(0);

		// the app is closed to this browser until the person signs in again
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard$/);
		await expect(page.getByText('Your password was changed.')).toHaveCount(0);

		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('N3wP@ssw0rd!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard$/);
	});

	test('401 wrong current password: error surface', async ({ page }) => {
		await signInForAccount(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/change-password',
			status: 401,
			body: { error: 'incorrect_current_password', message: '' }
		});
		await page.goto('/settings/account/security');
		await page.getByLabel(/current password/i).fill('WrongOldP@ssw0rd!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('N3wP@ssw0rd!');
		await page.getByLabel(/confirm/i).fill('N3wP@ssw0rd!');
		await page.getByRole('button', { name: /change password|update password/i }).click();

		// Go's incorrect_current_password lands on the current-password field.
		await expect(page.getByText("That doesn't match your current password.")).toBeVisible({
			timeout: 5000
		});
	});

	test('wrong current password is not treated as expiry: 1 change call, 0 refresh calls', async ({
		page
	}) => {
		await signInForAccount(page);
		// Go's credential-failure 401: no WWW-Authenticate header.
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/change-password',
			status: 401,
			body: { error: 'incorrect_current_password' }
		});
		await page.goto('/settings/account/security');
		await page.getByLabel(/current password/i).fill('WrongOldP@ssw0rd!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('N3wP@ssw0rd!');
		await page.getByLabel(/confirm/i).fill('N3wP@ssw0rd!');
		await page.getByRole('button', { name: /change password|update password/i }).click();

		await expect(page.getByText("That doesn't match your current password.")).toBeVisible();
		const calls = await listMockCalls();
		expect(calls.filter((c) => c.path === '/api/v1/auth/change-password')).toHaveLength(1);
		expect(calls.filter((c) => c.path === '/api/v1/auth/refresh')).toHaveLength(0);
	});
});

test.describe('Account sessions', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('sessions list renders the current device', async ({ page }) => {
		await signInForAccount(page);
		await page.goto('/settings/account/sessions');
		// The session list shows device labels — fakeSessionDto label is 'Test Browser'
		await expect(page.getByText(/test browser/i)).toBeVisible();
	});

	test('sessions list 500: error alert', async ({ page }) => {
		await signInForAccount(page);
		// Override the sign-in helper's default sessions mock with a 500
		await registerMock({
			method: 'GET',
			path: '/api/v1/auth/sessions',
			status: 500,
			body: { error: 'internal_error', message: 'session list failed' }
		});
		await page.goto('/settings/account/sessions');
		await expect(page.locator('[role="alert"]').first()).toBeVisible();
	});
});

test.describe('Account profile preload', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('profile loads from /v1/users/:membershipId', async ({ page }) => {
		const profile = fakeUserDto({
			membership_id: TEST_MEMBERSHIP_ID,
			designation: 'Sales Executive',
			department: 'Sales'
		});
		await signInAsTier(page, { tier: 'tenant-user' });
		// Override the helper's default — sign-in already registered a basic
		// userDto; we want a designation-populated one.
		await registerMock({
			method: 'GET',
			path: `/api/v1/users/${TEST_MEMBERSHIP_ID}`,
			status: 200,
			body: profile
		});
		await page.goto('/settings/account/profile');
		// Some indicator of the designation surfacing — heading or input value
		await expect(
			page
				.getByText(/sales executive/i)
				.or(page.getByLabel(/designation/i))
				.first()
		).toBeVisible({ timeout: 5000 });
	});
});
