import { expect, test } from '@playwright/test';
import { listMockCalls, registerMock, registerMocks, resetMock } from './helpers/mock';
import { mintScopeCookie } from './helpers/scope-cookie';
import { fakeTenantDto } from './helpers/fake-jwt';
import { signInAsTier } from './helpers/sign-in';

// Real Go routes (a redirect fixture must still target a route Go has).
const THING_ID = '00000000-0000-4000-8000-0000000000c1';
const THING = `/api/v1/users/${THING_ID}`;
const THING_2 = '/api/v1/users/00000000-0000-4000-8000-0000000000c2';
const OTHER_TENANT = '00000000-0000-4000-8000-0000000000c3';

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
			path: THING,
			status: 302,
			headers: { location: `http://localhost:9999${THING_2}` }
		});

		const resp = await page.request.get(THING, { maxRedirects: 0 });

		expect(resp.status()).toBe(302);
		expect(resp.headers()['location']).toBe(THING_2);
	});

	test('a redirect to a foreign host is not followed or relayed (502 upstream_redirect)', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin' });
		await registerMock({
			method: 'GET',
			path: THING,
			status: 302,
			headers: { location: 'http://evil.example/steal' }
		});

		const resp = await page.request.get(THING, { maxRedirects: 0 });

		expect(resp.status()).toBe(502);
		expect(resp.headers()['location']).toBeUndefined();
		expect(await resp.json()).toMatchObject({ error: 'upstream_redirect' });
	});
});

test.describe('proxy redirects on writes', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const status of [307, 308, 302]) {
		test(`a ${status} answer to a POST is never relayed (502 upstream_redirect) and not replayed`, async ({
			page
		}) => {
			await signInAsTier(page, { tier: 'tenant-admin' });
			await registerMock({
				method: 'POST',
				path: '/api/v1/roles',
				status,
				headers: { location: 'http://localhost:9999/api/v1/users' }
			});
			await registerMock({
				method: 'POST',
				path: '/api/v1/users',
				status: 201,
				body: { person_id: THING_ID, membership_id: THING_ID, person_existed: false }
			});
			const csrf = (await page.context().cookies()).find((c) => c.name === 'lk_csrf')?.value ?? '';

			const resp = await page.request.post('/api/v1/roles', {
				data: {},
				headers: { 'x-csrf-token': csrf },
				maxRedirects: 0
			});

			expect(resp.status()).toBe(502);
			expect(resp.headers()['location']).toBeUndefined();
			expect(await resp.json()).toMatchObject({ error: 'upstream_redirect' });
			const posts = (await listMockCalls()).filter((c) => c.method === 'POST');
			expect(posts.map((c) => c.path).filter((p) => p.startsWith('/api/v1/'))).not.toContain(
				'/api/v1/users'
			);
		});
	}
});

test.describe('server-side Go calls never follow redirects', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the scope layout tenant GET answered 302 shows an error and nothing else is fetched', async ({
		page,
		context
	}) => {
		const tenant = fakeTenantDto({
			id: '00000000-0000-4000-8000-0000000000a1',
			slug: 'acme-pharma',
			display_name: 'Acme Pharma'
		});
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view'],
			is_super_user: true
		});
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/tenants/${tenant.id}`,
				status: 302,
				headers: { location: `http://localhost:9999/api/v1/tenants/${OTHER_TENANT}` }
			},
			{ method: 'GET', path: `/api/v1/tenants/${OTHER_TENANT}`, status: 200, body: tenant }
		]);
		await context.addCookies([
			{
				name: 'lk_op_tenant',
				value: mintScopeCookie(
					{ id: tenant.id, slug: tenant.slug, display_name: tenant.display_name },
					600
				),
				url: 'http://localhost:4173'
			}
		]);

		await page.goto('/operator/scope/profile');

		await expect(page.getByText('The route loader threw')).toBeVisible();
		const calls = await listMockCalls();
		expect(calls.map((c) => c.path)).not.toContain(`/api/v1/tenants/${OTHER_TENANT}`);
		const tenantCalls = calls.filter((c) => c.path === `/api/v1/tenants/${tenant.id}`);
		expect(tenantCalls).toHaveLength(1);
		expect(tenantCalls[0]['x-tenant-id']).toBe(tenant.id);
	});
});
