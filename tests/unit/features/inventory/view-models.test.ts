import { describe, expect, it } from 'vitest';
import {
	stockLevel,
	stockLevelBadge,
	activeBadge,
	formatPrice,
	previewNewStock,
	willGoNegative,
	formatDelta,
	adjustmentReasonLabel
} from '$lib/features/inventory/view-models';
import type { InventoryItemDto } from '$lib/features/inventory/schemas';

const baseItem = {
	current_stock: 10,
	reorder_point: 5
} as Pick<InventoryItemDto, 'current_stock' | 'reorder_point'>;

describe('stockLevel', () => {
	it('returns "out" when current_stock is 0', () => {
		expect(stockLevel({ current_stock: 0, reorder_point: 5 })).toBe('out');
	});
	it('returns "low" when current_stock <= reorder_point and > 0', () => {
		expect(stockLevel({ current_stock: 5, reorder_point: 5 })).toBe('low');
		expect(stockLevel({ current_stock: 1, reorder_point: 5 })).toBe('low');
	});
	it('returns "in" when current_stock > reorder_point', () => {
		expect(stockLevel({ current_stock: 10, reorder_point: 5 })).toBe('in');
	});
	it('reorder_point of 0 means anything > 0 is in stock', () => {
		expect(stockLevel({ current_stock: 1, reorder_point: 0 })).toBe('in');
		expect(stockLevel({ current_stock: 0, reorder_point: 0 })).toBe('out');
	});
});

describe('stockLevelBadge', () => {
	it('maps in-stock to success variant', () => {
		expect(stockLevelBadge(baseItem)).toEqual({
			level: 'in',
			label: 'In stock',
			variant: 'success'
		});
	});
	it('maps low to warning variant', () => {
		expect(stockLevelBadge({ current_stock: 3, reorder_point: 5 })).toEqual({
			level: 'low',
			label: 'Low',
			variant: 'warning'
		});
	});
	it('maps out to danger variant', () => {
		expect(stockLevelBadge({ current_stock: 0, reorder_point: 5 })).toEqual({
			level: 'out',
			label: 'Out',
			variant: 'danger'
		});
	});
});

describe('activeBadge', () => {
	it('active → success', () => {
		expect(activeBadge({ is_active: true }).variant).toBe('success');
	});
	it('inactive → neutral', () => {
		expect(activeBadge({ is_active: false }).variant).toBe('neutral');
	});
});

describe('formatPrice', () => {
	it('formats with valid currency', () => {
		const out = formatPrice(12.5, 'USD');
		expect(out).toMatch(/12\.50/);
	});
	it('falls back when currency is invalid', () => {
		const out = formatPrice(12.5, 'XYZ');
		// Either Intl formats it (some runtimes) or we fall back — both
		// contain "12.50" and the currency code.
		expect(out).toContain('12.50');
	});
});

describe('previewNewStock', () => {
	it('adds a positive delta', () => {
		expect(previewNewStock(10, 5)).toBe(15);
	});
	it('subtracts a negative delta', () => {
		expect(previewNewStock(10, -3)).toBe(7);
	});
	it('clamps at 0 when delta would drive stock negative', () => {
		expect(previewNewStock(5, -10)).toBe(0);
	});
});

describe('willGoNegative', () => {
	it('false when delta keeps stock at or above 0', () => {
		expect(willGoNegative(10, -10)).toBe(false);
		expect(willGoNegative(10, -5)).toBe(false);
	});
	it('true when delta would drive stock below 0', () => {
		expect(willGoNegative(5, -10)).toBe(true);
	});
});

describe('formatDelta', () => {
	it('prefixes positive deltas with +', () => {
		expect(formatDelta(5)).toBe('+5');
	});
	it('prefixes negative deltas with the figure-dash', () => {
		expect(formatDelta(-3)).toBe('−3');
	});
	it('returns 0 for 0', () => {
		expect(formatDelta(0)).toBe('0');
	});
});

describe('adjustmentReasonLabel', () => {
	it('maps purchase → Purchase', () => {
		expect(adjustmentReasonLabel('purchase')).toBe('Purchase');
	});
	it('maps correction → Correction', () => {
		expect(adjustmentReasonLabel('correction')).toBe('Correction');
	});
});
