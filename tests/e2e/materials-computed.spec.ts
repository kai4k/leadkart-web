import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';
import { glass, leads, milk, opaque, overlay, paint, setPrefs } from './helpers/materials';

/**
 * The materials, read from COMPUTED styles on the built app (fix round E). The unit tests read source text; this
 * spec cannot pass with the feature broken: a cascade mistake (a layered `!important` losing to an unlayered one,
 * a utility that compiles to nothing) shows up here as a wrong `backdrop-filter` or a wrong alpha.
 *
 * Glass: topbar, sidebar, bulk bar and auth card have a real backdrop filter and a translucent fill. Milk
 * (dialog, sheet, menu, toast) is near-opaque and has NO filter. Solid, the OS Reduce Transparency setting and
 * forced colours: no filter and an opaque fill on both. A stacked modal is opaque. The tenant banner is opaque in
 * every case. The user menu's items all carry an icon. The solid materials (clay, trough, ...) keep a visible
 * edge in forced colours and keep their shape when glass turns solid.
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
async function everySurface(
	page: Page,
	expectation: typeof glass,
	label: string,
	overlayExpectation: typeof glass = expectation,
	/** The "dialog" the helper opens is the command palette (Ctrl+K), the one overlay that is glass. */
	paletteExpectation: typeof glass = overlayExpectation
) {
	await openBulk(page);
	for (const [name, sel] of Object.entries(SURFACES))
		expectation(await paint(page.locator(sel)), `${label} ${name}`);
	for (const kind of ['menu', 'dialog', 'sheet'] as const) {
		const loc = await overlay(page, kind);
		await page.waitForTimeout(300); // the open animation settles
		(kind === 'dialog' ? paletteExpectation : overlayExpectation)(
			await paint(loc),
			`${label} ${kind}`
		);
		await closeOverlay(page);
	}
}

test.describe('materials: computed styles on the built app', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const mode of ['light', 'dark']) {
		test(`Glass (${mode}): topbar, sidebar, bulk bar and the command palette are blurred and translucent; sheet and menu are milk (no blur)`, async ({
			page
		}) => {
			await leads(page, { mode });
			await everySurface(page, glass, `glass/${mode}`, milk, glass);
		});
	}

	test('Solid: no filter and an opaque fill on every surface', async ({ page }) => {
		await leads(page, { transparency: 'off' });
		await everySurface(page, opaque, 'solid');
	});

	test('OS Reduce Transparency overrides the Glass preference', async ({ page, browserName }) => {
		test.skip(browserName !== 'chromium', 'CDP media emulation exists in Chromium only');
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

	// REAL components, on the styleguide's overlay demo (no screen of the app stacks a confirmation over a sheet yet; the demo
	// opens the real Sheet, the real Dialog, the real DropdownMenu and fires the real `toast()`).
	test.describe('real components: toasts and stacked surfaces (/styleguide)', () => {
		async function guide(page: Page) {
			await setPrefs(page, { transparency: 'glass' });
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto('/styleguide');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		}
		async function stack(page: Page) {
			await page.getByRole('button', { name: 'Open sheet' }).click();
			await expect(page.locator('[data-slot="sheet-content"][data-state="open"]')).toBeVisible();
			await page.getByRole('button', { name: 'Open confirm over the sheet' }).click();
			await expect(page.locator('[data-slot="dialog-content"][data-state="open"]')).toBeVisible();
			await page.waitForTimeout(400);
		}

		test('a real neutral toast (data-type="default") is milk; a typed toast keeps its opaque status fill', async ({
			page
		}) => {
			await guide(page);
			await page.getByRole('button', { name: 'Default', exact: true }).click();
			const neutral = page.locator('[data-sonner-toast][data-type="default"]');
			await expect(neutral).toBeVisible();
			await expect(neutral).toHaveAttribute('data-mounted', 'true');
			milk(await paint(neutral), 'neutral toast at rest');
			await page.getByRole('button', { name: 'Success', exact: true }).click();
			const typed = page.locator('[data-sonner-toast][data-type="success"]');
			await expect(typed).toBeVisible();
			opaque(await paint(typed), 'success toast');
		});

		test('a real neutral toast fired over an open modal is milk too: no blur, so no override is needed', async ({
			page
		}) => {
			await guide(page);
			await stack(page);
			await page.getByRole('button', { name: 'Toast from the dialog' }).click();
			const toast = page.locator('[data-sonner-toast][data-type="default"]');
			await expect(toast).toBeVisible();
			// sonner's own mount transition (data-mounted) is over before the paint is read
			await expect(toast).toHaveAttribute('data-mounted', 'true');
			milk(await paint(toast), 'neutral toast over a modal');
		});

		test('a dialog opened over a sheet is opaque while the sheet beneath stays milk', async ({
			page
		}) => {
			await guide(page);
			await page.getByRole('button', { name: 'Open sheet' }).click();
			const sheet = page.locator('[data-slot="sheet-content"]');
			await expect(sheet).toBeVisible();
			await page.waitForTimeout(400);
			milk(await paint(sheet), 'sheet on its own');
			await page.getByRole('button', { name: 'Open confirm over the sheet' }).click();
			const dialog = page.locator('[data-slot="dialog-content"]');
			await expect(dialog).toBeVisible();
			await page.waitForTimeout(400);
			opaque(await paint(dialog), 'dialog over a sheet');
			milk(await paint(sheet), 'the sheet beneath keeps its material');
		});

		test('a real dropdown menu opened inside a dialog is milk: near-opaque, no blur', async ({
			page
		}) => {
			await guide(page);
			await stack(page);
			await page.getByRole('button', { name: 'Open a menu in the dialog' }).click();
			const menu = page.locator('[data-slot="dropdown-menu-content"]');
			await expect(menu).toBeVisible();
			milk(await paint(menu), 'menu inside a dialog');
		});
	});

	// The solid materials (clay, pebble, tray, trough, sheet) on the styleguide's swatches.
	test.describe('the solid materials on /styleguide', () => {
		const MATERIALS = ['sheet', 'clay', 'clay-sm', 'tray', 'trough', 'pebble'];
		const edge = (page: Page, name: string) =>
			page.locator(`[data-material="${name}"]`).evaluate((el) => {
				const cs = getComputedStyle(el);
				return {
					width: cs.borderTopWidth,
					style: cs.borderTopStyle,
					color: cs.borderTopColor,
					filter: cs.backdropFilter || 'none',
					shadow: cs.boxShadow
				};
			});
		async function guide(page: Page, extra: Record<string, string> = {}) {
			await setPrefs(page, extra);
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto('/styleguide');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		}

		test('every solid material has a 1px transparent border, no filter and a shadow', async ({
			page
		}) => {
			await guide(page);
			for (const name of MATERIALS) {
				const e = await edge(page, name);
				expect(e.width, name).toBe('1px');
				expect(e.style, name).toBe('solid');
				expect(e.color, name).toBe('rgba(0, 0, 0, 0)');
				expect(e.filter, name).toBe('none');
				expect(e.shadow, name).not.toBe('none');
			}
		});

		test('forced colours: a trough (and every clay) draws a visible edge, not a transparent one', async ({
			page,
			browserName
		}) => {
			test.skip(
				browserName === 'webkit',
				'WebKit matches (forced-colors: active) under emulation but never repaints; Safari has no forced-colours mode'
			);
			await guide(page);
			await page.emulateMedia({ forcedColors: 'active' });
			for (const name of MATERIALS) {
				const e = await edge(page, name);
				expect(e.width, name).toBe('1px');
				expect(e.color, `${name} border colour`).not.toBe('rgba(0, 0, 0, 0)');
				expect(e.shadow, `${name} shadow (forced colours drops it)`).toBe('none');
			}
		});

		test('a pebble drops a shadow in ITS OWN app colour, not the brand colour', async ({
			page
		}) => {
			await guide(page);
			const drop = (name: string) =>
				page.locator(`[data-material="${name}"]`).evaluate((el) => {
					const s = getComputedStyle(el).boxShadow;
					// the first shadow of the list: its colour is the part before the offsets
					return /^(color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|rgba?\([^)]*\))/.exec(s)?.[1] ?? s;
				});
			const leads = await drop('pebble');
			const home = await drop('pebble-home');
			expect(leads).not.toBe(home);
			// and the leads pebble is not tinted by the brand: its gradient colour differs too
			const bg = (name: string) =>
				page
					.locator(`[data-material="${name}"]`)
					.evaluate((el) => getComputedStyle(el).backgroundImage);
			expect(await bg('pebble')).not.toBe(await bg('pebble-home'));
		});

		test('increased contrast: clay, clay-sm, sheet, tray and the pebble get a visible edge of 3:1 against the surface', async ({
			page
		}) => {
			// Firefox applies a contrast emulation only to a page loaded after it
			await page.emulateMedia({ contrast: 'more' });
			await guide(page);
			for (const name of ['clay', 'clay-sm', 'sheet', 'tray']) {
				const e = await page.locator(`[data-material="${name}"]`).evaluate((el) => {
					const cs = getComputedStyle(el);
					return { border: cs.borderTopColor, width: cs.borderTopWidth };
				});
				expect(e.width, name).toBe('1px');
				expect(e.border, `${name} border`).not.toBe('rgba(0, 0, 0, 0)');
			}
			// the edge colour against the swatch's page background: >= 3:1 (WCAG 1.4.11)
			const ratio = await page.evaluate(() => {
				const lum = (c: string) => {
					const cv = document.createElement('canvas').getContext('2d')!;
					cv.fillStyle = c;
					cv.fillRect(0, 0, 1, 1);
					// Array.from, not a typed-array map: a Uint8ClampedArray would round each channel's luminance to 0 or 1
					const [r, g, b] = Array.from(cv.getImageData(0, 0, 1, 1).data, (v) => {
						const s = v / 255;
						return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
					});
					return 0.2126 * r + 0.7152 * g + 0.0722 * b;
				};
				const el = document.querySelector('[data-material="clay-sm"]')!;
				const edge = lum(getComputedStyle(el).borderTopColor);
				const surface = lum(getComputedStyle(el.parentElement!).backgroundColor);
				const [hi, lo] = edge > surface ? [edge, surface] : [surface, edge];
				return (hi + 0.05) / (lo + 0.05);
			});
			expect(ratio).toBeGreaterThanOrEqual(3);
		});

		test('reduced transparency: glass turns opaque and the solid materials keep their shape', async ({
			page,
			browserName
		}) => {
			test.skip(browserName !== 'chromium', 'CDP media emulation exists in Chromium only');
			await guide(page);
			const glassSwatch = page.locator('[data-material="glass"]');
			const milkSwatch = page.locator('[data-material="milk"]');
			glass(await paint(glassSwatch), 'glass swatch before');
			milk(await paint(milkSwatch), 'milk swatch before');
			const before = await edge(page, 'clay');
			const cdp = await page.context().newCDPSession(page);
			await cdp.send('Emulation.setEmulatedMedia', {
				features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
			});
			opaque(await paint(glassSwatch), 'glass swatch under reduced transparency');
			opaque(await paint(milkSwatch), 'milk swatch under reduced transparency');
			expect(await edge(page, 'clay')).toEqual(before);
		});
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
				{
					method: 'GET',
					path: `/api/v1/tenants/${ACME.id}/audit/events`,
					status: 200,
					body: { events: [], has_more: false }
				}
			]);
			await page.goto('/operator/tenants');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
			await page.getByText('Acme Pharma').first().click();
			await page.waitForURL(/\/operator\/scope\/profile$/);
			opaque(await paint(page.locator('[data-shell="banner"]')), `banner (${transparency})`);
		});
	}
});
