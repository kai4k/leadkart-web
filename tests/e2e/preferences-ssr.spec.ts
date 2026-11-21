import { expect, test } from './helpers/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * Display preferences live in the `lk_ui` cookie and are written onto <html> by the server, so the
 * first paint is already themed and no inline script is needed.
 */

const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

const SEMIBOX_DARK = b64url(
	JSON.stringify({
		v: 1,
		layout: 'semibox',
		navType: 'default',
		contentWidth: 'default',
		sidebar: 'large',
		mode: 'dark',
		colors: 'leadkart',
		sidebarColors: 'light',
		darkPalette: 'default'
	})
);

function htmlTag(body: string): string {
	return /<html[^>]*>/.exec(body)?.[0] ?? '';
}

test.describe('preferences at SSR', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the cookie is rendered onto <html> in the raw response', async ({ page }) => {
		await page
			.context()
			.addCookies([{ name: 'lk_ui', value: SEMIBOX_DARK, url: 'http://localhost:4173' }]);
		const res = await page.request.get('/signin');
		const tag = htmlTag(await res.text());
		expect(tag).toContain('data-layout="semibox"');
		expect(tag).toContain('data-mode="dark"');
		// a cookie written before the Transparency axis existed decodes to the default level
		expect(tag).toContain('data-transparency="glass"');
	});

	test('transparency "off" in the cookie is rendered onto <html>', async ({ page }) => {
		const off = b64url(
			JSON.stringify({ v: 1, layout: 'vertical', mode: 'light', transparency: 'off' })
		);
		await page.context().addCookies([{ name: 'lk_ui', value: off, url: 'http://localhost:4173' }]);
		const tag = htmlTag(await (await page.request.get('/signin')).text());
		expect(tag).toContain('data-transparency="off"');
		expect(
			(await (await page.request.get('/signin')).text()).match(/data-transparency=/g)
		).toHaveLength(1);
	});

	test('a hostile transparency value renders glass and injects no markup', async ({ page }) => {
		const hostile = b64url(JSON.stringify({ v: 1, transparency: '"><script>alert(2)</script>' }));
		await page
			.context()
			.addCookies([{ name: 'lk_ui', value: hostile, url: 'http://localhost:4173' }]);
		const body = await (await page.request.get('/signin')).text();
		expect(htmlTag(body)).toContain('data-transparency="glass"');
		expect(body).not.toContain('alert(2)');
	});

	test('a hostile cookie renders the defaults and injects no markup', async ({ page }) => {
		await page.context().addCookies([
			{
				name: 'lk_ui',
				value: encodeURIComponent('"><script>alert(1)</script>'),
				url: 'http://localhost:4173'
			}
		]);
		const body = await (await page.request.get('/signin')).text();
		const tag = htmlTag(body);
		expect(tag).toContain('data-layout="vertical"');
		expect(tag).toContain('data-mode="light"');
		expect(body).not.toContain('alert(1)');
	});

	test('the page needs no inline script: CSP has no unsafe-inline for scripts', async ({
		page
	}) => {
		const res = await page.request.get('/signin');
		const csp = res.headers()['content-security-policy'] ?? '';
		const scriptSrc = /script-src[^;]*/.exec(csp)?.[0] ?? '';
		expect(scriptSrc).not.toContain("'unsafe-inline'");
		const body = await res.text();
		for (const tag of body.match(/<script\b[^>]*>/g) ?? []) {
			expect(tag, `script tag without a nonce: ${tag}`).toMatch(/nonce=|src=/);
		}
	});

	test('picking Fluid in the customiser is rendered by the server on the next request', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
		await page.getByRole('button', { name: 'Open theme settings' }).click();
		await page
			.getByRole('radiogroup', { name: 'Content width' })
			.getByRole('radio', { name: 'Fluid' })
			.click();
		const body = await (await page.request.get('/dashboard')).text();
		expect(htmlTag(body)).toContain('data-content-width="fluid"');
	});
});

/**
 * GD15 / plan G9 step 0: Safari 27.3's Adaptive Dark Mode may re-colour a light page that has not opted out, which would
 * re-colour the gated light theme. The light and black-white modes declare `color-scheme: only light` (Chrome serializes it `light only`); auto keeps
 * `light dark` and dark keeps `dark`. The `light-dark()` lowering is unaffected (the build still emits one value
 * per mode): the page paints the same colours in every mode, which tokens-parity asserts.
 */
test.describe('color-scheme opt-out', () => {
	test.beforeEach(async () => {
		await resetMock();
	});
	for (const [mode, expected] of [
		['light', 'light only'],
		['black-white', 'light only'],
		['auto', 'light dark'],
		['dark', 'dark']
	] as const) {
		test(`mode=${mode} computes color-scheme "${expected}"`, async ({ page }) => {
			const cookie = b64url(JSON.stringify({ v: 1, layout: 'vertical', mode }));
			await page
				.context()
				.addCookies([{ name: 'lk_ui', value: cookie, url: 'http://localhost:4173' }]);
			await page.goto('/signin');
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
			const scheme = await page.evaluate(
				() => getComputedStyle(document.documentElement).colorScheme
			);
			expect(scheme).toBe(expected);
		});
	}
});
