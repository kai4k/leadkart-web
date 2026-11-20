import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';

/**
 * An operator acting inside a company sees the "Tenant context" banner with the Exit control on every
 * shell variant: it names the company, is not covered by the topbar or the sidebar, Tab reaches Exit,
 * and Exit from any page lands on /operator/tenants with no banner left. The variant is set through
 * the `lk_ui` cookie, so the server writes it onto <html>.
 */

const ACME = fakeTenantDto({
	id: '00000000-0000-4000-8000-0000000000a1',
	slug: 'acme-pharma',
	display_name: 'Acme Pharma',
	legal_name: 'Acme Pharma Pvt Ltd'
});

const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

const prefs = (extra: Record<string, string>) =>
	b64url(
		JSON.stringify({
			v: 1,
			layout: 'vertical',
			navType: 'default',
			contentWidth: 'default',
			sidebar: 'large',
			mode: 'light',
			colors: 'leadkart',
			sidebarColors: 'light',
			darkPalette: 'default',
			...extra
		})
	);

async function enterAcme(page: Page, extra: Record<string, string>, width: number) {
	await page.setViewportSize({ width, height: 800 });
	await page
		.context()
		.addCookies([{ name: 'lk_ui', value: prefs(extra), url: 'http://localhost:4173' }]);
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.tenants.manage'],
		is_super_user: true,
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
	await registerMocks([
		{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}`, status: 200, body: ACME },
		{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } },
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}/activity`, status: 200, body: {} }
	]);
	await page.goto('/operator/tenants');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
	await page.getByText('Acme Pharma').first().click();
	await page.waitForURL(/\/operator\/scope\/profile$/);
}

const region = (page: Page) => page.getByRole('region', { name: 'Tenant context' });

/** The banner is in view, named, and neither under the topbar nor beside-and-under the sidebar. */
async function expectPlaced(page: Page) {
	// the page keeps exactly one <h1> under the layout's header (the Team list is an h2 here)
	await expect(page.locator('h1')).toHaveCount(1);
	const banner = region(page);
	await expect(banner).toBeVisible();
	await expect(banner).toContainText('Acme Pharma');
	const b = (await banner.boundingBox())!;
	const t = (await page.locator('[data-shell="topbar"]').boundingBox())!;
	const overlapsTopbar =
		b.x < t.x + t.width && b.x + b.width > t.x && b.y < t.y + t.height - 1 && b.y + b.height > t.y;
	expect(overlapsTopbar, 'the banner must not sit under the topbar').toBe(false);
	const h = page.locator('[data-shell="hnav"]');
	if (await h.isVisible()) {
		const n = (await h.boundingBox())!;
		expect(b.y, 'the banner must not sit under the nav bar').toBeGreaterThanOrEqual(
			n.y + n.height - 1
		);
	}
	const exit = banner.getByRole('button', { name: 'Exit context' });
	await expect(exit).toBeVisible();
	const e = (await exit.boundingBox())!;
	expect(e.x).toBeGreaterThanOrEqual(0);
	expect(e.x + e.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
}

async function tabToExit(page: Page) {
	await page.locator('body').click({ position: { x: 1, y: 1 } });
	for (let i = 0; i < 60; i++) {
		await page.keyboard.press('Tab');
		const hit = await page.evaluate(
			() =>
				document.activeElement?.tagName === 'BUTTON' &&
				document.activeElement.closest('[data-shell="banner"]') !== null
		);
		if (hit) return;
	}
	throw new Error('Tab never reached the Exit control');
}

const LAYOUTS = ['vertical', 'horizontal', 'modern', 'boxed', 'semibox'];
const NAV_TYPES = ['default', 'floating', 'boxed', 'pattern'];

const VARIANTS: Array<{ name: string; extra: Record<string, string>; width: number }> = [
	// every layout x nav type at desktop width (plan review focus 4)
	...LAYOUTS.flatMap((layout) =>
		NAV_TYPES.map((navType) => ({
			name: `${layout} / nav ${navType}`,
			extra: { layout, navType },
			width: 1280
		}))
	),
	{ name: 'vertical, small sidebar', extra: { sidebar: 'small' }, width: 1280 },
	{
		name: 'horizontal, small sidebar',
		extra: { layout: 'horizontal', sidebar: 'small' },
		width: 1280
	},
	{ name: 'vertical, medium sidebar', extra: { sidebar: 'medium' }, width: 1280 },
	{
		name: 'vertical, dark, brand sidebar',
		extra: { mode: 'dark', sidebarColors: 'brand' },
		width: 1280
	},
	{ name: 'mobile 390', extra: {}, width: 390 },
	{ name: 'mobile 390, horizontal', extra: { layout: 'horizontal' }, width: 390 },
	{
		name: 'mobile 390, semibox + pattern',
		extra: { layout: 'semibox', navType: 'pattern' },
		width: 390
	}
];

test.describe('tenant context banner on every shell variant', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const v of VARIANTS) {
		test(`${v.name}: named, placed, reachable by Tab; Exit lands on the tenants list`, async ({
			page
		}) => {
			await enterAcme(page, v.extra, v.width);
			await expectPlaced(page);

			// the second page of the tree, a list: still there
			await page.goto('/operator/scope/members');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
			await expectPlaced(page);

			await tabToExit(page);
			await page.keyboard.press('Enter');
			await page.waitForURL(/\/operator\/tenants$/);
			await expect(region(page)).toHaveCount(0);
		});
	}

	test('rtl: the banner is still placed and Exit is still reachable', async ({ page }) => {
		await enterAcme(page, {}, 1280);
		await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
		await expectPlaced(page);
		await tabToExit(page);
	});

	test('the banner stays under the topbar while the page scrolls', async ({ page }) => {
		await enterAcme(page, {}, 1280);
		await page.evaluate(() => {
			const filler = document.createElement('div');
			filler.style.height = '3000px';
			document.querySelector('#main-content')!.append(filler);
		});
		await page.evaluate(() => window.scrollTo(0, 1500));
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
		await expectPlaced(page);
		const b = (await region(page).boundingBox())!;
		const t = (await page.locator('[data-shell="topbar"]').boundingBox())!;
		expect(Math.round(b.y)).toBe(Math.round(t.y + t.height));
	});

	test('with no context there is no banner', async ({ page }) => {
		await enterAcme(page, {}, 1280);
		await region(page).getByRole('button', { name: 'Exit context' }).click();
		await page.waitForURL(/\/operator\/tenants$/);
		await expect(region(page)).toHaveCount(0);
		await expect(page.locator('[data-shell="banner"]')).toHaveCount(0);
	});
});
