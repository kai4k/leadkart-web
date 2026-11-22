import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMocks, registerOutOfContract, resetMock } from './helpers/mock';
import {
	DEFAULT_PASSWORD_POLICY,
	fakeTenantDto,
	TEST_TENANT_ID,
	TEST_TENANT_SLUG
} from './helpers/fake-jwt';

/**
 * A company that never saved a security policy, as the FIXED Go API returns it (leadkart-go 6ebcddf):
 * the default policy (8 characters, four classes, 5 attempts, 15 minutes) on every read. The web's
 * schema is strict; nothing here is tolerated or defaulted client-side.
 *
 *   - the operator tenant list renders it next to an ordinary company
 *   - the scoped profile renders it
 *   - /settings/tenant/security shows the default and SAVES it (the PATCH body is in-contract)
 *   - ONE tenant in a list that breaks the contract: a typed contract-error state, never a blank list
 */

const FRESH = fakeTenantDto({
	id: '00000000-0000-4000-8000-0000000000c1',
	slug: 'fresh-pharma',
	display_name: 'Fresh Pharma',
	legal_name: 'Fresh Pharma Pvt Ltd',
	password_policy: DEFAULT_PASSWORD_POLICY
});
const SAVED = fakeTenantDto({
	id: '00000000-0000-4000-8000-0000000000c2',
	slug: 'saved-meds',
	display_name: 'Saved Meds',
	legal_name: 'Saved Meds Ltd'
});

async function operator(page: Page) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.tenants.manage'],
		is_super_user: true,
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
}

test.describe('A company that never saved a security policy', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the operator list and the scoped profile render it', async ({ page }) => {
		await operator(page);
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/platform/tenants',
				status: 200,
				body: { tenants: [FRESH, SAVED] }
			},
			{ method: 'GET', path: `/api/v1/tenants/${FRESH.id}`, status: 200, body: FRESH },
			{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [FRESH] } }
		]);
		await page.goto('/operator/tenants');
		await expect(page.getByText('Fresh Pharma').first()).toBeVisible();
		await expect(page.getByText('Saved Meds').first()).toBeVisible();

		await page.getByText('Fresh Pharma').first().click();
		await page.waitForURL(/\/operator\/scope\/profile$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Fresh Pharma' })).toBeVisible();
	});

	test('the security form shows the default and saves it in-contract', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'identity.tenants.update_settings']
		});
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/tenants/${TEST_TENANT_ID}`,
				status: 200,
				body: { ...FRESH, id: TEST_TENANT_ID }
			},
			{ method: 'PATCH', path: `/api/v1/tenants/${TEST_TENANT_ID}/settings`, status: 204 }
		]);
		await page.goto('/settings/tenant/security');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();

		await expect(page.getByLabel('Minimum length')).toHaveValue('8');
		for (const name of [/uppercase/i, /lowercase/i, /digit/i, /symbol/i]) {
			await expect(page.getByRole('switch', { name })).toBeChecked();
		}

		await page.getByRole('button', { name: /save/i }).first().click();
		await expect(
			page.getByRole('alert').filter({ hasText: /failed|error|not accepted/i })
		).toHaveCount(0);
		await expect
			.poll(async () => (await listMockCalls()).some((c) => c.method === 'PATCH'))
			.toBe(true);

		const patch = (await listMockCalls()).find(
			(c) => c.method === 'PATCH' && c.path === `/api/v1/tenants/${TEST_TENANT_ID}/settings`
		);
		expect(JSON.parse(patch!.body)).toEqual({ password_policy: DEFAULT_PASSWORD_POLICY });
	});
});

test.describe('One tenant in the list breaks the contract', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('the operator sees the contract-error state, not a blank list and not a crash', async ({
		page
	}) => {
		await operator(page);
		// What a never-saved company looked like BEFORE the Go fix: zeros the contract forbids.
		const broken = {
			...FRESH,
			password_policy: { ...DEFAULT_PASSWORD_POLICY, min_length: 0, max_failed_attempts: 0 }
		};
		await registerOutOfContract({
			method: 'GET',
			path: '/api/v1/platform/tenants',
			status: 200,
			body: { tenants: [broken, SAVED] }
		});
		await page.goto('/operator/tenants');
		const main = page.locator('#main-content');
		await expect(
			main.getByText(/the server sent data this page does not understand/i)
		).toBeVisible();
		await expect(main.getByRole('heading', { name: 'Tenants', exact: true })).toBeVisible();
		// nothing of the list is shown as if it were whole
		await expect(page.getByText('Saved Meds')).toHaveCount(0);
	});
});
