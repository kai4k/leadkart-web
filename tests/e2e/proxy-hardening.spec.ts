import { expect, test } from '@playwright/test';
import { registerMock, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * BFF proxy hardening: upstream redirects are never followed and the
 * internal Go host never reaches the browser.
 */
test.describe('proxy redirects', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('same-origin Go redirect is relayed as a relative /api/v1 Location', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'GET',
			path: '/api/v1/things/1',
			status: 302,
			headers: { location: 'http://localhost:9999/api/v1/things/2' }
		});

		const resp = await page.request.get('/api/v1/things/1', { maxRedirects: 0 });

		expect(resp.status()).toBe(302);
		expect(resp.headers()['location']).toBe('/api/v1/things/2');
	});

	test('a redirect to a foreign host is not followed or relayed (502 upstream_redirect)', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'GET',
			path: '/api/v1/things/1',
			status: 302,
			headers: { location: 'http://evil.example/steal' }
		});

		const resp = await page.request.get('/api/v1/things/1', { maxRedirects: 0 });

		expect(resp.status()).toBe(502);
		expect(resp.headers()['location']).toBeUndefined();
		expect(await resp.json()).toMatchObject({ error: 'upstream_redirect' });
	});
});
