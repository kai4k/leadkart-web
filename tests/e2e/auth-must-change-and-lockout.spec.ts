import { expect, test, type Page } from './helpers/test';
import { expectCookiesGone } from './helpers/cookies';
import { listMockCalls, resetMock, registerMocks } from './helpers/mock';
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

	test('must-change user navigating straight to /dashboard is redirected to /must-change-password', async ({
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

		const pageErrors: Error[] = [];
		page.on('pageerror', (e) => pageErrors.push(e));

		// Hard navigation: the redirect target is server-rendered, which needs
		// svelte-i18n initialised on the server.
		await page.goto('/dashboard');

		await page.waitForURL(/\/must-change-password\?next=%2Fdashboard$/);
		await expect(
			page.getByRole('heading', { level: 1, name: /set a new password/i })
		).toBeVisible();
		expect(pageErrors).toEqual([]);
	});

	// Go: POST /auth/change-password answers 204 and revokes EVERY session of the person, the caller's own
	// included (leadkart-go 44ff2b16 internal/identity/ports/http.go handleChangePassword;
	// docs/BFF_API_CHANGES.md row 24: "After 204 do NOT refresh: sign in again"). Owner's ruling: after a
	// password change the person signs in again.
	test('the forced change ends the session: /signin says why, the old cookies are gone, the new password signs in', async ({
		page,
		context
	}) => {
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

		await page.waitForURL(/\/signin$/, { timeout: 5000 });
		await expect(
			page.getByRole('status').filter({
				hasText: 'Your password was changed. Sign in with your new password.'
			})
		).toBeVisible();
		// the dead session is gone from the browser, the forced-change gate with it; the notice was taken
		await expectCookiesGone(context, [
			'lk_access',
			'lk_refresh',
			'lk_csrf',
			'lk_mcp',
			'lk_signin_notice'
		]);
		// one change call, and never a refresh with the dead token
		const calls = await listMockCalls();
		expect(calls.filter((c) => c.path === '/api/v1/auth/change-password')).toHaveLength(1);
		expect(calls.filter((c) => c.path === '/api/v1/auth/refresh')).toHaveLength(0);

		// said once: a reload has nothing left to say
		await page.reload();
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await expect(page.getByText('Your password was changed.')).toHaveCount(0);

		// Go's next login for this person is unflagged (row 24: "the new token is unflagged")
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 200,
				body: { ...baseLoginBody, must_change_password: false }
			}
		]);
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('MyFreshOne.Strong!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard$/);
		const logins = (await listMockCalls()).filter((c) => c.path === '/api/v1/auth/login');
		expect(JSON.parse(logins.at(-1)!.body)).toMatchObject({ password: 'MyFreshOne.Strong!' });
	});

	test('where the person was going survives the forced change and the sign-in', async ({
		page
	}) => {
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

		await page.goto('/signin?next=%2Fsettings%2Faccount%2Fprofile');
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('TempPassFromAdmin!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/must-change-password\?next=%2Fsettings%2Faccount%2Fprofile$/);

		await page.getByLabel(/current password/i).fill('TempPassFromAdmin!');
		await page
			.getByLabel(/new password/i)
			.first()
			.fill('MyFreshOne.Strong!');
		await page.getByLabel(/confirm/i).fill('MyFreshOne.Strong!');
		await page.getByRole('button', { name: /set password & continue/i }).click();

		await page.waitForURL(/\/signin\?next=%2Fsettings%2Faccount%2Fprofile$/);
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 200,
				body: { ...baseLoginBody, must_change_password: false }
			}
		]);
		await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('MyFreshOne.Strong!');
		await page.getByRole('button', { name: /sign in/i }).click();
		await page.waitForURL(/\/settings\/account\/profile$/);
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
				body: { error: 'account_locked', message: '' }
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

/**
 * What Go's login handler answers besides 200 / 401 / 423 (leadkart-go 44ff2b16
 * internal/identity/ports/http.go handleLogin):
 *   403 tenant_suspended   http.go:524  (docs/BFF_API_CHANGES.md row 36: only after the password was verified)
 *   403 tenant_not_active  http.go:528  (row 36)
 *   429 rate_limited + Retry-After   http.go:446 (per-person budget) and
 *                                    internal/common/httpmw/ratelimit.go:197 (per-route limiter; rows 12, 27)
 *   503 service_busy + Retry-After: 2   http.go:438, argonBusyRetryAfter http.go:428 (row 13)
 */
test.describe('Auth: sign-in refusals that are not a wrong password', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	// http.go:1021 writeError: type (problemType, http.go:1088), title, status, error
	const problem = (status: number, title: string, error: string) => ({
		type: `https://leadkart.api/errors/${error}`,
		title,
		status,
		error
	});

	async function submit(page: Page) {
		await page.goto('/signin');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page.getByRole('textbox', { name: /email/i }).fill('member@example.com');
		await page.getByRole('textbox', { name: /password/i }).fill('Right.Password.1!');
		await page.getByRole('button', { name: /sign in/i }).click();
	}
	const loginCalls = async () =>
		(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/auth/login');

	for (const [code, sentence] of [
		[
			'tenant_suspended',
			"Your company's account is suspended. Contact your administrator or LeadKart support."
		],
		[
			'tenant_not_active',
			"Your company's account is not active. Contact your administrator or LeadKart support."
		]
	] as const) {
		test(`403 ${code}: the company's own sentence, no countdown, no retry`, async ({
			page,
			context
		}) => {
			await registerMocks([
				{
					method: 'POST',
					path: '/api/v1/auth/login',
					status: 403,
					body: problem(403, 'Forbidden', code)
				}
			]);

			await submit(page);

			await expect(page.getByRole('alert')).toHaveText(sentence);
			// not the operator-scope sentence, not "wrong password"
			await expect(page.getByText(/This tenant is not active/)).toHaveCount(0);
			await expect(page.getByText(/Email or password is incorrect/)).toHaveCount(0);
			await expect(page).toHaveURL(/\/signin$/);
			// the person may try again at once; the page never does on its own
			await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
			await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue('member@example.com');
			await page.waitForTimeout(1500);
			expect(await loginCalls()).toHaveLength(1);
			await expectCookiesGone(context, ['lk_access', 'lk_refresh']);
		});
	}

	test('429 with Retry-After: "Too many requests", the seconds count down, the button is off', async ({
		page
	}) => {
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 429,
				headers: { 'retry-after': '3' },
				// ratelimit.go:199 writes exactly this body
				body: { error: 'rate_limited', message: 'too many requests' }
			}
		]);

		await submit(page);

		const banner = page.getByRole('alert');
		await expect(banner).toContainText(/Too many requests\. Try again in [123] seconds?\./);
		await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
		await expect(banner).toHaveText('You can try again now.', { timeout: 8000 });
		await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
		expect(await loginCalls()).toHaveLength(1);
	});

	test('503 service_busy with Retry-After: 2: "The service is busy", counts down, nothing is retried', async ({
		page
	}) => {
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 503,
				headers: { 'retry-after': '2' },
				body: problem(503, 'Service Unavailable', 'service_busy')
			}
		]);

		await submit(page);

		const banner = page.getByRole('alert');
		await expect(banner).toContainText(/The service is busy\. Try again in [12] seconds?\./);
		await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
		await expect(banner).toHaveText('You can try again now.', { timeout: 8000 });
		await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
		expect(await loginCalls()).toHaveLength(1);
	});
});
