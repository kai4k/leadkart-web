import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';
import { glass, leads, opaque, overlay, paint, setPrefs } from './helpers/materials';

/**
 * The materials, read from COMPUTED styles on the built app (fix round E). The unit tests read source text; this
 * spec cannot pass with the feature broken: a cascade mistake (a layered `!important` losing to an unlayered one,
 * a utility that compiles to nothing) shows up here as a wrong `backdrop-filter` or a wrong alpha.
 *
 * Glass: topbar, sidebar, bulk bar, auth card, dialog, sheet and menu have a real backdrop filter and a
 * translucent fill. Solid, the OS Reduce Transparency setting and forced colours: no filter and an opaque fill.
 * A neutral toast fired over an open dialog is opaque (the review's I1). A material inside a material is opaque.
 * The tenant banner is opaque in every case. The user menu's items all carry an icon.
 *
 * The toast and the nested pane are carried by synthetic elements that wear the real compiled classes (the toast
 * is `not-data-[type]:material-pane!` on a `[data-sonner-toast]`, as in ui/sonner/sonner.svelte): the cascade being
 * tested is the real one, and firing a neutral toast needs no feature flow.
 */

const SURFACES = {
	topbar: '[data-shell="topbar"]',
	sidebar: '[data-slot="sidebar-inner"]',
	bulkBar: '.material-bar:has([role="status"])'
};

async function openBulk(page: Page) {
	await page.getByLabel('Select Lead A').check();
	await page.getByLabel('Select Lead B').check();
	await expect(page.getByText('2 selected')).toBeVisible();
}

async function closeOverlay(page: Page) {
	await page.keyboard.press('Escape');
	await page.waitForTimeout(250);
}

/** Every surface, with the page in the state given: assert glass or opaque. */
async function everySurface(page: Page, expectation: typeof glass, label: string) {
	await openBulk(page);
	for (const [name, sel] of Object.entries(SURFACES))
		expectation(await paint(page.locator(sel)), `${label} ${name}`);
	for (const kind of ['menu', 'dialog', 'sheet'] as const) {
		const loc = await overlay(page, kind);
		await page.waitForTimeout(300); // the open animation settles
		expectation(await paint(loc), `${label} ${kind}`);
		await closeOverlay(page);
	}
}

test.describe('materials: computed styles on the built app', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const mode of ['light', 'dark']) {
		test(`Glass (${mode}): topbar, sidebar, bulk bar, dialog, sheet and menu are blurred and translucent`, async ({
			page
		}) => {
			await leads(page, { mode });
			await everySurface(page, glass, `glass/${mode}`);
		});
	}

	test('Solid: no filter and an opaque fill on every surface', async ({ page }) => {
		await leads(page, { transparency: 'off' });
		await everySurface(page, opaque, 'solid');
	});

	test('OS Reduce Transparency overrides the Glass preference', async ({ page }) => {
		await leads(page, {});
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
		});
		await everySurface(page, opaque, 'reduced-transparency');
	});

	test('forced colours: opaque, with a border', async ({ page }) => {
		await leads(page, {});
		await page.emulateMedia({ forcedColors: 'active' });
		const topbar = page.locator(SURFACES.topbar);
		opaque(await paint(topbar), 'forced topbar');
		const border = await topbar.first().evaluate((el) => getComputedStyle(el).borderTopWidth);
		expect(border).toBe('1px');
		const dialog = await overlay(page, 'dialog');
		opaque(await paint(dialog), 'forced dialog');
	});

	test('the auth card is glass in every motion setting, opaque in Solid (GD22: the backdrop is static, so the card is the signature glass)', async ({
		page
	}) => {
		for (const [transparency, motion, expectation] of [
			['glass', 'no-preference', glass],
			['glass', 'reduce', glass],
			['off', 'no-preference', opaque]
		] as const) {
			await page.emulateMedia({ reducedMotion: motion });
			await setPrefs(page, { transparency });
			await page.goto('/signin');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
			expectation(
				await paint(page.locator('.lk-auth-card')),
				`auth card ${transparency} / motion ${motion}`
			);
		}
	});

	test('nothing on the sign-in backdrop animates (a moving backdrop would make the glass card re-blur every frame)', async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await setPrefs(page, { transparency: 'glass' });
		await page.goto('/signin');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		const running = await page.evaluate(
			() =>
				document
					.querySelector('[data-auth-backdrop]')!
					.getAnimations({ subtree: true })
					.filter((a) => a.playState === 'running' && (a as CSSAnimation).animationName).length
		);
		expect(running).toBe(0);
	});

	test('a neutral toast over an open dialog is opaque (it is glass when nothing is open)', async ({
		page
	}) => {
		await leads(page, {});
		const addToast = () =>
			page.evaluate(() => {
				document.querySelector('#probe-toast')?.remove();
				const li = document.createElement('li');
				li.id = 'probe-toast';
				li.setAttribute('data-sonner-toast', '');
				li.className = 'not-data-[type]:material-pane!';
				document.body.appendChild(li);
			});
		await addToast();
		glass(await paint(page.locator('#probe-toast')), 'toast with no modal');
		await overlay(page, 'dialog');
		await addToast();
		opaque(await paint(page.locator('#probe-toast')), 'toast over a dialog');
	});

	test('a pane inside a pane, and a pane over an open sheet, are opaque', async ({ page }) => {
		await leads(page, {});
		await overlay(page, 'sheet');
		await page.evaluate(() => {
			const inner = document.createElement('div');
			inner.id = 'probe-inner';
			inner.className = 'material-pane';
			document.querySelector('[data-slot="sheet-content"]')!.appendChild(inner);
			const over = document.createElement('div');
			over.id = 'probe-over';
			over.className = 'material-pane';
			document.body.appendChild(over);
		});
		opaque(await paint(page.locator('#probe-inner')), 'pane inside a sheet');
		opaque(await paint(page.locator('#probe-over')), 'pane over an open sheet');
	});

	test('the active nav item is a visible capsule, also while hovered', async ({ page }) => {
		await leads(page, {});
		const active = page.locator('[data-slot="sidebar-inner"] a[aria-current="page"]').first();
		const bg = () => active.evaluate((a) => getComputedStyle(a).backgroundColor);
		expect(await bg()).not.toBe('rgba(0, 0, 0, 0)');
		await active.hover();
		expect(await bg()).not.toBe('rgba(0, 0, 0, 0)');
		expect(await active.evaluate((a) => getComputedStyle(a).borderRadius)).toBe('9999px');
	});

	test('the user menu: every item carries an icon (all or none per group)', async ({ page }) => {
		await leads(page, {});
		const menu = await overlay(page, 'menu');
		const items = menu.locator(
			'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
		);
		const count = await items.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i++)
			await expect(items.nth(i).locator('svg').first(), `menu item ${i}`).toBeAttached();
	});
});

test.describe('the tenant banner stays opaque', () => {
	const ACME = fakeTenantDto({
		id: '00000000-0000-4000-8000-0000000000a1',
		slug: 'acme-pharma',
		display_name: 'Acme Pharma',
		legal_name: 'Acme Pharma Pvt Ltd'
	});
	test.beforeEach(async () => {
		await resetMock();
	});
	for (const transparency of ['glass', 'off']) {
		test(`transparency ${transparency}`, async ({ page }) => {
			await setPrefs(page, { transparency });
			await page.setViewportSize({ width: 1280, height: 800 });
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
			opaque(await paint(page.locator('[data-shell="banner"]')), `banner (${transparency})`);
		});
	}
});
