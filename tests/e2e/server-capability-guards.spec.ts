import { expect, test, type Page } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, resetMock } from './helpers/mock';

/**
 * Server-side capability guards (requireCapability in +page.server.ts).
 *
 * A user WITHOUT the permission must:
 *   (a) land on /dashboard after a hard navigation,
 *   (b) never trigger the guarded page's data request (the server load
 *       redirects before the page renders or its queries fire),
 *   (c) get the same result on client-side navigation, where SvelteKit
 *       fetches __data.json and the server load answers with the redirect.
 *
 * Tenant route:   /settings/roles        (identity.roles.view → GET /api/v1/roles)
 * Operator route: /operator/persons      (platform.users.view → GET /api/v1/platform/persons)
 */

const ROUTES = [
	{ name: 'tenant /settings/roles', path: '/settings/roles', dataPath: '/api/v1/roles' },
	{
		name: 'operator /operator/persons',
		path: '/operator/persons',
		dataPath: '/api/v1/platform/persons'
	}
];

async function dataCalls(dataPath: string): Promise<number> {
	const calls = await listMockCalls();
	return calls.filter((c) => c.path === dataPath || c.path.startsWith(`${dataPath}?`)).length;
}

/** Client-side navigation: click a same-origin anchor so SvelteKit's router handles it. */
async function clientNavigate(page: Page, href: string): Promise<void> {
	await page.evaluate((h) => {
		const a = document.createElement('a');
		a.href = h;
		a.id = 'e2e-client-nav';
		a.textContent = 'go';
		document.body.append(a);
	}, href);
	await page.locator('#e2e-client-nav').click();
}

test.describe('Server-side capability guards', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const route of ROUTES) {
		test(`${route.name}: hard navigation without the permission redirects, no data request`, async ({
			page
		}) => {
			await signInAsTier(page, { tier: 'tenant-user' });
			await page.goto(route.path);
			await page.waitForURL(/\/dashboard$/);
			expect(await dataCalls(route.dataPath)).toBe(0);
		});

		test(`${route.name}: client-side navigation without the permission redirects via __data.json, no data request`, async ({
			page
		}) => {
			await signInAsTier(page, { tier: 'tenant-user' });
			const dataResponse = page.waitForResponse(
				(r) => r.url().includes('__data.json') && r.url().includes(route.path)
			);
			await clientNavigate(page, route.path);
			await dataResponse;
			await page.waitForURL(/\/dashboard$/);
			expect(page.url()).not.toContain(route.path);
			expect(await dataCalls(route.dataPath)).toBe(0);
		});
	}
});
