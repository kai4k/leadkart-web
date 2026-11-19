import { expect, test } from '@playwright/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * Cmd+K omni-search palette (frontend wiring of /v1/search).
 *
 *   Visibility gate is exercised here. Palette interactions
 *   (open + typing + hit rendering) are pending follow-up — bits-ui
 *   Dialog renders inside a portal whose selector model is finicky
 *   under Playwright's default queries. To migrate: scope to the
 *   Dialog content element via role="dialog" + the search input
 *   selector inside it.
 */

test.describe('Cmd+K search palette — visibility gate', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('trigger visible for operator tier', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view', 'platform.users.view']
		});
		await page.goto('/dashboard');
		await expect(page.locator('button[aria-label="Search (Cmd+K)"]')).toBeVisible();
	});

	test('palette is available to a tenant user: Pages only, no directory search', async ({
		page
	}) => {
		await signInAsTier(page, {
			tier: 'tenant-user',
			permissions: ['crm.leads.read', 'identity.meta.request_permission_elevation']
		});
		await page.goto('/dashboard');
		await page.locator('button[aria-label="Search (Cmd+K)"]').click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByPlaceholder('Search pages…')).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Leads' })).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Tenants' })).toHaveCount(0);
		await dialog.getByRole('searchbox').fill('perm');
		await expect(dialog.getByRole('link', { name: 'Permission requests' })).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Leads' })).toHaveCount(0);
		await dialog.getByRole('link', { name: 'Permission requests' }).click();
		await expect(page).toHaveURL(/\/permission-requests$/);
	});
});

test.fixme('PENDING: Cmd+K palette open + type + render hits', () => {
	// Migration: switch to scoped queries inside the BitsDialog.Content
	// portal. Reference operator-tenant-management.spec.ts for the
	// canonical mock-server fixture pattern.
});
