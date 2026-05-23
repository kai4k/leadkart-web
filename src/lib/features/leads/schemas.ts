/**
 * Leads module schemas (CRM contract — docs/superpowers/specs/2026-05-23-crm-modules-contracts.md).
 *
 * Source of truth is the OpenAPI spec on the Go side; these hand-rolled
 * Zod schemas mirror LeadDto + request envelopes for boundary parsing
 * at the gateway. Keep in sync when the backend spec moves; regenerate
 * via `npm run openapi:codegen` once the backend ships.
 *
 * UUID strings are intentionally NOT validated with `.uuid()` — Zod 4's
 * strict UUIDv4 variant check rejects the all-zeros test fixtures used
 * across the codebase. Server-side validation is the source of truth.
 */
import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────────────

export const leadStageSchema = z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']);
export type LeadStage = z.output<typeof leadStageSchema>;

export const leadSourceSchema = z.enum([
	'website',
	'referral',
	'ads',
	'marketplace',
	'manual',
	'import',
	'other'
]);
export type LeadSource = z.output<typeof leadSourceSchema>;

export const bulkActionSchema = z.enum([
	'assign_owner',
	'change_stage',
	'add_tag',
	'remove_tag',
	'delete'
]);
export type BulkAction = z.output<typeof bulkActionSchema>;

// ── DTO ─────────────────────────────────────────────────────────────

export const leadDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	full_name: z.string(),
	company: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	source: leadSourceSchema,
	stage: leadStageSchema,
	value: z.number().nullable().optional(),
	currency: z.string().default('USD'),
	owner_membership_id: z.string().nullable().optional(),
	tags: z.array(z.string()).default([]),
	notes: z.string().nullable().optional(),
	last_contacted_at: z.string().nullable().optional(),
	next_followup_at: z.string().nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	created_by_membership_id: z.string().optional()
});
export type LeadDto = z.output<typeof leadDtoSchema>;

// ── List envelope ───────────────────────────────────────────────────

export const listLeadsResponseSchema = z.object({
	items: z.array(leadDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListLeadsResponse = z.output<typeof listLeadsResponseSchema>;

// ── Create / Update ─────────────────────────────────────────────────

export const createLeadSchema = z.object({
	full_name: z.string().min(1, 'Full name is required').max(200),
	company: z.string().max(200).optional(),
	email: z.string().email('Enter a valid email').optional().or(z.literal('')),
	phone: z.string().max(32).optional(),
	source: leadSourceSchema,
	stage: leadStageSchema,
	value: z.number().min(0).optional(),
	currency: z.string().min(3).max(3).default('USD'),
	owner_membership_id: z.string().optional(),
	tags: z.array(z.string()).default([]),
	notes: z.string().max(4000).optional(),
	next_followup_at: z.string().optional()
});
export type CreateLeadRequest = z.output<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial();
export type UpdateLeadRequest = z.output<typeof updateLeadSchema>;

// ── Bulk action ─────────────────────────────────────────────────────

export const bulkLeadActionSchema = z.object({
	ids: z.array(z.string()).min(1).max(500),
	action: bulkActionSchema,
	owner_membership_id: z.string().optional(),
	stage: leadStageSchema.optional(),
	tag: z.string().optional()
});
export type BulkLeadActionRequest = z.output<typeof bulkLeadActionSchema>;

export const bulkActionResultSchema = z.object({
	affected: z.number().int(),
	errors: z
		.array(
			z.object({
				id: z.string().optional(),
				code: z.string(),
				message: z.string()
			})
		)
		.default([])
});
export type BulkActionResult = z.output<typeof bulkActionResultSchema>;

// ── Bulk upload ─────────────────────────────────────────────────────

export const bulkUploadErrorSchema = z.object({
	row_number: z.number().int().min(1),
	field: z.string(),
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

// ── List params ─────────────────────────────────────────────────────

export interface ListLeadsParams {
	cursor?: string;
	limit?: number;
	q?: string;
	stage?: LeadStage[];
	source?: LeadSource[];
	owner_membership_id?: string;
	tag?: string[];
	created_from?: string;
	created_to?: string;
	value_min?: number;
	value_max?: number;
	sort?: string;
}
