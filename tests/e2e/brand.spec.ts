import { expect, test, type Page } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The approved logo is wired in: the head links icons that exist, the manifest lists the three
 * installable icons, the browser chrome is Kart Blue, and the in-app mark follows the chosen primary.
 */

test.describe('brand wiring', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the page head links icons that are served, and the theme colour is Kart Blue', async ({
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
		expect(html).toMatch(/<meta name="theme-color" content="#2563EB"/);
		expect(html).toContain('name="twitter:card"');
	});

	// (auth) routes are client-rendered (ssr = false), so their HTML is the app.html shell with no <svelte:head>; any
	// server-rendered route carries the tags the root layout writes. A 404 is one that needs no session.
	test('server-rendered pages carry an absolute og:image, og:url and twitter:image on the request origin', async ({
		page
	}) => {
		const res = await page.request.get('/no-such-page-xyz');
		const html = await res.text();
		expect(html).toContain(
			'<meta property="og:image" content="http://localhost:4173/og-image-light.png"'
		);
		expect(html).toContain(
			'<meta name="twitter:image" content="http://localhost:4173/og-image-light.png"'
		);
		expect(html).toContain(
			'<meta property="og:url" content="http://localhost:4173/no-such-page-xyz"'
		);
		// and no relative duplicate is left in the shell
		expect(html.match(/property="og:image"/g)).toHaveLength(1);
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
		expect(manifest.theme_color).toBe('#2563EB');
		expect(manifest.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
		expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
		for (const icon of manifest.icons)
			expect((await page.request.get(icon.src)).status(), icon.src).toBe(200);
	});

	test('the in-app mark follows the primary colour chosen in the customizer', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
		const frameStroke = (p: Page) =>
			p
				.locator('header [data-brand-mark] svg path')
				.first()
				.evaluate((el) => getComputedStyle(el).stroke);
		const capsuleStroke = (p: Page) =>
			p
				.locator('header [data-brand-mark] svg path')
				.nth(1)
				.evaluate((el) => getComputedStyle(el).stroke);
		const before = await frameStroke(page);
		expect(before).not.toBe('none');
		// the capsule is a second tone, not the frame colour again, and it follows the palette too
		const capsuleBefore = await capsuleStroke(page);
		expect(capsuleBefore).not.toBe('none');
		expect(capsuleBefore).not.toBe(before);

		await page.getByRole('button', { name: 'Open theme settings' }).click();
		await page
			.getByRole('radiogroup', { name: 'Primary colour' })
			.getByRole('radio', { name: 'Teal' })
			.click();
		await expect(page.locator('html')).toHaveAttribute('data-colors', 'teal');
		const after = await frameStroke(page);
		expect(after).not.toBe(before);
		const capsuleAfter = await capsuleStroke(page);
		expect(capsuleAfter).not.toBe(after);
		expect(capsuleAfter).not.toBe(capsuleBefore);
	});
});
