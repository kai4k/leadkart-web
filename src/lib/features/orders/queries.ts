/**
 * TanStack Query hooks for the orders feature.
 *
 * List uses `createInfiniteQuery` for cursor-pagination + infinite
 * scroll. Mutations apply optimistic status flips where reversible.
 *
 * NOTE: TanStack-Svelte v6 takes a function that returns the options
 * object — this lets the queryKey react to runes-driven state.
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
	BulkOrderActionRequest,
	CancelOrderRequest,
	CreateOrderRequest,
	OrderDto,
	RefundOrderRequest,
	ShipOrderRequest,
	UpdateOrderRequest
} from './schemas';
import type { ListOrdersParams } from './api';

// ── Query keys ───────────────────────────────────────────────────────

export const ordersKeys = {
	all: ['orders'] as const,
	lists: () => [...ordersKeys.all, 'list'] as const,
	list: (params: ListOrdersParams) => [...ordersKeys.lists(), params] as const,
	detail: (id: string) => [...ordersKeys.all, 'detail', id] as const
};

// ── List (infinite) ──────────────────────────────────────────────────

export function ordersInfiniteListQuery(getParams: () => ListOrdersParams) {
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

// ── Detail ───────────────────────────────────────────────────────────

export function orderDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: ordersKeys.detail(id),
		queryFn: () => api.getOrder(id),
		enabled: !!id
	}));
}

// ── CRUD mutations ───────────────────────────────────────────────────

export function createOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreateOrderRequest) => api.createOrder(req),
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', `Order ${order.order_number} created`);
		}
	}));
}

export function updateOrderMutation(id: string) {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: UpdateOrderRequest) => api.updateOrder(id, req),
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(id), order);
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', 'Order updated');
		}
	}));
}

export function deleteOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteOrder(id),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: ordersKeys.all });
			const previous = qc.getQueryData<OrderDto>(ordersKeys.detail(id));
			// Remove from any cached list pages immediately.
			removeFromAllListCaches(qc, id);
			return { previous, id };
		},
		onError: (_e, _id, ctx) => {
			if (ctx?.previous) qc.setQueryData(ordersKeys.detail(ctx.id), ctx.previous);
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('danger', 'Failed to delete order');
		},
		onSuccess: () => {
			toast('success', 'Order deleted');
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
		}
	}));
}

// ── Status transition mutations ──────────────────────────────────────

function optimisticStatus(
	qc: ReturnType<typeof useQueryClient>,
	id: string,
	next: OrderDto['status']
) {
	const prev = qc.getQueryData<OrderDto>(ordersKeys.detail(id));
	if (prev) qc.setQueryData(ordersKeys.detail(id), { ...prev, status: next });
	return prev;
}

export function confirmOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.confirmOrder(id),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: ordersKeys.detail(id) });
			const previous = optimisticStatus(qc, id, 'confirmed');
			return { previous, id };
		},
		onError: (_e, _id, ctx) => {
			if (ctx?.previous) qc.setQueryData(ordersKeys.detail(ctx.id), ctx.previous);
			toast('danger', 'Failed to confirm order');
		},
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			toast('success', 'Order confirmed');
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ordersKeys.lists() })
	}));
}

export function shipOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body?: ShipOrderRequest }) =>
			api.shipOrder(id, body ?? {}),
		onMutate: async ({ id }) => {
			await qc.cancelQueries({ queryKey: ordersKeys.detail(id) });
			const previous = optimisticStatus(qc, id, 'shipped');
			return { previous, id };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.previous) qc.setQueryData(ordersKeys.detail(ctx.id), ctx.previous);
			toast('danger', 'Failed to mark shipped');
		},
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			toast('success', 'Order shipped');
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ordersKeys.lists() })
	}));
}

export function deliverOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deliverOrder(id),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: ordersKeys.detail(id) });
			const previous = optimisticStatus(qc, id, 'delivered');
			return { previous, id };
		},
		onError: (_e, _id, ctx) => {
			if (ctx?.previous) qc.setQueryData(ordersKeys.detail(ctx.id), ctx.previous);
			toast('danger', 'Failed to mark delivered');
		},
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			toast('success', 'Order delivered');
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ordersKeys.lists() })
	}));
}

export function cancelOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: CancelOrderRequest }) =>
			api.cancelOrder(id, body),
		onMutate: async ({ id }) => {
			await qc.cancelQueries({ queryKey: ordersKeys.detail(id) });
			const previous = optimisticStatus(qc, id, 'cancelled');
			return { previous, id };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.previous) qc.setQueryData(ordersKeys.detail(ctx.id), ctx.previous);
			toast('danger', 'Failed to cancel order');
		},
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			toast('success', 'Order cancelled');
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ordersKeys.lists() })
	}));
}

export function refundOrderMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: RefundOrderRequest }) =>
			api.refundOrder(id, body),
		onSuccess: (order) => {
			qc.setQueryData(ordersKeys.detail(order.id), order);
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', 'Order refunded');
		},
		onError: () => toast('danger', 'Failed to refund order')
	}));
}

// ── Bulk action ──────────────────────────────────────────────────────

export function bulkOrderActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: BulkOrderActionRequest) => api.bulkOrderAction(req),
		onSuccess: (res) => {
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			if (res.errors.length === 0) {
				toast('success', `${res.affected} order${res.affected === 1 ? '' : 's'} updated`);
			} else {
				toast('warning', `${res.affected} updated, ${res.errors.length} failed`);
			}
		},
		onError: () => toast('danger', 'Bulk action failed')
	}));
}

// ── Bulk upload (multipart) ──────────────────────────────────────────

export function bulkUploadPreviewMutation() {
	return createMutation(() => ({
		mutationFn: (file: File) => api.previewBulkUpload(file)
	}));
}

export function bulkUploadCommitMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ file, upsert_by }: { file: File; upsert_by?: 'order_external_id' | 'none' }) =>
			api.commitBulkUpload(file, { upsert_by }),
		onSuccess: (result) => {
			qc.invalidateQueries({ queryKey: ordersKeys.lists() });
			toast('success', `${result.inserted} order(s) imported`);
		}
	}));
}

// ── Helpers ──────────────────────────────────────────────────────────

interface ListPage {
	items: OrderDto[];
	has_more: boolean;
	next_cursor?: string | null;
}
interface InfiniteListData {
	pages: ListPage[];
	pageParams: unknown[];
}

function removeFromAllListCaches(qc: ReturnType<typeof useQueryClient>, idToRemove: string): void {
	const queries = qc.getQueriesData<InfiniteListData>({ queryKey: ordersKeys.lists() });
	for (const [key, data] of queries) {
		if (!data) continue;
		qc.setQueryData<InfiniteListData>(key, {
			...data,
			pages: data.pages.map((p) => ({
				...p,
				items: p.items.filter((o) => o.id !== idToRemove)
			}))
		});
	}
}
