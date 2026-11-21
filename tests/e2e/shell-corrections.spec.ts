import { expect, test, type Page } from './helpers/test';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { fakeUserDto, TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';
import { setPrefs } from './helpers/materials';

/**
 * Shell corrections, asserted on the built app's computed styles and DOM (not on the tokens):
 *
 *   a  the active nav item is a capsule that reads as a lighter tint of the sidebar in EVERY sidebar colour, with a
 *      second cue besides the fill (aria-current="page" and weight 500), and its label stays at 4.5:1 on the chip
 *   c  the legacy Drawer's close button sits at the header's inline-end corner, 24 x 24 at least, with a focus ring
 *   d  avatar initials are not clipped; the command palette input names its listbox
 */

/** Relative luminance of any CSS colour the browser can parse (through a canvas, so oklab and color() resolve). */
async function luminance(page: Page, css: string): Promise<number> {
	return page.evaluate((c) => {
		const ctx = document.createElement('canvas').getContext('2d')!;
		ctx.fillStyle = '#000';
		ctx.fillStyle = c;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		const lin = (v: number) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	}, css);
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

// The floor for text on the chip is the gate's 4.5. The fill's own floor (non-text) is the gate's 1.2; each coloured
// sidebar must clear the number measured on the built app (dark 2.20, brand 1.82, purple 1.68, sky 1.47, light 1.25),
// so a regression to the faint chip fails here. The dark sidebar was 1.84 before the 28% mix and 0.88 label lift.
const FLOOR: Record<string, number> = { light: 1.2, dark: 2.0, brand: 1.7, purple: 1.6, sky: 1.4 };

test.describe('a. the active nav capsule', () => {
	for (const sidebarColors of ['light', 'dark', 'brand', 'purple', 'sky'])
		for (const mode of ['light', 'dark'])
			test(`${sidebarColors} sidebar, ${mode} page: a visible chip, aria-current and weight 500, label at 4.5:1`, async ({
				page
			}) => {
				await dashboard(page, { sidebarColors, mode });
				const link = page.locator('a[aria-current="page"]').first();
				await expect(link).toHaveAttribute('aria-current', 'page');
				const [chip, label, weight, side] = await link.evaluate((el) => {
					const btn = (el.closest('[data-active]') ?? el) as HTMLElement;
					const cs = getComputedStyle(btn);
					const root = getComputedStyle(document.documentElement);
					return [
						cs.backgroundColor,
						cs.color,
						cs.fontWeight,
						root.getPropertyValue('--sidebar').trim()
					];
				});
				expect(Number(weight)).toBeGreaterThanOrEqual(500);
				// Solid: the sidebar is its opaque token, so the chip-to-sidebar ratio is exact
				const rChip = ratio(await luminance(page, chip), await luminance(page, side));
				test.info().annotations.push({
					type: 'ratio',
					description: `${sidebarColors}/${mode}: chip ${chip} on sidebar ${side} = ${rChip.toFixed(2)}`
				});
				expect(rChip, `chip ${chip} on sidebar ${side}`).toBeGreaterThanOrEqual(
					FLOOR[sidebarColors]
				);
				const rText = ratio(await luminance(page, label), await luminance(page, chip));
				expect(rText, `label ${label} on chip ${chip}`).toBeGreaterThanOrEqual(4.5);
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
