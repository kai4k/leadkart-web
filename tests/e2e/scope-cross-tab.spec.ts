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
		permissions: [
			'platform.tenants.view',
			'platform.tenants.manage',
			'platform.users.view',
			'platform.users.manage'
		],
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
	await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'));

	// Tab 2 enters Acme: the shared cookie now names it.
	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);

	// Tab 1 is told and reloads into the new context; a call that still carries what the page showed
	// before (a request already in flight, a script of the old page) is refused before Go, with the
	// typed code.
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { marker?: string }).marker))
		.toBeUndefined();
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

test('the other tab is told at once and reloads: nothing is re-bound in place', async ({
	page,
	context
}) => {
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

	// Reloads show as a fresh navigation of the document: a marker on window disappears.
	await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'));

	const second = await context.newPage();
	await second.goto('/operator/tenants');
	await second.getByText('Acme Pharma').first().click();
	await second.waitForURL(/\/operator\/scope\/profile$/);
	const after = await currentFingerprint(context);
	expect(after).not.toBe(before);

	// The broadcast hard-resets tab 1 (no click): the document is new, and it follows the new context
	// (the tenants list stays available in a context, so it stays on the same URL).
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { marker?: string }).marker))
		.toBeUndefined();
});

test('a tab with a filled-in dialog is reset when another tab changes the context: the dialog is gone and nothing is written', async ({
	page,
	context
}) => {
	await registerMocks([
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
	]);
	// Tab 1 acts inside Acme and has the Add member dialog open and filled in.
	await page.goto('/operator/tenants');
	await page.getByText('Acme Pharma').first().click();
	await page.waitForURL(/\/operator\/scope\/profile$/);
	await page.goto('/operator/scope/members');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
	await page
		.locator('#main-content')
		.getByRole('button', { name: /add member/i })
		.first()
		.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel(/email/i).first().fill('typed-for-acme@example.com');

	// Tab 2 leaves the context: the cookie now names none.
	const second = await context.newPage();
	await second.goto('/operator/scope/profile');
	await second.getByRole('button', { name: /exit context/i }).click();
	await second.waitForURL(/\/operator\/tenants$/);

	// Tab 1 is reset by the announcement: it lands where the new context sends it, the dialog and
	// what was typed in it are gone, and no write reached Go for either tenant.
	await page.waitForURL(/\/operator\/tenants$/);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByText('Acme Pharma').first()).toBeVisible();
	expect(
		(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/users')
	).toHaveLength(0);
});
