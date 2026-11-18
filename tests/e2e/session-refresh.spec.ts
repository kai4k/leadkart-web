import { expect, test, type BrowserContext } from '@playwright/test';
import { fakeAccessToken, fakeRefreshToken } from './helpers/fake-jwt';
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
			body: { access_token: REFRESHED_ACCESS, refresh_token: REFRESHED_REFRESH }
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

	test('proxy mutation survives an expired access token: 401 → refresh → body replayed', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'POST',
			path: '/api/v1/auth/refresh',
			status: 200,
			body: { access_token: REFRESHED_ACCESS, refresh_token: REFRESHED_REFRESH }
		});
		await registerMock({
			method: 'POST',
			path: '/api/v1/widgets',
			status: 200,
			body: { id: 'w1' }
		});
		// Go rejects the first (token-less) attempt, accepts the replay.
		await registerMock({
			method: 'POST',
			path: '/api/v1/widgets',
			status: 401,
			body: { code: 'token_expired' },
			times: 1
		});
		await dropAccessCookie(context);

		const result = await page.evaluate(async () => {
			const csrf = document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '';
			const resp = await fetch('/api/v1/widgets', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
				body: JSON.stringify({ name: 'replayed' })
			});
			return { status: resp.status, body: await resp.json() };
		});

		expect(result).toEqual({ status: 200, body: { id: 'w1' } });
		const calls = await listMockCalls();
		const widgetCalls = calls.filter((c) => c.method === 'POST' && c.path === '/api/v1/widgets');
		expect(widgetCalls).toHaveLength(2);
		expect(widgetCalls[0].authorization).toBeNull();
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
			body: { code: 'invalid_refresh_token' }
		});
		await dropAccessCookie(context);

		await page.goto('/dashboard');

		await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard$/);
		const names = (await context.cookies()).map((c) => c.name);
		expect(names).not.toContain('lk_refresh');
		expect(names).not.toContain('lk_csrf');
	});
});
