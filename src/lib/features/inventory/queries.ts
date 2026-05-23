/**
 * TanStack Query hooks for inventory.
 *
 * Patterns:
 *   - List uses createInfiniteQuery — cursor-based pagination per
 *     ADR 0038. Pages are flattened by the consumer via `data.pages`.
 *   - Detail uses createQuery.
 *   - Adjustments history uses createInfiniteQuery.
 *   - adjustStockMutation is optimistic — patches the detail cache so
 *     the badge + stock cell update before the round-trip resolves.
 *     Rollback on error via onError(ctx.previous).
 *
 * The toast for adjust-stock includes Undo: clicking it posts the
 * inverse delta with reason 'correction'. The history will end up
 * showing both the original adjustment and the undo — that's the
 * audit-correct behaviour (you cannot retroactively erase a stock
 * movement; you record a compensating one).
 */
import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { toast } from '$ui';
import * as api from './api';
import type { ListInventoryParams, ListAdjustmentsParams } from './api';
import type {
	AdjustStockRequest,
	BulkInventoryActionRequest,
	CreateInventoryItemRequest,
	InventoryItemDto,
	UpdateInventoryItemRequest
} from './schemas';

export const inventoryKeys = {
	all: ['inventory'] as const,
	lists: () => [...inventoryKeys.all, 'list'] as const,
	list: (params: ListInventoryParams) => [...inventoryKeys.lists(), params] as const,
	details: () => [...inventoryKeys.all, 'detail'] as const,
	detail: (id: string) => [...inventoryKeys.details(), id] as const,
	adjustments: (id: string) => [...inventoryKeys.all, 'adjustments', id] as const
};

const DEFAULT_LIMIT = 50;
const ADJUSTMENTS_LIMIT = 20;

export function inventoryListQuery(params: ListInventoryParams = {}) {
	return createInfiniteQuery(() => ({
		queryKey: inventoryKeys.list(params),
		queryFn: ({ pageParam }) =>
			api.listInventoryItems({
				...params,
				limit: params.limit ?? DEFAULT_LIMIT,
				cursor: pageParam as string | undefined
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => (last.has_more ? (last.next_cursor ?? undefined) : undefined)
	}));
}

export function inventoryItemQuery(id: string) {
	return createQuery(() => ({
		queryKey: inventoryKeys.detail(id),
		queryFn: () => api.getInventoryItem(id),
		enabled: !!id
	}));
}

export function stockAdjustmentsQuery(id: string, params: ListAdjustmentsParams = {}) {
	return createInfiniteQuery(() => ({
		queryKey: [...inventoryKeys.adjustments(id), params],
		queryFn: ({ pageParam }) =>
			api.listStockAdjustments(id, {
				...params,
				limit: params.limit ?? ADJUSTMENTS_LIMIT,
				cursor: pageParam as string | undefined
			}),
		enabled: !!id,
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => (last.has_more ? (last.next_cursor ?? undefined) : undefined)
	}));
}

export function createInventoryItemMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: CreateInventoryItemRequest) => api.createInventoryItem(body),
		// Errors surface inline in the create drawer's banner; suppress the
		// global mutation-toast that would otherwise duplicate the message.
		meta: { skipErrorToast: true },
		onSuccess: (item) => {
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			qc.setQueryData(inventoryKeys.detail(item.id), item);
			toast('success', 'Item created');
		}
	}));
}

export function updateInventoryItemMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: UpdateInventoryItemRequest }) =>
			api.updateInventoryItem(id, body),
		meta: { skipErrorToast: true },
		onSuccess: (item) => {
			qc.setQueryData(inventoryKeys.detail(item.id), item);
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			toast('success', 'Item updated');
		}
	}));
}

export function deleteInventoryItemMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteInventoryItem(id),
		onSuccess: (item) => {
			qc.setQueryData(inventoryKeys.detail(item.id), item);
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			toast('success', 'Item deleted');
		}
	}));
}

/**
 * Optimistic adjust-stock mutation. The detail cache is patched
 * before the round-trip resolves; the row in the list refreshes
 * via invalidate on settled.
 *
 * Toast includes Undo — posts the inverse delta with reason 'correction'.
 */
export function adjustStockMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: AdjustStockRequest }) =>
			api.adjustStock(id, body),
		meta: { skipErrorToast: true },
		onMutate: async ({ id, body }) => {
			await qc.cancelQueries({ queryKey: inventoryKeys.detail(id) });
			const previous = qc.getQueryData<InventoryItemDto>(inventoryKeys.detail(id));
			if (previous) {
				qc.setQueryData<InventoryItemDto>(inventoryKeys.detail(id), {
					...previous,
					current_stock: Math.max(0, previous.current_stock + body.delta)
				});
			}
			return { previous, id };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) qc.setQueryData(inventoryKeys.detail(ctx.id), ctx.previous);
		},
		onSuccess: ({ item, adjustment }) => {
			qc.setQueryData(inventoryKeys.detail(item.id), item);
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			qc.invalidateQueries({ queryKey: inventoryKeys.adjustments(item.id) });
			const sign = adjustment.delta > 0 ? '+' : '';
			toast('success', `${sign}${adjustment.delta} to ${item.sku}`, {
				duration: 10_000,
				action: {
					label: 'Undo',
					onClick: () =>
						api
							.adjustStock(item.id, {
								delta: -adjustment.delta,
								reason: 'correction',
								note: `Undo of ${adjustment.id}`
							})
							.then(({ item: undoneItem }) => {
								qc.setQueryData(inventoryKeys.detail(undoneItem.id), undoneItem);
								qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
								qc.invalidateQueries({ queryKey: inventoryKeys.adjustments(undoneItem.id) });
								toast('success', 'Adjustment undone');
							})
				}
			});
		}
	}));
}

export function bulkInventoryActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: BulkInventoryActionRequest) => api.bulkAction(body),
		onSuccess: (result) => {
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			toast('success', `${result.affected} item${result.affected === 1 ? '' : 's'} updated`);
		}
	}));
}

export function bulkUploadPreviewMutation() {
	return createMutation(() => ({
		mutationFn: (file: File) => api.bulkUploadPreview(file)
	}));
}

export function bulkUploadCommitMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ file, upsert_by }: { file: File; upsert_by?: 'sku' | 'none' }) =>
			api.bulkUploadCommit(file, { upsert_by }),
		onSuccess: (result) => {
			qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
			toast(
				'success',
				`Inserted ${result.inserted}, updated ${result.updated}` +
					(result.failed > 0 ? `, ${result.failed} failed` : '')
			);
		}
	}));
}
