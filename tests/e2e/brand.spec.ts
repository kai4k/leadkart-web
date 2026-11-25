import { expect, test, type Page } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The approved logo is wired in: the head links icons that exist, the manifest lists the three
 * installable icons, the browser chrome is the Iris primary (one colour in the head and the manifest,
 * written by scripts/brand/generate-icons.mjs), and the in-app mark follows the chosen palette: the L
 * is the primary, the K the second piece.
 */

const HEX = /^#[0-9A-F]{6}$/;

test.describe('brand wiring', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the page head links icons that are served, and the theme colour is the Iris primary', async ({
		page
	}) => {
		const html = await (await page.request.get('/signin')).text();
		const hrefs = [
			...html.matchAll(/<link[^>]*rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)
		].map((m) => m[1]!);
		expect(hrefs.length).toBeGreaterThanOrEqual(4);
		for (const href of hrefs) {
			const res = await page.request.get(href);
			expect(res.status(), href).toBe(200);
		}
		expect(hrefs.some((h) => h.endsWith('.ico'))).toBe(true);
		expect(hrefs.some((h) => h.endsWith('.svg'))).toBe(true);
		expect(hrefs.some((h) => h.includes('apple-touch-icon'))).toBe(true);
		const theme = /<meta name="theme-color" content="([^"]+)"/.exec(html)?.[1];
		expect(theme).toMatch(HEX);
		const manifest = (await (await page.request.get('/manifest.webmanifest')).json()) as {
			theme_color: string;
		};
		expect(manifest.theme_color).toBe(theme);
		expect(html).toContain(`<meta name="msapplication-TileColor" content="${theme}"`);
		expect(html).toContain('name="twitter:card"');
	});

	// The tags live in src/app.html (PUBLIC_SITE_URL), so the client-rendered (auth) routes - the pages a shared link
	// lands on - carry them too, absolute, exactly once.
	test('the sign-in shell and server-rendered pages carry an absolute og:image and twitter:image and no og:url', async ({
		page
	}) => {
		for (const path of ['/signin', '/forgot-password', '/no-such-page-xyz']) {
			const html = await (await page.request.get(path)).text();
			expect(html, path).toContain(
				'<meta property="og:image" content="http://localhost:4173/og-image-light.png"'
			);
			expect(html, path).toContain(
				'<meta name="twitter:image" content="http://localhost:4173/og-image-light.png"'
			);
			expect(html, path).not.toContain('og:url'); // it would be the site root on every shared deep link
			expect(html, path).toContain('property="og:image:width"');
			expect(html.match(/property="og:image"/g), path).toHaveLength(1);
		}
		expect((await page.request.get('/og-image-light.png')).status()).toBe(200);
	});

	test('the manifest is valid JSON and lists the three icons, each served', async ({ page }) => {
		const res = await page.request.get('/manifest.webmanifest');
		expect(res.status()).toBe(200);
		const manifest = (await res.json()) as {
			theme_color: string;
			background_color: string;
			icons: Array<{ src: string; sizes: string; purpose?: string }>;
		};
		expect(manifest.theme_color).toMatch(HEX);
		expect(manifest.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
		expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
		for (const icon of manifest.icons)
			expect((await page.request.get(icon.src)).status(), icon.src).toBe(200);
	});

	test('the in-app mark follows the primary colour chosen in the customizer', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
		const lFill = (p: Page) =>
			p
				.locator('header [data-brand-mark] svg path')
				.first()
				.evaluate((el) => getComputedStyle(el).fill);
		const kFill = (p: Page) =>
			p
				.locator('header [data-brand-mark] svg path')
				.nth(1)
				.evaluate((el) => getComputedStyle(el).fill);
		const before = await lFill(page);
		expect(before).not.toBe('none');
		// the K is a second tone, not the L colour again, and it follows the palette too
		const capsuleBefore = await kFill(page);
		expect(capsuleBefore).not.toBe('none');
		expect(capsuleBefore).not.toBe(before);

		await page.getByRole('button', { name: 'Open theme settings' }).click();
		await page
			.getByRole('radiogroup', { name: 'Colour palette' })
			.getByRole('radio', { name: 'Ocean' })
			.click();
		await expect(page.locator('html')).toHaveAttribute('data-palette', 'ocean');
		const after = await lFill(page);
		expect(after).not.toBe(before);
		const capsuleAfter = await kFill(page);
		expect(capsuleAfter).not.toBe(after);
		expect(capsuleAfter).not.toBe(capsuleBefore);
	});
});
