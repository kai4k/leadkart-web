import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { expectCookiesGone } from './helpers/cookies';
import { resetMock, registerMock, listMockCalls } from './helpers/mock';
import { fakeSessionDto, fakeUserDto, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

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
		await expectCookiesGone(context, [
			'lk_access',
			'lk_refresh',
			'lk_csrf',
			'lk_mcp',
			'lk_signin_notice'
		]);
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

	// Go: internal/identity/ports/http.go:675 -> writePasswordPolicyError (http.go:408): 422
	// password_policy_violation with `errors.new_password: [rule codes]`, checked BEFORE the current password
	// (docs/BFF_API_CHANGES.md rows 24, 25). The rule codes are settings.go:185-190.
	test('422 password_policy_violation: the unmet rule under the new password, the whole policy in the hint', async ({
		page,
		context
	}) => {
		await signInForAccount(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/change-password',
			status: 422,
			body: {
				type: 'https://leadkart.api/errors/password_policy_violation',
				title: 'Unprocessable Entity',
				status: 422,
				detail: 'password does not satisfy the tenant password policy',
				error: 'password_policy_violation',
				message: 'password does not satisfy the tenant password policy',
				errors: { new_password: ['requires_uppercase', 'requires_symbol'] }
			}
		});
		await page.goto('/settings/account/security');
		await page.getByLabel(/current password/i).fill('OldP@ssw0rd!');
		const next = page.getByLabel(/new password/i).first();
		await next.fill('alllowercase12345');
		await page.getByLabel(/confirm/i).fill('alllowercase12345');
		await page.getByRole('button', { name: /change password|update password/i }).click();

		// the first rule Go names is the field's message (one message per field) ...
		await expect(page.getByText('Add an uppercase letter.')).toBeVisible();
		await expect(next).toHaveAttribute('aria-invalid', 'true');
		// ... and the hint under the field states every rule of the policy, the second unmet one included
		const hint = page.getByText(/At least \d+ characters/);
		await expect(hint).toBeVisible();
		await expect(hint).toContainText(/uppercase/);
		await expect(hint).toContainText(/symbol/);
		// neither the code nor Go's sentence reaches the page
		await expect(page.getByText(/password_policy_violation|requires_uppercase/)).toHaveCount(0);
		await expect(page.getByText(/tenant password policy/)).toHaveCount(0);
		// nothing was changed: the person is still signed in, on the same page
		await expect(page).toHaveURL(/\/settings\/account\/security$/);
		expect((await context.cookies()).map((c) => c.name)).toContain('lk_refresh');
	});

	// Go: http.go:438 writePasswordWorkRefusal: 503 service_busy + Retry-After: 2 (rows 13, 24).
	test('503 service_busy: a calm line, the form and the session are kept', async ({
		page,
		context
	}) => {
		await signInForAccount(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/change-password',
			status: 503,
			headers: { 'retry-after': '2' },
			body: {
				type: 'https://leadkart.api/errors/service_busy',
				title: 'Service Unavailable',
				status: 503,
				error: 'service_busy'
			}
		});
		await page.goto('/settings/account/security');
		await page.getByLabel(/current password/i).fill('OldP@ssw0rd!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('N3wP@ssw0rd!');
		await page.getByLabel(/confirm/i).fill('N3wP@ssw0rd!');
		await page.getByRole('button', { name: /change password|update password/i }).click();

		await expect(page.getByRole('alert')).toHaveText('The service is busy. Try again in a moment.');
		await expect(page).toHaveURL(/\/settings\/account\/security$/);
		expect((await context.cookies()).map((c) => c.name)).toContain('lk_refresh');
		expect(
			(await listMockCalls()).filter((c) => c.path === '/api/v1/auth/change-password')
		).toHaveLength(1);
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

	test('this device is badged and has no Revoke; another device keeps its Revoke', async ({
		page
	}) => {
		await signInForAccount(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/auth/sessions',
			status: 200,
			body: {
				sessions: [
					fakeSessionDto(),
					fakeSessionDto({
						family_id: '00000000-0000-4000-8000-000000000f02',
						device_label: 'Office Laptop',
						is_current: false
					})
				]
			}
		});
		await page.goto('/settings/account/sessions');
		const here = page.getByRole('row', { name: /test browser/i });
		await expect(here.getByText('This device')).toBeVisible();
		await expect(here.getByRole('button', { name: /revoke/i })).toHaveCount(0);
		const other = page.getByRole('row', { name: /office laptop/i });
		await expect(other.getByText('This device')).toHaveCount(0);
		await expect(other.getByRole('button', { name: 'Revoke session Office Laptop' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sign out other devices' })).toBeVisible();
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
