import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks } from './helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * ActionForm on the tenant-settings forms (real BFF, mocked Go):
 *   - a refused save names the field with a catalogue sentence and focuses it, and the banner is the one alert
 *   - a saved form announces its confirmation in ONE status region and is clean again (no leave prompt)
 *   - unsaved input asks before the page is left
 *   - a caller without the permission sees the reason instead of the button
 */
const TENANT = fakeTenantDto({
	id: TEST_TENANT_ID,
	slug: 'acme',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme'
});
const GET_TENANT = {
	method: 'GET' as const,
	path: `/api/v1/tenants/${TEST_TENANT_ID}`,
	status: 200,
	body: TENANT
};

async function signInWith(page: Page, permissions: string[], effective?: string[]) {
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions,
		...(effective && { effective_permissions: effective as never })
	});
}

test.describe('ActionForm — tenant profile', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('an empty legal name: the catalogue sentence under the field, focus on it, no banner', async ({
		page
	}) => {
		await signInWith(page, ['tenant.admin', 'identity.tenants.update']);
		await registerMocks([GET_TENANT]);
		await page.goto('/settings/tenant/profile');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		const legal = page.getByLabel(/legal name/i);
		await legal.fill('');
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByText('Legal name is required.')).toBeVisible();
		await expect(legal).toBeFocused();
		await expect(legal).toHaveAttribute('aria-invalid', 'true');
		await expect(page.locator('[data-form-error]')).toHaveCount(0);
	});

	test('a saved form: one status line, and leaving afterwards is not questioned', async ({
		page
	}) => {
		await signInWith(page, ['tenant.admin', 'identity.tenants.update']);
		await registerMocks([
			GET_TENANT,
			{ method: 'PATCH', path: `/api/v1/tenants/${TEST_TENANT_ID}/profile`, status: 204 }
		]);
		await page.goto('/settings/tenant/profile');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page.getByLabel(/display name/i).fill('Acme New');
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByText('Profile saved.')).toHaveCount(1);
		await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toHaveCount(1);
		let asked = false;
		page.on('dialog', (d) => {
			asked = true;
			void d.dismiss();
		});
		await page.getByRole('link', { name: 'Statutory IDs' }).click();
		await expect(page).toHaveURL(/\/settings\/tenant\/statutory/);
		expect(asked).toBe(false);
	});

	test('unsaved input: leaving asks, declining stays', async ({ page }) => {
		await signInWith(page, ['tenant.admin', 'identity.tenants.update']);
		await registerMocks([GET_TENANT]);
		await page.goto('/settings/tenant/profile');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page.getByLabel(/display name/i).fill('Typed but not saved');
		let message = '';
		page.once('dialog', (d) => {
			message = d.message();
			void d.dismiss();
		});
		await page.getByRole('link', { name: 'Statutory IDs' }).click();
		await expect.poll(() => message).toContain('unsaved changes');
		await expect(page).toHaveURL(/\/settings\/tenant\/profile/);
	});

	test('without the permission: the reason instead of the button', async ({ page }) => {
		await signInWith(page, ['identity.tenants.view'], ['identity.tenants.view']);
		await registerMocks([GET_TENANT]);
		await page.goto('/settings/tenant/profile');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await expect(
			page.getByText("You don't have permission to change these settings.")
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
	});
});
