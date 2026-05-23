/**
 * Gateway for the inventory module (`/v1/inventory/items`).
 *
 * Responsibilities (per CLAUDE.md "Gateway" rule):
 *   - HTTP shape + Zod-parse the response at the boundary.
 *   - NO business logic, NO state mutation.
 *
 * All requests are tenant-scoped via the BFF cookie — no tenant_id in
 * paths or bodies. Multipart uploads go through `request` indirectly:
 * we use a plain `fetch` against `/api/...` so we don't have to teach
 * the JSON-only client about FormData. The BFF proxy still injects
 * cookies + CSRF transparently.
 */
import { api, parseResponse } from '$api/client';
import { getCsrfToken } from '$api/csrf';
import { ApiError } from '$api/errors';
import {
	adjustStockResponseSchema,
	bulkActionResultSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	inventoryItemDtoSchema,
	listInventoryItemsResponseSchema,
	listStockAdjustmentsResponseSchema,
	type AdjustStockRequest,
	type AdjustStockResponse,
	type BulkActionResult,
	type BulkInventoryActionRequest,
	type BulkUploadPreview,
	type BulkUploadResult,
	type CreateInventoryItemRequest,
	type InventoryItemDto,
	type ListInventoryItemsResponse,
	type ListStockAdjustmentsResponse,
	type UpdateInventoryItemRequest
} from './schemas';

export type InventorySort =
	| 'name:asc'
	| 'name:desc'
	| 'current_stock:asc'
	| 'current_stock:desc'
	| 'unit_price:asc'
	| 'unit_price:desc'
	| 'created_at:desc';

export interface ListInventoryParams {
	cursor?: string;
	limit?: number;
	q?: string;
	category?: string[];
	is_active?: boolean;
	low_stock?: boolean;
	sort?: InventorySort;
}

function buildListQuery(params: ListInventoryParams = {}): string {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.q) qs.set('q', params.q);
	if (params.category) {
		for (const c of params.category) qs.append('category', c);
	}
	if (params.is_active != null) qs.set('is_active', String(params.is_active));
	if (params.low_stock != null) qs.set('low_stock', String(params.low_stock));
	if (params.sort) qs.set('sort', params.sort);
	const s = qs.toString();
	return s ? `/v1/inventory/items?${s}` : '/v1/inventory/items';
}

export async function listInventoryItems(
	params?: ListInventoryParams
): Promise<ListInventoryItemsResponse> {
	const raw = await api.get<unknown>(buildListQuery(params));
	return parseResponse(listInventoryItemsResponseSchema, raw);
}

export async function getInventoryItem(id: string): Promise<InventoryItemDto> {
	const raw = await api.get<unknown>(`/v1/inventory/items/${id}`);
	return parseResponse(inventoryItemDtoSchema, raw);
}

export async function createInventoryItem(
	body: CreateInventoryItemRequest
): Promise<InventoryItemDto> {
	const raw = await api.post<unknown>('/v1/inventory/items', body);
	return parseResponse(inventoryItemDtoSchema, raw);
}

export async function updateInventoryItem(
	id: string,
	body: UpdateInventoryItemRequest
): Promise<InventoryItemDto> {
	const raw = await api.patch<unknown>(`/v1/inventory/items/${id}`, body);
	return parseResponse(inventoryItemDtoSchema, raw);
}

export async function deleteInventoryItem(id: string): Promise<InventoryItemDto> {
	const raw = await api.delete<unknown>(`/v1/inventory/items/${id}`);
	return parseResponse(inventoryItemDtoSchema, raw);
}

export async function adjustStock(
	id: string,
	body: AdjustStockRequest
): Promise<AdjustStockResponse> {
	const raw = await api.post<unknown>(`/v1/inventory/items/${id}/adjust-stock`, body);
	return parseResponse(adjustStockResponseSchema, raw);
}

export interface ListAdjustmentsParams {
	cursor?: string;
	limit?: number;
}

export async function listStockAdjustments(
	id: string,
	params?: ListAdjustmentsParams
): Promise<ListStockAdjustmentsResponse> {
	const qs = new URLSearchParams();
	if (params?.cursor) qs.set('cursor', params.cursor);
	if (params?.limit != null) qs.set('limit', String(params.limit));
	const s = qs.toString();
	const path = s
		? `/v1/inventory/items/${id}/adjustments?${s}`
		: `/v1/inventory/items/${id}/adjustments`;
	const raw = await api.get<unknown>(path);
	return parseResponse(listStockAdjustmentsResponseSchema, raw);
}

export async function bulkAction(body: BulkInventoryActionRequest): Promise<BulkActionResult> {
	const raw = await api.post<unknown>('/v1/inventory/items/bulk-action', body);
	return parseResponse(bulkActionResultSchema, raw);
}

/**
 * Multipart helper — hand-rolled because the JSON client only handles
 * JSON. BFF proxy injects cookies + CSRF transparently for same-origin
 * requests; we still set X-CSRF-Token here to satisfy the double-submit
 * check on mutations.
 */
async function uploadMultipart<T>(
	path: string,
	file: File,
	fields?: Record<string, string>
): Promise<T> {
	const fd = new FormData();
	fd.set('file', file);
	if (fields) {
		for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	}
	const headers = new Headers();
	const csrf = getCsrfToken();
	if (csrf) headers.set('X-CSRF-Token', csrf);
	let response: Response;
	try {
		response = await fetch(`/api${path}`, {
			method: 'POST',
			body: fd,
			headers,
			credentials: 'same-origin'
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}
	const text = await response.text();
	const parsed: unknown = text.length > 0 ? safeJsonParse(text) : null;
	if (!response.ok) {
		throw ApiError.fromResponse(response, parsed as Parameters<typeof ApiError.fromResponse>[1]);
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
	const raw = await uploadMultipart<unknown>('/v1/inventory/items/bulk-upload/preview', file);
	return parseResponse(bulkUploadPreviewSchema, raw);
}

export async function bulkUploadCommit(
	file: File,
	opts: { upsert_by?: 'sku' | 'none' } = {}
): Promise<BulkUploadResult> {
	const raw = await uploadMultipart<unknown>('/v1/inventory/items/bulk-upload/commit', file, {
		upsert_by: opts.upsert_by ?? 'sku'
	});
	return parseResponse(bulkUploadResultSchema, raw);
}

/** Exports return a CSV stream — caller pipes the blob into a download. */
export async function exportInventory(params?: ListInventoryParams): Promise<Blob> {
	const qs = new URLSearchParams();
	if (params?.q) qs.set('q', params.q);
	if (params?.category) for (const c of params.category) qs.append('category', c);
	if (params?.is_active != null) qs.set('is_active', String(params.is_active));
	if (params?.low_stock != null) qs.set('low_stock', String(params.low_stock));
	const s = qs.toString();
	const url = s ? `/api/v1/inventory/items/export?${s}` : '/api/v1/inventory/items/export';
	let response: Response;
	try {
		response = await fetch(url, { credentials: 'same-origin' });
	} catch (cause) {
		throw ApiError.transport(cause);
	}
	if (!response.ok) {
		throw ApiError.fromResponse(response, null);
	}
	return response.blob();
}
