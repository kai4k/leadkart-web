import { expect, test, type Page } from './helpers/test';
import { fakeCapabilitiesResponse } from './helpers/fake-jwt';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { API_CACHE_PREFIX, RUNTIME_CACHE_PREFIX } from '../../src/lib/utils/private-caches.ts';

/**
 * The service worker caches JSON /api GETs for offline reading. They must not outlive the session
 * that filled them: signing out, landing on an auth page for any reason, or changing scope clears
 * them; auth responses and downloads are never written in the first place. Signed-in HTML pages and
 * `__data.json` are never written at all (the Cache API ignores `no-store`).
 */

/** Request paths held in the caches whose name starts with `prefix`. */
async function cachePaths(page: Page, prefix: string): Promise<string[]> {
	return page.evaluate(async (p) => {
		const out: string[] = [];
		for (const name of await caches.keys()) {
			if (!name.startsWith(p)) continue;
			for (const req of await (await caches.open(name)).keys()) out.push(new URL(req.url).pathname);
		}
		return out;
	}, prefix);
}

const privateCachePaths = async (page: Page): Promise<string[]> => [
	...(await cachePaths(page, RUNTIME_CACHE_PREFIX)),
	...(await cachePaths(page, API_CACHE_PREFIX))
];

/** Sign in, let the worker take control, then browse a list page so the API cache fills. */
async function warmCaches(page: Page): Promise<void> {
	await signInAsTier(page, { tier: 'tenant-admin', permissions: ['crm.leads.view'] });
	await registerMock({
		method: 'GET',
		path: '/api/v1/crm/leads',
		status: 200,
		body: { items: [], has_more: false }
	});
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await page.goto('/leads');
	await expect(page.locator('#main-content')).toBeVisible();
	await expect.poll(() => cachePaths(page, API_CACHE_PREFIX)).toContain('/api/v1/crm/leads');
}

test.describe('private service-worker caches', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('a signed-in page is never written to any cache (HTML or __data.json)', async ({ page }) => {
		await warmCaches(page);
		await page.goto('/dashboard');
		await expect(page.locator('#main-content')).toBeVisible();
		const everything = await page.evaluate(async () => {
			const out: string[] = [];
			for (const name of await caches.keys()) {
				for (const req of await (await caches.open(name)).keys())
					out.push(new URL(req.url).pathname);
			}
			return out;
		});
		expect(
			everything.filter((p) => p === '/leads' || p === '/dashboard' || p.endsWith('__data.json'))
		).toEqual([]);
	});

	test('are emptied on sign out', async ({ page }) => {
		await warmCaches(page);
		await registerMock({ method: 'POST', path: '/api/v1/auth/logout', status: 204 });

		await page.getByRole('button', { name: 'User menu' }).click();
		await page.getByRole('menuitem', { name: /sign out/i }).click();
		await page.waitForURL(/\/signin/);

		// The worker may re-cache the public /signin page that logout lands on;
		// nothing from the signed-in session may remain.
		await expect
			.poll(async () => (await privateCachePaths(page)).filter((p) => p !== '/signin'))
			.toEqual([]);
	});

	test('are emptied on arrival at an auth page without signing out', async ({ page }) => {
		await warmCaches(page);

		await page.goto('/signin');
		await expect(page.locator('form')).toBeVisible();

		await expect
			.poll(async () => (await privateCachePaths(page)).filter((p) => p !== '/signin'))
			.toEqual([]);
	});

	test('downloads and auth responses are never written to the API cache', async ({ page }) => {
		await warmCaches(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/crm/leads/export',
			status: 200,
			body: 'name,phone\nAsha,9999999999\n',
			headers: {
				'content-type': 'text/csv',
				'content-disposition': 'attachment; filename="leads.csv"'
			}
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/auth/me/capabilities',
			status: 200,
			body: fakeCapabilitiesResponse()
		});

		const statuses = await page.evaluate(async () => {
			const csv = await fetch('/api/v1/crm/leads/export');
			const caps = await fetch('/api/v1/auth/me/capabilities');
			return [csv.status, caps.status];
		});
		expect(statuses).toEqual([200, 200]);
		// Give the worker time to (wrongly) write; the JSON list stays the control.
		await page.evaluate(() => fetch('/api/v1/crm/leads').then((r) => r.text()));
		await expect.poll(() => cachePaths(page, API_CACHE_PREFIX)).toContain('/api/v1/crm/leads');
		const cached = await cachePaths(page, API_CACHE_PREFIX);
		expect(cached).not.toContain('/api/v1/crm/leads/export');
		expect(cached).not.toContain('/api/v1/auth/me/capabilities');
	});
});
