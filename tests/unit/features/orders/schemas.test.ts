import { describe, expect, it } from 'vitest';
import {
	bulkOrderActionRequestSchema,
	cancelOrderRequestSchema,
	createOrderRequestSchema,
	listOrdersResponseSchema,
	orderDtoSchema,
	orderItemDtoSchema,
	orderStatusSchema
} from '$features/orders/schemas';

describe('orderStatusSchema', () => {
	it('accepts every documented status', () => {
		for (const s of [
			'draft',
			'pending',
			'confirmed',
			'shipped',
			'delivered',
			'cancelled',
			'refunded'
		]) {
			expect(orderStatusSchema.parse(s)).toBe(s);
		}
	});

	it('rejects unknown status', () => {
		expect(() => orderStatusSchema.parse('held')).toThrow();
	});
});

describe('orderItemDtoSchema', () => {
	it('accepts a minimal line item', () => {
		const line = {
			sku: 'WIDGET-1',
			name: 'Widget',
			quantity: 2,
			unit_price: 9.5,
			line_total: 19
		};
		expect(orderItemDtoSchema.parse(line)).toMatchObject(line);
	});

	it('rejects quantity < 1', () => {
		expect(() =>
			orderItemDtoSchema.parse({
				sku: 'X',
				name: 'X',
				quantity: 0,
				unit_price: 1,
				line_total: 0
			})
		).toThrow();
	});

	it('rejects negative unit_price', () => {
		expect(() =>
			orderItemDtoSchema.parse({
				sku: 'X',
				name: 'X',
				quantity: 1,
				unit_price: -1,
				line_total: 1
			})
		).toThrow();
	});
});

describe('orderDtoSchema', () => {
	const baseOrder = {
		id: 'o1',
		tenant_id: 't1',
		order_number: 'ORD-001',
		status: 'draft',
		customer_lead_id: 'l1',
		customer_name: 'Acme',
		items: [],
		subtotal: 0,
		tax_total: 0,
		total: 0,
		currency: 'USD',
		placed_at: '2026-05-23T00:00:00Z',
		created_at: '2026-05-23T00:00:00Z',
		updated_at: '2026-05-23T00:00:00Z'
	};

	it('parses a draft order with empty items', () => {
		expect(orderDtoSchema.parse(baseOrder).order_number).toBe('ORD-001');
	});

	it('preserves optional nullable timestamps', () => {
		const o = orderDtoSchema.parse({
			...baseOrder,
			delivered_at: null,
			cancelled_at: null
		});
		expect(o.delivered_at).toBeNull();
		expect(o.cancelled_at).toBeNull();
	});
});

describe('listOrdersResponseSchema', () => {
	it('parses an empty envelope', () => {
		const env = listOrdersResponseSchema.parse({ items: [], has_more: false });
		expect(env.items).toEqual([]);
		expect(env.has_more).toBe(false);
	});

	it('parses a populated envelope with next_cursor', () => {
		const env = listOrdersResponseSchema.parse({
			items: [],
			has_more: true,
			next_cursor: 'abc'
		});
		expect(env.next_cursor).toBe('abc');
	});
});

describe('createOrderRequestSchema', () => {
	it('rejects items.length === 0', () => {
		const res = createOrderRequestSchema.safeParse({
			customer_lead_id: 'l1',
			items: []
		});
		expect(res.success).toBe(false);
	});

	it('accepts a minimal valid create', () => {
		const res = createOrderRequestSchema.safeParse({
			customer_lead_id: 'l1',
			items: [{ sku: 'WIDGET', quantity: 1, unit_price: 5 }]
		});
		expect(res.success).toBe(true);
	});
});

describe('cancelOrderRequestSchema', () => {
	it('requires a reason', () => {
		expect(cancelOrderRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});
	it('accepts a non-empty reason', () => {
		expect(cancelOrderRequestSchema.parse({ reason: 'Customer changed mind' }).reason).toBeTruthy();
	});
});

describe('bulkOrderActionRequestSchema', () => {
	it('rejects empty ids', () => {
		expect(bulkOrderActionRequestSchema.safeParse({ ids: [], action: 'cancel' }).success).toBe(
			false
		);
	});

	it('accepts delete_drafts with ids', () => {
		const res = bulkOrderActionRequestSchema.parse({
			ids: ['1', '2'],
			action: 'delete_drafts'
		});
		expect(res.action).toBe('delete_drafts');
	});

	it('rejects unknown action', () => {
		expect(
			bulkOrderActionRequestSchema.safeParse({
				ids: ['1'],
				action: 'tickle'
			}).success
		).toBe(false);
	});
});
