import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMocks, resetMock } from './helpers/mock';
import { currentFingerprint } from './helpers/scope-fingerprint';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';
import { mintScopeCookie } from './helpers/scope-cookie';

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

const RELOAD_TOAST = /so this page was reloaded/i;
const createUserPosts = async () =>
	(await listMockCalls()).filter((c) => c.method === 'POST' && c.path === '/api/v1/users');

/** Tab 1 acts inside Acme with the Add member drawer open and completely filled in. */
async function openFilledDrawerInAcme(page: Page): Promise<void> {
	await registerMocks([
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
	]);
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
	await dialog.getByLabel(/first name/i).fill('Typed');
	await dialog.getByLabel(/last name/i).fill('Acme');
	await dialog.getByLabel(/initial password/i).fill('Correct-Horse-9-Battery');
	await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'));
}

const documentIsNew = (page: Page) =>
	page.evaluate(() => (window as unknown as { marker?: string }).marker === undefined);

async function exitContextInSecondTab(context: BrowserContext): Promise<void> {
	const second = await context.newPage();
	await second.goto('/operator/scope/profile');
	// The Exit button is server-rendered; its click handler exists only once the page is hydrated.
	await expect(second.locator('html[data-hydrated="true"]')).toBeAttached();
	await second.getByRole('button', { name: /exit context/i }).click();
	await second.waitForURL(/\/operator\/tenants$/);
}

test('after the broadcast: the stale tab is already reset, the filled drawer is gone, nothing was written, and it says why', async ({
	page,
	context
}) => {
	await openFilledDrawerInAcme(page);
	await exitContextInSecondTab(context);

	// The announcement resets tab 1 before anyone can press Submit: it lands where the new context
	// sends it, the drawer and what was typed in it are gone, and the user is told after the load.
	await page.waitForURL(/\/operator\/tenants$/);
	await expect.poll(() => documentIsNew(page)).toBe(true);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Create user' })).toHaveCount(0);
	await expect(page.getByText('Acme Pharma').first()).toBeVisible();
	await expect(page.getByText(RELOAD_TOAST)).toBeVisible();
	expect(await createUserPosts()).toHaveLength(0);
});

test('before the broadcast is handled: Submit in the stale tab is refused by the proxy, nothing is written to either tenant, the page then resets', async ({
	page,
	context
}) => {
	// This tab never hears the announcement (the race where Submit wins).
	await page.addInitScript(() => {
		(window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class {
			postMessage() {}
			addEventListener() {}
			removeEventListener() {}
			close() {}
		};
	});
	await openFilledDrawerInAcme(page);
	await exitContextInSecondTab(context);
	await page.bringToFront();
	await expect(page.getByRole('dialog')).toBeVisible();

	await page.getByRole('button', { name: 'Create user' }).click();

	await page.waitForURL(/\/operator\/tenants$/);
	await expect.poll(() => documentIsNew(page)).toBe(true);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByText(RELOAD_TOAST)).toBeVisible();
	expect(await createUserPosts()).toHaveLength(0);
});

test('the scope cookie expires under a filled drawer: a full navigation to /operator/tenants, nothing written to the home tenant', async ({
	page,
	context
}) => {
	await openFilledDrawerInAcme(page);
	// The 8-hour scope ran out while the drawer stayed open.
	const scope = (await context.cookies()).find((c) => c.name === 'lk_op_tenant');
	expect(scope).toBeDefined();
	await context.addCookies([
		{
			...scope!,
			value: mintScopeCookie({ id: ACME.id, slug: ACME.slug, display_name: 'Acme Pharma' }, -60)
		}
	]);

	await page.getByRole('button', { name: 'Create user' }).click();

	await page.waitForURL(/\/operator\/tenants$/);
	// A full navigation, not an in-place follow: the drawer cannot stay live in the home context.
	await expect.poll(() => documentIsNew(page)).toBe(true);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByText(/operator scope expired/i)).toBeVisible();
	expect(await createUserPosts()).toHaveLength(0);
});

test('a layout re-run that brings a different context hard-resets the tab, with the reason shown after the load', async ({
	page,
	context
}) => {
	await registerMocks([
		{ method: 'GET', path: '/api/v1/platform/persons', status: 200, body: { persons: [] } }
	]);
	await page.goto('/operator/tenants');
	await expect(page.getByText('Acme Pharma').first()).toBeVisible();
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
	await page.evaluate(() => ((window as unknown as { marker: string }).marker = 'still here'));

	// A change of the scope cookie that nothing broadcasts (the layout clearing it, a sign-in
	// elsewhere): the cookie now names Acme although this tab shows no context.
	const access = (await context.cookies()).find((c) => c.name === 'lk_access');
	expect(access).toBeDefined();
	await context.addCookies([
		{
			...access!,
			name: 'lk_op_tenant',
			value: mintScopeCookie({ id: ACME.id, slug: ACME.slug, display_name: 'Acme Pharma' }, 3600)
		}
	]);

	// The next layout run (any navigation) commits a different fingerprint under mounted pages.
	await page.getByRole('link', { name: 'People' }).first().click();

	await expect.poll(() => documentIsNew(page)).toBe(true);
	await expect(page.getByText(RELOAD_TOAST)).toBeVisible();
});
