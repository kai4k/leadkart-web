import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMock } from './helpers/mock';
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
			v: 1,
			layout,
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

	for (const layout of PREFERENCE_VALUES.layout) {
		test(`${layout}: the page does not overlap the sidebar or the topbar (1280x800)`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await open(page, layout);
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
