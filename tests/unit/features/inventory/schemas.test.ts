import { describe, expect, it } from 'vitest';
import {
	skuSchema,
	unitOfMeasureSchema,
	adjustmentReasonSchema,
	createInventoryItemSchema,
	updateInventoryItemSchema,
	adjustStockSchema,
	inventoryItemDtoSchema,
	stockAdjustmentDtoSchema,
	listInventoryItemsResponseSchema,
	bulkInventoryActionSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema
} from '$lib/features/inventory/schemas';

describe('skuSchema', () => {
	it('accepts uppercase letters, digits, hyphens, underscores', () => {
		expect(skuSchema.parse('WIDGET-001')).toBe('WIDGET-001');
		expect(skuSchema.parse('A_B-1')).toBe('A_B-1');
		expect(skuSchema.parse('SKU123')).toBe('SKU123');
	});
	it('rejects lowercase letters', () => {
		const r = skuSchema.safeParse('abc');
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error.issues[0]?.message).toMatch(/uppercase letters, digits/);
	});
	it('rejects whitespace', () => {
		expect(skuSchema.safeParse('FOO BAR').success).toBe(false);
	});
	it('rejects empty', () => {
		expect(skuSchema.safeParse('').success).toBe(false);
	});
	it('rejects >64 chars', () => {
		expect(skuSchema.safeParse('A'.repeat(65)).success).toBe(false);
	});
});

describe('unitOfMeasureSchema', () => {
	it('accepts known UoM values', () => {
		for (const v of [
			'each',
			'kg',
			'g',
			'lb',
			'oz',
			'l',
			'ml',
			'm',
			'cm',
			'ft',
			'in',
			'box',
			'pack',
			'pallet'
		]) {
			expect(unitOfMeasureSchema.parse(v)).toBe(v);
		}
	});
	it('rejects unknown UoM', () => {
		expect(unitOfMeasureSchema.safeParse('gallon').success).toBe(false);
	});
});

describe('adjustmentReasonSchema', () => {
	it('accepts the 7 enum values', () => {
		for (const v of ['purchase', 'sale', 'return', 'damage', 'correction', 'transfer', 'other']) {
			expect(adjustmentReasonSchema.parse(v)).toBe(v);
		}
	});
	it('rejects unknown reason', () => {
		expect(adjustmentReasonSchema.safeParse('lost').success).toBe(false);
	});
});

describe('createInventoryItemSchema', () => {
	it('parses a minimal valid payload', () => {
		const out = createInventoryItemSchema.parse({
			sku: 'WIDGET-1',
			name: 'Widget',
			unit_of_measure: 'each',
			unit_price: 9.99,
			currency: 'USD'
		});
		expect(out.sku).toBe('WIDGET-1');
		expect(out.current_stock).toBe(0); // default
	});
	it('rejects extras (.strict)', () => {
		expect(() =>
			createInventoryItemSchema.parse({
				sku: 'WIDGET-1',
				name: 'Widget',
				unit_of_measure: 'each',
				unit_price: 9.99,
				currency: 'USD',
				sneaky: 'x'
			})
		).toThrow();
	});
	it('rejects negative unit_price', () => {
		expect(
			createInventoryItemSchema.safeParse({
				sku: 'X',
				name: 'Y',
				unit_of_measure: 'each',
				unit_price: -1,
				currency: 'USD'
			}).success
		).toBe(false);
	});
	it('rejects bad currency code', () => {
		const r = createInventoryItemSchema.safeParse({
			sku: 'X',
			name: 'Y',
			unit_of_measure: 'each',
			unit_price: 1,
			currency: 'usd'
		});
		expect(r.success).toBe(false);
	});
});

describe('updateInventoryItemSchema', () => {
	it('parses partial payloads', () => {
		expect(updateInventoryItemSchema.parse({ name: 'New name' }).name).toBe('New name');
	});
	it('still rejects extras (.strict via .partial)', () => {
		expect(() => updateInventoryItemSchema.parse({ sneaky: 1 })).toThrow();
	});
});

describe('adjustStockSchema', () => {
	it('parses a valid adjust', () => {
		expect(adjustStockSchema.parse({ delta: 5, reason: 'purchase' })).toEqual({
			delta: 5,
			reason: 'purchase'
		});
	});
	it('rejects zero delta', () => {
		const r = adjustStockSchema.safeParse({ delta: 0, reason: 'purchase' });
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error.issues[0]?.message).toMatch(/cannot be zero/);
	});
	it('rejects non-integer delta', () => {
		expect(adjustStockSchema.safeParse({ delta: 1.5, reason: 'purchase' }).success).toBe(false);
	});
});

describe('inventoryItemDtoSchema', () => {
	it('parses a complete DTO', () => {
		const dto = {
			id: 'item-1',
			tenant_id: 'tenant-1',
			sku: 'X-1',
			name: 'X',
			unit_of_measure: 'each',
			unit_price: 1,
			currency: 'USD',
			current_stock: 0,
			reorder_point: 0,
			reorder_quantity: 0,
			tags: [],
			is_active: true,
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z'
		};
		expect(inventoryItemDtoSchema.parse(dto).id).toBe('item-1');
	});
});

describe('stockAdjustmentDtoSchema', () => {
	it('parses an adjustment', () => {
		const dto = {
			id: 'adj-1',
			item_id: 'item-1',
			delta: 5,
			reason: 'purchase' as const,
			new_stock: 10,
			created_at: '2026-01-01T00:00:00Z',
			created_by_membership_id: 'm-1'
		};
		expect(stockAdjustmentDtoSchema.parse(dto).delta).toBe(5);
	});
});

describe('listInventoryItemsResponseSchema', () => {
	it('parses an empty list', () => {
		expect(listInventoryItemsResponseSchema.parse({ items: [], has_more: false }).items).toEqual(
			[]
		);
	});
});

describe('bulkInventoryActionSchema', () => {
	it('parses a bulk action', () => {
		expect(bulkInventoryActionSchema.parse({ ids: ['a'], action: 'deactivate' })).toEqual({
			ids: ['a'],
			action: 'deactivate'
		});
	});
	it('rejects empty ids', () => {
		expect(bulkInventoryActionSchema.safeParse({ ids: [], action: 'delete' }).success).toBe(false);
	});
});

describe('bulkUploadPreviewSchema', () => {
	it('parses', () => {
		expect(bulkUploadPreviewSchema.parse({ total_rows: 0, rows: [], errors: [] }).total_rows).toBe(
			0
		);
	});
});

describe('bulkUploadResultSchema', () => {
	it('parses with defaults', () => {
		const r = bulkUploadResultSchema.parse({ inserted: 1, updated: 2, failed: 0 });
		expect(r.errors).toEqual([]);
	});
});
