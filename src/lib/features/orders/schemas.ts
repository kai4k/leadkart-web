/**
 * Order schemas (CRM module 2 — see
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`).
 *
 * Backend lives at /v1/orders. All responses are Zod-parsed at the
 * gateway boundary (`parseResponse` in api.ts). Schemas mirror the
 * draft OpenAPI contract; regenerate when backend ships codegen.
 */
import { z } from 'zod';

// ── Status enum + transition diagram ─────────────────────────────────

export const orderStatusSchema = z.enum([
	'draft',
	'pending',
	'confirmed',
	'shipped',
	'delivered',
	'cancelled',
	'refunded'
]);
export type OrderStatus = z.output<typeof orderStatusSchema>;

// ── Line item ────────────────────────────────────────────────────────

export const orderItemDtoSchema = z.object({
	sku: z.string().min(1),
	name: z.string(),
	quantity: z.number().int().min(1),
	unit_price: z.number().nonnegative(),
	line_total: z.number().nonnegative(),
	discount: z.number().nonnegative().default(0).optional(),
	tax_rate: z.number().nonnegative().default(0).optional()
});
export type OrderItemDto = z.output<typeof orderItemDtoSchema>;

// ── Order DTO ────────────────────────────────────────────────────────

// Per the project canon: accept any string for UUID/email fields so
// fixtures (`00000000-0000-4000-8000-...`) don't get rejected. The
// server validates the canonical formats.
export const orderDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	order_number: z.string(),
	status: orderStatusSchema,
	customer_lead_id: z.string(),
	customer_name: z.string(),
	customer_email: z.string().optional().nullable(),
	items: z.array(orderItemDtoSchema),
	subtotal: z.number().nonnegative(),
	tax_total: z.number().nonnegative(),
	discount_total: z.number().nonnegative().default(0).optional(),
	total: z.number().nonnegative(),
	currency: z.string(),
	placed_at: z.string(),
	expected_delivery_at: z.string().optional().nullable(),
	delivered_at: z.string().optional().nullable(),
	cancelled_at: z.string().optional().nullable(),
	cancel_reason: z.string().optional().nullable(),
	tracking_number: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
	created_by_membership_id: z.string().optional()
});
export type OrderDto = z.output<typeof orderDtoSchema>;

// ── List envelope ────────────────────────────────────────────────────

export const listOrdersResponseSchema = z.object({
	items: z.array(orderDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().optional().nullable(),
	total_count: z.number().int().optional().nullable()
});
export type ListOrdersResponse = z.output<typeof listOrdersResponseSchema>;

// ── Create / Update request schemas ──────────────────────────────────

/**
 * `name` is optional — server denormalizes from inventory when
 * omitted. The schema accepts an empty string as "omitted" so a
 * blank UI field doesn't trip `.min(1)`. The drawer's submit handler
 * still strips empty strings before POST.
 */
export const createOrderItemSchema = z.object({
	sku: z.string().min(1, 'SKU is required'),
	name: z.string().max(200).optional(),
	quantity: z.number().int().min(1, 'Quantity must be at least 1'),
	unit_price: z.number().nonnegative('Price must be ≥ 0'),
	discount: z.number().nonnegative().optional(),
	tax_rate: z.number().nonnegative().optional()
});
export type CreateOrderItem = z.output<typeof createOrderItemSchema>;

export const createOrderRequestSchema = z.object({
	customer_lead_id: z.string().min(1, 'Customer is required'),
	customer_name: z.string().max(200).optional(),
	customer_email: z.string().max(254).optional(),
	items: z.array(createOrderItemSchema).min(1, 'At least one line item is required'),
	currency: z.string().min(3).max(3).default('USD'),
	expected_delivery_at: z.string().max(64).optional(),
	notes: z.string().max(4000).optional()
});
export type CreateOrderRequest = z.output<typeof createOrderRequestSchema>;

export const updateOrderRequestSchema = createOrderRequestSchema.partial();
export type UpdateOrderRequest = z.output<typeof updateOrderRequestSchema>;

// ── Status transition requests ───────────────────────────────────────

export const shipOrderRequestSchema = z.object({
	tracking_number: z.string().optional().or(z.literal(''))
});
export type ShipOrderRequest = z.output<typeof shipOrderRequestSchema>;

export const cancelOrderRequestSchema = z.object({
	reason: z.string().min(1, 'Reason is required').max(1024)
});
export type CancelOrderRequest = z.output<typeof cancelOrderRequestSchema>;

export const refundOrderRequestSchema = z.object({
	reason: z.string().min(1, 'Reason is required').max(1024)
});
export type RefundOrderRequest = z.output<typeof refundOrderRequestSchema>;

// ── Bulk action ──────────────────────────────────────────────────────

export const bulkOrderActionSchema = z.enum(['cancel', 'delete_drafts']);
export type BulkOrderAction = z.output<typeof bulkOrderActionSchema>;

export const bulkOrderActionRequestSchema = z.object({
	ids: z.array(z.string()).min(1, 'Select at least one order').max(500),
	action: bulkOrderActionSchema,
	reason: z.string().max(1024).optional()
});
export type BulkOrderActionRequest = z.output<typeof bulkOrderActionRequestSchema>;

export const bulkOrderActionResultSchema = z.object({
	affected: z.number().int().nonnegative(),
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
export type BulkOrderActionResult = z.output<typeof bulkOrderActionResultSchema>;

// ── Bulk upload preview + commit ─────────────────────────────────────

export const bulkUploadErrorSchema = z.object({
	row_number: z.number().int().min(1),
	field: z.string(),
	code: z.string(),
	message: z.string()
});
export type BulkUploadError = z.output<typeof bulkUploadErrorSchema>;

/**
 * Server-side preview for the flat row-per-line-item CSV format.
 * `rows` is the parsed echo; `orders_preview` groups rows into
 * orders by their `order_external_id` column so the UI can show
 * grouped totals before commit.
 */
export const bulkUploadOrderPreviewSchema = z.object({
	order_external_id: z.string(),
	customer_name: z.string(),
	line_item_count: z.number().int().nonnegative(),
	subtotal: z.number().nonnegative(),
	total: z.number().nonnegative()
});
export type BulkUploadOrderPreview = z.output<typeof bulkUploadOrderPreviewSchema>;

export const bulkUploadPreviewSchema = z.object({
	total_rows: z.number().int().nonnegative(),
	rows: z.array(z.record(z.string(), z.unknown())).default([]),
	orders_preview: z.array(bulkUploadOrderPreviewSchema).default([]),
	errors: z.array(bulkUploadErrorSchema).default([])
});
export type BulkUploadPreview = z.output<typeof bulkUploadPreviewSchema>;

export const bulkUploadResultSchema = z.object({
	inserted: z.number().int().nonnegative(),
	updated: z.number().int().nonnegative().default(0),
	failed: z.number().int().nonnegative(),
	errors: z.array(bulkUploadErrorSchema).default([])
});
export type BulkUploadResult = z.output<typeof bulkUploadResultSchema>;
