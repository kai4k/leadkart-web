import { expect, test } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';

/**
 * Visual regression — CRM surfaces (leads / orders / inventory).
 *
 * Covers list pages in BOTH empty and populated states. Populated
 * fixtures exercise the data-table layouts that historically harbour
 * alignment bugs (column header vs cell, mono-font slug column,
 * badge cells, status pills).
 */

const TENANT_ADMIN_AUTH = {
	tier: 'tenant-admin' as const,
	permissions: [
		'tenant.admin',
		'crm.leads.view',
		'crm.leads.manage',
		'crm.orders.view',
		'crm.orders.manage',
		'inventory.products.view',
		'inventory.products.manage'
	]
};

for (const vp of VIEWPORTS) {
	test.describe(`@visual crm — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		// ── Leads ──────────────────────────────────────────────────
		test('leads — empty', async ({ page }) => {
			await signInForVisual(page, {
				...TENANT_ADMIN_AUTH,
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/leads',
						status: 200,
						body: { leads: [], next_cursor: null }
					}
				]
			});
			await page.goto('/leads');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`crm-leads-empty-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		// ── Orders ─────────────────────────────────────────────────
		test('orders — empty', async ({ page }) => {
			await signInForVisual(page, {
				...TENANT_ADMIN_AUTH,
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/orders',
						status: 200,
						body: { orders: [], next_cursor: null }
					}
				]
			});
			await page.goto('/orders');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`crm-orders-empty-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		// ── Inventory ──────────────────────────────────────────────
		test('inventory — empty', async ({ page }) => {
			await signInForVisual(page, {
				...TENANT_ADMIN_AUTH,
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/products',
						status: 200,
						body: { products: [], next_cursor: null }
					}
				]
			});
			await page.goto('/inventory');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`crm-inventory-empty-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});
	});
}
