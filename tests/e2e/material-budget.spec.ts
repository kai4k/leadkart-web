import { expect, test, type Page } from './helpers/test';
import { resetMock } from './helpers/mock';
import { countFilteredLayers, hasFixedDescendant, leads } from './helpers/materials';

/**
 * The layer budget (plan section 5), a HARD gate: elements with a computed `backdrop-filter` are counted in each state
 * at two viewports, with transparency Glass.
 *
 *   fine pointer (1280 x 800)   over moving content <= 3 (topbar, hnav, bulk bar);  any state <= 4;  at rest <= 35% of the viewport
 *   coarse pointer (390 x 844)  over moving content <= 2 (topbar, bulk bar);        any state <= 4;  panes and the sidebar are opaque
 *
 * No material has a `position: fixed` descendant (a backdrop filter makes its element the containing block of fixed
 * descendants: everything floating is portalled to <body>, and this pins it). The counts are printed in the test
 * annotations so a regression shows its number.
 */

const FINE = { width: 1280, height: 800 };

async function openLeadsAt(page: Page, coarse: boolean) {
	if (coarse) await page.setViewportSize({ width: 390, height: 844 });
	await leads(page, {});
	if (coarse) await page.setViewportSize({ width: 390, height: 844 });
}

async function note(page: Page, label: string, c: Awaited<ReturnType<typeof countFilteredLayers>>) {
	test.info().annotations.push({
		type: 'layers',
		description: `${label}: total ${c.total}, over scroll ${c.overScroll}, area ${(c.area * 100).toFixed(1)}% [${c.names.join(', ')}]`
	});
	expect(
		await hasFixedDescendant(page),
		`${label}: a material contains a fixed descendant`
	).toEqual([]);
}

const STATES = {
	async rest() {},
	async bulk(page: Page) {
		await page.getByLabel('Select Lead A').check();
		await page.getByLabel('Select Lead B').check();
		await expect(page.getByText('2 selected')).toBeVisible();
	},
	async userMenu(page: Page) {
		await page.getByRole('button', { name: 'User menu' }).click();
		await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeVisible();
	},
	async customizer(page: Page) {
		await page.getByRole('button', { name: 'Open theme settings' }).click();
		await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
	},
	async command(page: Page) {
		await page.keyboard.press('Control+k');
		await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible();
	},
	/**
	 * An edit sheet (the form's Selects are native <select>s, which draw no list of their own; a Combobox popover opened
	 * inside a sheet is opaque by the no-glass-on-glass rule, asserted in materials-computed.spec.ts).
	 */
	async formSheet(page: Page) {
		await page.getByTestId('lead-row').first().focus();
		await page.keyboard.press('e');
		await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
	}
} as const;

test.describe('filtered-layer budget, fine pointer 1280 x 800', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('at rest: topbar + sidebar, under 35% of the viewport', async ({ page }) => {
		await leads(page, {});
		await page.setViewportSize(FINE);
		const c = await countFilteredLayers(page);
		await note(page, 'rest', c);
		expect(c.total).toBeLessThanOrEqual(4);
		expect(c.overScroll).toBeLessThanOrEqual(3);
		expect(c.area).toBeLessThanOrEqual(0.35);
		expect(c.total).toBeGreaterThanOrEqual(2); // the budget is only meaningful if glass is really on
	});

	for (const [name, fn] of Object.entries(STATES)) {
		if (name === 'rest') continue;
		test(`${name}: at most 4 layers in total, at most 3 over moving content`, async ({ page }) => {
			await leads(page, {});
			await page.setViewportSize(FINE);
			await fn(page);
			await page.waitForTimeout(300);
			const c = await countFilteredLayers(page);
			await note(page, name, c);
			expect(c.total).toBeLessThanOrEqual(4);
			expect(c.overScroll).toBeLessThanOrEqual(3);
		});
	}

	test('the horizontal layout adds the nav bar as the third bar over moving content', async ({
		page
	}) => {
		await leads(page, { layout: 'horizontal' });
		await page.setViewportSize(FINE);
		await STATES.bulk(page);
		const c = await countFilteredLayers(page);
		await note(page, 'horizontal + bulk bar', c);
		expect(c.overScroll).toBeLessThanOrEqual(3);
		expect(c.total).toBeLessThanOrEqual(4);
	});
});

test.describe('filtered-layer budget, coarse pointer 390 x 844', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	test.beforeEach(async () => {
		await resetMock();
	});

	test('at rest: the topbar is the only bar, with the smaller blur', async ({ page }) => {
		await openLeadsAt(page, true);
		const c = await countFilteredLayers(page);
		await note(page, 'touch rest', c);
		expect(c.total).toBeLessThanOrEqual(4);
		expect(c.overScroll).toBeLessThanOrEqual(2);
		const blur = await page
			.locator('[data-shell="topbar"]')
			.evaluate((el) => getComputedStyle(el).backdropFilter);
		expect(blur).toContain('blur(12px)');
	});

	test('panes and the sidebar are opaque on touch: a sheet and a menu add no layer', async ({
		page
	}) => {
		await openLeadsAt(page, true);
		const rest = await countFilteredLayers(page);
		await STATES.customizer(page);
		await page.waitForTimeout(300);
		const withSheet = await countFilteredLayers(page);
		await note(page, 'touch sheet', withSheet);
		expect(withSheet.total).toBe(rest.total);
		const sheetFilter = await page
			.locator('[data-slot="sheet-content"]')
			.evaluate((el) => getComputedStyle(el).backdropFilter);
		expect(sheetFilter).toBe('none');
		expect(withSheet.total).toBeLessThanOrEqual(4);
	});
});
