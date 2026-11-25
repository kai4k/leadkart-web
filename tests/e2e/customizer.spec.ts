import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The customizer writes the `lk_ui` preferences only: every control re-skins the page through
 * <html data-*> at once (no reload), the next server render carries the same attributes, Reset
 * restores the defaults, and nothing is injected at runtime (CSP stays strict).
 */

const DEFAULTS = {
	'data-layout': 'vertical',
	'data-nav-type': 'default',
	'data-content-width': 'default',
	'data-sidebar': 'large',
	'data-mode': 'light',
	'data-palette': 'iris',
	'data-sidebar-colors': 'light',
	'data-dock': 'bottom',
	'data-dock-autohide': 'off',
	'data-density': 'comfortable',
	'data-transparency': 'glass'
} as const;

const attr = (page: Page, name: string) => page.locator('html').getAttribute(name);
const htmlTag = (body: string) => /<html[^>]*>/.exec(body)?.[0] ?? '';

async function open(page: Page) {
	await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
	await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
	await page.getByRole('button', { name: 'Open theme settings' }).click();
	await expect(page.getByRole('dialog', { name: 'Customize' })).toBeVisible();
}
const pick = (page: Page, group: string, option: string) =>
	page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option }).click();

test.describe('theme customizer', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('layout, mode and primary update <html> with no reload; the next server render has them; Reset undoes them', async ({
		page
	}) => {
		await open(page);
		const navigations: string[] = [];
		page.on('framenavigated', (f) => f === page.mainFrame() && navigations.push(f.url()));

		await pick(page, 'Layout', 'Semibox');
		await pick(page, 'Mode', 'Dark');
		await pick(page, 'Colour palette', 'Ocean');
		expect(await attr(page, 'data-layout')).toBe('semibox');
		expect(await attr(page, 'data-mode')).toBe('dark');
		expect(await attr(page, 'data-palette')).toBe('ocean');
		expect(navigations).toEqual([]);

		// the radios report the choice
		await expect(
			page.getByRole('radiogroup', { name: 'Layout' }).getByRole('radio', { name: 'Semibox' })
		).toHaveAttribute('aria-checked', 'true');

		// the next server render carries the same attributes (cookie, not a client-only state)
		const tag = htmlTag(await (await page.request.get('/dashboard')).text());
		expect(tag).toContain('data-layout="semibox"');
		expect(tag).toContain('data-mode="dark"');
		expect(tag).toContain('data-palette="ocean"');

		await page.getByRole('button', { name: 'Reset to defaults' }).click();
		for (const [name, value] of Object.entries(DEFAULTS))
			expect(await attr(page, name), name).toBe(value);
		const reset = htmlTag(await (await page.request.get('/dashboard')).text());
		for (const [name, value] of Object.entries(DEFAULTS))
			expect(reset, name).toContain(`${name}="${value}"`);
	});

	test('every group re-skins one attribute', async ({ page }) => {
		await open(page);
		const cases = [
			['Navigation style', 'Pattern', 'data-nav-type', 'pattern'],
			['Content width', 'Fluid', 'data-content-width', 'fluid'],
			['Sidebar size', 'Medium', 'data-sidebar', 'medium'],
			['Sidebar colour', 'Brand', 'data-sidebar-colors', 'brand'],
			['Mode', 'Dark', 'data-mode', 'dark'],
			['Transparency', 'Tinted', 'data-transparency', 'reduced'],
			['Transparency', 'Solid', 'data-transparency', 'off'],
			['Colour palette', 'Emerald', 'data-palette', 'emerald'],
			['Dock position', 'Side', 'data-dock', 'side'],
			['Hide the dock', 'Hide until needed', 'data-dock-autohide', 'on'],
			['Density', 'Compact', 'data-density', 'compact'],
			['Mode', 'Auto (follows your device)', 'data-mode', 'auto']
		] as const;
		for (const [group, option, name, value] of cases) {
			await pick(page, group, option);
			expect(await attr(page, name), `${group}: ${option}`).toBe(value);
		}
	});

	test('Transparency: Solid updates <html> with no reload, the next server render has it, and the hint is on screen', async ({
		page
	}) => {
		await open(page);
		const navigations: string[] = [];
		page.on('framenavigated', (f) => f === page.mainFrame() && navigations.push(f.url()));
		await expect(page.getByRole('radiogroup', { name: 'Transparency' })).toBeVisible();
		await expect(page.getByText(/Chrome and Edge/)).toBeVisible();
		await pick(page, 'Transparency', 'Solid');
		expect(await attr(page, 'data-transparency')).toBe('off');
		expect(navigations).toEqual([]);
		await expect(
			page.getByRole('radiogroup', { name: 'Transparency' }).getByRole('radio', { name: 'Solid' })
		).toHaveAttribute('aria-checked', 'true');
		expect(htmlTag(await (await page.request.get('/dashboard')).text())).toContain(
			'data-transparency="off"'
		);
		// the material tokens follow the level: opaque fills, no backdrop filter (the shell consumes them from G6)
		const tokens = await page.evaluate(() => {
			const cs = getComputedStyle(document.documentElement);
			return {
				filter: cs.getPropertyValue('--material-bar-filter').trim(),
				plate: cs.getPropertyValue('--brand-plate-solid').trim()
			};
		});
		expect(tokens).toEqual({ filter: 'none', plate: '1' });
		await page.getByRole('button', { name: 'Reset to defaults' }).click();
		expect(await attr(page, 'data-transparency')).toBe('glass');
	});

	test('the horizontal layout drops the groups that do not apply', async ({ page }) => {
		await open(page);
		await pick(page, 'Layout', 'Horizontal');
		for (const g of ['Navigation style', 'Sidebar size', 'Sidebar colour'])
			await expect(page.getByRole('radiogroup', { name: g })).toHaveCount(0);
		await expect(page.getByRole('radiogroup', { name: 'Colour palette' })).toBeVisible();
	});

	test('the keyboard moves through a group, closes with Escape and returns focus to the trigger', async ({
		page
	}) => {
		await open(page);
		const first = page
			.getByRole('radiogroup', { name: 'Colour palette' })
			.getByRole('radio', { name: 'Iris' });
		await first.focus();
		await page.keyboard.press('ArrowRight');
		await expect(
			page.getByRole('radiogroup', { name: 'Colour palette' }).getByRole('radio', { name: 'Ocean' })
		).toBeFocused();
		expect(await attr(page, 'data-palette')).toBe('ocean');
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog', { name: 'Customize' })).toBeHidden();
		await expect(page.getByRole('button', { name: 'Open theme settings' })).toBeFocused();
	});

	test('no CSP violation while choosing, and nothing is announced as an alert', async ({
		page
	}) => {
		const violations: string[] = [];
		page.on('console', (m) => {
			if (/content security policy/i.test(m.text())) violations.push(m.text());
		});
		await open(page);
		await pick(page, 'Mode', 'Dark');
		await pick(page, 'Colour palette', 'Coral');
		expect(violations).toEqual([]);
		await expect(
			page.getByRole('dialog', { name: 'Customize' }).locator('[role="alert"], [aria-live]')
		).toHaveCount(0);
	});

	test('the open sheet has no serious or critical axe violation, in light and dark', async ({
		page
	}) => {
		await open(page);
		for (const mode of ['Light', 'Dark']) {
			await pick(page, 'Mode', mode);
			// colours transition when the mode flips: measure the settled page
			await page.waitForTimeout(600);
			const result = await new AxeBuilder({ page })
				.include('[role="dialog"]')
				.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
				.analyze();
			const bad = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
			expect(
				bad.map((v) => `${mode}: ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
			).toEqual([]);
		}
	});

	test('the topbar mode button goes light -> dark -> light', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
		const button = page.getByRole('button', { name: 'Switch between light and dark mode' });
		expect(await attr(page, 'data-mode')).toBe('light');
		await button.click();
		expect(await attr(page, 'data-mode')).toBe('dark');
		await button.click();
		expect(await attr(page, 'data-mode')).toBe('light');
	});
});

test.describe('theme customizer on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });
	test('opens full width, disables the layouts that need room, keeps the group keyboard-reachable, and scrolls to the primary colours', async ({
		page
	}) => {
		await open(page);
		const dialog = page.getByRole('dialog', { name: 'Customize' });
		const box = await dialog.boundingBox();
		expect(box!.width).toBeGreaterThanOrEqual(389);
		const layout = page.getByRole('radiogroup', { name: 'Layout' });
		await expect(layout.getByRole('radio', { name: 'Semibox' })).toBeDisabled();
		await expect(layout.getByRole('radio', { name: 'Modern' })).toBeDisabled();
		await expect(layout.getByRole('radio', { name: 'Horizontal' })).toBeVisible();
		await expect(layout.getByRole('radio', { name: 'Vertical' })).toBeChecked();
		// arrow keys skip the unavailable tiles; the group keeps one reachable tab stop
		await layout.getByRole('radio', { name: 'Horizontal' }).focus();
		await page.keyboard.press('ArrowRight');
		await expect(layout.getByRole('radio', { name: 'Boxed' })).toBeFocused();
		const stops = await layout
			.getByRole('radio')
			.evaluateAll(
				(els) =>
					els.filter((e) => (e as HTMLElement).tabIndex === 0 && !(e as HTMLButtonElement).disabled)
						.length
			);
		expect(stops).toBe(1);
		await pick(page, 'Colour palette', 'Emerald');
		expect(await attr(page, 'data-palette')).toBe('emerald');
		// no horizontal scroll inside the sheet
		const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});
