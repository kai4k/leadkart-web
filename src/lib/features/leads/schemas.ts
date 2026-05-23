/**
 * Leads CRM module schemas (BRD §6.3 — pharma SaaS shape).
 *
 * Source of truth: `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`.
 * Backend ADR 0038: mutations return the updated DTO (200 + body) — these
 * schemas mirror that envelope. Identity fields (contact_name, mobile_number,
 * address pin/city/district/state) are LOCKED at lead-purchase time; PATCH
 * accepts the editable subset only and the server enforces with 422 on
 * locked-field writes.
 *
 * UUID strings are NOT validated with `.uuid()` — Zod 4's strict UUIDv4
 * variant check rejects RFC-4122 v4 fixtures used in our e2e tests. The
 * Go API validates UUIDs server-side; we accept any string here.
 */
import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────────────

export const leadStageSchema = z.enum([
	'new',
	'contacted',
	'interested',
	'negotiation',
	'converted',
	'lost'
]);
export type LeadStage = z.output<typeof leadStageSchema>;

export const leadTemperatureSchema = z.enum(['hot', 'warm', 'cold', 'dead']);
export type LeadTemperature = z.output<typeof leadTemperatureSchema>;

export const businessTypeSchema = z.enum(['pcd', 'third_party']);
export type BusinessType = z.output<typeof businessTypeSchema>;

export const medicineSystemSchema = z.enum(['allopathic', 'ayurvedic']);
export type MedicineSystem = z.output<typeof medicineSystemSchema>;

export const orderValueBandSchema = z.enum([
	'below_5000',
	'upto_25000',
	'upto_50000',
	'above_50000'
]);
export type OrderValueBand = z.output<typeof orderValueBandSchema>;

export const buyTimelineSchema = z.enum(['within_week', 'within_15_days', 'within_month']);
export type BuyTimeline = z.output<typeof buyTimelineSchema>;

export const callOutcomeSchema = z.enum([
	'connected',
	'busy',
	'no_answer',
	'switched_off',
	'wrong_number',
	'do_not_call'
]);
export type CallOutcome = z.output<typeof callOutcomeSchema>;

export const reminderKindSchema = z.enum(['callback', 'three_month_mature', 'manual']);
export type ReminderKind = z.output<typeof reminderKindSchema>;

export const reminderStatusSchema = z.enum(['pending', 'snoozed', 'completed', 'dismissed']);
export type ReminderStatus = z.output<typeof reminderStatusSchema>;

export const bulkActionSchema = z.enum([
	'reassign',
	'change_stage',
	'change_temperature',
	'add_note'
]);
export type BulkAction = z.output<typeof bulkActionSchema>;

// ── Regex (BRD §5 / §6.3) ───────────────────────────────────────────

// Indian mobile: +91 followed by 10 digits starting 6-9.
const MOBILE_RE = /^\+91[6-9][0-9]{9}$/;
// PIN code: 6 digits, first digit non-zero.
const PIN_RE = /^[1-9][0-9]{5}$/;
// GSTIN: 2 state digits + 5 PAN chars + 4 PAN nums + PAN check + entity + Z + check.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;
// PAN: AAAAA9999A.
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const mobileNumberSchema = z
	.string()
	.regex(MOBILE_RE, 'Mobile must be +91 followed by a 10-digit number starting 6-9');
export const pinCodeSchema = z.string().regex(PIN_RE, 'PIN code must be 6 digits, not starting 0');
export const gstinSchema = z
	.string()
	.regex(GSTIN_RE, 'GSTIN must be 15 chars in the canonical pattern');
export const panSchema = z.string().regex(PAN_RE, 'PAN must be AAAAA9999A');

// ── Address (DTO + edit) ────────────────────────────────────────────

export const leadAddressSchema = z.object({
	pin_code: pinCodeSchema,
	city: z.string(),
	district: z.string(),
	state: z.string(),
	street: z.string().max(500).nullable().optional()
});
export type LeadAddress = z.output<typeof leadAddressSchema>;

// ── Core DTO ────────────────────────────────────────────────────────

export const crmLeadDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	platform_lead_id: z.string(),
	purchased_at: z.string(),

	// Contact (locked)
	contact_name: z.string().min(1).max(200),
	mobile_number: mobileNumberSchema,
	email: z.string().email().nullable().optional(),

	// Address (pin/city/district/state locked; street editable)
	address: leadAddressSchema,

	// Compliance
	has_drug_licence: z.boolean(),
	has_gst: z.boolean(),
	gst_number: gstinSchema.nullable().optional(),
	gst_verified: z.boolean(),
	has_pan: z.boolean(),
	pan_number: panSchema.nullable().optional(),

	// Profile
	business_type: businessTypeSchema,
	medicine_system: medicineSystemSchema,
	product_ranges: z.array(z.string()).default([]),
	dosage_forms: z.array(z.string()).default([]),
	order_value_band: orderValueBandSchema,
	buy_timeline: buyTimelineSchema,

	// Pipeline
	stage: leadStageSchema,
	temperature: leadTemperatureSchema,
	last_contacted_at: z.string().nullable().optional(),
	next_followup_at: z.string().nullable().optional(),

	// Assignment
	owner_membership_id: z.string(),

	// Free-form
	notes: z.string().max(4000).nullable().optional(),

	// Audit
	created_at: z.string(),
	updated_at: z.string()
});
export type CrmLeadDto = z.output<typeof crmLeadDtoSchema>;

// ── List envelope ───────────────────────────────────────────────────

export const listLeadsResponseSchema = z.object({
	items: z.array(crmLeadDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListLeadsResponse = z.output<typeof listLeadsResponseSchema>;

// ── PATCH (editable subset) ─────────────────────────────────────────

export const updateLeadSchema = z
	.object({
		stage: leadStageSchema,
		temperature: leadTemperatureSchema,
		next_followup_at: z.string(),
		notes: z.string().max(4000),
		email: z.string().email().or(z.literal('')),
		street: z.string().max(500),
		has_drug_licence: z.boolean(),
		has_gst: z.boolean(),
		gst_number: gstinSchema,
		has_pan: z.boolean(),
		pan_number: panSchema,
		product_ranges: z.array(z.string()),
		dosage_forms: z.array(z.string()),
		order_value_band: orderValueBandSchema,
		buy_timeline: buyTimelineSchema
	})
	.partial();
export type UpdateLeadRequest = z.output<typeof updateLeadSchema>;

// ── Reassignment ────────────────────────────────────────────────────

export const reassignLeadSchema = z.object({
	to_membership_id: z.string().min(1, 'Pick the new owner'),
	reason: z.string().max(500).optional()
});
export type ReassignLeadRequest = z.output<typeof reassignLeadSchema>;

// ── CallLog ─────────────────────────────────────────────────────────

export const callLogDtoSchema = z.object({
	id: z.string(),
	lead_id: z.string(),
	called_at: z.string(),
	outcome: callOutcomeSchema,
	notes: z.string().max(2000).nullable().optional(),
	callback_at: z.string().nullable().optional(),
	callback_window_minutes: z.number().int().nullable().optional(),
	logged_by_membership_id: z.string(),
	created_at: z.string()
});
export type CallLogDto = z.output<typeof callLogDtoSchema>;

export const listCallLogsResponseSchema = z.object({
	items: z.array(callLogDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListCallLogsResponse = z.output<typeof listCallLogsResponseSchema>;

export const logCallSchema = z.object({
	outcome: callOutcomeSchema,
	notes: z.string().max(2000).optional(),
	callback_at: z.string().optional(),
	callback_window_minutes: z.number().int().min(5).max(720).optional()
});
export type LogCallRequest = z.output<typeof logCallSchema>;

// ── Reminder ────────────────────────────────────────────────────────

export const reminderDtoSchema = z.object({
	id: z.string(),
	lead_id: z.string(),
	owner_membership_id: z.string(),
	due_at: z.string(),
	kind: reminderKindSchema,
	status: reminderStatusSchema,
	note: z.string().max(1000).nullable().optional(),
	completed_at: z.string().nullable().optional(),
	completed_by_membership_id: z.string().nullable().optional(),
	created_at: z.string()
});
export type ReminderDto = z.output<typeof reminderDtoSchema>;

export const listRemindersResponseSchema = z.object({
	items: z.array(reminderDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListRemindersResponse = z.output<typeof listRemindersResponseSchema>;

export const reminderActionSchema = z.enum(['complete', 'dismiss', 'snooze']);
export type ReminderAction = z.output<typeof reminderActionSchema>;

// ── AssignmentHistory ───────────────────────────────────────────────

export const assignmentHistoryDtoSchema = z.object({
	id: z.string(),
	lead_id: z.string(),
	from_membership_id: z.string().nullable().optional(),
	to_membership_id: z.string(),
	assigned_at: z.string(),
	assigned_by_membership_id: z.string(),
	reason: z.string().max(500).nullable().optional()
});
export type AssignmentHistoryDto = z.output<typeof assignmentHistoryDtoSchema>;

export const listAssignmentHistoryResponseSchema = z.object({
	items: z.array(assignmentHistoryDtoSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable().optional(),
	total_count: z.number().int().nullable().optional()
});
export type ListAssignmentHistoryResponse = z.output<typeof listAssignmentHistoryResponseSchema>;

// ── Bulk action ─────────────────────────────────────────────────────

export const bulkLeadActionSchema = z.object({
	ids: z.array(z.string()).min(1).max(500),
	action: bulkActionSchema,
	to_membership_id: z.string().optional(),
	stage: leadStageSchema.optional(),
	temperature: leadTemperatureSchema.optional(),
	note: z.string().max(2000).optional(),
	reason: z.string().max(500).optional()
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
	temperature?: LeadTemperature[];
	owner_membership_id?: string;
	pin_code?: string;
	city?: string;
	state?: string;
	product_range?: string[];
	dosage_form?: string[];
	business_type?: BusinessType;
	medicine_system?: MedicineSystem;
	order_value_band?: OrderValueBand;
	buy_timeline?: BuyTimeline;
	has_drug_licence?: boolean;
	has_gst?: boolean;
	gst_verified?: boolean;
	created_from?: string;
	created_to?: string;
	sort?: string;
}
