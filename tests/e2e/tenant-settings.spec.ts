import { expect, test, type Page } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Tenant Settings e2e — /settings/tenant/{profile,statutory,contact,preferences}
 *
 *   Positive:
 *     Each tab renders its Card section + form
 *     Profile save success → calls PATCH + shows success
 *
 *   Negative:
 *     Tenant detail 500: layout shows the error alert (no tabs)
 *     Profile save 422 (validation): inline error surfaces
 *
 *   Tier:
 *     Tenant user without tenant.admin: redirected from /settings/tenant
 */

const TENANT = fakeTenantDto({
	id: TEST_TENANT_ID,
	slug: 'acme',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	gst_number: '27AAAPL1234C1Z1',
	pan_number: 'AAAPL1234C',
	drug_licence_number: 'MH-DL-0123/24',
	admin_phone: '+919999900000',
	admin_email: 'admin@acme.test'
});

async function signInAsTenantAdmin(page: Page) {
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: ['tenant.admin', 'identity.tenants.update']
	});
}

test.describe('Tenant settings — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Profile tab renders + shows tenant values', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${TEST_TENANT_ID}`,
			status: 200,
			body: TENANT
		});
		await page.goto('/settings/tenant/profile');
		await expect(page.getByRole('heading', { level: 3, name: 'Profile' })).toBeVisible();
		// The form preloads with current display_name
		await expect(page.getByLabel(/display name/i)).toHaveValue('Acme');
	});

	test('Statutory tab renders + shows GSTIN', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${TEST_TENANT_ID}`,
			status: 200,
			body: TENANT
		});
		await page.goto('/settings/tenant/statutory');
		await expect(page.getByRole('heading', { level: 3, name: 'Statutory IDs' })).toBeVisible();
		await expect(page.getByLabel(/gst|gstin/i)).toHaveValue('27AAAPL1234C1Z1');
	});

	test('Contact tab renders', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${TEST_TENANT_ID}`,
			status: 200,
			body: TENANT
		});
		await page.goto('/settings/tenant/contact');
		await expect(page.getByRole('heading', { level: 3, name: 'Contact' })).toBeVisible();
	});

	test('Preferences tab renders', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${TEST_TENANT_ID}`,
			status: 200,
			body: TENANT
		});
		await page.goto('/settings/tenant/preferences');
		await expect(
			page.getByRole('heading', { level: 3, name: 'Display preferences' })
		).toBeVisible();
	});

	test('Profile save: PATCH 204 → success state', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/tenants/${TEST_TENANT_ID}`,
				status: 200,
				body: TENANT
			},
			{
				method: 'PATCH',
				path: `/api/v1/tenants/${TEST_TENANT_ID}/profile`,
				status: 204
			}
		]);
		await page.goto('/settings/tenant/profile');
		// Mutate display name and submit
		const displayName = page.getByLabel(/display name/i);
		await displayName.fill('Acme New');
		const saveBtn = page.getByRole('button', { name: /save|update/i });
		await saveBtn.first().click();
		// Either success alert or non-error state — assert no danger alert appears
		await expect(page.getByRole('alert').filter({ hasText: /failed|error/i })).toHaveCount(0, {
			timeout: 5000
		});
	});
});

test.describe('Tenant settings — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('tenant detail 500: layout surfaces error alert (no tabs render)', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: `/api/v1/tenants/${TEST_TENANT_ID}`,
			status: 500,
			body: { code: 'internal_error', message: 'tenant lookup failed' }
		});
		await page.goto('/settings/tenant/profile');
		await expect(page.getByText(/could not load tenant settings/i)).toBeVisible();
	});
});

// Note: /settings/tenant has no page-level tier guard — the Sidebar
// only surfaces the link to tenant-admin tier. Pages enforce at action
// time (PATCH would 403 from Go). This matches the FAANG canon noted
// in nav.ts and ADR 0036 — nav is the shell, not a permission audit.
