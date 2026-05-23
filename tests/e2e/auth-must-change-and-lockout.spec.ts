import { expect, test } from '@playwright/test';
import { resetMock, registerMocks } from './helpers/mock';
import {
	fakeAccessToken,
	fakeRefreshToken,
	fakeCapabilitiesResponse,
	fakeUserDto,
	fakeSessionDto,
	fakeTenantDto,
	TEST_TENANT_ID,
	TEST_TENANT_SLUG,
	TEST_MEMBERSHIP_ID,
	TEST_PERSON_ID
} from './helpers/fake-jwt';

/**
 * Auth invariants beyond the happy path (ADR 0053):
 *   - Login returns must_change_password=true → user is routed to
 *     /must-change-password and stays there until they rotate.
 *   - Login returns 423 Locked → form renders the Retry-After countdown.
 */

const baseLoginBody = {
	access_token: fakeAccessToken(),
	refresh_token: fakeRefreshToken(),
	access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
	token_type: 'Bearer'
};

const baseAuthMocks = [
	{
		method: 'GET' as const,
		path: '/api/v1/auth/me/capabilities',
		status: 200,
		body: fakeCapabilitiesResponse({
			tenant_id: TEST_TENANT_ID,
			tenant_slug: TEST_TENANT_SLUG,
			membership_id: TEST_MEMBERSHIP_ID,
			person_id: TEST_PERSON_ID,
			email: 'test@example.com'
		})
	},
	{
		method: 'GET' as const,
		path: `/api/v1/users/${TEST_MEMBERSHIP_ID}`,
		status: 200,
		body: fakeUserDto({ membership_id: TEST_MEMBERSHIP_ID })
	},
	{
		method: 'GET' as const,
		path: '/api/v1/auth/sessions',
		status: 200,
		body: { sessions: [fakeSessionDto({ tenant_id: TEST_TENANT_ID })] }
	},
	{
		method: 'GET' as const,
		path: `/api/v1/tenants/${TEST_TENANT_ID}`,
		status: 200,
		body: fakeTenantDto({ id: TEST_TENANT_ID, slug: TEST_TENANT_SLUG })
	},
	{
		method: 'GET' as const,
		path: '/api/v1/tenants',
		status: 200,
		body: { tenants: [fakeTenantDto({ id: TEST_TENANT_ID, slug: TEST_TENANT_SLUG })] }
	}
];

test.describe('Auth — must_change_password', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('login returns must_change_password=true → routes to /must-change-password', async ({
		page
	}) => {
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 200,
				body: { ...baseLoginBody, must_change_password: true }
			},
			...baseAuthMocks
		]);

		await page.goto('/signin');
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('TempPassFromAdmin!');
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL(/\/must-change-password/);
		await expect(
			page.getByRole('heading', { level: 1, name: /set a new password/i })
		).toBeVisible();
	});

	test('must-change-password page rotates → redirects to /dashboard', async ({ page }) => {
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 200,
				body: { ...baseLoginBody, must_change_password: true }
			},
			{ method: 'POST', path: '/api/v1/auth/change-password', status: 204 },
			...baseAuthMocks
		]);

		await page.goto('/signin');
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('TempPassFromAdmin!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/must-change-password/);

		await page.getByLabel(/current password/i).fill('TempPassFromAdmin!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('MyFreshOne.Strong!');
		await page.getByLabel(/confirm/i).fill('MyFreshOne.Strong!');
		await page.getByRole('button', { name: /set password & continue/i }).click();

		await page.waitForURL(/\/dashboard$/, { timeout: 5000 });
	});
});

test.describe('Auth — account lockout (423)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('423 with Retry-After: form shows countdown banner', async ({ page }) => {
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 423,
				headers: { 'retry-after': '120' },
				body: { code: 'account_locked', message: 'Account locked' }
			}
		]);

		await page.goto('/signin');
		await page.getByRole('textbox', { name: /email/i }).fill('locked@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('Anything!');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Banner alert mentions the lockout + the seconds the user must wait
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
		await expect(page.getByRole('alert')).toContainText(/120/);
	});
});
