import { describe, expect, it } from 'vitest';
import {
	hsnCodeSchema,
	drugScheduleSchema,
	stockMovementReasonSchema,
	productDtoSchema,
	batchDtoSchema,
	stockMovementDtoSchema,
	createProductRequestSchema,
	updateProductRequestSchema,
	createBatchRequestSchema,
	createMovementRequestSchema,
	writeOffBatchRequestSchema,
	bulkProductActionRequestSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	gstDefaultsResponseSchema,
	computedPricesResponseSchema
} from '$lib/features/inventory/schemas';

describe('hsnCodeSchema', () => {
	it('accepts 4 to 8 digits', () => {
		expect(hsnCodeSchema.parse('3004')).toBe('3004');
		expect(hsnCodeSchema.parse('30049099')).toBe('30049099');
	});
	it('rejects fewer than 4 digits', () => {
		expect(hsnCodeSchema.safeParse('123').success).toBe(false);
	});
	it('rejects more than 8 digits', () => {
		expect(hsnCodeSchema.safeParse('123456789').success).toBe(false);
	});
	it('rejects non-numeric', () => {
		expect(hsnCodeSchema.safeParse('AB12').success).toBe(false);
	});
	it('rejects lowercase / mixed', () => {
		expect(hsnCodeSchema.safeParse('3004a').success).toBe(false);
	});
});

describe('drugScheduleSchema', () => {
	it('accepts the six known values', () => {
		for (const v of [
			'otc',
			'schedule_h',
			'schedule_h1',
			'schedule_x',
			'schedule_c',
			'not_applicable'
		]) {
			expect(drugScheduleSchema.parse(v)).toBe(v);
		}
	});
	it('rejects unknown schedule', () => {
		expect(drugScheduleSchema.safeParse('schedule_z').success).toBe(false);
	});
});

describe('stockMovementReasonSchema', () => {
	it('accepts the nine known reasons', () => {
		for (const v of [
			'inward',
			'sale',
			'sale_cancelled',
			'damage',
			'expired',
			'transfer_in',
			'transfer_out',
			'correction',
			'opening_balance'
		]) {
			expect(stockMovementReasonSchema.parse(v)).toBe(v);
		}
	});
	it('rejects unknown reason', () => {
		expect(stockMovementReasonSchema.safeParse('purchase').success).toBe(false);
	});
});

describe('createProductRequestSchema', () => {
	const valid = {
		brand_name: 'Crocin',
		product_category: 'Pain relief',
		product_type: 'Tablet',
		drug_schedule: 'otc' as const,
		units_per_pack: 10,
		mrp: 50,
		purchase_rate: 30,
		sale_rate: 45,
		gst_percentage: 12,
		hsn_code: '30049099',
		shelf_life_months: 24
	};

	it('parses minimal valid payload', () => {
		const out = createProductRequestSchema.parse(valid);
		expect(out.brand_name).toBe('Crocin');
	});

	it('rejects empty brand_name', () => {
		expect(createProductRequestSchema.safeParse({ ...valid, brand_name: '' }).success).toBe(false);
	});

	it('rejects bad HSN', () => {
		expect(createProductRequestSchema.safeParse({ ...valid, hsn_code: 'abc' }).success).toBe(false);
	});

	it('rejects negative MRP', () => {
		expect(createProductRequestSchema.safeParse({ ...valid, mrp: -1 }).success).toBe(false);
	});

	it('rejects GST > 100', () => {
		expect(createProductRequestSchema.safeParse({ ...valid, gst_percentage: 101 }).success).toBe(
			false
		);
	});

	it('rejects extras (.strict)', () => {
		expect(() => createProductRequestSchema.parse({ ...valid, sneaky: 'x' })).toThrow();
	});
});

describe('updateProductRequestSchema', () => {
	it('parses partial payloads', () => {
		expect(updateProductRequestSchema.parse({ brand_name: 'New' }).brand_name).toBe('New');
	});
	it('rejects extras', () => {
		expect(() => updateProductRequestSchema.parse({ sneaky: 1 })).toThrow();
	});
});

describe('createBatchRequestSchema', () => {
	it('accepts manufactured_at < expires_at', () => {
		const r = createBatchRequestSchema.safeParse({
			batch_number: 'B-1',
			manufactured_at: '2026-01-01',
			expires_at: '2028-01-01',
			quantity_received: 100,
			purchase_rate: 50
		});
		expect(r.success).toBe(true);
	});

	it('rejects when expires_at is BEFORE manufactured_at', () => {
		const r = createBatchRequestSchema.safeParse({
			batch_number: 'B-1',
			manufactured_at: '2026-06-01',
			expires_at: '2026-01-01',
			quantity_received: 100,
			purchase_rate: 50
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues.some((i) => i.message.match(/Expiry must be after/))).toBe(true);
		}
	});

	it('rejects zero quantity', () => {
		expect(
			createBatchRequestSchema.safeParse({
				batch_number: 'B-1',
				manufactured_at: '2026-01-01',
				expires_at: '2028-01-01',
				quantity_received: 0,
				purchase_rate: 50
			}).success
		).toBe(false);
	});
});

describe('createMovementRequestSchema', () => {
	it('parses a valid adjustment', () => {
		const r = createMovementRequestSchema.parse({
			delta: 5,
			reason: 'correction'
		});
		expect(r.delta).toBe(5);
	});
	it('rejects zero delta', () => {
		const r = createMovementRequestSchema.safeParse({ delta: 0, reason: 'correction' });
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error.issues[0]?.message).toMatch(/cannot be zero/);
	});
	it('rejects non-integer delta', () => {
		expect(
			createMovementRequestSchema.safeParse({ delta: 1.5, reason: 'correction' }).success
		).toBe(false);
	});
});

describe('writeOffBatchRequestSchema', () => {
	it('requires reason', () => {
		expect(writeOffBatchRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});
	it('parses with non-empty reason', () => {
		expect(writeOffBatchRequestSchema.parse({ reason: 'damaged' }).reason).toBe('damaged');
	});
});

describe('bulkProductActionRequestSchema', () => {
	it('accepts action + ids', () => {
		expect(
			bulkProductActionRequestSchema.parse({ ids: ['p-1'], action: 'deactivate' }).action
		).toBe('deactivate');
	});
	it('rejects empty ids', () => {
		expect(bulkProductActionRequestSchema.safeParse({ ids: [], action: 'delete' }).success).toBe(
			false
		);
	});
});

describe('productDtoSchema', () => {
	it('parses a complete DTO', () => {
		const dto = {
			id: 'p-1',
			tenant_id: 't-1',
			brand_name: 'Crocin',
			generic_name: 'Paracetamol',
			manufacturer_name: 'GSK',
			product_category: 'Pain relief',
			product_type: 'Tablet',
			drug_schedule: 'otc' as const,
			pack_size: '10x10',
			pack_type: 'Strip',
			units_per_pack: 10,
			mrp: 50,
			purchase_rate: 30,
			sale_rate: 45,
			gst_percentage: 12,
			hsn_code: '30049099',
			shelf_life_months: 24,
			total_quantity_available: 100,
			total_quantity_reserved: 0,
			is_active: true,
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z'
		};
		expect(productDtoSchema.parse(dto).id).toBe('p-1');
	});
});

describe('batchDtoSchema', () => {
	it('parses a complete batch', () => {
		const dto = {
			id: 'b-1',
			product_id: 'p-1',
			batch_number: 'BN-001',
			manufactured_at: '2026-01-01',
			expires_at: '2028-01-01',
			quantity_received: 100,
			quantity_available: 90,
			quantity_reserved: 10,
			purchase_rate: 30,
			gst_percentage: 12,
			inward_date: '2026-01-01',
			is_quarantined: false,
			is_written_off: false
		};
		expect(batchDtoSchema.parse(dto).batch_number).toBe('BN-001');
	});
});

describe('stockMovementDtoSchema', () => {
	it('parses a movement', () => {
		const dto = {
			id: 'm-1',
			product_id: 'p-1',
			batch_id: 'b-1',
			delta: 5,
			reason: 'correction' as const,
			balance_after: 105,
			occurred_at: '2026-05-20T10:00:00Z',
			recorded_by_membership_id: 'mem-1'
		};
		expect(stockMovementDtoSchema.parse(dto).delta).toBe(5);
	});
});

describe('gstDefaultsResponseSchema', () => {
	it('parses a defaults map', () => {
		const out = gstDefaultsResponseSchema.parse({
			defaults: { 'Pain relief': 12, Ortho: 18 }
		});
		expect(out.defaults['Pain relief']).toBe(12);
	});
});

describe('computedPricesResponseSchema', () => {
	it('parses computed prices', () => {
		const out = computedPricesResponseSchema.parse({
			purchase_rate_with_gst: 33.6,
			sale_rate_with_gst: 50.4
		});
		expect(out.purchase_rate_with_gst).toBe(33.6);
	});
});

describe('bulkUploadPreviewSchema', () => {
	it('parses a preview', () => {
		const r = bulkUploadPreviewSchema.parse({ total_rows: 0, rows: [], errors: [] });
		expect(r.total_rows).toBe(0);
	});
});

describe('bulkUploadResultSchema', () => {
	it('parses with defaults', () => {
		const r = bulkUploadResultSchema.parse({ inserted: 1, updated: 2, failed: 0 });
		expect(r.errors).toEqual([]);
	});
});
