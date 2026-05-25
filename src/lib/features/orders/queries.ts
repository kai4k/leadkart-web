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
import * as api from './api';
import type {
	ApproveQuotationRequest,
	BulkOrderActionRequest,
	CancelOrderRequest,
	CreateQuotationRequest,
	DispatchRequest,
	MarkDeliveredRequest,
	MarkPackedRequest,
	OrderDto,
	RecordPaymentRequest,
	ReviseQuotationRequest,
	UpdateOrderRequest
} from './schemas';
import type { ListOrdersParams } from './api';

// ── Query keys ───────────────────────────────────────────────────────

export const ordersKeys = {
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
			getNextPageParam: (last) => (last.has_more ? (last.next_cursor ?? undefined) : undefined)
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

// ── CRUD ─────────────────────────────────────────────────────────────

export function createQuotationMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateQuotationRequest) => api.createQuotation(req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', `Quotation ${order.order_number} created`);
		},
		onError: () => toast('danger', 'Failed to create quotation')
	}));
}

export function updateOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: UpdateOrderRequest) => api.updateOrder(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order updated');
		},
		onError: () => toast('danger', 'Failed to update order')
	}));
}

export function deleteOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteOrder(id),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', 'Quotation deleted');
		},
		onError: () => toast('danger', 'Failed to delete quotation')
	}));
}

// ── State transitions ───────────────────────────────────────────────

export function reviseQuotationMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: ReviseQuotationRequest) => api.reviseQuotation(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			void qc.invalidateQueries({ queryKey: ordersKeys.revisions(id) });
			toast('success', 'Quotation revised');
		},
		onError: () => toast('danger', 'Failed to revise quotation')
	}));
}

export function approveQuotationMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: ApproveQuotationRequest = {}) => api.approveQuotation(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Quotation approved');
		},
		onError: () => toast('danger', 'Failed to approve quotation')
	}));
}

export function recordPaymentMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: RecordPaymentRequest) => api.recordPayment(id, req),
		onSuccess: () => {
			// Payment endpoint returns the PaymentDto, not the order — invalidate
			// detail + payments so both surface the new payment + (for token)
			// the resulting status flip.
			void qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.payments(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', 'Payment recorded');
		},
		onError: () => toast('danger', 'Failed to record payment')
	}));
}

export function confirmOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.confirmOrder(id),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order confirmed');
		},
		onError: () => toast('danger', 'Failed to confirm order')
	}));
}

export function markPackedMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: MarkPackedRequest) => api.markPacked(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order marked as packed');
		},
		onError: () => toast('danger', 'Failed to mark as packed')
	}));
}

export function generateInvoiceMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.generateInvoice(id),
		onSuccess: (order) => {
			syncCaches(qc, order);
			void qc.invalidateQueries({ queryKey: ordersKeys.invoice(id) });
			toast('success', 'Invoice generated');
		},
		onError: () => toast('danger', 'Failed to generate invoice')
	}));
}

export function dispatchOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: DispatchRequest = {}) => api.dispatchOrder(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order dispatched');
		},
		onError: () => toast('danger', 'Failed to dispatch order')
	}));
}

export function markDeliveredMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: MarkDeliveredRequest = {}) => api.markDelivered(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order marked as delivered');
		},
		onError: () => toast('danger', 'Failed to mark as delivered')
	}));
}

export function completeOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.completeOrder(id),
		onSuccess: (order) => {
			syncCaches(qc, order);
			toast('success', 'Order complete');
		},
		onError: () => toast('danger', 'Failed to complete order')
	}));
}

export function cancelOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CancelOrderRequest) => api.cancelOrder(id, req),
		onSuccess: (order) => {
			syncCaches(qc, order);
			void qc.invalidateQueries({ queryKey: ordersKeys.creditNotes(id) });
			void qc.invalidateQueries({ queryKey: ordersKeys.invoice(id) });
			toast('success', 'Order cancelled');
		},
		onError: () => toast('danger', 'Failed to cancel order')
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
				toast('success', `${res.affected} order${res.affected === 1 ? '' : 's'} updated`);
			} else {
				toast('warning', `${res.affected} updated, ${res.errors.length} failed`);
			}
		},
		onError: () => toast('danger', 'Bulk action failed')
	}));
}
