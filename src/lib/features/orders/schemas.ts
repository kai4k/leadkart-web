/**
 * Order schemas (CRM module 2 — see
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`).
 *
 * Backend lives at /v1/orders. All responses are Zod-parsed at the
 * gateway boundary via `parseResponse` in `api.ts`. Schemas mirror the
 * draft OpenAPI contract; regenerate when the backend ships codegen.
 *
 * State machine (per Go ADR 0035 — state-based + outbox, no
 * event sourcing): quotation_draft → quotation_revised* →
 * quotation_approved → token_payment_received → confirmed → packed →
 * invoice_generated → dispatched → delivered → complete. Cancellation
 * available at any post-confirm state.
 *
 * UUIDs are validated as `z.string()` (not `.uuid()`) so fixtures with
 * all-zero IDs don't trip the parser — the server is the authoritative
 * validator. INR is the only currency at v0.1.
 */
import { z } from 'zod';

// ── Order status enum (full lifecycle) ───────────────────────────────

export const orderStatusSchema = z.enum([
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
]);
export type OrderStatus = z.output<typeof orderStatusSchema>;

// ── Order item ───────────────────────────────────────────────────────

export const orderItemDtoSchema = z.object({
	product_id: z.string(),
	batch_id: z.string(),
	batch_number: z.string(),
	brand_name: z.string(),
	pack_size: z.string().optional(),
	hsn_code: z.string().optional(),
	quantity: z.number().int().min(1),
	unit_price: z.number().nonnegative(),
	discount_percentage: z.number().min(0).max(100).default(0).optional(),
	gst_percentage: z.number().nonnegative(),
	line_total: z.number().nonnegative(),
	line_gst: z.number().nonnegative().optional()
});
export type OrderItemDto = z.output<typeof orderItemDtoSchema>;

// ── Quotation revisions ──────────────────────────────────────────────

export const quotationRevisionDtoSchema = z.object({
	revision_number: z.number().int().min(1),
	items: z.array(orderItemDtoSchema),
	subtotal: z.number().nonnegative(),
	gst_total: z.number().nonnegative(),
	discount_total: z.number().nonnegative().default(0).optional(),
	total: z.number().nonnegative(),
	notes: z.string().max(2000).nullable().optional(),
	revised_by_membership_id: z.string(),
	revised_at: z.string()
});
export type QuotationRevisionDto = z.output<typeof quotationRevisionDtoSchema>;

// ── Payments ─────────────────────────────────────────────────────────

export const paymentKindSchema = z.enum(['token', 'full']);
export type PaymentKind = z.output<typeof paymentKindSchema>;

export const paymentMethodSchema = z.enum([
	'cash',
	'upi',
	'bank_transfer',
	'cheque',
	'card',
	'other'
]);
export type PaymentMethod = z.output<typeof paymentMethodSchema>;

export const paymentDtoSchema = z.object({
	id: z.string(),
	order_id: z.string(),
	kind: paymentKindSchema,
	amount: z.number().nonnegative(),
	method: paymentMethodSchema,
	reference: z.string().max(200).nullable().optional(),
	received_at: z.string(),
	received_by_membership_id: z.string()
});
export type PaymentDto = z.output<typeof paymentDtoSchema>;

// ── Invoice ──────────────────────────────────────────────────────────

export const invoiceStatusSchema = z.enum(['active', 'cancelled']);
export type InvoiceStatus = z.output<typeof invoiceStatusSchema>;

export const invoiceDtoSchema = z.object({
	id: z.string(),
	order_id: z.string(),
	invoice_number: z.string(),
	fy: z.string(),
	generated_at: z.string(),
	taxable_total: z.number().nonnegative(),
	gst_total: z.number().nonnegative(),
	grand_total: z.number().nonnegative(),
	status: invoiceStatusSchema,
	cancelled_at: z.string().nullable().optional(),
	cancellation_reason: z.string().nullable().optional()
});
export type InvoiceDto = z.output<typeof invoiceDtoSchema>;

// ── Credit note ──────────────────────────────────────────────────────

export const creditNoteDtoSchema = z.object({
	id: z.string(),
	order_id: z.string(),
	invoice_id: z.string(),
	credit_note_number: z.string(),
	fy: z.string(),
	issued_at: z.string(),
	amount: z.number().nonnegative(),
	reason: z.string().max(500)
});
export type CreditNoteDto = z.output<typeof creditNoteDtoSchema>;

// ── Order DTO ────────────────────────────────────────────────────────

export const orderDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	order_number: z.string(),
	status: orderStatusSchema,

	customer_lead_id: z.string(),
	customer_name: z.string(),
	customer_gst_number: z.string().nullable().optional(),

	current_items: z.array(orderItemDtoSchema),
	current_subtotal: z.number().nonnegative(),
	current_gst_total: z.number().nonnegative(),
	current_discount_total: z.number().nonnegative().default(0).optional(),
	current_total: z.number().nonnegative(),
	currency: z.string().default('INR'),

	revisions: z.array(quotationRevisionDtoSchema).default([]),
	payments: z.array(paymentDtoSchema).default([]),
	invoice_id: z.string().nullable().optional(),
	credit_note_ids: z.array(z.string()).default([]).optional(),
	consignment_id: z.string().nullable().optional(),

	quotation_approved_at: z.string().nullable().optional(),
	confirmed_at: z.string().nullable().optional(),
	packed_at: z.string().nullable().optional(),
	invoice_generated_at: z.string().nullable().optional(),
	dispatched_at: z.string().nullable().optional(),
	delivered_at: z.string().nullable().optional(),
	completed_at: z.string().nullable().optional(),
	cancelled_at: z.string().nullable().optional(),
	cancel_reason: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),

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

export const listRevisionsResponseSchema = z.object({
	items: z.array(quotationRevisionDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().optional().nullable()
});
export type ListRevisionsResponse = z.output<typeof listRevisionsResponseSchema>;

export const listPaymentsResponseSchema = z.object({
	items: z.array(paymentDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().optional().nullable()
});
export type ListPaymentsResponse = z.output<typeof listPaymentsResponseSchema>;

export const listCreditNotesResponseSchema = z.object({
	items: z.array(creditNoteDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().optional().nullable()
});
export type ListCreditNotesResponse = z.output<typeof listCreditNotesResponseSchema>;

// ── Create / Revise quotation request ────────────────────────────────

export const createOrderItemSchema = z.object({
	product_id: z.string().min(1, 'Product is required'),
	batch_id: z.string().min(1, 'Batch is required'),
	quantity: z.number().int().min(1, 'Quantity must be at least 1'),
	unit_price: z.number().nonnegative('Price must be ≥ 0'),
	// Default to 0 so the form input shape ALSO has a `number` instead
	// of `number | undefined` — matters because the line-items editor
	// binds NumberInput directly to this field.
	discount_percentage: z.number().min(0).max(100).default(0)
});
export type CreateOrderItem = z.output<typeof createOrderItemSchema>;

export const createQuotationRequestSchema = z.object({
	customer_lead_id: z.string().min(1, 'Customer is required'),
	items: z.array(createOrderItemSchema).min(1, 'At least one line item is required'),
	notes: z.string().max(2000).optional()
});
export type CreateQuotationRequest = z.output<typeof createQuotationRequestSchema>;

export const reviseQuotationRequestSchema = z.object({
	items: z.array(createOrderItemSchema).min(1, 'At least one line item is required'),
	notes: z.string().max(2000).optional()
});
export type ReviseQuotationRequest = z.output<typeof reviseQuotationRequestSchema>;

// ── State transition requests ────────────────────────────────────────

export const approveQuotationRequestSchema = z.object({
	notes: z.string().max(2000).optional()
});
export type ApproveQuotationRequest = z.output<typeof approveQuotationRequestSchema>;

export const markPackedRequestSchema = z.object({
	box_count: z.number().int().min(1, 'Box count must be at least 1'),
	packed_by_membership_id: z.string().optional()
});
export type MarkPackedRequest = z.output<typeof markPackedRequestSchema>;

export const markDeliveredRequestSchema = z.object({
	delivered_at: z.string().optional()
});
export type MarkDeliveredRequest = z.output<typeof markDeliveredRequestSchema>;

export const dispatchRequestSchema = z.object({
	carrier: z.string().min(1, 'Carrier is required').optional(),
	tracking_number: z.string().optional(),
	notes: z.string().max(1000).optional()
});
export type DispatchRequest = z.output<typeof dispatchRequestSchema>;

export const cancelOrderRequestSchema = z.object({
	reason: z.string().min(1, 'Reason is required').max(1024)
});
export type CancelOrderRequest = z.output<typeof cancelOrderRequestSchema>;

export const recordPaymentRequestSchema = z.object({
	kind: paymentKindSchema,
	amount: z.number().positive('Amount must be greater than 0'),
	method: paymentMethodSchema,
	reference: z.string().max(200).optional()
});
export type RecordPaymentRequest = z.output<typeof recordPaymentRequestSchema>;

export const updateOrderRequestSchema = z.object({
	notes: z.string().max(4000).nullable().optional()
});
export type UpdateOrderRequest = z.output<typeof updateOrderRequestSchema>;

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
