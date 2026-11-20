import { readFileSync } from 'node:fs';
import { expect, test } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * The server renders each request in that request's language: <html lang> matches, no English
 * frame before Hindi, and interleaved requests never borrow each other's language (svelte-i18n's
 * locale is one global store, set by the root layout right before a synchronous render).
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

	test('the two titles differ, so the assertions below prove something', () => {
		expect(HI).not.toBe(EN);
	});

	test('Accept-Language: hi renders a Hindi page with <html lang="hi">', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const res = await page.request.get(PAGE, { headers: { 'accept-language': 'hi' } });
		const body = await res.text();
		expect(htmlTag(body)).toContain('lang="hi"');
		expect(h1Texts(body)).toContain(HI);
	});

	test('ten interleaved hi/en requests each get their own language', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const langs = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 'hi' : 'en'));
		const bodies = await Promise.all(
			langs.map(async (lang) =>
				(await page.request.get(PAGE, { headers: { 'accept-language': lang } })).text()
			)
		);
		for (const [i, body] of bodies.entries()) {
			const lang = langs[i];
			expect(htmlTag(body), `request ${i} (${lang}) <html lang>`).toContain(`lang="${lang}"`);
			const titles = h1Texts(body);
			const expected = lang === 'hi' ? HI : EN;
			const other = lang === 'hi' ? EN : HI;
			expect(titles, `request ${i} (${lang}) title`).toContain(expected);
			expect(titles, `request ${i} (${lang}) has no ${other} title`).not.toContain(other);
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

	test('a Hindi browser sees Hindi in the server HTML, with no script running', async ({
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
			await expect(noJs.locator('html')).toHaveAttribute('lang', 'hi');
			await expect(noJs.locator('main h1', { hasText: HI })).toHaveCount(1);
		} finally {
			await context.close();
		}
	});

	test('hydration keeps the server language: no English frame, no flip', async ({
		browser,
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		const state = await page.context().storageState();
		const context = await browser.newContext({ storageState: state, locale: 'hi-IN' });
		try {
			const hydrating = await context.newPage();
			await hydrating.goto(PAGE, { waitUntil: 'domcontentloaded' });
			await expect(hydrating.locator('main h1', { hasText: HI })).toHaveCount(1);
			await hydrating.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
			await expect(hydrating.locator('main h1', { hasText: HI })).toHaveCount(1);
			await expect(hydrating.locator('html')).toHaveAttribute('lang', 'hi');
		} finally {
			await context.close();
		}
	});
});
