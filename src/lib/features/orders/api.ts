/**
 * Gateway for CRM orders (per
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md`).
 *
 * All responses are Zod-parsed at the boundary via `parseResponse`.
 * Components NEVER call `fetch` directly — they call into this module
 * (CLAUDE.md rule 6).
 */
import { api, parseResponse } from '$api/client';
import { getCsrfToken } from '$api/csrf';
import { ApiError } from '$api/errors';
import {
	bulkOrderActionResultSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	listOrdersResponseSchema,
	orderDtoSchema,
	type BulkOrderActionRequest,
	type BulkOrderActionResult,
	type BulkUploadPreview,
	type BulkUploadResult,
	type CancelOrderRequest,
	type CreateOrderRequest,
	type ListOrdersResponse,
	type OrderDto,
	type OrderStatus,
	type RefundOrderRequest,
	type ShipOrderRequest,
	type UpdateOrderRequest
} from './schemas';

// ── List ─────────────────────────────────────────────────────────────

export interface ListOrdersParams {
	cursor?: string;
	limit?: number;
	q?: string;
	status?: OrderStatus[];
	customer_lead_id?: string;
	placed_from?: string;
	placed_to?: string;
	total_min?: number;
	total_max?: number;
	sort?: string;
}

function buildListQuery(params: ListOrdersParams = {}): string {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.q) qs.set('q', params.q);
	if (params.status?.length) {
		for (const s of params.status) qs.append('status', s);
	}
	if (params.customer_lead_id) qs.set('customer_lead_id', params.customer_lead_id);
	if (params.placed_from) qs.set('placed_from', params.placed_from);
	if (params.placed_to) qs.set('placed_to', params.placed_to);
	if (params.total_min != null) qs.set('total_min', String(params.total_min));
	if (params.total_max != null) qs.set('total_max', String(params.total_max));
	if (params.sort) qs.set('sort', params.sort);
	const q = qs.toString();
	return q ? `/v1/orders?${q}` : '/v1/orders';
}

export async function listOrders(params?: ListOrdersParams): Promise<ListOrdersResponse> {
	const raw = await api.get<unknown>(buildListQuery(params));
	return parseResponse(listOrdersResponseSchema, raw);
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function getOrder(id: string): Promise<OrderDto> {
	const raw = await api.get<unknown>(`/v1/orders/${id}`);
	return parseResponse(orderDtoSchema, raw);
}

export async function createOrder(req: CreateOrderRequest): Promise<OrderDto> {
	const raw = await api.post<unknown>('/v1/orders', req);
	return parseResponse(orderDtoSchema, raw);
}

export async function updateOrder(id: string, req: UpdateOrderRequest): Promise<OrderDto> {
	const raw = await api.patch<unknown>(`/v1/orders/${id}`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function deleteOrder(id: string): Promise<OrderDto> {
	const raw = await api.delete<unknown>(`/v1/orders/${id}`);
	return parseResponse(orderDtoSchema, raw);
}

// ── Status transitions ───────────────────────────────────────────────

export async function confirmOrder(id: string): Promise<OrderDto> {
	const raw = await api.post<unknown>(`/v1/orders/${id}/confirm`, {});
	return parseResponse(orderDtoSchema, raw);
}

export async function shipOrder(id: string, req: ShipOrderRequest = {}): Promise<OrderDto> {
	const raw = await api.post<unknown>(`/v1/orders/${id}/ship`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function deliverOrder(id: string): Promise<OrderDto> {
	const raw = await api.post<unknown>(`/v1/orders/${id}/deliver`, {});
	return parseResponse(orderDtoSchema, raw);
}

export async function cancelOrder(id: string, req: CancelOrderRequest): Promise<OrderDto> {
	const raw = await api.post<unknown>(`/v1/orders/${id}/cancel`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function refundOrder(id: string, req: RefundOrderRequest): Promise<OrderDto> {
	const raw = await api.post<unknown>(`/v1/orders/${id}/refund`, req);
	return parseResponse(orderDtoSchema, raw);
}

// ── Bulk action ──────────────────────────────────────────────────────

export async function bulkOrderAction(req: BulkOrderActionRequest): Promise<BulkOrderActionResult> {
	const raw = await api.post<unknown>('/v1/orders/bulk-action', req);
	return parseResponse(bulkOrderActionResultSchema, raw);
}

// ── Bulk upload (multipart) ──────────────────────────────────────────

/**
 * Multipart upload bypasses the JSON client helpers — we do a raw
 * `fetch` to the BFF proxy. The BFF reads the upstream Content-Type
 * verbatim, so a boundary'd multipart/form-data round-trips correctly.
 * CSRF token is still required (BFF enforces it on every mutation).
 */
async function postMultipart<T>(path: string, form: FormData): Promise<T> {
	const headers = new Headers();
	// Read the non-httpOnly CSRF cookie + echo as header (double-submit).
	const csrf = getCsrfToken();
	if (csrf) headers.set('X-CSRF-Token', csrf);
	headers.set('Accept', 'application/json');

	let resp: Response;
	try {
		resp = await fetch(`/api${path.startsWith('/') ? path : '/' + path}`, {
			method: 'POST',
			credentials: 'same-origin',
			headers,
			body: form
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}
	const text = await resp.text();
	const parsed: unknown = text ? safeJsonParse(text) : null;
	if (!resp.ok) {
		throw ApiError.fromResponse(resp, parsed as Parameters<typeof ApiError.fromResponse>[1]);
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

export async function previewBulkUpload(file: File): Promise<BulkUploadPreview> {
	const form = new FormData();
	form.append('file', file);
	const raw = await postMultipart<unknown>('/v1/orders/bulk-upload/preview', form);
	return parseResponse(bulkUploadPreviewSchema, raw);
}

export async function commitBulkUpload(
	file: File,
	opts: { upsert_by?: 'order_external_id' | 'none' } = {}
): Promise<BulkUploadResult> {
	const form = new FormData();
	form.append('file', file);
	form.append('upsert_by', opts.upsert_by ?? 'none');
	const raw = await postMultipart<unknown>('/v1/orders/bulk-upload/commit', form);
	return parseResponse(bulkUploadResultSchema, raw);
}

// ── Export ───────────────────────────────────────────────────────────

/**
 * Returns the CSV export as a Blob — callers should pipe to an
 * `<a download>` synthetic click. Goes through the BFF proxy.
 */
export async function exportOrdersCsv(params?: ListOrdersParams): Promise<Blob> {
	const qs = buildListQuery(params).replace('/v1/orders', '/v1/orders/export');
	let resp: Response;
	try {
		resp = await fetch(`/api${qs}`, {
			method: 'GET',
			credentials: 'same-origin',
			headers: { Accept: 'text/csv' }
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}
	if (!resp.ok) {
		const text = await resp.text();
		const parsed: unknown = text ? safeJsonParse(text) : null;
		throw ApiError.fromResponse(resp, parsed as Parameters<typeof ApiError.fromResponse>[1]);
	}
	return resp.blob();
}
