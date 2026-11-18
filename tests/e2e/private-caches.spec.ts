import { expect, test, type Page } from '@playwright/test';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The service worker caches authenticated navigations and /api GETs for
 * offline use. Signing out must drop them so the next user on this device
 * cannot be shown the previous user's data.
 */

/** Request paths held in the private (runtime / api) caches. */
async function privateCachePaths(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const out: string[] = [];
		for (const name of await caches.keys()) {
			if (!/^lk-(runtime|api)-/.test(name)) continue;
			for (const req of await (await caches.open(name)).keys()) out.push(new URL(req.url).pathname);
		}
		return out;
	});
}

test.describe('private service-worker caches', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('are emptied on sign out', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['crm.leads.view'] });
		await registerMock({
			method: 'GET',
			path: '/api/v1/crm/leads',
			status: 200,
			body: { items: [], has_more: false }
		});
		await registerMock({ method: 'POST', path: '/api/v1/auth/logout', status: 204 });

		// Let the worker install and take control, then browse so it caches.
		await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		await page.reload();
		await page.goto('/leads');
		await expect(page.locator('#main-content')).toBeVisible();
		await expect.poll(() => privateCachePaths(page)).toContain('/leads');

		await page.getByRole('button', { name: 'User menu' }).click();
		await page.getByRole('menuitem', { name: /sign out/i }).click();
		await page.waitForURL(/\/signin/);

		// The worker may re-cache the public /signin page that logout lands on;
		// nothing from the signed-in session may remain.
		await expect
			.poll(async () => (await privateCachePaths(page)).filter((p) => p !== '/signin'))
			.toEqual([]);
	});
});
