import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './helpers/test';
import { registerMocks, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { leads, opaque, overlay, paint, setPrefs } from './helpers/materials';

/**
 * Every condition under which glass must degrade to an opaque surface (plan section 4, G9), asserted on COMPUTED styles
 * of the built app, Chromium only (CDP media emulation). The default preference is Glass in every test: the setting
 * under test must override it.
 *
 *   1  prefers-reduced-transparency: reduce  topbar, an open dialog and the sidebar: no backdrop filter, alpha 1
 *   2  prefers-contrast: more                as 1, and the dialog's box-shadow carries the `--input` colour (the 3:1 edge)
 *   3  forced-colors: active                 the dialog has a 1px solid border and an opaque background
 *   4  print                                 no backdrop filter
 *   5  hasTouch + isMobile                   an open sheet has no filter, the topbar blurs 12px
 *   6  prefers-reduced-motion: reduce        opening a dialog leaves no running animation
 *
 * Then axe (WCAG 2.2 AA, no serious or critical findings), light and dark, Glass and Solid, on: /dashboard (at rest, with
 * the customizer open, with the command palette open), /settings/users (at rest, with the customizer open) and /leads
 * WITH ROWS (at rest, with the command palette open). Axe does not run under forced colours (the colours are the user
 * agent's): case 3 asserts the computed border and fill instead.
 */

const inputColour = (page: Page) =>
	page.evaluate(() => {
		const probe = document.createElement('i');
		probe.style.color = 'var(--input)';
		document.body.appendChild(probe);
		const c = getComputedStyle(probe).color;
		probe.remove();
		return c;
	});

async function setFeature(page: Page, name: string, value: string) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name, value }] });
}

const SHELL = {
	topbar: '[data-shell="topbar"]',
	sidebar: '[data-slot="sidebar-inner"]'
};

test.describe('glass degrades to opaque', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('1. prefers-reduced-transparency: topbar, dialog and sidebar are opaque', async ({
		page
	}) => {
		await leads(page, {});
		await setFeature(page, 'prefers-reduced-transparency', 'reduce');
		for (const [name, sel] of Object.entries(SHELL)) opaque(await paint(page.locator(sel)), name);
		opaque(await paint(await overlay(page, 'dialog')), 'dialog');
	});

	test('2. prefers-contrast: more is opaque too, and the dialog edge is the 3:1 --input colour', async ({
		page
	}) => {
		await leads(page, {});
		await setFeature(page, 'prefers-contrast', 'more');
		for (const [name, sel] of Object.entries(SHELL)) opaque(await paint(page.locator(sel)), name);
		const dialog = await overlay(page, 'dialog');
		opaque(await paint(dialog), 'dialog');
		const shadow = await dialog.evaluate((el) => getComputedStyle(el).boxShadow);
		expect(shadow).toContain(await inputColour(page));
	});

	test('3. forced colours: the dialog has a 1px solid border and an opaque background', async ({
		page
	}) => {
		await leads(page, {});
		await page.emulateMedia({ forcedColors: 'active' });
		const dialog = await overlay(page, 'dialog');
		opaque(await paint(dialog), 'dialog');
		const border = await dialog.evaluate((el) => {
			const cs = getComputedStyle(el);
			return `${cs.borderTopWidth} ${cs.borderTopStyle}`;
		});
		expect(border).toBe('1px solid');
	});

	test('3b. forced colours: the active nav item still has a visible indicator bar, and aria-current', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await leads(page, {});
		await page.emulateMedia({ forcedColors: 'active' });
		const active = page.locator('[data-sidebar="menu-button"][data-active="true"]').first();
		await expect(active).toBeVisible();
		await expect(page.locator('a[aria-current="page"]').first()).toBeVisible();
		const bar = await active.evaluate((el) => {
			const cs = getComputedStyle(el, '::before');
			return {
				bg: cs.backgroundColor,
				item: getComputedStyle(el).backgroundColor,
				width: cs.width,
				height: cs.height,
				content: cs.content
			};
		});
		expect(bar.content, 'the bar is generated').not.toBe('none');
		expect(bar.bg, 'the bar has a colour that forced colours keep').not.toBe('rgba(0, 0, 0, 0)');
		expect(bar.bg).not.toBe('transparent');
		// forced colours paint a background as Canvas: the bar must differ from the item it sits on (Highlight)
		expect(bar.bg, 'the bar is not painted as the canvas').not.toBe(bar.item);
		expect(parseFloat(bar.width)).toBeGreaterThanOrEqual(2);
		expect(parseFloat(bar.height)).toBeGreaterThanOrEqual(12);
	});

	test('4. print: no backdrop filter on any surface', async ({ page }) => {
		await leads(page, {});
		await page.emulateMedia({ media: 'print' });
		for (const [name, sel] of Object.entries(SHELL)) {
			const p = await paint(page.locator(sel));
			expect(p.filter, name).toBe('none');
		}
	});

	test('5. touch: an open sheet has no filter and the topbar blurs 12px', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			hasTouch: true,
			isMobile: true
		});
		const page = await context.newPage();
		await leads(page, {});
		await page.setViewportSize({ width: 390, height: 844 });
		const topbar = await paint(page.locator(SHELL.topbar));
		expect(topbar.filter).toContain('blur(12px)');
		const sheet = await overlay(page, 'sheet');
		expect((await paint(sheet)).filter).toBe('none');
		await context.close();
	});

	test('6. reduced motion: opening a dialog leaves no running animation', async ({ page }) => {
		await leads(page, {});
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await overlay(page, 'dialog');
		await page.waitForTimeout(400);
		expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
	});
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeClean(page: Page, label: string) {
	await page.emulateMedia({ reducedMotion: 'reduce' }); // axe reads painted colours: settle every animation first
	await page.waitForTimeout(400);
	const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	const blocking = results.violations.filter(
		(v) => v.impact === 'serious' || v.impact === 'critical'
	);
	expect(
		blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
		label
	).toEqual([]);
}

/** A tenant admin on `path`, with the empty lists the shell pages ask for. */
async function shell(page: Page, extra: Record<string, string>, path: string) {
	await setPrefs(page, extra);
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: ['tenant.admin', 'identity.users.view', 'identity.roles.view']
	});
	await registerMocks([
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
	]);
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(path);
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}

test.describe('axe on glass and solid, light and dark', () => {
	test.beforeEach(async () => {
		await resetMock();
	});
	// The table with ROWS (a stale lead carries a status dot) and the command palette (a combobox naming its listbox):
	// no known finding is pinned any more.
	for (const mode of ['light', 'dark'])
		for (const transparency of ['glass', 'off'])
			test(`/leads with rows: at rest, then the command palette open (${mode}, ${transparency})`, async ({
				page
			}) => {
				await leads(page, { mode, transparency });
				await expect(page.getByRole('img', { name: 'Stale lead' }).first()).toBeVisible();
				await axeClean(page, `/leads ${mode}/${transparency} at rest`);
				await overlay(page, 'dialog');
				await axeClean(page, `/leads ${mode}/${transparency} command palette`);
			});
	for (const mode of ['light', 'dark'])
		for (const transparency of ['glass', 'off']) {
			test(`/dashboard: at rest, with the customizer open, then with a dialog open (${mode}, ${transparency})`, async ({
				page
			}) => {
				await shell(page, { mode, transparency }, '/dashboard');
				await axeClean(page, `/dashboard ${mode}/${transparency} at rest`);
				await overlay(page, 'sheet');
				await axeClean(page, `/dashboard ${mode}/${transparency} customizer`);
				await page.keyboard.press('Escape');
				await page.waitForTimeout(300);
				await overlay(page, 'dialog');
				await axeClean(page, `/dashboard ${mode}/${transparency} dialog`);
			});
			test(`/settings/users: at rest and with the customizer open (${mode}, ${transparency})`, async ({
				page
			}) => {
				await shell(page, { mode, transparency }, '/settings/users');
				await axeClean(page, `/settings/users ${mode}/${transparency}`);
				await overlay(page, 'sheet');
				await axeClean(page, `/settings/users ${mode}/${transparency} customizer`);
			});
		}
});
