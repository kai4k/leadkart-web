import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMock } from './helpers/mock';
import { glass, opaque, paint } from './helpers/materials';
import { PREFERENCE_VALUES } from '../../src/lib/features/preferences/schema';

/**
 * The five shell layouts, set through the `lk_ui` cookie (so the server writes them onto <html>):
 * the page never overlaps the sidebar or the topbar, horizontal swaps the sidebar for the nav bar,
 * semibox floats the sidebar with a gap, and below `lg` the navigation is a sheet in every layout.
 */

const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

const cookie = (layout: string, extra: Record<string, string> = {}) =>
	b64url(
		JSON.stringify({
			v: 2,
			layout,
			navType: 'default',
			contentWidth: 'default',
			sidebar: 'large',
			mode: 'light',
			palette: 'iris',
			sidebarColors: 'light',
			...extra
		})
	);

async function open(page: Page, layout: string, extra: Record<string, string> = {}) {
	await page
		.context()
		.addCookies([{ name: 'lk_ui', value: cookie(layout, extra), url: 'http://localhost:4173' }]);
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: ['tenant.admin', 'identity.users.view', 'identity.roles.view']
	});
	await registerMock({
		method: 'GET',
		path: '/api/v1/users',
		status: 200,
		body: { users: [], has_more: false }
	});
	await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
	await page.goto('/settings/users');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}

const box = async (page: Page, selector: string) => {
	const b = await page.locator(selector).first().boundingBox();
	expect(b, selector).not.toBeNull();
	return b!;
};

test.describe('shell layouts', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	const COMBOS = PREFERENCE_VALUES.layout.flatMap((layout) =>
		PREFERENCE_VALUES.navType.map((navType) => [layout, navType] as const)
	);
	for (const [layout, navType] of COMBOS) {
		test(`${layout} / nav ${navType}: the page does not overlap the sidebar or the topbar (1280x800)`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await open(page, layout, { navType });
			await expect(page.locator('html')).toHaveAttribute('data-layout', layout);

			// the page's content (main's own padding clears the bars, so main itself starts higher)
			const main = await box(page, 'main#main-content > div');
			const topbar = await box(page, '[data-shell="topbar"]');
			// the page starts below the topbar's bottom edge ...
			expect(main.y + 1, 'main below the topbar').toBeGreaterThanOrEqual(
				topbar.y + topbar.height - 1
			);

			if (layout === 'horizontal') {
				await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0);
				const nav = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(nav).toBeVisible();
				await expect(nav.locator('[data-slot="dropdown-menu-trigger"]').first()).toBeVisible();
				const bar = await box(page, '[data-shell="hnav"]');
				expect(main.y + 1, 'main below the nav bar').toBeGreaterThanOrEqual(bar.y + bar.height);
			} else {
				const sidebar = await box(page, '[data-slot="sidebar-container"]');
				// ... and to the right of the sidebar's right edge
				expect(main.x + 1, 'main beside the sidebar').toBeGreaterThanOrEqual(
					sidebar.x + sidebar.width
				);
				if (layout === 'semibox') {
					expect(sidebar.x, 'the semibox sidebar floats off the viewport edge').toBeGreaterThan(0);
				}
			}
		});
	}

	test('rtl: the page still clears the topbar and sits beside the sidebar', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical');
		await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
		const main = await box(page, 'main#main-content > div');
		const topbar = await box(page, '[data-shell="topbar"]');
		const sidebar = await box(page, '[data-slot="sidebar-container"]');
		expect(main.y + 1).toBeGreaterThanOrEqual(topbar.y + topbar.height - 1);
		// mirrored: the sidebar is at the inline start, now the right edge
		expect(sidebar.x).toBeGreaterThan(640);
		expect(main.x + main.width, 'main ends before the sidebar starts').toBeLessThanOrEqual(
			sidebar.x + 1
		);
	});

	test('pattern nav type: after a scroll the topbar still has its own opaque fill, not the page background', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { navType: 'pattern' });
		await page.evaluate(() => {
			const filler = document.createElement('div');
			filler.style.height = '3000px';
			document.querySelector('#main-content')!.append(filler);
		});
		await page.evaluate(() => window.scrollTo(0, 1500));
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
		const fills = await page.evaluate(() => {
			const top = getComputedStyle(document.querySelector('[data-shell="topbar"]')!);
			return {
				topbar: top.backgroundColor,
				page: getComputedStyle(document.body).backgroundColor,
				scrollY: window.scrollY
			};
		});
		expect(fills.scrollY).toBeGreaterThan(100);
		expect(fills.topbar).not.toBe('rgba(0, 0, 0, 0)');
		expect(fills.topbar).not.toBe('transparent');
		expect(fills.topbar).not.toBe(fills.page);
		// opaque: no alpha channel below 1
		expect(fills.topbar).not.toMatch(/rgba\(.*,\s*0?\.\d+\)/);
	});

	test('the small sidebar is icon-only and every link keeps its name (a tooltip names it)', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { sidebar: 'small' });
		const sidebar = page.locator('[data-slot="sidebar"]');
		await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
		const team = page.getByRole('link', { name: 'Team' });
		await expect(team).toBeVisible();
		await expect(team).toHaveAttribute('aria-current', 'page');
		const width = (await box(page, '[data-slot="sidebar-container"]')).width;
		expect(width).toBeLessThan(100);
		await team.hover();
		await expect(
			page.locator('[data-slot="tooltip-content"]').filter({ hasText: 'Team' }).first()
		).toBeVisible();
	});

	test('the tooltip takes no material: opaque, no backdrop filter, while the surfaces around it are glass (GD12)', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { sidebar: 'small', transparency: 'glass' });
		await page.getByRole('link', { name: 'Team' }).hover();
		const tip = page.locator('[data-slot="tooltip-content"]').filter({ hasText: 'Team' }).first();
		await expect(tip).toBeVisible();
		await page.waitForTimeout(300);
		opaque(await paint(tip), 'tooltip');
		// the same prefs do give the sidebar its material, so the check above can fail
		glass(
			await paint(page.locator('[data-slot="sidebar-container"] [data-sidebar="sidebar"]')),
			'sidebar'
		);
	});

	test('the toggle has a name and aria-expanded, and collapses and expands the sidebar', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical');
		const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'small');
		await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
		await toggle.click();
		await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'large');
	});

	for (const layout of PREFERENCE_VALUES.layout) {
		test(`${layout}: below lg the sidebar is hidden and the topbar toggle opens a dialog with the nav (390x844)`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 390, height: 844 });
			await open(page, layout);
			await expect(page.locator('[data-slot="sidebar-container"]')).toBeHidden();
			const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
			await toggle.click();
			const dialog = page.getByRole('dialog', { name: 'Navigation' });
			await expect(dialog).toBeVisible();
			await expect(dialog.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
			await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden();
			// focus returns to the control that opened it
			await expect(toggle).toBeFocused();
		});
	}
});

test.describe('shell on materials (plan G6)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const layout of PREFERENCE_VALUES.layout) {
		test(`${layout} (glass): the topbar is glass, with no ::after fade`, async ({ page }) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await open(page, layout, { transparency: 'glass' });
			const style = await page.evaluate(() => {
				const bar = document.querySelector('[data-shell="topbar"]')!;
				return {
					filter: getComputedStyle(bar).backdropFilter,
					after: getComputedStyle(bar, '::after').content
				};
			});
			expect(style.filter).toContain('blur(');
			expect(['none', 'normal']).toContain(style.after);
		});
	}

	test('pattern nav type keeps an opaque band: no backdrop filter, no shadow', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { navType: 'pattern', transparency: 'glass' });
		const style = await page.evaluate(() => {
			const s = getComputedStyle(document.querySelector('[data-shell="topbar"]')!);
			return { filter: s.backdropFilter, shadow: s.boxShadow };
		});
		expect(style.filter).toBe('none');
		expect(style.shadow).toBe('none');
	});

	test('Solid: every bar and the sidebar are opaque, with no backdrop filter', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { transparency: 'off' });
		const filters = await page.evaluate(() =>
			['[data-shell="topbar"]', '[data-slot="sidebar-inner"]'].map((sel) => {
				const s = getComputedStyle(document.querySelector(sel)!);
				return [sel, s.backdropFilter, s.backgroundColor];
			})
		);
		for (const [sel, filter, bg] of filters) {
			expect(filter, sel).toBe('none');
			expect(bg, sel).not.toMatch(/rgba\(.*,\s*0?\.\d+\)/);
		}
	});

	test('horizontal: the topbar has no outer 1px edge, the nav bar has one (one scroll edge)', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'horizontal', { transparency: 'glass' });
		const shadows = await page.evaluate(() => ({
			topbar: getComputedStyle(document.querySelector('[data-shell="topbar"]')!).boxShadow,
			hnav: getComputedStyle(document.querySelector('[data-shell="hnav"]')!).boxShadow,
			hnavFilter: getComputedStyle(document.querySelector('[data-shell="hnav"]')!).backdropFilter
		}));
		const ring = /0px 0px 0px 1px/;
		expect(shadows.topbar).not.toMatch(ring);
		expect(shadows.hnav).toMatch(ring);
		expect(shadows.hnavFilter).toContain('blur(');
	});

	test('inactive nav icons are the muted sidebar text; the active icon and label are the accent text (colour means something)', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await open(page, 'vertical', { sidebarColors: 'light' });
		const c = await page.evaluate(() => {
			const colour = (el: Element) => getComputedStyle(el).color;
			const active = document.querySelector(
				'[data-slot="sidebar-content"] a[aria-current="page"]'
			)!;
			const inactive = [...document.querySelectorAll('[data-slot="sidebar-content"] a')].find(
				(a) => a !== active
			)!;
			const probe = (token: string) => {
				const i = document.createElement('i');
				i.style.color = `var(${token})`;
				document.body.append(i);
				const v = getComputedStyle(i).color;
				i.remove();
				return v;
			};
			return {
				activeIcon: colour(active.querySelector('svg')!),
				activeLabel: colour(active),
				inactiveIcon: colour(inactive.querySelector('svg')!),
				accent: probe('--sidebar-accent-foreground'),
				muted: probe('--sidebar-muted-foreground')
			};
		});
		expect(c.activeIcon).toBe(c.accent);
		expect(c.activeLabel).toBe(c.accent);
		expect(c.inactiveIcon).toBe(c.muted);
	});
});
