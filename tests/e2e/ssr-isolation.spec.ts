import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock } from './helpers/mock';

/**
 * Server-side rendering must never share one user's data with another.
 *
 * The Node process renders every user's pages. A query cache shared across
 * requests would hand user A's capabilities (email, tier) to user B's SSR
 * HTML. User B's page is fetched as pure SSR (no JavaScript, no hydration
 * fetch) so only what the server rendered is inspected.
 */
const ALICE = 'alice.admin@example.com';
const BOB = 'bob.user@example.com';

test.describe('SSR isolation between users', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test("user B's server-rendered dashboard never contains user A's data", async ({ browser }) => {
		const contextA = await browser.newContext();
		const contextB = await browser.newContext();
		try {
			const pageA = await contextA.newPage();
			await signInAsTier(pageA, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin'],
				email: ALICE
			});
			// A full SSR render of A's dashboard (sign-in may navigate client-side).
			const htmlA = await (await contextA.request.get('/dashboard')).text();
			expect(htmlA).toContain(ALICE);

			// B signs in second; the mock now answers capabilities with B's identity.
			const pageB = await contextB.newPage();
			await signInAsTier(pageB, { tier: 'tenant-user', email: BOB });

			const respB = await contextB.request.get('/dashboard');
			expect(respB.status()).toBe(200);
			const htmlB = await respB.text();
			expect(htmlB).not.toContain(ALICE);
			expect(htmlB).toContain(BOB);
			// B's tier, not A's: the tenant-user dashboard.
			expect(htmlB).toContain('My Dashboard');
			expect(htmlB).not.toContain('Tenant Dashboard');
		} finally {
			await contextA.close();
			await contextB.close();
		}
	});

	test('hydration keeps the server-rendered identity: no loading flash', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user', email: BOB });
		// A fresh tab: only its own full load (SSR + hydration) is observed.
		const tab = await page.context().newPage();
		const capabilityFetches: string[] = [];
		tab.on('request', (r) => {
			// Page fetches only (the service worker re-issues each one).
			if (r.url().endsWith('/api/v1/auth/me/capabilities') && r.serviceWorker() === null) {
				capabilityFetches.push(r.url());
			}
		});
		await tab.goto('/dashboard');
		await expect(tab.locator('html[data-hydrated="true"]')).toHaveCount(1);
		// The browser cache seeds from the SSR capabilities, so the identity is
		// there at once — never the em-dash placeholder of an empty query.
		await expect(tab.getByRole('heading', { level: 1, name: 'My Dashboard' })).toBeVisible({
			timeout: 100
		});
		await expect(tab.getByText(BOB, { exact: true })).toBeVisible({ timeout: 100 });
		// At most the one deliberate background refresh (initialDataUpdatedAt: 0), shared by every observer.
		await tab.waitForLoadState('networkidle');
		expect(capabilityFetches.length).toBeLessThanOrEqual(1);
	});
});
