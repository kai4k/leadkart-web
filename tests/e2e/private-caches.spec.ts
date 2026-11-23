import { expect, test, type Page } from './helpers/test';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The service worker stores public build output and static images only. Signed-in HTML pages and
 * `__data.json` carry capabilities, tenant data and the CSRF value; `/api` JSON is the tenant's data
 * (the Cache API is keyed by URL alone, no user and no tenant, and survives sign-out): none of it is
 * ever written, and `/api` is not intercepted at all.
 */

/** Every request path held in any cache. */
async function allCachedPaths(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const out: string[] = [];
		for (const name of await caches.keys()) {
			for (const req of await (await caches.open(name)).keys()) out.push(new URL(req.url).pathname);
		}
		return out;
	});
}

/** Sign in, let the worker take control, then browse a list page that makes API calls. */
async function browse(page: Page): Promise<void> {
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
	// Armed BEFORE goto: goto waits for hydration, and the list answers during that wait.
	const leads = page.waitForResponse((r) => r.url().includes('/api/v1/crm/leads') && r.ok());
	await page.goto('/leads');
	await expect(page.locator('#main-content')).toBeVisible();
	await leads;
}

test.describe('what the service worker stores', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('a signed-in page is never written to any cache (HTML or __data.json)', async ({ page }) => {
		await browse(page);
		await page.goto('/dashboard');
		await expect(page.locator('#main-content')).toBeVisible();
		const everything = await allCachedPaths(page);
		expect(
			everything.filter((p) => p === '/leads' || p === '/dashboard' || p.endsWith('__data.json'))
		).toEqual([]);
	});

	test('no /api response is ever written to any cache', async ({ page }) => {
		await browse(page);
		// The worker controls the page: it must have had the chance to (wrongly) store the list.
		expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
		await page.evaluate(() => window.specFetch('/api/v1/crm/leads').then((r) => r.text()));
		expect((await allCachedPaths(page)).filter((p) => p.startsWith('/api'))).toEqual([]);
	});
});
