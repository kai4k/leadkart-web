/**
 * TanStack Query hooks for the orders feature.
 *
 * List uses `createInfiniteQuery` for cursor-pagination + infinite
 * scroll. Mutations DO NOT optimistically flip status for transitions
 * the server might reject (price-band, invalid_status_transition,
 * stock_reservation_failed) — those use `setQueryData(detail, returned
 * DTO)` on success so the cache stays in sync with server truth.
 *
 * Per CLAUDE.md rule 11: every mutation returns the updated DTO; we
 * never `await mutate(); await refetch()` — the response IS the refetch.
 */
import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { toast } from '$ui';
import { createResourceMutation, INLINE_ERRORS_META } from '#lib/api/mutations.ts';
import { nextPageParam } from '#lib/api/pagination.ts';
import * as api from './api';
import type {
	ApproveQuotationRequest,
	BulkOrderActionRequest,
	CancelOrderRequest,
	DispatchRequest,
	MarkDeliveredRequest,
	MarkPackedRequest,
	OrderDto,
	RecordPaymentRequest,
	ReviseQuotationRequest
} from './schemas';
import type { ListOrdersParams } from './api';

// ── Query keys ───────────────────────────────────────────────────────

const ordersKeys = {
	all: ['orders'] as const,
	lists: () => [...ordersKeys.all, 'list'] as const,
	list: (params: ListOrdersParams) => [...ordersKeys.lists(), params] as const,
	detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
	revisions: (id: string) => [...ordersKeys.all, 'revisions', id] as const,
	payments: (id: string) => [...ordersKeys.all, 'payments', id] as const,
	invoice: (id: string) => [...ordersKeys.all, 'invoice', id] as const,
	creditNotes: (id: string) => [...ordersKeys.all, 'credit-notes', id] as const
};

// ── List (infinite) ──────────────────────────────────────────────────

export function ordersInfiniteQuery(getParams: () => ListOrdersParams) {
	return createInfiniteQuery(() => {
		const params = getParams();
		return {
			queryKey: ordersKeys.list(params),
			queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
				api.listOrders({ ...params, cursor: pageParam }),
			initialPageParam: undefined as string | undefined,
			getNextPageParam: nextPageParam
		};
	});
}

// ── Detail + sub-resources ───────────────────────────────────────────

export function orderDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: ordersKeys.detail(id),
		queryFn: () => api.getOrder(id),
		enabled: Boolean(id)
	}));
}

export function orderRevisionsQuery(id: string) {
	return createQuery(() => ({
		queryKey: ordersKeys.revisions(id),
		queryFn: () => api.getOrderRevisions(id),
		enabled: Boolean(id)
	}));
}

export function orderPaymentsQuery(id: string) {
	return createQuery(() => ({
		queryKey: ordersKeys.payments(id),
		queryFn: () => api.getOrderPayments(id),
		enabled: Boolean(id)
	}));
}

export function orderInvoiceQuery(id: string, opts?: { enabled?: boolean }) {
	return createQuery(() => ({
		queryKey: ordersKeys.invoice(id),
		queryFn: () => api.getOrderInvoice(id),
		enabled: Boolean(id) && (opts?.enabled ?? true)
	}));
}

export function orderCreditNotesQuery(id: string) {
	return createQuery(() => ({
		queryKey: ordersKeys.creditNotes(id),
		queryFn: () => api.getOrderCreditNotes(id),
		enabled: Boolean(id)
	}));
}

// ── Mutation helpers ─────────────────────────────────────────────────

function syncCaches(qc: ReturnType<typeof useQueryClient>, order: OrderDto): void {
	qc.setQueryData(ordersKeys.detail(order.id), order);
	void qc.invalidateQueries({ queryKey: ordersKeys.lists() });
}

// ── State transitions ───────────────────────────────────────────────
// Every per-order mutation takes the order id in its variables (never captured
// at creation): the detail component is reused when only [id] changes, so a
// captured id would act on the previous order.

/** `inlineErrors`: the revise drawer shows the failure in its banner (and, on a 422, on the fields). */
export function reviseQuotationMutation() {
	const qc = useQueryClient();
	return createResourceMutation({
		fn: ({ id, ...req }: { id: string } & ReviseQuotationRequest) => api.reviseQuotation(id, req),
		// The response IS the refetch for the detail (rule 11); the lists and revisions re-read.
		invalidate: ({ id }) => [ordersKeys.lists(), ordersKeys.revisions(id)],
		onSuccess: (_vars, order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
		},
		successToast: 'Quotation revised',
		inlineErrors: true
	});
}

export function approveQuotationMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, ...req }: { id: string } & ApproveQuotationRequest) =>
			api.approveQuotation(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Quotation approved');
		}
	}));
}

export function recordPaymentMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		meta: INLINE_ERRORS_META,
		mutationFn: ({ id, ...req }: { id: string } & RecordPaymentRequest) =>
			api.recordPayment(id, req),
		onSuccess: (_payment, { id }) => {
			// Payment endpoint returns the PaymentDto, not the order — invalidate
			// detail + payments so both surface the new payment + (for token)
			// the resulting status flip.
			void qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.payments(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast.success('Payment recorded');
		}
	}));
}

export function confirmOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id }: { id: string }) => api.confirmOrder(id),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Order confirmed');
		}
	}));
}

export function markPackedMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		meta: INLINE_ERRORS_META,
		mutationFn: ({ id, ...req }: { id: string } & MarkPackedRequest) => api.markPacked(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Order marked as packed');
		}
	}));
}

export function generateInvoiceMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id }: { id: string }) => api.generateInvoice(id),
		onSuccess: (order, { id }) => {
			syncCaches(qc, order);
			void qc.invalidateQueries({ queryKey: ordersKeys.invoice(id) });
			toast.success('Invoice generated');
		}
	}));
}

export function dispatchOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		meta: INLINE_ERRORS_META,
		mutationFn: ({ id, ...req }: { id: string } & DispatchRequest) => api.dispatchOrder(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Order dispatched');
		}
	}));
}

export function markDeliveredMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, ...req }: { id: string } & MarkDeliveredRequest) =>
			api.markDelivered(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Order marked as delivered');
		}
	}));
}

export function completeOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id }: { id: string }) => api.completeOrder(id),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast.success('Order complete');
		}
	}));
}

export function cancelOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		meta: INLINE_ERRORS_META,
		mutationFn: ({ id, ...req }: { id: string } & CancelOrderRequest) => api.cancelOrder(id, req),
		onSuccess: (order, { id }) => {
			syncCaches(qc, order);
			void qc.invalidateQueries({ queryKey: ordersKeys.creditNotes(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.invoice(id) });
			toast.success('Order cancelled');
		}
	}));
}

// ── Bulk action ──────────────────────────────────────────────────────

export function bulkOrderActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: BulkOrderActionRequest) => api.bulkOrderAction(req),
		onSuccess: (res) => {
			void qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			if (res.errors.length === 0) {
				toast.success(`${res.affected} order${res.affected === 1 ? '' : 's'} updated`);
			} else {
				toast.warning(`${res.affected} updated, ${res.errors.length} failed`);
			}
		}
	}));
}
