import { expect, test } from './helpers/test';
import { registerMock, resetMock } from './helpers/mock';
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
		await registerMock({
			method: 'GET',
			path: '/api/v1/permission-requests',
			status: 200,
			body: { requests: [], has_more: false }
		});
		await page.goto('/dashboard');
		await page.locator('button[aria-label="Search (Cmd+K)"]').click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByPlaceholder('Search pages…')).toBeVisible();
		await expect(dialog.getByRole('option', { name: 'Leads' })).toBeVisible();
		await expect(dialog.getByRole('option', { name: 'Tenants' })).toHaveCount(0);
		await dialog.getByRole('combobox', { name: 'Search' }).fill('perm');
		await expect(dialog.getByRole('option', { name: 'Permission requests' })).toBeVisible();
		await expect(dialog.getByRole('option', { name: 'Leads' })).toHaveCount(0);
		await dialog.getByRole('option', { name: 'Permission requests' }).click();
		await expect(page).toHaveURL(/\/permission-requests$/);
	});
});

test.fixme('PENDING: Cmd+K palette open + type + render hits', () => {
	// Migration: switch to scoped queries inside the BitsDialog.Content
	// portal. Reference operator-tenant-management.spec.ts for the
	// canonical mock-server fixture pattern.
});

test.describe('Cmd+K palette under forced colours', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('only the highlighted item draws an outline; the others draw none (no overlap)', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-user', permissions: ['crm.leads.read'] });
		await page.emulateMedia({ forcedColors: 'active' });
		await page.goto('/dashboard');
		await page.locator('button[aria-label="Search (Cmd+K)"]').click();
		const items = page.getByRole('dialog').locator('[data-slot="command-item"]');
		await expect(items.first()).toBeVisible();
		expect(await items.count()).toBeGreaterThan(1);
		const outlines = await items.evaluateAll((els) =>
			els.map((el) => ({
				selected: el.hasAttribute('data-selected'),
				style: getComputedStyle(el).outlineStyle
			}))
		);
		expect(outlines.filter((o) => o.selected).map((o) => o.style)).toEqual(['solid']);
		expect(new Set(outlines.filter((o) => !o.selected).map((o) => o.style))).toEqual(
			new Set(['none'])
		);
	});
});
