/**
 * Gateway for the CRM Leads module (`/v1/crm/leads`).
 *
 * Layer rule (CLAUDE.md): components NEVER fetch directly. They go
 * through this gateway via TanStack hooks in queries.ts. All responses
 * are Zod-parsed at the boundary via `parseResponse`.
 *
 * BFF cookie-auth: `api.*` already routes through `/api/*` (SvelteKit
 * proxy) which injects Bearer + `X-Tenant-Id` server-side from the
 * scope cookie. Multipart uploads bypass the JSON helper because the
 * body must be `FormData`; the proxy still forwards both untouched.
 */
import { seg } from '#lib/utils/path-segment.ts';
import { api, apiLegacy, parseResponse } from '#lib/api/client.ts';
import { CSV_TYPE, downloadBlob } from '#lib/utils/download.ts';
import {
	crmLeadDtoSchema,
	listLeadsResponseSchema,
	listCallLogsResponseSchema,
	callLogDtoSchema,
	listRemindersResponseSchema,
	reminderDtoSchema,
	listAssignmentHistoryResponseSchema,
	bulkActionResultSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	type CrmLeadDto,
	type ListLeadsResponse,
	type ListLeadsParams,
	type UpdateLeadRequest,
	type ReassignLeadRequest,
	type LogCallRequest,
	type CallLogDto,
	type ListCallLogsResponse,
	type ReminderDto,
	type ReminderAction,
	type ListRemindersResponse,
	type ListAssignmentHistoryResponse,
	type BulkLeadActionRequest,
	type BulkActionResult,
	type BulkUploadPreview,
	type BulkUploadResult
} from './schemas';

// ── List ────────────────────────────────────────────────────────────

function buildListQuery(params: ListLeadsParams = {}): string {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.q) qs.set('q', params.q);
	for (const s of params.stage ?? []) qs.append('stage', s);
	for (const t of params.temperature ?? []) qs.append('temperature', t);
	if (params.owner_membership_id) qs.set('owner_membership_id', params.owner_membership_id);
	if (params.pin_code) qs.set('pin_code', params.pin_code);
	if (params.city) qs.set('city', params.city);
	if (params.state) qs.set('state', params.state);
	for (const r of params.product_range ?? []) qs.append('product_range', r);
	for (const d of params.dosage_form ?? []) qs.append('dosage_form', d);
	if (params.business_type) qs.set('business_type', params.business_type);
	if (params.medicine_system) qs.set('medicine_system', params.medicine_system);
	if (params.order_value_band) qs.set('order_value_band', params.order_value_band);
	if (params.buy_timeline) qs.set('buy_timeline', params.buy_timeline);
	if (params.has_drug_licence != null) qs.set('has_drug_licence', String(params.has_drug_licence));
	if (params.has_gst != null) qs.set('has_gst', String(params.has_gst));
	if (params.gst_verified != null) qs.set('gst_verified', String(params.gst_verified));
	if (params.created_from) qs.set('created_from', params.created_from);
	if (params.created_to) qs.set('created_to', params.created_to);
	if (params.sort) qs.set('sort', params.sort);
	const q = qs.toString();
	return q ? `/v1/crm/leads?${q}` : '/v1/crm/leads';
}

export async function listLeads(params: ListLeadsParams = {}): Promise<ListLeadsResponse> {
	const raw = await apiLegacy.get<unknown>(buildListQuery(params));
	return parseResponse(listLeadsResponseSchema, raw);
}

export async function getLead(id: string): Promise<CrmLeadDto> {
	const raw = await apiLegacy.get<unknown>(`/v1/crm/leads/${seg(id)}`);
	return parseResponse(crmLeadDtoSchema, raw);
}

export async function updateLead(id: string, req: UpdateLeadRequest): Promise<CrmLeadDto> {
	const raw = await apiLegacy.patch<unknown>(`/v1/crm/leads/${seg(id)}`, req);
	return parseResponse(crmLeadDtoSchema, raw);
}

export async function reassignLead(id: string, req: ReassignLeadRequest): Promise<CrmLeadDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/crm/leads/${seg(id)}/reassign`, req);
	return parseResponse(crmLeadDtoSchema, raw);
}

// ── CallLogs ────────────────────────────────────────────────────────

export async function listCallLogs(leadId: string): Promise<ListCallLogsResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/crm/leads/${seg(leadId)}/calls`);
	return parseResponse(listCallLogsResponseSchema, raw);
}

export async function logCall(leadId: string, req: LogCallRequest): Promise<CallLogDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/crm/leads/${seg(leadId)}/calls`, req);
	return parseResponse(callLogDtoSchema, raw);
}

// ── Reminders ───────────────────────────────────────────────────────

export async function listLeadReminders(leadId: string): Promise<ListRemindersResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/crm/leads/${seg(leadId)}/reminders`);
	return parseResponse(listRemindersResponseSchema, raw);
}

export async function updateReminder(
	id: string,
	action: ReminderAction,
	body: { snooze_until?: string } = {}
): Promise<ReminderDto> {
	const raw = await apiLegacy.patch<unknown>(`/v1/crm/leads/reminders/${seg(id)}`, {
		action,
		...body
	});
	return parseResponse(reminderDtoSchema, raw);
}

export interface CrossReminderParams {
	role?: 'mine' | 'team';
	status?: 'pending' | 'all';
	due_window?: 'today' | 'upcoming' | 'overdue';
}

export async function listReminders(
	params: CrossReminderParams = {}
): Promise<ListRemindersResponse> {
	const qs = new URLSearchParams();
	if (params.role) qs.set('role', params.role);
	if (params.status) qs.set('status', params.status);
	if (params.due_window) qs.set('due_window', params.due_window);
	const q = qs.toString();
	const raw = await apiLegacy.get<unknown>(q ? `/v1/crm/reminders?${q}` : '/v1/crm/reminders');
	return parseResponse(listRemindersResponseSchema, raw);
}

// ── Assignment history ──────────────────────────────────────────────

export async function listAssignmentHistory(
	leadId: string
): Promise<ListAssignmentHistoryResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/crm/leads/${seg(leadId)}/history`);
	return parseResponse(listAssignmentHistoryResponseSchema, raw);
}

// ── Bulk action ─────────────────────────────────────────────────────

export async function bulkLeadAction(req: BulkLeadActionRequest): Promise<BulkActionResult> {
	const raw = await apiLegacy.post<unknown>('/v1/crm/leads/bulk-action', req);
	return parseResponse(bulkActionResultSchema, raw);
}

// ── Multipart bulk upload ───────────────────────────────────────────

export async function bulkUploadPreview(file: File): Promise<BulkUploadPreview> {
	const fd = new FormData();
	fd.append('file', file);
	return api.postForm('/v1/crm/leads/bulk-upload/preview', fd, bulkUploadPreviewSchema);
}

export async function bulkUploadCommit(
	file: File,
	upsertBy: 'mobile_number' | 'none' = 'none'
): Promise<BulkUploadResult> {
	const fd = new FormData();
	fd.append('file', file);
	fd.append('upsert_by', upsertBy);
	return api.postForm('/v1/crm/leads/bulk-upload/commit', fd, bulkUploadResultSchema);
}

/**
 * CSV export with the same filter set as `listLeads`, saved as a file through the one download
 * helper. Not a link: a plain navigation cannot carry the context header the BFF requires on every
 * call. The Blob is `text/csv` whatever the response said.
 */
export async function exportLeads(params: ListLeadsParams = {}): Promise<void> {
	const csv = await api.getBlob('/v1/crm/leads/export', CSV_TYPE, {
		query: {
			q: params.q,
			stage: params.stage,
			temperature: params.temperature,
			owner_membership_id: params.owner_membership_id
		}
	});
	downloadBlob(csv, 'leads.csv');
}
