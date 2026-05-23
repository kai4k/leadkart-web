/**
 * Inventory feature schemas (per crm-modules-contracts.md, ADR 0038).
 *
 * Source-of-record: leadkart-go contract draft at
 *   docs/superpowers/specs/2026-05-23-crm-modules-contracts.md
 * These hand-rolled schemas mirror InventoryItemDto + StockAdjustmentDto
 * for boundary parsing at the gateway. Keep in sync when the backend
 * spec moves.
 *
 * IDs are plain `z.string()` (not `.uuid()`) per the rest of the
 * codebase — test fixtures use simple synthetic IDs.
 */
import { z } from 'zod';

export const unitOfMeasureSchema = z.enum([
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
]);
export type UnitOfMeasure = z.output<typeof unitOfMeasureSchema>;

export const adjustmentReasonSchema = z.enum([
	'purchase',
	'sale',
	'return',
	'damage',
	'correction',
	'transfer',
	'other'
]);
export type AdjustmentReason = z.output<typeof adjustmentReasonSchema>;

/** Tenant-scoped SKU regex — uppercase letters, digits, hyphen, underscore. */
export const skuSchema = z
	.string()
	.min(1, 'SKU is required')
	.max(64, 'SKU must be at most 64 characters')
	.regex(/^[A-Z0-9_-]+$/, 'SKU must be uppercase letters, digits, hyphens, or underscores');

export const inventoryItemDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	sku: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	unit_of_measure: unitOfMeasureSchema,
	unit_price: z.number(),
	currency: z.string(),
	cost_price: z.number().nullable().optional(),
	current_stock: z.number().int(),
	reorder_point: z.number().int(),
	reorder_quantity: z.number().int(),
	supplier_name: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	tags: z.array(z.string()).default([]),
	is_active: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
});
export type InventoryItemDto = z.output<typeof inventoryItemDtoSchema>;

export const stockAdjustmentDtoSchema = z.object({
	id: z.string(),
	item_id: z.string(),
	delta: z.number().int(),
	reason: adjustmentReasonSchema,
	note: z.string().nullable().optional(),
	new_stock: z.number().int(),
	created_at: z.string(),
	created_by_membership_id: z.string()
});
export type StockAdjustmentDto = z.output<typeof stockAdjustmentDtoSchema>;

export const listInventoryItemsResponseSchema = z.object({
	items: z.array(inventoryItemDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListInventoryItemsResponse = z.output<typeof listInventoryItemsResponseSchema>;

export const listStockAdjustmentsResponseSchema = z.object({
	items: z.array(stockAdjustmentDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional()
});
export type ListStockAdjustmentsResponse = z.output<typeof listStockAdjustmentsResponseSchema>;

export const createInventoryItemSchema = z
	.object({
		sku: skuSchema,
		name: z.string().min(1, 'Name is required').max(200),
		description: z.string().max(4000).optional(),
		category: z.string().max(100).optional(),
		unit_of_measure: unitOfMeasureSchema,
		unit_price: z.number().min(0, 'Unit price must be 0 or more'),
		currency: z
			.string()
			.length(3, 'Currency must be a 3-letter code')
			.regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters'),
		cost_price: z.number().min(0).optional(),
		current_stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
		reorder_point: z.number().int().min(0).default(0),
		reorder_quantity: z.number().int().min(0).default(0),
		supplier_name: z.string().max(200).optional(),
		barcode: z.string().max(64).optional(),
		tags: z.array(z.string()).default([])
	})
	.strict();
export type CreateInventoryItemRequest = z.output<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial().strict();
export type UpdateInventoryItemRequest = z.output<typeof updateInventoryItemSchema>;

export const adjustStockSchema = z
	.object({
		delta: z
			.number()
			.int('Delta must be a whole number')
			.refine((v) => v !== 0, 'Delta cannot be zero'),
		reason: adjustmentReasonSchema,
		note: z.string().max(2000).optional()
	})
	.strict();
export type AdjustStockRequest = z.output<typeof adjustStockSchema>;

export const adjustStockResponseSchema = z.object({
	item: inventoryItemDtoSchema,
	adjustment: stockAdjustmentDtoSchema
});
export type AdjustStockResponse = z.output<typeof adjustStockResponseSchema>;

export const bulkInventoryActionSchema = z
	.object({
		ids: z.array(z.string()).min(1).max(500),
		action: z.enum(['activate', 'deactivate', 'delete'])
	})
	.strict();
export type BulkInventoryActionRequest = z.output<typeof bulkInventoryActionSchema>;

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

export const bulkUploadPreviewSchema = z.object({
	total_rows: z.number().int(),
	rows: z.array(z.record(z.string(), z.unknown())),
	errors: z.array(
		z.object({
			row_number: z.number().int(),
			field: z.string(),
			code: z.string(),
			message: z.string()
		})
	)
});
export type BulkUploadPreview = z.output<typeof bulkUploadPreviewSchema>;

export const bulkUploadResultSchema = z.object({
	inserted: z.number().int(),
	updated: z.number().int(),
	failed: z.number().int(),
	errors: z
		.array(
			z.object({
				row_number: z.number().int(),
				field: z.string().optional(),
				code: z.string(),
				message: z.string()
			})
		)
		.default([])
});
export type BulkUploadResult = z.output<typeof bulkUploadResultSchema>;
