import { expect, test } from '@playwright/test';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Inventory module e2e (per crm-modules-contracts.md).
 *
 * Mock-server matches on pathname only; last fixture wins. Use RFC-valid
 * UUIDs to satisfy any downstream Zod parses.
 */

const ITEM_IN_ID = '00000000-0000-4000-8000-000000000001';
const ITEM_LOW_ID = '00000000-0000-4000-8000-000000000002';
const ITEM_OUT_ID = '00000000-0000-4000-8000-000000000003';
const ADJ_ID = '00000000-0000-4000-8000-0000000000aa';
const NEW_ITEM_ID = '00000000-0000-4000-8000-0000000000bb';

const INVENTORY_PERMISSIONS = [
	'tenant.admin',
	'crm.inventory.view',
	'crm.inventory.create',
	'crm.inventory.update',
	'crm.inventory.delete',
	'crm.inventory.adjust_stock',
	'crm.inventory.bulk_upload'
];

function makeItem(over: Record<string, unknown> = {}) {
	return {
		id: ITEM_IN_ID,
		tenant_id: TEST_TENANT_ID,
		sku: 'WIDGET-001',
		name: 'Widget',
		description: 'A widget',
		category: 'Hardware',
		unit_of_measure: 'each',
		unit_price: 9.99,
		currency: 'USD',
		cost_price: 5.0,
		current_stock: 20,
		reorder_point: 5,
		reorder_quantity: 50,
		supplier_name: 'Acme Supplies',
		barcode: '1234567890',
		tags: ['popular'],
		is_active: true,
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-01T10:00:00Z',
		...over
	};
}

function makeAdjustment(over: Record<string, unknown> = {}) {
	return {
		id: ADJ_ID,
		item_id: ITEM_IN_ID,
		delta: 5,
		reason: 'purchase',
		note: 'Restock',
		new_stock: 25,
		created_at: '2026-05-10T10:00:00Z',
		created_by_membership_id: TEST_MEMBERSHIP_ID,
		...over
	};
}

const itemInStock = makeItem({
	id: ITEM_IN_ID,
	sku: 'WIDGET-001',
	current_stock: 20,
	reorder_point: 5
});
const itemLow = makeItem({
	id: ITEM_LOW_ID,
	sku: 'WIDGET-002',
	name: 'Low widget',
	current_stock: 3,
	reorder_point: 5
});
const itemOut = makeItem({
	id: ITEM_OUT_ID,
	sku: 'WIDGET-003',
	name: 'Out widget',
	current_stock: 0,
	reorder_point: 5
});

test.describe('Inventory — empty state', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('empty state shows Create item + Bulk upload', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/inventory/items',
			status: 200,
			body: { items: [], has_more: false }
		});
		await page.goto('/inventory');
		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: /inventory/i })
		).toBeVisible();
		await expect(page.getByText(/no items yet/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /create item/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: /bulk upload/i }).first()).toBeVisible();
	});
});

test.describe('Inventory — list + badges', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders 3 fixtures with the correct stock-level badges', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/inventory/items',
			status: 200,
			body: { items: [itemInStock, itemLow, itemOut], has_more: false }
		});
		await page.goto('/inventory');
		await expect(page.getByText('WIDGET-001')).toBeVisible();
		await expect(page.getByText('WIDGET-002')).toBeVisible();
		await expect(page.getByText('WIDGET-003')).toBeVisible();

		// Badges
		await expect(page.getByText('In stock').first()).toBeVisible();
		await expect(page.getByText('Low').first()).toBeVisible();
		await expect(page.getByText('Out').first()).toBeVisible();
	});

	test('clicking a row navigates to /inventory/[id]', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [itemInStock], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto('/inventory');
		await page.getByText('WIDGET-001').click();
		await page.waitForURL(new RegExp(`/inventory/${itemInStock.id}$`));
	});
});

test.describe('Inventory — create', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: drawer closes + toast', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		const created = makeItem({ id: NEW_ITEM_ID, sku: 'NEW-001', name: 'New' });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/inventory/items',
				status: 201,
				body: created
			}
		]);
		await page.goto('/inventory');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /create item/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: 'Create item' })).toBeVisible();

		await page.locator('input[name="sku"]').fill('NEW-001');
		await page.locator('input[name="name"]').fill('New');
		// unit_of_measure already defaults to 'each'; currency to 'USD'.
		await page.locator('input[name="unit_price"]').fill('9.99');

		await page.locator('button[type="submit"][form="create-inventory-item-form"]').click();
		await expect(page.getByText(/item created/i)).toBeVisible({ timeout: 5000 });
	});

	test('lowercase SKU triggers Zod field error; no POST fires', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/inventory/items',
			status: 200,
			body: { items: [], has_more: false }
		});
		await page.goto('/inventory');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /create item/i })
			.first()
			.click();

		await page.locator('input[name="sku"]').fill('abc');
		await page.locator('input[name="name"]').fill('Lowercase test');
		await page.locator('input[name="unit_price"]').fill('1');

		await page.locator('button[type="submit"][form="create-inventory-item-form"]').click();

		await expect(page.getByText(/uppercase letters, digits/i)).toBeVisible({ timeout: 3000 });
	});

	test('409 sku_taken surfaces a banner alert', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/inventory/items',
				status: 409,
				body: { code: 'sku_taken', message: 'SKU already exists' }
			}
		]);
		await page.goto('/inventory');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /create item/i })
			.first()
			.click();

		await page.locator('input[name="sku"]').fill('TAKEN-001');
		await page.locator('input[name="name"]').fill('Dup');
		await page.locator('input[name="unit_price"]').fill('1');

		await page.locator('button[type="submit"][form="create-inventory-item-form"]').click();

		await expect(page.getByText(/sku already exists/i).first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Inventory — detail / edit / delete', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('edit drawer PATCH happy path', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		const updated = makeItem({ name: 'Renamed Widget', unit_price: 14.5 });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'PATCH',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: updated
			}
		]);
		await page.goto(`/inventory/${itemInStock.id}`);
		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Widget' })
		).toBeVisible();
		await page.getByLabel('More actions').first().click();
		await page.getByRole('menuitem', { name: /edit/i }).click();

		const nameInput = page.locator('input[name="name"]');
		await expect(nameInput).toHaveValue('Widget');
		await nameInput.fill('Renamed Widget');
		await page.locator('input[name="unit_price"]').fill('14.5');

		await page.locator('button[type="submit"][form="edit-inventory-item-form"]').click();
		await expect(page.getByText(/item updated/i)).toBeVisible({ timeout: 5000 });
	});

	test('delete confirm → DELETE → navigate home', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'DELETE',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: { ...itemInStock, is_active: false }
			},
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto(`/inventory/${itemInStock.id}`);
		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Widget' })
		).toBeVisible();
		await page.getByLabel('More actions').first().click();
		await page.getByRole('menuitem', { name: /delete/i }).click();
		await page
			.getByRole('dialog')
			.getByRole('button', { name: /^delete$/i })
			.click();
		await expect(page.getByText(/item deleted/i)).toBeVisible({ timeout: 5000 });
	});

	test('detail page shows recent adjustments history', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [makeAdjustment()], has_more: false }
			}
		]);
		await page.goto(`/inventory/${itemInStock.id}`);
		await expect(page.getByRole('heading', { name: /recent adjustments/i })).toBeVisible();
		// Reason label + delta both rendered.
		await expect(page.getByText('Purchase').first()).toBeVisible({ timeout: 5000 });
		await expect(page.getByText('+5').first()).toBeVisible();
	});
});

test.describe('Inventory — adjust stock', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: +5 purchase → toast contains +5 and Undo', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		const after = makeItem({ current_stock: 25 });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjust-stock`,
				status: 200,
				body: { item: after, adjustment: makeAdjustment({ delta: 5, new_stock: 25 }) }
			}
		]);
		await page.goto(`/inventory/${itemInStock.id}`);
		await page.getByTestId('detail-adjust-stock').first().click();
		await expect(page.getByRole('heading', { name: /adjust stock/i })).toBeVisible();
		await page.getByTestId('adjust-delta').fill('5');
		await page.locator('button[type="submit"][form="adjust-stock-form"]').click();

		// Toast shows the SKU + signed delta + Undo.
		await expect(page.getByText(/\+5.*WIDGET-001/)).toBeVisible({ timeout: 5000 });
		await expect(page.getByRole('button', { name: /undo/i })).toBeVisible();
	});

	test('negative-stock guard: 422 → inline banner', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		const itemSmall = makeItem({ current_stock: 10 });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemSmall.id}`,
				status: 200,
				body: itemSmall
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemSmall.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: `/api/v1/inventory/items/${itemSmall.id}/adjust-stock`,
				status: 422,
				body: {
					code: 'negative_stock_disallowed',
					message: 'Adjustment would drive stock below zero',
					fields: { delta: 'Would drive stock below zero' }
				}
			}
		]);
		await page.goto(`/inventory/${itemSmall.id}`);
		await page.getByTestId('detail-adjust-stock').first().click();
		await page.getByTestId('adjust-delta').fill('-100');
		await page.locator('button[type="submit"][form="adjust-stock-form"]').click();

		await expect(page.getByText(/Would drive stock below zero/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Inventory — filters', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('low-stock toggle adds ?low_stock=true and refetches', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/inventory/items',
			status: 200,
			body: { items: [itemInStock], has_more: false }
		});
		await page.goto('/inventory');
		await expect(page.getByText('WIDGET-001')).toBeVisible();
		await page.getByTestId('filter-low-stock').click();
		await page.waitForURL(/low_stock=true/);
	});
});

test.describe('Inventory — bulk select', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('select 2 rows + deactivate → POST /bulk-action', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [itemInStock, itemLow], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/inventory/items/bulk-action',
				status: 200,
				body: { affected: 2, errors: [] }
			}
		]);
		await page.goto('/inventory');
		await page.getByTestId(`row-checkbox-${itemInStock.id}`).check();
		await page.getByTestId(`row-checkbox-${itemLow.id}`).check();
		// Sticky action bar appears.
		const bar = page.getByTestId('bulk-actions-bar');
		await expect(bar).toBeVisible();
		await bar.getByRole('button', { name: /deactivate/i }).click();
		await expect(page.getByText(/2 items updated/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Inventory — bulk upload', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('preview + commit happy path', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/inventory/items/bulk-upload/preview',
				status: 200,
				body: {
					total_rows: 2,
					rows: [
						{ sku: 'A-1', name: 'A', current_stock: 10, __action: 'insert' },
						{ sku: 'B-1', name: 'B', current_stock: 5, __action: 'update' }
					],
					errors: []
				}
			},
			{
				method: 'POST',
				path: '/api/v1/inventory/items/bulk-upload/commit',
				status: 200,
				body: { inserted: 1, updated: 1, failed: 0, errors: [] }
			}
		]);
		await page.goto('/inventory');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /bulk upload/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: /bulk upload items/i })).toBeVisible();

		// Upload a fake CSV from disk.
		await page.getByTestId('bulk-upload-file').setInputFiles({
			name: 'items.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from('sku,name,current_stock\nA-1,A,10\nB-1,B,5')
		});
		await page.getByRole('button', { name: /^preview$/i }).click();
		await expect(page.getByTestId('bulk-upload-preview-table')).toBeVisible({ timeout: 5000 });

		await page.getByTestId('bulk-upload-commit').click();
		await expect(page.getByText(/Upload complete/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/Inserted 1, updated 1/i).first()).toBeVisible();
	});
});

test.describe('Inventory — keyboard shortcuts', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('j focuses first row, Enter navigates to detail', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/inventory/items',
				status: 200,
				body: { items: [itemInStock, itemLow], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}`,
				status: 200,
				body: itemInStock
			},
			{
				method: 'GET',
				path: `/api/v1/inventory/items/${itemInStock.id}/adjustments`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto('/inventory');
		await expect(page.getByText('WIDGET-001')).toBeVisible();
		// Move focus off the body away from any inputs (focus the heading).
		await page.locator('#main-content h1').first().click();
		await page.keyboard.press('j');
		await page.keyboard.press('Enter');
		await page.waitForURL(new RegExp(`/inventory/${itemInStock.id}$`));
	});

	test('a opens the adjust-stock dialog for the focused row', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: INVENTORY_PERMISSIONS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/inventory/items',
			status: 200,
			body: { items: [itemInStock], has_more: false }
		});
		await page.goto('/inventory');
		await expect(page.getByText('WIDGET-001')).toBeVisible();
		await page.locator('#main-content h1').first().click();
		await page.keyboard.press('j');
		await page.keyboard.press('a');
		await expect(page.getByRole('heading', { name: /adjust stock/i })).toBeVisible({
			timeout: 3000
		});
	});
});
