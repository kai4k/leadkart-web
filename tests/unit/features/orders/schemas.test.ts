import { describe, expect, it } from 'vitest';
import {
	approveQuotationRequestSchema,
	bulkOrderActionRequestSchema,
	cancelOrderRequestSchema,
	createQuotationRequestSchema,
	dispatchRequestSchema,
	invoiceDtoSchema,
	listOrdersResponseSchema,
	markPackedRequestSchema,
	orderDtoSchema,
	orderItemDtoSchema,
	orderStatusSchema,
	paymentDtoSchema,
	paymentKindSchema,
	paymentMethodSchema,
	recordPaymentRequestSchema,
	reviseQuotationRequestSchema
} from '$features/orders/schemas';

describe('orderStatusSchema', () => {
	const all = [
		'quotation_draft',
		'quotation_revised',
		'quotation_approved',
		'token_payment_received',
		'confirmed',
		'packed',
		'invoice_generated',
		'dispatched',
		'delivered',
		'complete',
		'cancelled'
	] as const;

	it('accepts every documented status', () => {
		for (const s of all) {
			expect(orderStatusSchema.parse(s)).toBe(s);
		}
	});

	it('rejects unknown statuses (incl. the old draft/pending/shipped/refunded)', () => {
		for (const stale of ['draft', 'pending', 'shipped', 'refunded']) {
			expect(() => orderStatusSchema.parse(stale)).toThrow();
		}
	});
});

describe('paymentKindSchema + paymentMethodSchema', () => {
	it('paymentKindSchema accepts token | full only', () => {
		expect(paymentKindSchema.parse('token')).toBe('token');
		expect(paymentKindSchema.parse('full')).toBe('full');
		expect(() => paymentKindSchema.parse('partial')).toThrow();
	});

	it('paymentMethodSchema enumerates the 6 methods', () => {
		for (const m of ['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']) {
			expect(paymentMethodSchema.parse(m)).toBe(m);
		}
		expect(() => paymentMethodSchema.parse('venmo')).toThrow();
	});
});

describe('orderItemDtoSchema', () => {
	it('accepts a minimal pharma line item', () => {
		const line = {
			product_id: 'p',
			batch_id: 'b',
			batch_number: 'BATCH-1',
			brand_name: 'Acmecet 500',
			quantity: 5,
			unit_price: 9.5,
			gst_percentage: 12,
			line_total: 49
		};
		expect(orderItemDtoSchema.parse(line)).toMatchObject(line);
	});

	it('rejects quantity < 1', () => {
		expect(() =>
			orderItemDtoSchema.parse({
				product_id: 'p',
				batch_id: 'b',
				batch_number: 'B',
				brand_name: 'B',
				quantity: 0,
				unit_price: 1,
				gst_percentage: 0,
				line_total: 0
			})
		).toThrow();
	});

	it('rejects negative unit_price', () => {
		expect(() =>
			orderItemDtoSchema.parse({
				product_id: 'p',
				batch_id: 'b',
				batch_number: 'B',
				brand_name: 'B',
				quantity: 1,
				unit_price: -1,
				gst_percentage: 0,
				line_total: 0
			})
		).toThrow();
	});

	it('rejects discount_percentage > 100', () => {
		expect(() =>
			orderItemDtoSchema.parse({
				product_id: 'p',
				batch_id: 'b',
				batch_number: 'B',
				brand_name: 'B',
				quantity: 1,
				unit_price: 1,
				discount_percentage: 200,
				gst_percentage: 0,
				line_total: 1
			})
		).toThrow();
	});
});

describe('orderDtoSchema', () => {
	const baseOrder = {
		id: 'o1',
		tenant_id: 't1',
		order_number: 'ORD-2026-0001',
		status: 'quotation_draft',
		customer_lead_id: 'l1',
		customer_name: 'Acme Pharma',
		current_items: [],
		current_subtotal: 0,
		current_gst_total: 0,
		current_total: 0,
		currency: 'INR',
		revisions: [],
		payments: [],
		created_at: '2026-05-23T00:00:00Z',
		updated_at: '2026-05-23T00:00:00Z'
	};

	it('parses a draft order with empty items', () => {
		expect(orderDtoSchema.parse(baseOrder).order_number).toBe('ORD-2026-0001');
	});

	it('preserves nullable lifecycle timestamps', () => {
		const o = orderDtoSchema.parse({
			...baseOrder,
			delivered_at: null,
			cancelled_at: null,
			invoice_id: null
		});
		expect(o.delivered_at).toBeNull();
		expect(o.cancelled_at).toBeNull();
		expect(o.invoice_id).toBeNull();
	});

	it('defaults currency to INR when omitted', () => {
		// `currency` has a default of INR; passing undefined should be OK.
		const o = orderDtoSchema.parse({ ...baseOrder, currency: undefined });
		expect(o.currency).toBe('INR');
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

describe('createQuotationRequestSchema', () => {
	it('rejects items.length === 0', () => {
		const res = createQuotationRequestSchema.safeParse({
			customer_lead_id: 'l1',
			items: []
		});
		expect(res.success).toBe(false);
	});

	it('accepts a minimal valid create with one item', () => {
		const res = createQuotationRequestSchema.safeParse({
			customer_lead_id: 'l1',
			items: [{ product_id: 'p', batch_id: 'b', quantity: 1, unit_price: 5 }]
		});
		expect(res.success).toBe(true);
	});
});

describe('reviseQuotationRequestSchema', () => {
	it('rejects items.length === 0', () => {
		expect(reviseQuotationRequestSchema.safeParse({ items: [], notes: 'oops' }).success).toBe(
			false
		);
	});

	it('accepts with notes', () => {
		const res = reviseQuotationRequestSchema.safeParse({
			items: [{ product_id: 'p', batch_id: 'b', quantity: 1, unit_price: 5 }],
			notes: 'Adjusted qty'
		});
		expect(res.success).toBe(true);
	});
});

describe('approveQuotationRequestSchema', () => {
	it('accepts empty body', () => {
		expect(approveQuotationRequestSchema.parse({})).toEqual({});
	});
	it('accepts optional notes', () => {
		expect(approveQuotationRequestSchema.parse({ notes: 'Ship asap' }).notes).toBe('Ship asap');
	});
});

describe('markPackedRequestSchema', () => {
	it('requires box_count ≥ 1', () => {
		expect(markPackedRequestSchema.safeParse({ box_count: 0 }).success).toBe(false);
		expect(markPackedRequestSchema.parse({ box_count: 3 }).box_count).toBe(3);
	});
});

describe('dispatchRequestSchema', () => {
	it('accepts empty body (cross-module stub)', () => {
		expect(dispatchRequestSchema.parse({})).toEqual({});
	});
	it('preserves carrier + tracking number', () => {
		const r = dispatchRequestSchema.parse({ carrier: 'BlueDart', tracking_number: '12345' });
		expect(r.carrier).toBe('BlueDart');
		expect(r.tracking_number).toBe('12345');
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

describe('recordPaymentRequestSchema', () => {
	it('requires amount > 0', () => {
		const r = recordPaymentRequestSchema.safeParse({
			kind: 'token',
			amount: 0,
			method: 'upi'
		});
		expect(r.success).toBe(false);
	});

	it('accepts a token payment via UPI', () => {
		const r = recordPaymentRequestSchema.parse({
			kind: 'token',
			amount: 500,
			method: 'upi',
			reference: 'UTR123'
		});
		expect(r.amount).toBe(500);
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

describe('invoiceDtoSchema', () => {
	it('parses a server-issued invoice with FY-aware number', () => {
		const inv = invoiceDtoSchema.parse({
			id: 'i',
			order_id: 'o',
			invoice_number: 'INV/2026-27/00047',
			fy: '2026-27',
			generated_at: '2026-05-23T00:00:00Z',
			taxable_total: 100,
			gst_total: 18,
			grand_total: 118,
			status: 'active'
		});
		expect(inv.invoice_number).toMatch(/^INV\/\d{4}-\d{2}\//);
	});

	it('accepts cancelled status with reason', () => {
		const inv = invoiceDtoSchema.parse({
			id: 'i',
			order_id: 'o',
			invoice_number: 'INV/2026-27/00047',
			fy: '2026-27',
			generated_at: '2026-05-23T00:00:00Z',
			taxable_total: 100,
			gst_total: 18,
			grand_total: 118,
			status: 'cancelled',
			cancelled_at: '2026-05-24T00:00:00Z',
			cancellation_reason: 'Mistaken invoice'
		});
		expect(inv.status).toBe('cancelled');
	});
});

describe('paymentDtoSchema', () => {
	it('parses a full payment', () => {
		const p = paymentDtoSchema.parse({
			id: 'p',
			order_id: 'o',
			kind: 'full',
			amount: 1180,
			method: 'bank_transfer',
			received_at: '2026-05-23T00:00:00Z',
			received_by_membership_id: 'm'
		});
		expect(p.kind).toBe('full');
		expect(p.method).toBe('bank_transfer');
	});
});
