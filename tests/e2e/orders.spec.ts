import { expect, test } from '@playwright/test';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * CRM Orders — e2e coverage per
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`.
 *
 *   Discovery + empty:
 *     Empty state + create CTA visible
 *   List + nav:
 *     List renders fixture orders; row click → detail
 *   Create:
 *     Happy path → drawer closes + toast
 *     Items length 0 → field error, no POST
 *   Status workflow:
 *     confirmed → ship dialog → tracking + flip status
 *     shipped → mark delivered → flip status
 *     draft → cancel dialog requires reason → flip status
 *   Bulk:
 *     Bulk delete drafts
 *   Filters:
 *     Status filter writes ?status= to URL + refetches
 *   Bulk upload:
 *     Preview + commit happy path
 *   Keyboard:
 *     `j` focuses row; Enter → detail
 */

// UUIDv4 RFC 4122 fixtures (4th group must start 8/9/a/b).
const ORDER_DRAFT = '00000000-0000-4000-8000-000000000001';
const ORDER_CONFIRMED = '00000000-0000-4000-8000-000000000002';
const ORDER_SHIPPED = '00000000-0000-4000-8000-000000000003';
const ORDER_DRAFT_2 = '00000000-0000-4000-8000-000000000004';
const LEAD_ID = '00000000-0000-4000-8000-0000000000aa';

const PERMS = [
	'tenant.admin',
	'crm.orders.view',
	'crm.orders.create',
	'crm.orders.update',
	'crm.orders.delete',
	'crm.orders.confirm',
	'crm.orders.ship',
	'crm.orders.deliver',
	'crm.orders.cancel',
	'crm.orders.refund',
	'crm.orders.bulk_upload'
];

function makeOrder(over: Record<string, unknown> = {}) {
	return {
		id: ORDER_DRAFT,
		tenant_id: TEST_TENANT_ID,
		order_number: 'ORD-2026-0001',
		status: 'draft',
		customer_lead_id: LEAD_ID,
		customer_name: 'Acme Pharma',
		customer_email: 'orders@acme.test',
		items: [
			{
				sku: 'WIDGET-A',
				name: 'Widget A',
				quantity: 2,
				unit_price: 10,
				line_total: 20,
				discount: 0,
				tax_rate: 0
			}
		],
		subtotal: 20,
		tax_total: 0,
		discount_total: 0,
		total: 20,
		currency: 'USD',
		placed_at: '2026-05-20T10:00:00Z',
		created_at: '2026-05-20T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		...over
	};
}

test.describe('Orders — discovery + empty state', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('empty state + Create order CTA visible', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/orders',
			status: 200,
			body: { items: [], has_more: false }
		});
		await page.goto('/orders');
		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: /^orders$/i })
		).toBeVisible();
		await expect(page.getByText(/no orders yet/i)).toBeVisible();
		await expect(
			page
				.locator('#main-content')
				.getByRole('button', { name: /create order/i })
				.first()
		).toBeVisible();
	});
});

test.describe('Orders — list + navigation', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('list renders 3 fixture orders + row click → detail', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const orders = [
			makeOrder({ id: ORDER_DRAFT, order_number: 'ORD-1', status: 'draft' }),
			makeOrder({ id: ORDER_CONFIRMED, order_number: 'ORD-2', status: 'confirmed' }),
			makeOrder({ id: ORDER_SHIPPED, order_number: 'ORD-3', status: 'shipped' })
		];
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/orders',
				status: 200,
				body: { items: orders, has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/orders/${ORDER_DRAFT}`,
				status: 200,
				body: orders[0]
			}
		]);
		await page.goto('/orders');
		await expect(page.getByText('ORD-1')).toBeVisible();
		await expect(page.getByText('ORD-2')).toBeVisible();
		await expect(page.getByText('ORD-3')).toBeVisible();

		await page.getByTestId(`order-row-${ORDER_DRAFT}`).click();
		await page.waitForURL(new RegExp(`/orders/${ORDER_DRAFT}$`));
		await expect(page.getByTestId('order-number')).toContainText('ORD-1');
	});
});

test.describe('Orders — create flow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('happy path: drawer closes + success toast', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/orders',
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/orders',
				status: 201,
				body: makeOrder({ id: ORDER_DRAFT, order_number: 'ORD-NEW-1' })
			}
		]);
		await page.goto('/orders');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /new order/i })
			.first()
			.click();

		await expect(page.getByRole('heading', { name: 'Create order' })).toBeVisible();
		await page.locator('input[name="customer_lead_id"]').fill(LEAD_ID);

		// Add a line item
		await page.getByRole('button', { name: /add line/i }).click();
		await page.getByTestId('line-0-sku').fill('WIDGET-A');
		await page.getByTestId('line-0-quantity').fill('2');
		await page.getByTestId('line-0-unit-price').fill('10');

		await page.locator('button[type="submit"][form="create-order-form"]').click();
		await expect(page.getByText(/order ord-new-1 created/i)).toBeVisible({ timeout: 5000 });
	});

	test('items.length === 0 → field error, no POST', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/orders',
			status: 200,
			body: { items: [], has_more: false }
		});
		await page.goto('/orders');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /new order/i })
			.first()
			.click();

		await page.locator('input[name="customer_lead_id"]').fill(LEAD_ID);
		// Don't add any line — submit with empty items.
		await page.locator('button[type="submit"][form="create-order-form"]').click();
		await expect(page.getByTestId('line-items-error')).toBeVisible({ timeout: 3000 });
	});
});

test.describe('Orders — status workflow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('confirmed order: Ship button → dialog → tracking + flip to shipped', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const confirmed = makeOrder({
			id: ORDER_CONFIRMED,
			order_number: 'ORD-2',
			status: 'confirmed'
		});
		const shipped = { ...confirmed, status: 'shipped', tracking_number: '1Z-TRACK' };
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/orders/${ORDER_CONFIRMED}`,
				status: 200,
				body: confirmed
			},
			{
				method: 'POST',
				path: `/api/v1/orders/${ORDER_CONFIRMED}/ship`,
				status: 200,
				body: shipped
			}
		]);
		await page.goto(`/orders/${ORDER_CONFIRMED}`);
		await expect(page.getByTestId('order-status-badge')).toContainText(/confirmed/i);
		await page.getByRole('button', { name: /^ship$/i }).click();
		await page.getByTestId('ship-tracking-number').fill('1Z-TRACK');
		await page.getByRole('button', { name: /mark shipped/i }).click();
		await expect(page.getByText(/order shipped/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId('order-status-badge')).toContainText(/shipped/i);
	});

	test('shipped order: Mark delivered → flip to delivered', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const shipped = makeOrder({ id: ORDER_SHIPPED, order_number: 'ORD-3', status: 'shipped' });
		const delivered = { ...shipped, status: 'delivered', delivered_at: '2026-05-22T00:00:00Z' };
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/orders/${ORDER_SHIPPED}`,
				status: 200,
				body: shipped
			},
			{
				method: 'POST',
				path: `/api/v1/orders/${ORDER_SHIPPED}/deliver`,
				status: 200,
				body: delivered
			}
		]);
		await page.goto(`/orders/${ORDER_SHIPPED}`);
		await expect(page.getByTestId('order-status-badge')).toContainText(/shipped/i);
		await page.getByRole('button', { name: /mark delivered/i }).click();
		await expect(page.getByText(/order delivered/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId('order-status-badge')).toContainText(/delivered/i);
	});

	test('draft order: Cancel → dialog requires reason → POST cancel', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const draft = makeOrder({ id: ORDER_DRAFT, order_number: 'ORD-D', status: 'draft' });
		const cancelled = { ...draft, status: 'cancelled', cancel_reason: 'Wrong order' };
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/orders/${ORDER_DRAFT}`,
				status: 200,
				body: draft
			},
			{
				method: 'POST',
				path: `/api/v1/orders/${ORDER_DRAFT}/cancel`,
				status: 200,
				body: cancelled
			}
		]);
		await page.goto(`/orders/${ORDER_DRAFT}`);
		await expect(page.getByTestId('order-status-badge')).toContainText(/draft/i);
		await page.getByRole('button', { name: /^cancel$/i }).click();
		// Confirm without reason → client-side error.
		await page.getByRole('button', { name: /^cancel order$/i }).click();
		await expect(page.getByText(/reason is required/i)).toBeVisible();
		await page.getByTestId('cancel-reason').fill('Wrong order');
		await page.getByRole('button', { name: /^cancel order$/i }).click();
		await expect(page.getByText(/order cancelled/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Orders — bulk select + delete drafts', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('select 2 drafts → Delete drafts → POST bulk-action → toast', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const a = makeOrder({ id: ORDER_DRAFT, order_number: 'ORD-A', status: 'draft' });
		const b = makeOrder({ id: ORDER_DRAFT_2, order_number: 'ORD-B', status: 'draft' });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/orders',
				status: 200,
				body: { items: [a, b], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/orders/bulk-action',
				status: 200,
				body: { affected: 2, errors: [] }
			}
		]);
		await page.goto('/orders');
		await page.getByTestId(`row-select-${ORDER_DRAFT}`).check();
		await page.getByTestId(`row-select-${ORDER_DRAFT_2}`).check();
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible();
		await page.getByRole('button', { name: /delete drafts \(2\)/i }).click();
		// Confirm dialog
		await page
			.getByRole('button', { name: /^delete drafts$/i })
			.last()
			.click();
		await expect(page.getByText(/2 orders updated/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Orders — filters', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('saved view applies status filter via URL', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/orders',
			status: 200,
			body: {
				items: [makeOrder({ id: ORDER_CONFIRMED, order_number: 'ORD-CF', status: 'confirmed' })],
				has_more: false
			}
		});
		await page.goto('/orders');
		await page.getByTestId('view-awaiting_shipment').click();
		await page.waitForURL(/[?&]status=confirmed/);
		await expect(page.getByText('ORD-CF')).toBeVisible();
	});
});

test.describe('Orders — bulk upload', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('preview + commit happy path', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/orders',
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/orders/bulk-upload/preview',
				status: 200,
				body: {
					total_rows: 2,
					rows: [],
					orders_preview: [
						{
							order_external_id: 'EXT-1',
							customer_name: 'Acme',
							line_item_count: 2,
							subtotal: 30,
							total: 30
						}
					],
					errors: []
				}
			},
			{
				method: 'POST',
				path: '/api/v1/orders/bulk-upload/commit',
				status: 200,
				body: { inserted: 1, updated: 0, failed: 0, errors: [] }
			}
		]);
		await page.goto('/orders');
		await page.getByRole('button', { name: /bulk upload/i }).click();
		await expect(page.getByTestId('bulk-step-upload')).toBeVisible();

		const csv = Buffer.from(
			'order_external_id,customer_name,sku,quantity,unit_price\nEXT-1,Acme,WIDGET,1,10\nEXT-1,Acme,WIDGET-B,2,10\n'
		);
		await page.getByTestId('bulk-file-input').setInputFiles({
			name: 'orders.csv',
			mimeType: 'text/csv',
			buffer: csv
		});
		await page.getByRole('button', { name: /^preview$/i }).click();
		await expect(page.getByTestId('bulk-step-preview')).toBeVisible({ timeout: 5000 });
		await expect(page.getByText('EXT-1')).toBeVisible();

		await page.getByRole('button', { name: /commit import/i }).click();
		await expect(page.getByTestId('bulk-step-committed')).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/1 order\(s\) imported/i)).toBeVisible();
	});
});

test.describe('Orders — keyboard navigation', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('j focuses first row, Enter opens detail', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		const a = makeOrder({ id: ORDER_DRAFT, order_number: 'ORD-K1', status: 'draft' });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/orders',
				status: 200,
				body: { items: [a], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/orders/${ORDER_DRAFT}`,
				status: 200,
				body: a
			}
		]);
		await page.goto('/orders');
		await expect(page.getByText('ORD-K1')).toBeVisible();
		// Click body to make sure window has focus.
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('j');
		await expect(page.getByTestId(`order-row-${ORDER_DRAFT}`)).toBeFocused();
		await page.keyboard.press('Enter');
		await page.waitForURL(new RegExp(`/orders/${ORDER_DRAFT}$`));
	});
});
