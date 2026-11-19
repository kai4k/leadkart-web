import { expect, test, type BrowserContext } from '@playwright/test';
import {
	fakeAccessToken,
	fakeLoginResponse,
	fakeRefreshToken,
	TEST_MEMBERSHIP_ID
} from './helpers/fake-jwt';
import { listMockCalls, registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * Session refresh + logout through the BFF.
 *
 * The refresh cookie lives on Path=/, so the (app) layout, the /api proxy
 * and /auth/logout all receive it. These specs prove the whole chain:
 * expired access cookie → silent refresh, logout revokes on Go, a rejected
 * refresh token ends the session.
 */

// Go's authn middleware 401: WWW-Authenticate header + `unauthenticated` body.
const EXPIRED_HEADERS = { 'www-authenticate': 'Bearer' };
// A real Go route that takes a POST (the proxy path under test is generic).
const ROLE_ID = '00000000-0000-4000-8000-0000000000d1';
const EXPIRED_BODY = { error: 'unauthenticated' };

const REFRESHED_ACCESS = fakeAccessToken({ jti: 'refreshed-jti' });
const REFRESHED_REFRESH = fakeRefreshToken('refreshed-family');

async function cookieValue(context: BrowserContext, name: string): Promise<string | undefined> {
	return (await context.cookies()).find((c) => c.name === name)?.value;
}

async function dropAccessCookie(context: BrowserContext): Promise<void> {
	// Simulates the 15-minute expiry: the browser simply stops sending it.
	await context.clearCookies({ name: 'lk_access' });
	const left = (await context.cookies()).map((c) => c.name);
	expect(left).not.toContain('lk_access');
	expect(left).toContain('lk_refresh');
}

test.describe('session refresh', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('expired access token is refreshed silently and the page still loads', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 200,
			body: {
				...fakeLoginResponse(),
				access_token: REFRESHED_ACCESS,
				refresh_token: REFRESHED_REFRESH
			}
		});
		const signedInRefresh = await cookieValue(context, 'lk_refresh');
		await dropAccessCookie(context);

		await page.goto('/dashboard');

		await expect(page).toHaveURL(/\/dashboard$/);
		const refreshCalls = (await listMockCalls()).filter(
			(c) => c.method === 'POST' && c.path === '/api/v1/auth/refresh'
		);
		expect(refreshCalls).toHaveLength(1);
		expect(JSON.parse(refreshCalls[0].body)).toEqual({ refresh_token: signedInRefresh });
		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === 'lk_access')?.value).toBe(REFRESHED_ACCESS);
		expect(cookies.find((c) => c.name === 'lk_refresh')?.value).toBe(REFRESHED_REFRESH);
	});

	test('proxy mutation rejected with 401 → refresh → body replayed', async ({ page, context }) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 200,
			body: {
				...fakeLoginResponse(),
				access_token: REFRESHED_ACCESS,
				refresh_token: REFRESHED_REFRESH
			}
		});
		await registerMock({
			method: 'POST',
			path: '/api/v1/roles',
			status: 200,
			body: { role_id: ROLE_ID }
		});
		// Go rejects the first attempt, accepts the replay.
		await registerMock({
			method: 'POST',
			path: '/api/v1/roles',
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY,
			times: 1
		});
		const signedInAccess = await cookieValue(context, 'lk_access');

		const result = await page.evaluate(async () => {
			const csrf = document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '';
			const resp = await fetch('/api/v1/roles', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
				body: JSON.stringify({ name: 'replayed' })
			});
			return { status: resp.status, body: await resp.json() };
		});

		expect(result).toEqual({ status: 200, body: { role_id: ROLE_ID } });
		const calls = await listMockCalls();
		const widgetCalls = calls.filter((c) => c.method === 'POST' && c.path === '/api/v1/roles');
		expect(widgetCalls).toHaveLength(2);
		// Go rejects the still-present (stale) access token; the retry carries the new one.
		expect(widgetCalls[0].authorization).toBe(`Bearer ${signedInAccess}`);
		expect(widgetCalls[1].authorization).toBe(`Bearer ${REFRESHED_ACCESS}`);
		expect(widgetCalls[1].body).toBe(JSON.stringify({ name: 'replayed' }));
		expect(
			calls.filter((c) => c.method === 'POST' && c.path === '/api/v1/auth/refresh')
		).toHaveLength(1);
	});

	test('logout revokes the refresh token on the Go API', async ({ page, context }) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({ method: 'POST', path: '/api/v1/auth/logout', status: 204 });

		const signedInRefresh = await cookieValue(context, 'lk_refresh');

		await page.getByRole('button', { name: 'User menu' }).click();
		await page.getByRole('menuitem', { name: /sign out/i }).click();
		await page.waitForURL(/\/signin/);

		const logoutCalls = (await listMockCalls()).filter(
			(c) => c.method === 'POST' && c.path === '/api/v1/auth/logout'
		);
		expect(logoutCalls).toHaveLength(1);
		expect(JSON.parse(logoutCalls[0].body)).toEqual({ refresh_token: signedInRefresh });
		const names = (await context.cookies()).map((c) => c.name);
		expect(names).not.toContain('lk_refresh');
		expect(names).not.toContain('lk_access');
	});

	test('a rejected refresh token ends the session', async ({ page, context }) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 401,
			body: { error: 'invalid_refresh_token' }
		});
		await dropAccessCookie(context);

		await page.goto('/dashboard');

		await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard$/);
		const names = (await context.cookies()).map((c) => c.name);
		expect(names).not.toContain('lk_refresh');
		expect(names).not.toContain('lk_csrf');
	});

	async function registerRefresh(): Promise<void> {
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 200,
			body: {
				...fakeLoginResponse(),
				access_token: REFRESHED_ACCESS,
				refresh_token: REFRESHED_REFRESH
			}
		});
	}

	const refreshCallsOf = async () =>
		(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/auth/refresh');

	test('a child load refreshes via the hook instead of bouncing to /signin', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerRefresh();
		await dropAccessCookie(context);

		await page.goto('/settings/account/profile');

		await expect(page).toHaveURL(/\/settings\/account\/profile$/);
		await expect(page.getByLabel(/designation/i)).toBeVisible();
		expect(await refreshCallsOf()).toHaveLength(1);
		expect(await cookieValue(context, 'lk_access')).toBe(REFRESHED_ACCESS);
	});

	test('a form action submitted with an expired access cookie succeeds', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerRefresh();
		await registerMock({
			method: 'PATCH',
			path: `/api/v1/users/${TEST_MEMBERSHIP_ID}/profile`,
			status: 204
		});
		await page.goto('/settings/account/profile');
		await page.getByLabel(/designation/i).fill('Regional Manager');
		await dropAccessCookie(context);

		await page.getByRole('button', { name: /save changes/i }).click();

		await expect(page.getByText('Profile saved.')).toBeVisible();
		await expect(page).toHaveURL(/\/settings\/account\/profile/);
		const patches = (await listMockCalls()).filter((c) => c.method === 'PATCH');
		expect(patches).toHaveLength(1);
		expect(patches[0].authorization).toBe(`Bearer ${REFRESHED_ACCESS}`);
		expect(JSON.parse(patches[0].body)).toMatchObject({ designation: 'Regional Manager' });
		expect(await refreshCallsOf()).toHaveLength(1);
	});

	test('the root page lands on the dashboard after the access cookie expires', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerRefresh();
		await dropAccessCookie(context);

		await page.goto('/');

		await expect(page).toHaveURL(/\/dashboard$/);
	});

	test('goFetch retries once with a refreshed token when Go answers 401', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await registerRefresh();
		const profilePath = `/api/v1/users/${TEST_MEMBERSHIP_ID}/profile`;
		await registerMock({ method: 'PATCH', path: profilePath, status: 204 });
		await registerMock({
			method: 'PATCH',
			path: profilePath,
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY,
			times: 1
		});
		await page.goto('/settings/account/profile');
		const staleAccess = await cookieValue(context, 'lk_access');

		await page.getByRole('button', { name: /save changes/i }).click();

		await expect(page.getByText('Profile saved.')).toBeVisible();
		const patches = (await listMockCalls()).filter((c) => c.method === 'PATCH');
		expect(patches.map((c) => c.authorization)).toEqual([
			`Bearer ${staleAccess}`,
			`Bearer ${REFRESHED_ACCESS}`
		]);
		expect(await refreshCallsOf()).toHaveLength(1);
	});
	test('only the access cookie dropped: an /api POST refreshes once and replays with the new Bearer', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerRefresh();
		await registerMock({
			method: 'POST',
			path: '/api/v1/roles',
			status: 200,
			body: { role_id: ROLE_ID }
		});
		await dropAccessCookie(context);

		const result = await page.evaluate(async () => {
			const csrf = document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '';
			const resp = await fetch('/api/v1/roles', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
				body: JSON.stringify({ name: 'after-expiry' })
			});
			return { status: resp.status, body: await resp.json() };
		});

		expect(result).toEqual({ status: 200, body: { role_id: ROLE_ID } });
		expect(await refreshCallsOf()).toHaveLength(1);
		const widgets = (await listMockCalls()).filter((c) => c.path === '/api/v1/roles');
		expect(widgets).toHaveLength(1);
		expect(widgets[0].authorization).toBe(`Bearer ${REFRESHED_ACCESS}`);
	});
	test('refresh rejected: the proxy relays Go 401 (not a 500) and the session ends', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 401,
			body: { error: 'invalid_refresh_token' }
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY
		});
		await dropAccessCookie(context);

		const result = await page.evaluate(async () => {
			const resp = await fetch('/api/v1/users');
			return { status: resp.status, body: (await resp.json()) as Record<string, unknown> };
		});

		expect(result.status).toBe(401);
		expect(result.body).toMatchObject({ error: 'session_expired' });
	});

	test('refresh unavailable (Go down): 503 refresh_unavailable, session cookies kept', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 503,
			body: { error: 'unavailable' }
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY
		});
		const refreshBefore = await cookieValue(context, 'lk_refresh');
		await dropAccessCookie(context);

		const result = await page.evaluate(async () => {
			const resp = await fetch('/api/v1/users');
			return { status: resp.status, body: (await resp.json()) as Record<string, unknown> };
		});

		expect(result.status).toBe(503);
		expect(result.body).toMatchObject({ error: 'refresh_unavailable' });
		expect(await cookieValue(context, 'lk_refresh')).toBe(refreshBefore);
	});

	test('refresh unavailable on a full navigation: 503 error page, cookies kept, reload recovers', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 503,
			body: { error: 'unavailable' }
		});
		const refreshBefore = await cookieValue(context, 'lk_refresh');
		await dropAccessCookie(context);

		// Go being down is not "signed out": no bounce to /signin.
		const app = await page.goto('/dashboard');
		expect(app?.status()).toBe(503);
		await expect(page).toHaveURL(/\/dashboard$/);
		const root = await page.goto('/');
		expect(root?.status()).toBe(503);
		await expect(page).toHaveURL(/\/$/);
		expect(await cookieValue(context, 'lk_refresh')).toBe(refreshBefore);

		// Go is healthy again: the same tab recovers on reload.
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 200,
			body: {
				...fakeLoginResponse(),
				access_token: REFRESHED_ACCESS,
				refresh_token: REFRESHED_REFRESH
			}
		});
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByRole('heading', { level: 1, name: 'My Dashboard' })).toBeVisible();
	});

	test('refresh unavailable on a real client query: the SPA stays on the page, not /signin', async ({
		page
	}) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'identity.users.view', 'identity.users.manage']
		});
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 503,
			body: { error: 'unavailable' }
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY
		});

		await page.goto('/settings/users');
		// First attempt + 2 retries (ServerError), each one a refresh attempt.
		await expect
			.poll(
				async () => (await listMockCalls()).filter((c) => c.path === '/api/v1/auth/refresh').length,
				{ timeout: 15_000 }
			)
			.toBeGreaterThanOrEqual(3);
		// The query has settled as an error (the guard has had its say): the user was never sent away.
		await expect(page.getByRole('alert').filter({ hasText: "Couldn't load" })).toBeVisible();
		await expect(page).toHaveURL(/\/settings\/users$/);
	});

	test('refresh rejected on a real client query: the SPA lands on /signin', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'identity.users.view', 'identity.users.manage']
		});
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 401,
			body: { error: 'invalid_refresh_token' }
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 401,
			headers: EXPIRED_HEADERS,
			body: EXPIRED_BODY
		});

		// The (app) layout load succeeds (access cookie present); the client
		// query then hits the proxy, which cannot refresh.
		await page.goto('/settings/users');

		await expect(page).toHaveURL(/\/signin\?next=%2Fsettings%2Fusers$/);
	});
});
