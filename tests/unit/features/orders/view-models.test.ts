import { describe, expect, it } from 'vitest';
import {
	canDelete,
	canEdit,
	canTransitionTo,
	computeLineTotal,
	computeOrderTotals,
	formatMoney,
	lineItemsLabel,
	nextStatesFor,
	statusBadge
} from '$features/orders/view-models';
import type { OrderItemDto } from '$features/orders/schemas';

describe('nextStatesFor', () => {
	it('draft can transition to confirmed or cancelled', () => {
		expect(nextStatesFor('draft').sort()).toEqual(['cancelled', 'confirmed']);
	});

	it('pending can transition to confirmed or cancelled', () => {
		expect(nextStatesFor('pending').sort()).toEqual(['cancelled', 'confirmed']);
	});

	it('confirmed can transition to shipped or cancelled', () => {
		expect(nextStatesFor('confirmed').sort()).toEqual(['cancelled', 'shipped']);
	});

	it('shipped → delivered only', () => {
		expect(nextStatesFor('shipped')).toEqual(['delivered']);
	});

	it('delivered → refunded only', () => {
		expect(nextStatesFor('delivered')).toEqual(['refunded']);
	});

	it('cancelled and refunded are terminal', () => {
		expect(nextStatesFor('cancelled')).toEqual([]);
		expect(nextStatesFor('refunded')).toEqual([]);
	});
});

describe('canTransitionTo', () => {
	it('allows draft → cancelled', () => {
		expect(canTransitionTo('draft', 'cancelled')).toBe(true);
	});
	it('rejects shipped → cancelled', () => {
		expect(canTransitionTo('shipped', 'cancelled')).toBe(false);
	});
	it('rejects delivered → confirmed', () => {
		expect(canTransitionTo('delivered', 'confirmed')).toBe(false);
	});
});

describe('canEdit', () => {
	it('allows draft + pending', () => {
		expect(canEdit('draft')).toBe(true);
		expect(canEdit('pending')).toBe(true);
	});
	it('rejects everything else', () => {
		expect(canEdit('confirmed')).toBe(false);
		expect(canEdit('shipped')).toBe(false);
		expect(canEdit('delivered')).toBe(false);
		expect(canEdit('cancelled')).toBe(false);
		expect(canEdit('refunded')).toBe(false);
	});
});

describe('canDelete', () => {
	it('only allows draft', () => {
		expect(canDelete('draft')).toBe(true);
		expect(canDelete('pending')).toBe(false);
		expect(canDelete('cancelled')).toBe(false);
	});
});

describe('statusBadge', () => {
	it('maps every status to a label + variant', () => {
		for (const s of [
			'draft',
			'pending',
			'confirmed',
			'shipped',
			'delivered',
			'cancelled',
			'refunded'
		] as const) {
			const b = statusBadge(s);
			expect(b.label.length).toBeGreaterThan(0);
			expect(b.variant).toBeTruthy();
		}
	});

	it('uses success variant for delivered', () => {
		expect(statusBadge('delivered').variant).toBe('success');
	});

	it('uses danger variant for refunded', () => {
		expect(statusBadge('refunded').variant).toBe('danger');
	});
});

describe('computeLineTotal', () => {
	it('quantity × unit_price with zero tax/discount', () => {
		expect(computeLineTotal({ quantity: 3, unit_price: 10 })).toBe(30);
	});

	it('applies discount before tax', () => {
		// gross 100, discount 10, net 90, tax 10% → 99
		expect(computeLineTotal({ quantity: 1, unit_price: 100, discount: 10, tax_rate: 0.1 })).toBe(
			99
		);
	});

	it('never goes negative when discount exceeds gross', () => {
		expect(computeLineTotal({ quantity: 1, unit_price: 5, discount: 99 })).toBe(0);
	});

	it('rounds to 2 decimals', () => {
		expect(computeLineTotal({ quantity: 3, unit_price: 0.333 })).toBeCloseTo(1, 2);
	});
});

describe('computeOrderTotals', () => {
	it('sums multiple lines', () => {
		const totals = computeOrderTotals([
			{ sku: 'A', quantity: 2, unit_price: 10 }, // gross 20
			{ sku: 'B', quantity: 1, unit_price: 5, tax_rate: 0.1 } // gross 5, tax 0.5
		]);
		expect(totals.subtotal).toBe(25);
		expect(totals.tax_total).toBeCloseTo(0.5, 2);
		expect(totals.discount_total).toBe(0);
		expect(totals.total).toBeCloseTo(25.5, 2);
	});

	it('returns zeros for empty input', () => {
		expect(computeOrderTotals([])).toEqual({
			subtotal: 0,
			discount_total: 0,
			tax_total: 0,
			total: 0
		});
	});
});

describe('formatMoney', () => {
	it('returns a string with the amount in it', () => {
		const v = formatMoney(1234.5, 'USD');
		expect(v).toContain('1,234.5');
	});

	it('falls back when currency is invalid', () => {
		const v = formatMoney(10, 'ZZZ');
		// Intl rejects 'ZZZ' on some engines; fall-back returns 'ZZZ 10.00'.
		expect(v).toMatch(/10/);
	});
});

describe('lineItemsLabel', () => {
	it('singular form', () => {
		const items: OrderItemDto[] = [
			{ sku: 'A', name: 'A', quantity: 1, unit_price: 1, line_total: 1 }
		];
		expect(lineItemsLabel(items)).toBe('1 item');
	});

	it('plural form', () => {
		const items: OrderItemDto[] = [
			{ sku: 'A', name: 'A', quantity: 1, unit_price: 1, line_total: 1 },
			{ sku: 'B', name: 'B', quantity: 1, unit_price: 1, line_total: 1 }
		];
		expect(lineItemsLabel(items)).toBe('2 items');
	});

	it('empty', () => {
		expect(lineItemsLabel([])).toBe('No items');
	});
});
