import { expect, test, type Page } from './helpers/test';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { fakeUserDto, TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';
import { setPrefs } from './helpers/materials';

/**
 * Shell corrections, asserted on the built app's computed styles and DOM (not on the tokens):
 *
 *   a  the active nav item carries a 3px inline-start indicator bar at 3:1, expanded and collapsed, in every sidebar
 *      colour; its icon and label are the accent text, inactive icons are muted
 *   c  the legacy Drawer's close button sits at the header's inline-end corner, 24 x 24 at least, with a focus ring
 *   d  avatar initials are not clipped; the command palette input names its listbox
 */

/** Relative luminance of the colour a stack of CSS colours paints, bottom first (alpha composited on a canvas). */
async function luminance(page: Page, ...stack: string[]): Promise<number> {
	return page.evaluate((layers) => {
		const ctx = document.createElement('canvas').getContext('2d')!;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, 1, 1);
		for (const c of layers) {
			ctx.fillStyle = c;
			ctx.fillRect(0, 0, 1, 1);
		}
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		const lin = (v: number) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	}, stack);
}
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function dashboard(page: Page, extra: Record<string, string>) {
	await resetMock();
	await setPrefs(page, { transparency: 'off', ...extra });
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: ['tenant.admin', 'identity.users.view', 'identity.users.manage']
	});
	await registerMock({
		method: 'GET',
		path: '/api/v1/users',
		status: 200,
		body: { users: [], has_more: false }
	});
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/dashboard');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}

/**
 * The selected item is marked by SHAPE (a 3px inline-start bar, 16px tall, at 3:1 on the chip and on the sidebar) as well
 * as tint, in the expanded AND the collapsed sidebar, and the active icon and label are the accent text while inactive
 * icons are muted (fix round F, I1). Solid, so the sidebar and chip composites are exact; the gate proves the glass cases.
 */
test.describe('a. the active nav item', () => {
	for (const sidebarColors of ['light', 'dark', 'brand', 'purple', 'sky'])
		for (const mode of ['light', 'dark'])
			for (const sidebar of ['large', 'small'])
				test(`${sidebarColors} sidebar, ${mode} page, ${sidebar === 'small' ? 'collapsed' : 'expanded'}: indicator bar, accent icon, aria-current`, async ({
					page
				}) => {
					await dashboard(page, { sidebarColors, mode, sidebar });
					const link = page.locator('a[aria-current="page"]').first();
					await expect(link).toHaveAttribute('aria-current', 'page');
					const m = await link.evaluate((el) => {
						const btn = (el.closest('[data-active]') ?? el) as HTMLElement;
						const bar = getComputedStyle(btn, '::before');
						const cs = getComputedStyle(btn);
						const root = getComputedStyle(document.documentElement);
						const icons = [
							...(btn.closest('[data-slot="sidebar-content"]') ?? document).querySelectorAll(
								'a svg'
							)
						];
						const activeIcon = btn.querySelector('svg');
						const inactiveIcon = icons.find((i) => !btn.contains(i));
						return {
							content: bar.content,
							w: bar.width,
							h: bar.height,
							barColour: bar.backgroundColor,
							chip: cs.backgroundColor,
							weight: cs.fontWeight,
							sidebar: root.getPropertyValue('--sidebar').trim(),
							activeIcon: activeIcon ? getComputedStyle(activeIcon).color : '',
							activeLabel: cs.color,
							inactiveIcon: inactiveIcon ? getComputedStyle(inactiveIcon).color : ''
						};
					});
					expect(m.content).not.toBe('none');
					expect(m.w).toBe('3px');
					expect(m.h).toBe('16px');
					const lSide = await luminance(page, m.sidebar);
					const lChip = await luminance(page, m.sidebar, m.chip);
					const lBar = await luminance(page, m.barColour);
					test.info().annotations.push({
						type: 'ratio',
						description: `${sidebarColors}/${mode}/${sidebar}: bar on sidebar ${ratio(lBar, lSide).toFixed(2)}, bar on chip ${ratio(lBar, lChip).toFixed(2)}, chip on sidebar ${ratio(lChip, lSide).toFixed(2)}`
					});
					expect(ratio(lBar, lSide), 'bar on the sidebar').toBeGreaterThanOrEqual(3);
					expect(ratio(lBar, lChip), 'bar on the chip').toBeGreaterThanOrEqual(3);
					// the active icon is the accent text; an inactive icon is a different (muted) colour
					expect(m.activeIcon).toBe(m.activeLabel);
					expect(m.inactiveIcon).not.toBe(m.activeIcon);
					if (sidebar === 'large') expect(Number(m.weight)).toBeGreaterThanOrEqual(500);
					if (sidebar === 'large')
						expect(
							ratio(await luminance(page, m.sidebar, m.chip, m.activeLabel), lChip)
						).toBeGreaterThanOrEqual(4.5);
				});
});

test.describe('c. the legacy Drawer close button', () => {
	test('sits at the header inline-end corner, is at least 24 x 24 and shows a focus ring', async ({
		page
	}) => {
		await dashboard(page, {});
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await page.goto('/settings/users');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page
			.getByRole('button', { name: /add member/i })
			.first()
			.click();
		const header = page.locator('[data-slot="drawer-header"]');
		await expect(header).toBeVisible();
		const close = header.getByRole('button', { name: 'Close' });
		await page.waitForTimeout(500); // the slide-in
		const [h, c] = await Promise.all([header.boundingBox(), close.boundingBox()]);
		expect(c!.width).toBeGreaterThanOrEqual(24);
		expect(c!.height).toBeGreaterThanOrEqual(24);
		// inline-end corner: right edge within 16 px of the header's, top within 16 px of the header's
		expect(h!.x + h!.width - (c!.x + c!.width)).toBeLessThanOrEqual(16);
		expect(c!.y - h!.y).toBeLessThanOrEqual(16);
		// the title is not covered by it
		const title = await header.locator('[data-slot="sheet-title"], h2').first().boundingBox();
		expect(title!.x + title!.width).toBeLessThanOrEqual(c!.x);
		await close.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		const ring = await close.evaluate((el) => getComputedStyle(el).boxShadow);
		expect(ring).not.toBe('none');
	});
});

test.describe('d. accessibility findings that used to be pinned', () => {
	test('avatar initials are not clipped in the Team list', async ({ page }) => {
		await dashboard(page, {});
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 200,
			body: {
				users: [
					fakeUserDto({
						membership_id: '00000000-0000-4000-8000-00000000010d',
						person_id: '00000000-0000-4000-8000-00000000010e',
						tenant_id: TEST_TENANT_ID,
						email: 'alice@acme.test',
						first_name: 'Alice',
						last_name: 'Anderson'
					}),
					fakeUserDto({ membership_id: TEST_MEMBERSHIP_ID, first_name: 'Test', last_name: 'User' })
				],
				has_more: false
			}
		});
		await page.goto('/settings/users');
		await expect(page.getByText('Alice Anderson')).toBeVisible();
		const sizes = await page.evaluate(() =>
			[...document.querySelectorAll('[data-slot="avatar"]')].map((el) => ({
				text: el.textContent,
				w: el.getBoundingClientRect().width,
				h: el.getBoundingClientRect().height,
				clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
			}))
		);
		expect(sizes.length).toBeGreaterThanOrEqual(2);
		for (const s of sizes) {
			expect(s.w, `${s.text} width`).toBeGreaterThanOrEqual(36);
			expect(s.w).toBeCloseTo(s.h, 0); // a circle
			expect(s.clipped, `${s.text} clipped`).toBe(false);
		}
	});

	test('the command palette input is a combobox that names its listbox', async ({ page }) => {
		await dashboard(page, {});
		await page.keyboard.press('Control+k');
		const input = page.locator('[data-slot="command-input"]');
		await expect(input).toBeVisible();
		await expect(input).toHaveAttribute('role', 'combobox');
		const controls = await input.getAttribute('aria-controls');
		expect(controls).toBeTruthy();
		const listbox = page.locator(`[id="${controls}"]`);
		await expect(listbox).toHaveAttribute('role', 'listbox');
		await expect(listbox).toHaveAccessibleName(/\S/);
		// the options are inside the element it controls
		await expect(listbox.getByRole('option').first()).toBeVisible();
	});
});
