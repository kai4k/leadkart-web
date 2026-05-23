/**
 * Gateway for the Leads CRM module (`/v1/leads`).
 *
 * All responses are Zod-parsed at the boundary via `parseResponse`.
 * Components NEVER fetch directly — they go through this file via the
 * TanStack hooks in queries.ts.
 *
 * Multipart uploads (bulk-upload/preview & commit) go through a direct
 * `fetch()` so we can send a FormData body — `api.post` only handles
 * JSON. The BFF proxy forwards the multipart payload to Go untouched.
 */
import { api, parseResponse } from '$api/client';
import { getCsrfToken } from '$api/csrf';
import { ApiError } from '$api/errors';
import {
	leadDtoSchema,
	listLeadsResponseSchema,
	bulkActionResultSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	type LeadDto,
	type ListLeadsResponse,
	type ListLeadsParams,
	type CreateLeadRequest,
	type UpdateLeadRequest,
	type BulkLeadActionRequest,
	type BulkActionResult,
	type BulkUploadPreview,
	type BulkUploadResult
} from './schemas';

function buildListQuery(params: ListLeadsParams = {}): string {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.q) qs.set('q', params.q);
	for (const s of params.stage ?? []) qs.append('stage', s);
	for (const s of params.source ?? []) qs.append('source', s);
	if (params.owner_membership_id) qs.set('owner_membership_id', params.owner_membership_id);
	for (const t of params.tag ?? []) qs.append('tag', t);
	if (params.created_from) qs.set('created_from', params.created_from);
	if (params.created_to) qs.set('created_to', params.created_to);
	if (params.value_min != null) qs.set('value_min', String(params.value_min));
	if (params.value_max != null) qs.set('value_max', String(params.value_max));
	if (params.sort) qs.set('sort', params.sort);
	const q = qs.toString();
	return q ? `/v1/leads?${q}` : '/v1/leads';
}

export async function listLeads(params: ListLeadsParams = {}): Promise<ListLeadsResponse> {
	const raw = await api.get<unknown>(buildListQuery(params));
	return parseResponse(listLeadsResponseSchema, raw);
}

export async function getLead(id: string): Promise<LeadDto> {
	const raw = await api.get<unknown>(`/v1/leads/${id}`);
	return parseResponse(leadDtoSchema, raw);
}

export async function createLead(req: CreateLeadRequest): Promise<LeadDto> {
	const raw = await api.post<unknown>('/v1/leads', req);
	return parseResponse(leadDtoSchema, raw);
}

export async function updateLead(id: string, req: UpdateLeadRequest): Promise<LeadDto> {
	const raw = await api.patch<unknown>(`/v1/leads/${id}`, req);
	return parseResponse(leadDtoSchema, raw);
}

export async function deleteLead(id: string): Promise<LeadDto> {
	const raw = await api.delete<unknown>(`/v1/leads/${id}`);
	return parseResponse(leadDtoSchema, raw);
}

export async function bulkLeadAction(req: BulkLeadActionRequest): Promise<BulkActionResult> {
	const raw = await api.post<unknown>('/v1/leads/bulk-action', req);
	return parseResponse(bulkActionResultSchema, raw);
}

/**
 * Send a multipart upload directly via fetch — `api.post` only handles
 * JSON. The BFF proxy at `/api/[...path]` forwards the body and content-type
 * untouched, so we just need the CSRF echo header.
 */
async function multipartPost<T>(path: string, formData: FormData): Promise<T> {
	const csrf = getCsrfToken();
	const headers = new Headers();
	if (csrf) headers.set('X-CSRF-Token', csrf);
	headers.set('Accept', 'application/json');

	let resp: Response;
	try {
		resp = await fetch(`/api${path}`, {
			method: 'POST',
			headers,
			credentials: 'same-origin',
			body: formData
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}

	const text = await resp.text();
	const parsed: unknown = text.length > 0 ? safeJsonParse(text) : null;
	if (!resp.ok) {
		throw ApiError.fromResponse(resp, parsed as never);
	}
	return parsed as T;
}

function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

export async function bulkUploadPreview(file: File): Promise<BulkUploadPreview> {
	const fd = new FormData();
	fd.append('file', file);
	const raw = await multipartPost<unknown>('/v1/leads/bulk-upload/preview', fd);
	return parseResponse(bulkUploadPreviewSchema, raw);
}

export async function bulkUploadCommit(
	file: File,
	upsertBy: 'email' | 'phone' | 'none' = 'none'
): Promise<BulkUploadResult> {
	const fd = new FormData();
	fd.append('file', file);
	fd.append('upsert_by', upsertBy);
	const raw = await multipartPost<unknown>('/v1/leads/bulk-upload/commit', fd);
	return parseResponse(bulkUploadResultSchema, raw);
}

/**
 * CSV export — returns the URL the browser should navigate to so the
 * browser handles the download stream natively. Same filter set as list.
 */
export function leadsExportUrl(params: ListLeadsParams = {}): string {
	const qs = new URLSearchParams();
	if (params.q) qs.set('q', params.q);
	for (const s of params.stage ?? []) qs.append('stage', s);
	for (const s of params.source ?? []) qs.append('source', s);
	if (params.owner_membership_id) qs.set('owner_membership_id', params.owner_membership_id);
	for (const t of params.tag ?? []) qs.append('tag', t);
	if (params.created_from) qs.set('created_from', params.created_from);
	if (params.created_to) qs.set('created_to', params.created_to);
	if (params.value_min != null) qs.set('value_min', String(params.value_min));
	if (params.value_max != null) qs.set('value_max', String(params.value_max));
	if (params.sort) qs.set('sort', params.sort);
	const q = qs.toString();
	return q ? `/api/v1/leads/export?${q}` : '/api/v1/leads/export';
}
