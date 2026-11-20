import { readFileSync } from 'node:fs';
import { expect, test } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * English only for now (owner decision 2026-11-21, plan L46): ENABLED_LOCALES is ['en'], so every
 * request renders English and <html lang="en"> whatever Accept-Language says, and the client never
 * loads hi. The per-request mechanism itself (negotiation, one tag per concurrent request) is
 * covered in unit tests with the enabled list overridden (tests/unit/i18n/negotiate.test.ts,
 * tests/unit/server/html-shell.test.ts): the server list is a build-time constant, so an e2e
 * cannot flip it.
 */

const dictionary = (lang: 'en' | 'hi') =>
	JSON.parse(readFileSync(`src/lib/i18n/locales/${lang}.json`, 'utf8')) as {
		auth: { mustChange: { title: string } };
	};
const EN = dictionary('en').auth.mustChange.title;
const HI = dictionary('hi').auth.mustChange.title;

const PAGE = '/must-change-password';
const htmlTag = (body: string) => /<html[^>]*>/.exec(body)?.[0] ?? '';
// Every <h1> inside <main>: the topbar and the page each render one until Task 14, and
// only the page's own is translated, so the check is "the translated title is among them".
const h1Texts = (body: string) =>
	[...body.slice(body.indexOf('id="main-content"')).matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(
		(m) =>
			(m[1] ?? '')
				.replaceAll(/<[^>]*>/g, '')
				.replaceAll('&amp;', '&')
				.trim()
	);

test.describe('per-request SSR locale', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Accept-Language: hi renders the English page with <html lang="en">', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const res = await page.request.get(PAGE, { headers: { 'accept-language': 'hi' } });
		const body = await res.text();
		expect(htmlTag(body)).toContain('lang="en"');
		expect(h1Texts(body)).toContain(EN);
		expect(h1Texts(body)).not.toContain(HI);
	});

	test('ten interleaved hi/en requests are all English, none borrows another', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const langs = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 'hi' : 'en'));
		const bodies = await Promise.all(
			langs.map(async (lang) =>
				(await page.request.get(PAGE, { headers: { 'accept-language': lang } })).text()
			)
		);
		for (const [i, body] of bodies.entries()) {
			const lang = langs[i];
			expect(htmlTag(body), `request ${i} (${lang}) <html lang>`).toContain('lang="en"');
			expect(h1Texts(body), `request ${i} (${lang}) title`).toContain(EN);
		}
	});

	test('a hostile Accept-Language renders English and injects nothing', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const res = await page.request.get(PAGE, {
			headers: { 'accept-language': '"><script>alert(1)</script>;q=1' }
		});
		const body = await res.text();
		expect(htmlTag(body)).toContain('lang="en"');
		expect(body).not.toContain('alert(1)');
	});

	test('a Hindi browser sees English in the server HTML, with no script running', async ({
		browser,
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const state = await page.context().storageState();
		const context = await browser.newContext({
			storageState: state,
			locale: 'hi-IN',
			javaScriptEnabled: false
		});
		try {
			const noJs = await context.newPage();
			await noJs.goto(PAGE, { waitUntil: 'domcontentloaded' });
			await expect(noJs.locator('html')).toHaveAttribute('lang', 'en');
			await expect(noJs.locator('main h1', { hasText: EN })).toHaveCount(1);
		} finally {
			await context.close();
		}
	});

	test('hydration keeps English for a Hindi browser: no flip', async ({ browser, page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const state = await page.context().storageState();
		const context = await browser.newContext({ storageState: state, locale: 'hi-IN' });
		try {
			const hydrating = await context.newPage();
			await hydrating.goto(PAGE, { waitUntil: 'domcontentloaded' });
			await expect(hydrating.locator('main h1', { hasText: EN })).toHaveCount(1);
			await hydrating.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
			await expect(hydrating.locator('main h1', { hasText: EN })).toHaveCount(1);
			await expect(hydrating.locator('html')).toHaveAttribute('lang', 'en');
		} finally {
			await context.close();
		}
	});
});
