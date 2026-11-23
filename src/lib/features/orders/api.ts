/**
 * Gateway for CRM orders (see
 * `docs/superpowers/specs/2026-05-23-crm-modules-contracts.md` Module 2).
 *
 * All responses are Zod-parsed at the boundary via `parseResponse`.
 * Components NEVER call `fetch` directly — they call into this module
 * (CLAUDE.md rule 6). State transitions are surfaced as one named
 * function per backend endpoint so callers compose intent, not URLs.
 */
import { seg } from '#lib/utils/path-segment.ts';
import { apiLegacy, parseResponse } from '#lib/api/client.ts';
import {
	bulkOrderActionResultSchema,
	cancelOrderRequestSchema,
	creditNoteDtoSchema,
	invoiceDtoSchema,
	listCreditNotesResponseSchema,
	listOrdersResponseSchema,
	listPaymentsResponseSchema,
	listRevisionsResponseSchema,
	orderDtoSchema,
	paymentDtoSchema,
	type ApproveQuotationRequest,
	type BulkOrderActionRequest,
	type BulkOrderActionResult,
	type CancelOrderRequest,
	type CreateQuotationRequest,
	type CreditNoteDto,
	type DispatchRequest,
	type InvoiceDto,
	type ListCreditNotesResponse,
	type ListOrdersResponse,
	type ListPaymentsResponse,
	type ListRevisionsResponse,
	type MarkDeliveredRequest,
	type MarkPackedRequest,
	type OrderDto,
	type OrderStatus,
	type PaymentDto,
	type RecordPaymentRequest,
	type ReviseQuotationRequest,
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
	const raw = await apiLegacy.get<unknown>(buildListQuery(params));
	return parseResponse(listOrdersResponseSchema, raw);
}

// ── Detail + sub-resources ───────────────────────────────────────────

export async function getOrder(id: string): Promise<OrderDto> {
	const raw = await apiLegacy.get<unknown>(`/v1/orders/${seg(id)}`);
	return parseResponse(orderDtoSchema, raw);
}

export async function getOrderRevisions(id: string): Promise<ListRevisionsResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/orders/${seg(id)}/revisions`);
	return parseResponse(listRevisionsResponseSchema, raw);
}

export async function getOrderPayments(id: string): Promise<ListPaymentsResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/orders/${seg(id)}/payments`);
	return parseResponse(listPaymentsResponseSchema, raw);
}

export async function getOrderInvoice(id: string): Promise<InvoiceDto | null> {
	const raw = await apiLegacy.get<unknown>(`/v1/orders/${seg(id)}/invoice`);
	if (raw == null) return null;
	return parseResponse(invoiceDtoSchema, raw);
}

export async function getOrderCreditNotes(id: string): Promise<ListCreditNotesResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/orders/${seg(id)}/credit-notes`);
	return parseResponse(listCreditNotesResponseSchema, raw);
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function createQuotation(req: CreateQuotationRequest): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>('/v1/orders', req);
	return parseResponse(orderDtoSchema, raw);
}

export async function updateOrder(id: string, req: UpdateOrderRequest): Promise<OrderDto> {
	const raw = await apiLegacy.patch<unknown>(`/v1/orders/${seg(id)}`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function deleteOrder(id: string): Promise<OrderDto> {
	const raw = await apiLegacy.delete<unknown>(`/v1/orders/${seg(id)}`);
	return parseResponse(orderDtoSchema, raw);
}

// ── State transitions (one POST per transition) ──────────────────────

export async function reviseQuotation(id: string, req: ReviseQuotationRequest): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/revise`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function approveQuotation(
	id: string,
	req: ApproveQuotationRequest = {}
): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/approve-quotation`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function recordPayment(id: string, req: RecordPaymentRequest): Promise<PaymentDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/payments`, req);
	return parseResponse(paymentDtoSchema, raw);
}

export async function confirmOrder(id: string): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/confirm`, {});
	return parseResponse(orderDtoSchema, raw);
}

export async function markPacked(id: string, req: MarkPackedRequest): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/mark-packed`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function generateInvoice(id: string): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/generate-invoice`, {});
	return parseResponse(orderDtoSchema, raw);
}

export async function dispatchOrder(id: string, req: DispatchRequest = {}): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/dispatch`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function markDelivered(id: string, req: MarkDeliveredRequest = {}): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/mark-delivered`, req);
	return parseResponse(orderDtoSchema, raw);
}

export async function completeOrder(id: string): Promise<OrderDto> {
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/complete`, {});
	return parseResponse(orderDtoSchema, raw);
}

export async function cancelOrder(id: string, req: CancelOrderRequest): Promise<OrderDto> {
	cancelOrderRequestSchema.parse(req);
	const raw = await apiLegacy.post<unknown>(`/v1/orders/${seg(id)}/cancel`, req);
	return parseResponse(orderDtoSchema, raw);
}

// ── Bulk action ──────────────────────────────────────────────────────

export async function bulkOrderAction(req: BulkOrderActionRequest): Promise<BulkOrderActionResult> {
	const raw = await apiLegacy.post<unknown>('/v1/orders/bulk-action', req);
	return parseResponse(bulkOrderActionResultSchema, raw);
}

// ── Credit notes detail (per ID, used to refresh single CN cards) ────

export async function getCreditNote(id: string, creditNoteId: string): Promise<CreditNoteDto> {
	const raw = await apiLegacy.get<unknown>(
		`/v1/orders/${seg(id)}/credit-notes/${seg(creditNoteId)}`
	);
	return parseResponse(creditNoteDtoSchema, raw);
}
