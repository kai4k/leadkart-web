import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMocks, resetMock } from './helpers/mock';
import { currentFingerprint } from './helpers/scope-fingerprint';
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
		{
			method: 'POST',
			path: '/api/v1/users',
			status: 201,
			body: {
				person_id: '00000000-0000-4000-8000-000000000c01',
				membership_id: '00000000-0000-4000-8000-000000000c02',
				person_existed: false
			}
		}
	]);
});

test('a tab that shows the own tenant cannot write once another tab entered a tenant', async ({
	page,
	context
}) => {
	await page.goto('/operator/tenants');
	await expect(page.getByText('Acme Pharma').first()).toBeVisible();
	// What this tab shows: the cookie's context now, before another tab changes it.
	const shownByTab1 = await currentFingerprint(context);

	// Tab 2 enters Acme: the shared cookie now names it.
	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);

	// Tab 1 still holds its page: the write it sends is refused before Go, with the typed code.
	const csrf = (await context.cookies()).find((c) => c.name === 'lk_csrf')?.value ?? '';
	const out = await page.evaluate(
		async ({ csrf, fp }) => {
			const r = await window.specFetch('/api/v1/users', {
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
		{ csrf, fp: shownByTab1 }
	);
	expect(out).toMatchObject({ status: 409, body: { error: 'scope_changed' } });
	expect(
		(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/users')
	).toHaveLength(0);
});

test('the other tab is told at once and catches up without a click', async ({ page, context }) => {
	// The fingerprint each of tab 1's own tenant-list calls carries (the page's committed data).
	const sent: string[] = [];
	page.on('request', (r) => {
		if (r.url().includes('/api/v1/platform/tenants')) {
			sent.push(r.headers()['x-lk-scope-context'] ?? '');
		}
	});
	await page.goto('/operator/tenants');
	await expect.poll(() => sent.length).toBeGreaterThan(0);
	const before = await currentFingerprint(context);
	expect(sent.at(-1)).toBe(before);

	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);
	const after = await currentFingerprint(context);
	expect(after).not.toBe(before);

	// The broadcast re-runs tab 1's layout and resets its queries: its next own call carries the new
	// context's fingerprint, with no click and no reload.
	await expect.poll(() => sent.at(-1)).toBe(after);
});
