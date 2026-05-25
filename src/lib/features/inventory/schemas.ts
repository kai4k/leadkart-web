/**
 * Inventory schemas (CRM module 3, per
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`).
 *
 * Backend lives at /v1/inventory. All responses are Zod-parsed at the
 * gateway boundary (`parseResponse` in api.ts).
 *
 * IDs are `z.string()` (not `.uuid()`) per the rest of the codebase —
 * test fixtures and the server use canonical UUIDs but Zod's strict
 * uuid() rejects all-zero sentinels.
 */
import { z } from 'zod';

// ── Classification enums ─────────────────────────────────────────────

/** Therapeutic area — open list at server (Combobox typeahead). */
export const productCategorySchema = z.string().min(1).max(100);

/** Physical form — open list at server (Combobox typeahead). */
export const productTypeSchema = z.string().min(1).max(100);

export const drugScheduleSchema = z.enum([
	'otc',
	'schedule_h',
	'schedule_h1',
	'schedule_x',
	'schedule_c',
	'not_applicable'
]);
export type DrugSchedule = z.output<typeof drugScheduleSchema>;

export const stockMovementReasonSchema = z.enum([
	'inward',
	'sale',
	'sale_cancelled',
	'damage',
	'expired',
	'transfer_in',
	'transfer_out',
	'correction',
	'opening_balance'
]);
export type StockMovementReason = z.output<typeof stockMovementReasonSchema>;

export const stockMovementReferenceKindSchema = z.enum([
	'order',
	'dispatch',
	'manual',
	'batch_inward'
]);
export type StockMovementReferenceKind = z.output<typeof stockMovementReferenceKindSchema>;

// ── HSN code regex (4-8 digits, GST canonical) ───────────────────────

export const hsnCodeSchema = z.string().regex(/^[0-9]{4,8}$/, 'HSN code must be 4–8 digits');

// ── Product DTO ──────────────────────────────────────────────────────

export const productDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),

	// Identity
	brand_name: z.string().min(1).max(200),
	generic_name: z.string().max(500).default(''),
	composition: z.string().max(1000).nullable().optional(),
	manufacturer_name: z.string().max(200).default(''),
	manufacturing_license_no: z.string().max(100).nullable().optional(),

	// Classification
	product_category: z.string(),
	product_type: z.string(),
	drug_schedule: drugScheduleSchema,

	// Commercial
	pack_size: z.string().max(50).default(''),
	pack_type: z.string().max(50).default(''),
	units_per_pack: z.number().int().min(1).default(1),
	mrp: z.number().min(0),
	purchase_rate: z.number().min(0),
	sale_rate: z.number().min(0),
	gst_percentage: z.number().min(0).max(100),
	hsn_code: z.string(),

	// Regulatory
	storage_condition: z.string().max(200).nullable().optional(),
	shelf_life_months: z.number().int().min(1),

	// Type-varying attributes
	attributes: z.record(z.string(), z.unknown()).nullable().optional(),

	// Stock aggregate (server-computed)
	total_quantity_available: z.number().int().min(0).default(0),
	total_quantity_reserved: z.number().int().min(0).default(0),
	earliest_expiry_at: z.string().nullable().optional(),

	is_active: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
});
export type ProductDto = z.output<typeof productDtoSchema>;

// ── Batch DTO ────────────────────────────────────────────────────────

export const batchDtoSchema = z.object({
	id: z.string(),
	product_id: z.string(),
	batch_number: z.string().min(1).max(100),
	manufactured_at: z.string(),
	expires_at: z.string(),
	quantity_received: z.number().int().min(0),
	quantity_available: z.number().int().min(0),
	quantity_reserved: z.number().int().min(0),
	purchase_rate: z.number().min(0),
	gst_percentage: z.number().min(0),
	inward_date: z.string(),
	supplier_name: z.string().max(200).nullable().optional(),
	supplier_invoice_no: z.string().max(100).nullable().optional(),
	is_quarantined: z.boolean(),
	is_written_off: z.boolean(),
	write_off_reason: z.string().nullable().optional()
});
export type BatchDto = z.output<typeof batchDtoSchema>;

// ── Stock movement DTO ───────────────────────────────────────────────

export const stockMovementDtoSchema = z.object({
	id: z.string(),
	product_id: z.string(),
	batch_id: z.string(),
	delta: z.number().int(),
	reason: stockMovementReasonSchema,
	balance_after: z.number().int().min(0),
	reference_kind: stockMovementReferenceKindSchema.optional(),
	reference_id: z.string().nullable().optional(),
	note: z.string().max(1000).nullable().optional(),
	occurred_at: z.string(),
	recorded_by_membership_id: z.string()
});
export type StockMovementDto = z.output<typeof stockMovementDtoSchema>;

// ── List envelopes ───────────────────────────────────────────────────

export const listProductsResponseSchema = z.object({
	items: z.array(productDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListProductsResponse = z.output<typeof listProductsResponseSchema>;

export const listBatchesResponseSchema = z.object({
	items: z.array(batchDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional()
});
export type ListBatchesResponse = z.output<typeof listBatchesResponseSchema>;

export const listStockMovementsResponseSchema = z.object({
	items: z.array(stockMovementDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional()
});
export type ListStockMovementsResponse = z.output<typeof listStockMovementsResponseSchema>;

// ── Create / Update product ──────────────────────────────────────────

export const createProductRequestSchema = z
	.object({
		brand_name: z.string().min(1, 'Brand name is required').max(200),
		generic_name: z.string().max(500).optional(),
		composition: z.string().max(1000).optional(),
		manufacturer_name: z.string().max(200).optional(),
		manufacturing_license_no: z.string().max(100).optional(),

		product_category: z.string().min(1, 'Category is required').max(100),
		product_type: z.string().min(1, 'Type is required').max(100),
		drug_schedule: drugScheduleSchema,

		pack_size: z.string().max(50).optional(),
		pack_type: z.string().max(50).optional(),
		units_per_pack: z.number().int().min(1),
		mrp: z.number().min(0),
		purchase_rate: z.number().min(0),
		sale_rate: z.number().min(0),
		gst_percentage: z.number().min(0).max(100),
		hsn_code: hsnCodeSchema,

		storage_condition: z.string().max(200).optional(),
		shelf_life_months: z.number().int().min(1),
		attributes: z.record(z.string(), z.unknown()).optional(),
		is_active: z.boolean().optional()
	})
	.strict();
export type CreateProductRequest = z.output<typeof createProductRequestSchema>;

export const updateProductRequestSchema = createProductRequestSchema.partial().strict();
export type UpdateProductRequest = z.output<typeof updateProductRequestSchema>;

// ── Create batch ─────────────────────────────────────────────────────

export const createBatchRequestSchema = z
	.object({
		batch_number: z.string().min(1, 'Batch number is required').max(100),
		manufactured_at: z.string().min(1, 'Manufacture date is required'),
		expires_at: z.string().min(1, 'Expiry date is required'),
		quantity_received: z
			.number()
			.int('Quantity must be a whole number')
			.min(1, 'Quantity must be at least 1'),
		purchase_rate: z.number().min(0),
		gst_percentage: z.number().min(0).max(100).optional(),
		inward_date: z.string().optional(),
		supplier_name: z.string().max(200).optional(),
		supplier_invoice_no: z.string().max(100).optional()
	})
	.strict()
	.refine((v) => new Date(v.manufactured_at) < new Date(v.expires_at), {
		message: 'Expiry must be after manufacture date',
		path: ['expires_at']
	});
export type CreateBatchRequest = z.output<typeof createBatchRequestSchema>;

export const writeOffBatchRequestSchema = z
	.object({
		reason: z.string().min(1, 'Reason is required').max(500)
	})
	.strict();
export type WriteOffBatchRequest = z.output<typeof writeOffBatchRequestSchema>;

// ── Create stock movement (manual correction / adjust) ───────────────

export const createMovementRequestSchema = z
	.object({
		batch_id: z.string().optional(),
		delta: z
			.number()
			.int('Delta must be a whole number')
			.refine((v) => v !== 0, 'Delta cannot be zero'),
		reason: stockMovementReasonSchema,
		note: z.string().max(1000).optional()
	})
	.strict();
export type CreateMovementRequest = z.output<typeof createMovementRequestSchema>;

// ── Reference data ───────────────────────────────────────────────────

export const referenceListResponseSchema = z.object({
	items: z.array(z.string())
});
export type ReferenceListResponse = z.output<typeof referenceListResponseSchema>;

export const gstDefaultsResponseSchema = z.object({
	defaults: z.record(z.string(), z.number().min(0).max(100))
});
export type GstDefaultsResponse = z.output<typeof gstDefaultsResponseSchema>;

export const computedPricesResponseSchema = z.object({
	purchase_rate_with_gst: z.number().min(0),
	sale_rate_with_gst: z.number().min(0)
});
export type ComputedPricesResponse = z.output<typeof computedPricesResponseSchema>;

// ── Bulk ─────────────────────────────────────────────────────────────

export const bulkProductActionSchema = z.enum(['activate', 'deactivate', 'delete']);
export type BulkProductAction = z.output<typeof bulkProductActionSchema>;

export const bulkProductActionRequestSchema = z
	.object({
		ids: z.array(z.string()).min(1).max(500),
		action: bulkProductActionSchema
	})
	.strict();
export type BulkProductActionRequest = z.output<typeof bulkProductActionRequestSchema>;

export const bulkActionResultSchema = z.object({
	affected: z.number().int(),
	errors: z
		.array(
			z.object({
				id: z.string(),
				code: z.string(),
				message: z.string()
			})
		)
		.default([])
});
export type BulkActionResult = z.output<typeof bulkActionResultSchema>;

export const bulkUploadErrorSchema = z.object({
	row_number: z.number().int().min(1),
	field: z.string().default(''),
	code: z.string(),
	message: z.string()
});
export type BulkUploadError = z.output<typeof bulkUploadErrorSchema>;

export const bulkUploadPreviewSchema = z.object({
	total_rows: z.number().int(),
	rows: z.array(z.record(z.string(), z.unknown())).default([]),
	errors: z.array(bulkUploadErrorSchema).default([])
});
export type BulkUploadPreview = z.output<typeof bulkUploadPreviewSchema>;

export const bulkUploadResultSchema = z.object({
	inserted: z.number().int(),
	updated: z.number().int(),
	failed: z.number().int(),
	errors: z.array(bulkUploadErrorSchema).default([])
});
export type BulkUploadResult = z.output<typeof bulkUploadResultSchema>;
