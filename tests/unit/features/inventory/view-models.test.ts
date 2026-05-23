import { describe, expect, it } from 'vitest';
import {
	stockLevel,
	stockLevelBadge,
	activeBadge,
	drugScheduleBadge,
	expiryStatus,
	daysUntilExpiry,
	fefoSort,
	computePriceWithGst,
	formatPrice,
	previewNewBalance,
	willGoNegative,
	formatDelta,
	movementReasonLabel,
	movementReasonAccent,
	LOW_STOCK_THRESHOLD
} from '$lib/features/inventory/view-models';
import type { BatchDto } from '$lib/features/inventory/schemas';

describe('stockLevel', () => {
	it('out when total_quantity_available is 0', () => {
		expect(stockLevel({ total_quantity_available: 0 })).toBe('out');
	});
	it('low when total_quantity_available <= LOW_STOCK_THRESHOLD', () => {
		expect(stockLevel({ total_quantity_available: 1 })).toBe('low');
		expect(stockLevel({ total_quantity_available: LOW_STOCK_THRESHOLD })).toBe('low');
	});
	it('in when total_quantity_available > LOW_STOCK_THRESHOLD', () => {
		expect(stockLevel({ total_quantity_available: LOW_STOCK_THRESHOLD + 1 })).toBe('in');
	});
});

describe('stockLevelBadge', () => {
	it('maps in stock to success', () => {
		expect(stockLevelBadge({ total_quantity_available: 100 })).toEqual({
			level: 'in',
			label: 'In stock',
			variant: 'success'
		});
	});
	it('maps low to warning', () => {
		expect(stockLevelBadge({ total_quantity_available: 5 })).toEqual({
			level: 'low',
			label: 'Low',
			variant: 'warning'
		});
	});
	it('maps out to danger', () => {
		expect(stockLevelBadge({ total_quantity_available: 0 })).toEqual({
			level: 'out',
			label: 'Out of stock',
			variant: 'danger'
		});
	});
});

describe('activeBadge', () => {
	it('active', () => {
		expect(activeBadge({ is_active: true }).variant).toBe('success');
	});
	it('inactive', () => {
		expect(activeBadge({ is_active: false }).variant).toBe('neutral');
	});
});

describe('drugScheduleBadge', () => {
	it('Schedule H → warning', () => {
		expect(drugScheduleBadge('schedule_h').variant).toBe('warning');
	});
	it('Schedule H1 → danger', () => {
		expect(drugScheduleBadge('schedule_h1').variant).toBe('danger');
	});
	it('Schedule X → danger', () => {
		expect(drugScheduleBadge('schedule_x').variant).toBe('danger');
	});
	it('OTC → success', () => {
		expect(drugScheduleBadge('otc').variant).toBe('success');
	});
	it('not_applicable → neutral', () => {
		expect(drugScheduleBadge('not_applicable').variant).toBe('neutral');
	});
});

describe('daysUntilExpiry', () => {
	const FIXED_NOW = new Date('2026-05-20T00:00:00Z');
	it('returns positive integer when in the future', () => {
		expect(daysUntilExpiry('2026-05-30', FIXED_NOW)).toBe(10);
	});
	it('returns 0 on the same calendar day', () => {
		expect(daysUntilExpiry('2026-05-20', FIXED_NOW)).toBe(0);
	});
	it('returns negative when in the past', () => {
		expect(daysUntilExpiry('2026-05-10', FIXED_NOW)).toBeLessThan(0);
	});
});

describe('expiryStatus', () => {
	const FIXED_NOW = new Date('2026-05-20T00:00:00Z');
	it('null when expiresAt absent', () => {
		expect(expiryStatus(null, FIXED_NOW)).toBeNull();
		expect(expiryStatus(undefined, FIXED_NOW)).toBeNull();
	});
	it('expired when in the past → danger', () => {
		const vm = expiryStatus('2026-05-10', FIXED_NOW)!;
		expect(vm.status).toBe('expired');
		expect(vm.variant).toBe('danger');
	});
	it('critical when within 30d → danger', () => {
		const vm = expiryStatus('2026-06-05', FIXED_NOW)!;
		expect(vm.status).toBe('critical');
		expect(vm.variant).toBe('danger');
	});
	it('warning when within 90d → warning', () => {
		const vm = expiryStatus('2026-07-20', FIXED_NOW)!;
		expect(vm.status).toBe('warning');
		expect(vm.variant).toBe('warning');
	});
	it('fresh when beyond 90d → success', () => {
		const vm = expiryStatus('2027-05-20', FIXED_NOW)!;
		expect(vm.status).toBe('fresh');
		expect(vm.variant).toBe('success');
	});
});

describe('fefoSort', () => {
	function batch(overrides: Partial<BatchDto>): BatchDto {
		return {
			id: 'b-1',
			product_id: 'p-1',
			batch_number: 'BN',
			manufactured_at: '2026-01-01',
			expires_at: '2027-01-01',
			quantity_received: 10,
			quantity_available: 10,
			quantity_reserved: 0,
			purchase_rate: 100,
			gst_percentage: 12,
			inward_date: '2026-01-01',
			is_quarantined: false,
			is_written_off: false,
			...overrides
		};
	}

	it('orders by expires_at ascending', () => {
		const out = fefoSort([
			batch({ id: 'b-late', expires_at: '2027-12-01' }),
			batch({ id: 'b-soon', expires_at: '2026-06-01' }),
			batch({ id: 'b-mid', expires_at: '2027-01-01' })
		]);
		expect(out.map((b) => b.id)).toEqual(['b-soon', 'b-mid', 'b-late']);
	});

	it('pushes quarantined batches to the bottom', () => {
		const out = fefoSort([
			batch({ id: 'b-q', expires_at: '2026-06-01', is_quarantined: true }),
			batch({ id: 'b-ok', expires_at: '2027-01-01' })
		]);
		expect(out.map((b) => b.id)).toEqual(['b-ok', 'b-q']);
	});

	it('pushes written-off batches to the bottom', () => {
		const out = fefoSort([
			batch({ id: 'b-wo', expires_at: '2026-06-01', is_written_off: true }),
			batch({ id: 'b-ok', expires_at: '2027-01-01' })
		]);
		expect(out.map((b) => b.id)).toEqual(['b-ok', 'b-wo']);
	});

	it('is stable on equal expires_at via id', () => {
		const out = fefoSort([
			batch({ id: 'b-2', expires_at: '2026-06-01' }),
			batch({ id: 'b-1', expires_at: '2026-06-01' })
		]);
		expect(out.map((b) => b.id)).toEqual(['b-1', 'b-2']);
	});
});

describe('computePriceWithGst', () => {
	it('adds GST to the base rate', () => {
		expect(computePriceWithGst(100, 12)).toBe(112);
		expect(computePriceWithGst(50, 18)).toBe(59);
	});
	it('handles 0% GST', () => {
		expect(computePriceWithGst(100, 0)).toBe(100);
	});
	it('rounds to 2 decimal places', () => {
		expect(computePriceWithGst(33.33, 5)).toBe(35);
	});
	it('returns baseRate when inputs are negative', () => {
		expect(computePriceWithGst(-1, 12)).toBe(-1);
		expect(computePriceWithGst(100, -1)).toBe(100);
	});
});

describe('formatPrice', () => {
	it('formats INR by default', () => {
		const out = formatPrice(1234.5);
		expect(out).toMatch(/1,234/);
	});
});

describe('previewNewBalance', () => {
	it('adds positive delta', () => {
		expect(previewNewBalance(10, 5)).toBe(15);
	});
	it('clamps at 0 on under-flow', () => {
		expect(previewNewBalance(5, -10)).toBe(0);
	});
});

describe('willGoNegative', () => {
	it('true when delta drives below 0', () => {
		expect(willGoNegative(5, -10)).toBe(true);
	});
	it('false when delta keeps at or above 0', () => {
		expect(willGoNegative(10, -10)).toBe(false);
	});
});

describe('formatDelta', () => {
	it('prefixes positive with +', () => {
		expect(formatDelta(5)).toBe('+5');
	});
	it('prefixes negative with figure-dash', () => {
		expect(formatDelta(-3)).toBe('−3');
	});
	it('zero', () => {
		expect(formatDelta(0)).toBe('0');
	});
});

describe('movementReasonLabel', () => {
	it('inward → Inward', () => {
		expect(movementReasonLabel('inward')).toBe('Inward');
	});
	it('opening_balance → Opening balance', () => {
		expect(movementReasonLabel('opening_balance')).toBe('Opening balance');
	});
});

describe('movementReasonAccent', () => {
	it('inward → success', () => {
		expect(movementReasonAccent('inward')).toBe('success');
	});
	it('damage → danger', () => {
		expect(movementReasonAccent('damage')).toBe('danger');
	});
	it('correction → neutral', () => {
		expect(movementReasonAccent('correction')).toBe('neutral');
	});
});
