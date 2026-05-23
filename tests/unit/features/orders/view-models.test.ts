import { describe, expect, it } from 'vitest';
import {
	canApprove,
	canCancel,
	canComplete,
	canConfirm,
	canDelete,
	canDispatch,
	canEditNotes,
	canGenerateInvoice,
	canMarkDelivered,
	canMarkPacked,
	canRecordFullPayment,
	canRecordTokenPayment,
	canRevise,
	canTransitionTo,
	checkPriceBand,
	computeLineTotal,
	computeOrderTotals,
	formatMoney,
	lifecycleStepsFor,
	lineItemsLabel,
	nextStatesFor,
	outstandingBalance,
	statusBadge,
	totalPaid
} from '$features/orders/view-models';
import {
	orderStatusSchema,
	type OrderDto,
	type OrderItemDto,
	type OrderStatus,
	type PaymentDto
} from '$features/orders/schemas';

const ALL_STATUSES = orderStatusSchema.options as readonly OrderStatus[];

function emptyOrder(over: Partial<OrderDto> = {}): OrderDto {
	return {
		id: 'o',
		tenant_id: 't',
		order_number: 'ORD-1',
		status: 'quotation_draft',
		customer_lead_id: 'l',
		customer_name: 'Acme',
		current_items: [],
		current_subtotal: 0,
		current_gst_total: 0,
		current_total: 0,
		currency: 'INR',
		revisions: [],
		payments: [],
		credit_note_ids: [],
		created_at: '2026-05-23T00:00:00Z',
		updated_at: '2026-05-23T00:00:00Z',
		...over
	};
}

describe('nextStatesFor — full state-machine matrix', () => {
	it('quotation_draft → revised or approved', () => {
		expect(nextStatesFor('quotation_draft').sort()).toEqual([
			'quotation_approved',
			'quotation_revised'
		]);
	});

	it('quotation_revised → revised again or approved', () => {
		expect(nextStatesFor('quotation_revised').sort()).toEqual([
			'quotation_approved',
			'quotation_revised'
		]);
	});

	it('quotation_approved → token_payment_received only', () => {
		expect(nextStatesFor('quotation_approved')).toEqual(['token_payment_received']);
	});

	it('token_payment_received → confirmed only', () => {
		expect(nextStatesFor('token_payment_received')).toEqual(['confirmed']);
	});

	it('confirmed → packed or cancelled', () => {
		expect(nextStatesFor('confirmed').sort()).toEqual(['cancelled', 'packed']);
	});

	it('packed → invoice_generated or cancelled', () => {
		expect(nextStatesFor('packed').sort()).toEqual(['cancelled', 'invoice_generated']);
	});

	it('invoice_generated → dispatched or cancelled', () => {
		expect(nextStatesFor('invoice_generated').sort()).toEqual(['cancelled', 'dispatched']);
	});

	it('dispatched → delivered or cancelled', () => {
		expect(nextStatesFor('dispatched').sort()).toEqual(['cancelled', 'delivered']);
	});

	it('delivered → complete or cancelled', () => {
		expect(nextStatesFor('delivered').sort()).toEqual(['cancelled', 'complete']);
	});

	it('complete + cancelled are terminal', () => {
		expect(nextStatesFor('complete')).toEqual([]);
		expect(nextStatesFor('cancelled')).toEqual([]);
	});

	it('every status has a defined transitions array', () => {
		for (const s of ALL_STATUSES) {
			expect(nextStatesFor(s)).toBeInstanceOf(Array);
		}
	});

	it('canTransitionTo gates explicit transitions correctly', () => {
		expect(canTransitionTo('quotation_draft', 'quotation_approved')).toBe(true);
		expect(canTransitionTo('quotation_draft', 'confirmed')).toBe(false);
		expect(canTransitionTo('delivered', 'cancelled')).toBe(true);
		expect(canTransitionTo('complete', 'cancelled')).toBe(false);
	});
});

describe('per-action capability predicates', () => {
	it('canRevise — only draft and revised', () => {
		const allowed = new Set(['quotation_draft', 'quotation_revised']);
		for (const s of ALL_STATUSES) expect(canRevise(s)).toBe(allowed.has(s));
	});

	it('canApprove — only draft and revised', () => {
		const allowed = new Set(['quotation_draft', 'quotation_revised']);
		for (const s of ALL_STATUSES) expect(canApprove(s)).toBe(allowed.has(s));
	});

	it('canRecordTokenPayment — only approved', () => {
		for (const s of ALL_STATUSES) expect(canRecordTokenPayment(s)).toBe(s === 'quotation_approved');
	});

	it('canConfirm — only after token', () => {
		for (const s of ALL_STATUSES) expect(canConfirm(s)).toBe(s === 'token_payment_received');
	});

	it('canMarkPacked — only confirmed', () => {
		for (const s of ALL_STATUSES) expect(canMarkPacked(s)).toBe(s === 'confirmed');
	});

	it('canGenerateInvoice — only packed', () => {
		for (const s of ALL_STATUSES) expect(canGenerateInvoice(s)).toBe(s === 'packed');
	});

	it('canDispatch — only after invoice', () => {
		for (const s of ALL_STATUSES) expect(canDispatch(s)).toBe(s === 'invoice_generated');
	});

	it('canMarkDelivered — only dispatched', () => {
		for (const s of ALL_STATUSES) expect(canMarkDelivered(s)).toBe(s === 'dispatched');
	});

	it('canCancel — confirmed through delivered, never pre-confirm or terminal', () => {
		const allowed = new Set([
			'confirmed',
			'packed',
			'invoice_generated',
			'dispatched',
			'delivered'
		]);
		for (const s of ALL_STATUSES) expect(canCancel(s)).toBe(allowed.has(s));
	});

	it('canEditNotes — everything except cancelled / complete', () => {
		expect(canEditNotes('cancelled')).toBe(false);
		expect(canEditNotes('complete')).toBe(false);
		expect(canEditNotes('confirmed')).toBe(true);
	});

	it('canDelete — only quotation_draft', () => {
		for (const s of ALL_STATUSES) expect(canDelete(s)).toBe(s === 'quotation_draft');
	});

	it('canRecordFullPayment — delivered + no prior full payment', () => {
		const o = emptyOrder({ status: 'delivered', payments: [] });
		expect(canRecordFullPayment(o)).toBe(true);
		const o2 = emptyOrder({
			status: 'delivered',
			payments: [makePayment({ kind: 'full' })]
		});
		expect(canRecordFullPayment(o2)).toBe(false);
		const o3 = emptyOrder({ status: 'dispatched' });
		expect(canRecordFullPayment(o3)).toBe(false);
	});

	it('canComplete — delivered + at least one full payment', () => {
		const o = emptyOrder({
			status: 'delivered',
			payments: [makePayment({ kind: 'full' })]
		});
		expect(canComplete(o)).toBe(true);
		const o2 = emptyOrder({ status: 'delivered', payments: [makePayment({ kind: 'token' })] });
		expect(canComplete(o2)).toBe(false);
	});
});

function makePayment(over: Partial<PaymentDto> = {}): PaymentDto {
	return {
		id: 'p',
		order_id: 'o',
		kind: 'token',
		amount: 100,
		method: 'upi',
		received_at: '2026-05-23T00:00:00Z',
		received_by_membership_id: 'm',
		...over
	};
}

describe('statusBadge', () => {
	it('maps every status to a non-empty label + variant', () => {
		for (const s of ALL_STATUSES) {
			const b = statusBadge(s);
			expect(b.label.length).toBeGreaterThan(0);
			expect(b.variant).toBeTruthy();
		}
	});

	it('cancelled = danger; delivered/complete = success', () => {
		expect(statusBadge('cancelled').variant).toBe('danger');
		expect(statusBadge('delivered').variant).toBe('success');
		expect(statusBadge('complete').variant).toBe('success');
	});
});

describe('lifecycleStepsFor', () => {
	it('marks earlier steps complete, current step current, later pending', () => {
		const o = emptyOrder({ status: 'confirmed' });
		const steps = lifecycleStepsFor(o);
		expect(steps.find((s) => s.id === 'quotation_draft')?.state).toBe('complete');
		expect(steps.find((s) => s.id === 'confirmed')?.state).toBe('current');
		expect(steps.find((s) => s.id === 'dispatched')?.state).toBe('pending');
	});

	it('marks the cancellation step error and keeps prior complete', () => {
		const o = emptyOrder({
			status: 'cancelled',
			confirmed_at: '2026-05-23T00:00:00Z',
			packed_at: '2026-05-23T00:00:01Z'
		});
		const steps = lifecycleStepsFor(o);
		const packedStep = steps.find((s) => s.id === 'packed');
		expect(packedStep?.state).toBe('error');
		const confirmedStep = steps.find((s) => s.id === 'confirmed');
		expect(confirmedStep?.state).toBe('complete');
	});
});

describe('computeLineTotal', () => {
	it('handles zero discount + zero gst', () => {
		expect(computeLineTotal({ quantity: 2, unit_price: 10 })).toEqual({
			net: 20,
			gst: 0,
			total: 20
		});
	});

	it('applies discount BEFORE GST', () => {
		const r = computeLineTotal({
			quantity: 1,
			unit_price: 100,
			discount_percentage: 10,
			gst_percentage: 18
		});
		// gross 100, discount 10, net 90, gst = 90 * 0.18 = 16.2, total 106.2
		expect(r).toEqual({ net: 90, gst: 16.2, total: 106.2 });
	});

	it('never goes negative when discount exceeds gross', () => {
		const r = computeLineTotal({
			quantity: 1,
			unit_price: 5,
			discount_percentage: 200
		});
		expect(r.net).toBe(0);
	});

	it('rounds to 2 decimals', () => {
		const r = computeLineTotal({ quantity: 3, unit_price: 0.333 });
		expect(r.total).toBeCloseTo(1, 2);
	});
});

describe('computeOrderTotals', () => {
	it('sums multiple lines using catalogue gst', () => {
		const totals = computeOrderTotals(
			[
				{ product_id: 'p1', batch_id: 'b1', quantity: 2, unit_price: 10 },
				{ product_id: 'p2', batch_id: 'b2', quantity: 1, unit_price: 5, discount_percentage: 10 }
			],
			{
				b1: { gst_percentage: 18 },
				b2: { gst_percentage: 12 }
			}
		);
		// b1: gross 20 → net 20 → gst 3.6
		// b2: gross 5 → discount 0.5 → net 4.5 → gst 0.54
		expect(totals.subtotal).toBe(25);
		expect(totals.discount_total).toBeCloseTo(0.5, 2);
		expect(totals.gst_total).toBeCloseTo(4.14, 2);
		expect(totals.total).toBeCloseTo(28.64, 2);
	});

	it('returns zeros for empty input', () => {
		expect(computeOrderTotals([])).toEqual({
			subtotal: 0,
			discount_total: 0,
			gst_total: 0,
			total: 0
		});
	});

	it('falls back to 0 gst when catalogue missing the batch', () => {
		const totals = computeOrderTotals([
			{ product_id: 'p1', batch_id: 'b1', quantity: 1, unit_price: 100 }
		]);
		expect(totals.gst_total).toBe(0);
		expect(totals.total).toBe(100);
	});
});

describe('formatMoney', () => {
	it('formats INR as the default currency', () => {
		const v = formatMoney(1234.5);
		expect(v).toMatch(/1,234\.50|1,234\.5/);
	});

	it('falls back to a plain string when currency is invalid', () => {
		const v = formatMoney(10, 'ZZZ');
		expect(v).toMatch(/10/);
	});
});

describe('checkPriceBand', () => {
	it('accepts a price within ±10% by default', () => {
		const r = checkPriceBand(100, 100);
		expect(r.ok).toBe(true);
		expect(r.min).toBe(90);
		expect(r.max).toBe(110);
	});

	it('flags below band', () => {
		const r = checkPriceBand(80, 100);
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('below_band');
	});

	it('flags above band', () => {
		const r = checkPriceBand(120, 100);
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('above_band');
	});

	it('treats zero/negative sale_rate as no enforcement', () => {
		expect(checkPriceBand(50, 0).ok).toBe(true);
		expect(checkPriceBand(50, -1).ok).toBe(true);
	});

	it('respects a custom ratio', () => {
		const r = checkPriceBand(115, 100, 0.2);
		expect(r.ok).toBe(true);
	});
});

describe('lineItemsLabel', () => {
	it('singular form', () => {
		const items: OrderItemDto[] = [
			{
				product_id: 'p',
				batch_id: 'b',
				batch_number: 'B1',
				brand_name: 'X',
				quantity: 1,
				unit_price: 1,
				gst_percentage: 0,
				line_total: 1
			}
		];
		expect(lineItemsLabel(items)).toBe('1 item');
	});

	it('plural form', () => {
		const items: OrderItemDto[] = [
			{
				product_id: 'p',
				batch_id: 'b',
				batch_number: 'B1',
				brand_name: 'X',
				quantity: 1,
				unit_price: 1,
				gst_percentage: 0,
				line_total: 1
			},
			{
				product_id: 'p',
				batch_id: 'b2',
				batch_number: 'B2',
				brand_name: 'Y',
				quantity: 1,
				unit_price: 1,
				gst_percentage: 0,
				line_total: 1
			}
		];
		expect(lineItemsLabel(items)).toBe('2 items');
	});

	it('empty', () => {
		expect(lineItemsLabel([])).toBe('No items');
	});
});

describe('totalPaid / outstandingBalance', () => {
	it('sums every payment', () => {
		const o = emptyOrder({
			current_total: 500,
			payments: [makePayment({ amount: 100 }), makePayment({ amount: 250 })]
		});
		expect(totalPaid(o)).toBe(350);
		expect(outstandingBalance(o)).toBe(150);
	});

	it('clamps outstanding at 0 on overpayment', () => {
		const o = emptyOrder({
			current_total: 100,
			payments: [makePayment({ amount: 200 })]
		});
		expect(outstandingBalance(o)).toBe(0);
	});
});
