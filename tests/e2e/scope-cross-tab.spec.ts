import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMocks, resetMock } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';

/**
 * Two pages of ONE browser context share the scope cookie. A page that shows one tenant context
 * must never write into (or read from) another because a sibling tab changed the cookie.
 */
const ACME = fakeTenantDto({
	id: '00000000-0000-4000-8000-0000000000a1',
	slug: 'acme-pharma',
	display_name: 'Acme Pharma',
	legal_name: 'Acme Pharma Pvt Ltd'
});

test.beforeEach(async ({ page }) => {
	await resetMock();
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.tenants.manage', 'platform.users.view'],
		is_super_user: true,
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
	await registerMocks([
		{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}`, status: 200, body: ACME },
		{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'POST', path: '/api/v1/users', status: 201, body: {} }
	]);
});

const fingerprintOf = (page: Page) =>
	page.locator('[data-scope-context]').first().getAttribute('data-scope-context');

test('a tab that shows the own tenant cannot write once another tab entered a tenant', async ({
	page,
	context
}) => {
	await page.goto('/operator/tenants');
	await expect(page.getByText('Acme Pharma').first()).toBeVisible();
	expect(await fingerprintOf(page)).toBe('none');

	// Tab 2 enters Acme: the shared cookie now names it.
	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);

	// Tab 1 still holds its page: the write it sends is refused before Go, with the typed code.
	const csrf = (await context.cookies()).find((c) => c.name === 'lk_csrf')?.value ?? '';
	const out = await page.evaluate(
		async ({ csrf, fp }) => {
			const r = await fetch('/api/v1/users', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-csrf-token': csrf,
					'x-lk-scope-context': fp
				},
				body: '{}'
			});
			return { status: r.status, body: (await r.json()) as { error: string } };
		},
		{ csrf, fp: 'none' }
	);
	expect(out).toMatchObject({ status: 409, body: { error: 'scope_changed' } });
	expect(
		(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/users')
	).toHaveLength(0);
});

test('the other tab is told at once and catches up without a click', async ({ page, context }) => {
	await page.goto('/operator/tenants');
	expect(await fingerprintOf(page)).toBe('none');
	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);

	await expect.poll(() => fingerprintOf(page)).not.toBe('none');
	// And now the tab's own (real) calls run in the context it shows.
	expect(await fingerprintOf(page)).toBe(await fingerprintOf(second));
});
