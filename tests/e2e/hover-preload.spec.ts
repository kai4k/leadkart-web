import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, resetMock } from './helpers/mock';

/**
 * app.html preloads data on tap and code on hover; the tests switch preloading off (the helpers set
 * `data-sveltekit-preload-data="off"` on <body>), so the mouse moving over a link (every Playwright
 * click does that) never runs a route's server load for a page the spec did not visit. Without this,
 * the load's Go calls would hit the mock unregistered.
 */
test.describe('hover preload is off under test', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('hovering the Leads link calls nothing for /leads', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['crm.leads.read'] });
		await expect(page.locator('body')).toHaveAttribute('data-sveltekit-preload-data', 'off');

		const before = (await listMockCalls()).length;
		await page.getByRole('link', { name: 'Leads' }).first().hover();
		await page.waitForTimeout(500);

		const after = await listMockCalls();
		expect(after.slice(before).filter((c) => c.path.includes('/crm/'))).toEqual([]);
		await expect(page).toHaveURL(/\/dashboard$/);
	});
});
