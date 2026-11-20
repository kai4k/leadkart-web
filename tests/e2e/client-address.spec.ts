import { isIP } from 'node:net';
import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMock, resetMock } from './helpers/mock';

/**
 * The built server proves the request-context path of the client address: every call the BFF makes
 * to Go carries exactly ONE valid address in X-Forwarded-For (the unit tests prove the pieces with
 * mocked `getRequestEvent`; only the real adapter-node server proves `getClientAddress()` is the one
 * of the request being served, on the four ways the BFF calls Go).
 */
test.beforeEach(async () => {
	await resetMock();
});

/** Every recorded call to `path` carries one valid IP (never a list, never empty, never the browser's value). */
async function expectOneAddress(match: (c: { method: string; path: string }) => boolean) {
	const calls = (await listMockCalls()).filter(match);
	expect(calls.length, 'the call reached the mock').toBeGreaterThan(0);
	for (const c of calls) {
		const value = c['x-forwarded-for'];
		expect(value, `${c.method} ${c.path}`).not.toBeNull();
		expect(value!.includes(','), `${c.path}: one address, not a list (${value})`).toBe(false);
		expect(isIP(value!), `${c.path}: a valid IP (${value})`).not.toBe(0);
		expect(value).not.toBe('6.6.6.6');
	}
}

test('the sign-in action tells Go the caller address', async ({ page }) => {
	await signInAsTier(page, { tier: 'tenant-user' });
	await expectOneAddress((c) => c.method === 'POST' && c.path === '/api/v1/auth/login');
});

test('a server load tells Go the caller address', async ({ page }) => {
	await signInAsTier(page, { tier: 'tenant-user' });
	await page.goto('/dashboard');
	await expectOneAddress((c) => c.method === 'GET' && c.path === '/api/v1/auth/me/capabilities');
});

test('a form action tells Go the caller address', async ({ page }) => {
	await signInAsTier(page, { tier: 'tenant-user' });
	await registerMock({ method: 'POST', path: '/api/v1/auth/change-password', status: 204 });
	await page.goto('/settings/account/security');
	await page.getByLabel(/current password/i).fill('OldP@ssw0rd!');
	await page
		.getByLabel(/new password/i)
		.first()
		.fill('N3wP@ssw0rd!');
	await page.getByLabel(/confirm/i).fill('N3wP@ssw0rd!');
	await page.getByRole('button', { name: /change password|update password/i }).click();
	await expect
		.poll(async () =>
			(await listMockCalls()).some((c) => c.path === '/api/v1/auth/change-password')
		)
		.toBe(true);
	await expectOneAddress((c) => c.method === 'POST' && c.path === '/api/v1/auth/change-password');
});

test('a proxied call tells Go the caller address, and a browser-supplied X-Forwarded-For is not it', async ({
	page
}) => {
	await signInAsTier(page, { tier: 'tenant-user' });
	await page.goto('/dashboard');
	const status = await page.evaluate(async () => {
		const r = await window.specFetch('/api/v1/auth/sessions', {
			headers: { 'x-forwarded-for': '6.6.6.6' }
		});
		return r.status;
	});
	expect(status).toBeLessThan(500);
	await expectOneAddress((c) => c.method === 'GET' && c.path === '/api/v1/auth/sessions');
});
