import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { clientNavigate } from './helpers/navigation';
import { mintScopeCookie } from './helpers/scope-cookie';
import { fakeTenantDto, TEST_TENANT_SLUG } from './helpers/fake-jwt';
import { listMockCalls, registerMock, resetMock } from './helpers/mock';

/**
 * Server-side capability guards (requireCapability in +page.server.ts).
 *
 * A user WITHOUT the permission must:
 *   (a) land on /dashboard after a hard navigation,
 *   (b) never trigger the guarded page's data request (the server load
 *       redirects before the page renders or its queries fire),
 *   (c) get the same result on client-side navigation, where SvelteKit
 *       fetches __data.json and the server load answers with the redirect.
 *
 * Tenant route:   /settings/roles        (identity.roles.view → GET /api/v1/roles)
 * Operator route: /operator/persons      (platform.users.view → GET /api/v1/platform/persons)
 */

const ROUTES = [
	{ name: 'tenant /settings/roles', path: '/settings/roles', dataPath: '/api/v1/roles' },
	{
		name: 'operator /operator/persons',
		path: '/operator/persons',
		dataPath: '/api/v1/platform/persons'
	}
];

async function dataCalls(dataPath: string): Promise<number> {
	const calls = await listMockCalls();
	return calls.filter((c) => c.path === dataPath || c.path.startsWith(`${dataPath}?`)).length;
}

test.describe('Server-side capability guards', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	for (const route of ROUTES) {
		test(`${route.name}: hard navigation without the permission redirects, no data request`, async ({
			page
		}) => {
			await signInAsTier(page, { tier: 'tenant-user' });
			await page.goto(route.path);
			await page.waitForURL(/\/dashboard$/);
			expect(await dataCalls(route.dataPath)).toBe(0);
		});

		test(`${route.name}: client-side navigation without the permission redirects via __data.json, no data request`, async ({
			page
		}) => {
			await signInAsTier(page, { tier: 'tenant-user' });
			const dataResponse = page.waitForResponse(
				(r) => r.url().includes('__data.json') && r.url().includes(route.path)
			);
			await clientNavigate(page, route.path);
			await dataResponse;
			await page.waitForURL(/\/dashboard$/);
			expect(page.url()).not.toContain(route.path);
			expect(await dataCalls(route.dataPath)).toBe(0);
		});
	}
});

const OTHER_TENANT_ID = '00000000-0000-4000-8000-0000000000b2';

test.describe('Operator scope is platform-only at the BFF', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('a tenant-tier user POSTing /api/operator/scope gets 403 and no scope cookie', async ({
		page,
		context
	}) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.waitForLoadState('networkidle');
		const lookupsBefore = (await listMockCalls()).filter(
			(c) => c.path === '/api/v1/tenants'
		).length;
		const result = await page.evaluate(async (slug) => {
			const csrf = document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '';
			const resp = await fetch('/api/operator/scope', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf) },
				body: JSON.stringify({ slug })
			});
			return { status: resp.status, body: (await resp.json()) as { error?: string } };
		}, TEST_TENANT_SLUG);
		expect(result.status).toBe(403);
		expect(result.body.error).toBe('forbidden');
		expect((await context.cookies()).some((c) => c.name === 'lk_op_tenant')).toBe(false);
		// Refused before the tenant lookup ever reached Go.
		const lookupsAfter = (await listMockCalls()).filter((c) => c.path === '/api/v1/tenants').length;
		expect(lookupsAfter).toBe(lookupsBefore);
	});

	test('a tenant-tier user with a valid scope cookie visiting /operator/scope/profile lands on /dashboard', async ({
		page,
		context
	}) => {
		// A real (signed, unexpired) scope for a tenant Go would serve: only the
		// platform gate can keep this user out.
		const other = fakeTenantDto({ id: OTHER_TENANT_ID, slug: 'beta', display_name: 'Beta' });
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${OTHER_TENANT_ID}`,
			status: 200,
			body: other
		});
		await context.addCookies([
			{
				name: 'lk_op_tenant',
				value: mintScopeCookie({ id: OTHER_TENANT_ID, slug: 'beta', display_name: 'Beta' }, 600),
				url: 'http://localhost:4173'
			}
		]);
		const tenantLoads = async () =>
			(await listMockCalls()).filter((c) => c.path === `/api/v1/tenants/${OTHER_TENANT_ID}`).length;
		await page.waitForLoadState('networkidle');
		const before = await tenantLoads();
		await page.goto('/operator/scope/profile');
		await page.waitForURL(/\/dashboard$/);
		// The scope layout never loaded the scoped tenant for this user.
		expect(await tenantLoads()).toBe(before);
	});
});
