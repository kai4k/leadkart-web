/**
 * Gateway for the inventory module (`/v1/inventory/...`).
 *
 * Responsibilities (per CLAUDE.md "Gateway" rule):
 *   - HTTP shape + Zod-parse the response at the boundary.
 *   - NO business logic, NO state mutation.
 *
 * All requests are tenant-scoped via the BFF cookie — no tenant_id in
 * paths or bodies. Multipart uploads bypass the JSON client and hit
 * `/api/...` directly (BFF still injects cookies + CSRF transparently).
 */
import { api, parseResponse } from '$api/client';
import { getCsrfToken } from '$api/csrf';
import { ApiError } from '$api/errors';
import {
	batchDtoSchema,
	bulkActionResultSchema,
	bulkUploadPreviewSchema,
	bulkUploadResultSchema,
	computedPricesResponseSchema,
	gstDefaultsResponseSchema,
	listBatchesResponseSchema,
	listProductsResponseSchema,
	listStockMovementsResponseSchema,
	productDtoSchema,
	referenceListResponseSchema,
	stockMovementDtoSchema,
	type BatchDto,
	type BulkProductActionRequest,
	type BulkActionResult,
	type BulkUploadPreview,
	type BulkUploadResult,
	type ComputedPricesResponse,
	type CreateBatchRequest,
	type CreateMovementRequest,
	type CreateProductRequest,
	type DrugSchedule,
	type GstDefaultsResponse,
	type ListBatchesResponse,
	type ListProductsResponse,
	type ListStockMovementsResponse,
	type ProductDto,
	type ReferenceListResponse,
	type StockMovementDto,
	type UpdateProductRequest,
	type WriteOffBatchRequest
} from './schemas';

export type ProductSort =
	| 'brand_name:asc'
	| 'brand_name:desc'
	| 'created_at:desc'
	| 'created_at:asc'
	| 'total_quantity_available:asc'
	| 'total_quantity_available:desc'
	| 'earliest_expiry_at:asc';

export interface ListProductsParams {
	cursor?: string;
	limit?: number;
	q?: string;
	product_category?: string[];
	product_type?: string[];
	drug_schedule?: DrugSchedule[];
	is_active?: boolean;
	low_stock?: boolean;
	expiring_within_days?: number;
	sort?: ProductSort;
}

function buildProductListQuery(params: ListProductsParams = {}): string {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.q) qs.set('q', params.q);
	for (const c of params.product_category ?? []) qs.append('product_category', c);
	for (const t of params.product_type ?? []) qs.append('product_type', t);
	for (const d of params.drug_schedule ?? []) qs.append('drug_schedule', d);
	if (params.is_active != null) qs.set('is_active', String(params.is_active));
	if (params.low_stock != null) qs.set('low_stock', String(params.low_stock));
	if (params.expiring_within_days != null)
		qs.set('expiring_within_days', String(params.expiring_within_days));
	if (params.sort) qs.set('sort', params.sort);
	const s = qs.toString();
	return s ? `/v1/inventory/products?${s}` : '/v1/inventory/products';
}

// ── Products ─────────────────────────────────────────────────────────

export async function listProducts(params?: ListProductsParams): Promise<ListProductsResponse> {
	const raw = await api.get<unknown>(buildProductListQuery(params));
	return parseResponse(listProductsResponseSchema, raw);
}

export async function getProduct(id: string): Promise<ProductDto> {
	const raw = await api.get<unknown>(`/v1/inventory/products/${id}`);
	return parseResponse(productDtoSchema, raw);
}

export async function createProduct(body: CreateProductRequest): Promise<ProductDto> {
	const raw = await api.post<unknown>('/v1/inventory/products', body);
	return parseResponse(productDtoSchema, raw);
}

export async function updateProduct(id: string, body: UpdateProductRequest): Promise<ProductDto> {
	const raw = await api.patch<unknown>(`/v1/inventory/products/${id}`, body);
	return parseResponse(productDtoSchema, raw);
}

export async function deleteProduct(id: string): Promise<ProductDto> {
	const raw = await api.delete<unknown>(`/v1/inventory/products/${id}`);
	return parseResponse(productDtoSchema, raw);
}

// ── Batches ──────────────────────────────────────────────────────────

export interface ListBatchesParams {
	include_written_off?: boolean;
}

export async function listBatches(
	productId: string,
	params: ListBatchesParams = {}
): Promise<ListBatchesResponse> {
	const qs = new URLSearchParams();
	if (params.include_written_off != null)
		qs.set('include_written_off', String(params.include_written_off));
	const s = qs.toString();
	const path = s
		? `/v1/inventory/products/${productId}/batches?${s}`
		: `/v1/inventory/products/${productId}/batches`;
	const raw = await api.get<unknown>(path);
	return parseResponse(listBatchesResponseSchema, raw);
}

export async function createBatch(productId: string, body: CreateBatchRequest): Promise<BatchDto> {
	const raw = await api.post<unknown>(`/v1/inventory/products/${productId}/batches`, body);
	return parseResponse(batchDtoSchema, raw);
}

export async function writeOffBatch(
	batchId: string,
	body: WriteOffBatchRequest
): Promise<BatchDto> {
	const raw = await api.post<unknown>(`/v1/inventory/batches/${batchId}/write-off`, body);
	return parseResponse(batchDtoSchema, raw);
}

export async function quarantineBatch(batchId: string): Promise<BatchDto> {
	const raw = await api.post<unknown>(`/v1/inventory/batches/${batchId}/quarantine`, {});
	return parseResponse(batchDtoSchema, raw);
}

// ── Stock movements ──────────────────────────────────────────────────

export interface ListMovementsParams {
	cursor?: string;
	limit?: number;
	from?: string;
	to?: string;
}

export async function listMovements(
	productId: string,
	params: ListMovementsParams = {}
): Promise<ListStockMovementsResponse> {
	const qs = new URLSearchParams();
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.from) qs.set('from', params.from);
	if (params.to) qs.set('to', params.to);
	const s = qs.toString();
	const path = s
		? `/v1/inventory/products/${productId}/movements?${s}`
		: `/v1/inventory/products/${productId}/movements`;
	const raw = await api.get<unknown>(path);
	return parseResponse(listStockMovementsResponseSchema, raw);
}

export async function createMovement(
	productId: string,
	body: CreateMovementRequest
): Promise<StockMovementDto> {
	const raw = await api.post<unknown>(`/v1/inventory/products/${productId}/movements`, body);
	return parseResponse(stockMovementDtoSchema, raw);
}

// ── Reference data ───────────────────────────────────────────────────

export async function listCategories(): Promise<ReferenceListResponse> {
	const raw = await api.get<unknown>('/v1/inventory/categories');
	return parseResponse(referenceListResponseSchema, raw);
}

export async function listTypes(): Promise<ReferenceListResponse> {
	const raw = await api.get<unknown>('/v1/inventory/types');
	return parseResponse(referenceListResponseSchema, raw);
}

export async function getGstDefaults(): Promise<GstDefaultsResponse> {
	const raw = await api.get<unknown>('/v1/inventory/gst-defaults');
	return parseResponse(gstDefaultsResponseSchema, raw);
}

export async function getComputedPrices(productId: string): Promise<ComputedPricesResponse> {
	const raw = await api.get<unknown>(`/v1/inventory/products/${productId}/computed-prices`);
	return parseResponse(computedPricesResponseSchema, raw);
}

// ── Bulk ─────────────────────────────────────────────────────────────

export async function bulkProductAction(body: BulkProductActionRequest): Promise<BulkActionResult> {
	const raw = await api.post<unknown>('/v1/inventory/products/bulk-action', body);
	return parseResponse(bulkActionResultSchema, raw);
}

/**
 * Multipart upload bypasses the JSON client helpers — raw `fetch` to
 * the BFF proxy. BFF echoes the upstream Content-Type so a boundary'd
 * multipart/form-data round-trips. CSRF token is still required.
 */
async function postMultipart<T>(path: string, form: FormData): Promise<T> {
	const headers = new Headers();
	const csrf = getCsrfToken();
	if (csrf) headers.set('X-CSRF-Token', csrf);
	headers.set('Accept', 'application/json');

	let resp: Response;
	try {
		resp = await fetch(`/api${path.startsWith('/') ? path : `/${path}`}`, {
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

export async function bulkUploadPreview(file: File): Promise<BulkUploadPreview> {
	const form = new FormData();
	form.append('file', file);
	const raw = await postMultipart<unknown>('/v1/inventory/products/bulk-upload/preview', form);
	return parseResponse(bulkUploadPreviewSchema, raw);
}

export async function bulkUploadCommit(
	file: File,
	opts: { upsert_by?: 'product_key' | 'none' } = {}
): Promise<BulkUploadResult> {
	const form = new FormData();
	form.append('file', file);
	form.append('upsert_by', opts.upsert_by ?? 'product_key');
	const raw = await postMultipart<unknown>('/v1/inventory/products/bulk-upload/commit', form);
	return parseResponse(bulkUploadResultSchema, raw);
}

/** CSV export — caller pipes the blob into a download anchor. */
export async function exportProducts(params?: ListProductsParams): Promise<Blob> {
	const path = buildProductListQuery(params).replace(
		'/v1/inventory/products',
		'/v1/inventory/products/export'
	);
	let resp: Response;
	try {
		resp = await fetch(`/api${path}`, { credentials: 'same-origin' });
	} catch (cause) {
		throw ApiError.transport(cause);
	}
	if (!resp.ok) throw ApiError.fromResponse(resp, null);
	return resp.blob();
}
