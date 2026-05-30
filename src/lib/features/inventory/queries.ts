/**
 * TanStack Query hooks for inventory.
 *
 * Patterns:
 *   - Product list uses createInfiniteQuery — cursor-based per ADR 0038.
 *   - Detail, batches, computed-prices use createQuery.
 *   - Movements history uses createInfiniteQuery.
 *   - Reference data (categories, types, gst-defaults) has long staleTime
 *     — these change rarely and many components query them.
 *   - adjustStockMutation is OPTIMISTIC: bumps the product's
 *     total_quantity_available immediately, rollback on error.
 *     The toast carries an Undo button that posts the inverse delta
 *     with reason 'correction'.
 */
import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { toast } from '$ui';
import * as api from './api';
import type { ListBatchesParams, ListMovementsParams, ListProductsParams } from './api';
import { movementReasonLabel } from './view-models';
import type {
	BulkProductActionRequest,
	CreateBatchRequest,
	CreateMovementRequest,
	CreateProductRequest,
	ProductDto,
	UpdateProductRequest,
	WriteOffBatchRequest
} from './schemas';

export const inventoryKeys = {
	all: ['inventory'] as const,

	productLists: () => [...inventoryKeys.all, 'products', 'list'] as const,
	productList: (params: ListProductsParams) => [...inventoryKeys.productLists(), params] as const,
	productDetails: () => [...inventoryKeys.all, 'products', 'detail'] as const,
	productDetail: (id: string) => [...inventoryKeys.productDetails(), id] as const,

	batches: (productId: string) => [...inventoryKeys.all, 'batches', productId] as const,
	movements: (productId: string) => [...inventoryKeys.all, 'movements', productId] as const,

	computedPrices: (productId: string) =>
		[...inventoryKeys.all, 'computed-prices', productId] as const,

	categories: () => [...inventoryKeys.all, 'categories'] as const,
	types: () => [...inventoryKeys.all, 'types'] as const,
	gstDefaults: () => [...inventoryKeys.all, 'gst-defaults'] as const
};

const PRODUCT_PAGE_SIZE = 50;
const MOVEMENT_PAGE_SIZE = 20;
const REFERENCE_STALE_MS = 10 * 60 * 1000; // 10m

// ── Products ─────────────────────────────────────────────────────────

export function productsInfiniteQuery(params: ListProductsParams = {}) {
	return createInfiniteQuery(() => ({
		queryKey: inventoryKeys.productList(params),
		queryFn: ({ pageParam }) =>
			api.listProducts({
				...params,
				limit: params.limit ?? PRODUCT_PAGE_SIZE,
				cursor: pageParam as string | undefined
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => (last.has_more ? (last.next_cursor ?? undefined) : undefined)
	}));
}

export function productDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: inventoryKeys.productDetail(id),
		queryFn: () => api.getProduct(id),
		enabled: Boolean(id)
	}));
}

export function createProductMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: CreateProductRequest) => api.createProduct(body),
		meta: { skipErrorToast: true },
		onSuccess: (product) => {
			qc.setQueryData(inventoryKeys.productDetail(product.id), product);
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success('Product created');
		}
	}));
}

export function updateProductMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, body }: { id: string; body: UpdateProductRequest }) =>
			api.updateProduct(id, body),
		meta: { skipErrorToast: true },
		onSuccess: (product) => {
			qc.setQueryData(inventoryKeys.productDetail(product.id), product);
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success('Product updated');
		}
	}));
}

export function deleteProductMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.deleteProduct(id),
		onSuccess: (product) => {
			qc.setQueryData(inventoryKeys.productDetail(product.id), product);
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success('Product deleted');
		}
	}));
}

export function bulkProductActionMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (body: BulkProductActionRequest) => api.bulkProductAction(body),
		onSuccess: (result) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success(`${result.affected} product${result.affected === 1 ? '' : 's'} updated`);
		}
	}));
}

// ── Batches ──────────────────────────────────────────────────────────

export function batchesQuery(productId: string, params: ListBatchesParams = {}) {
	return createQuery(() => ({
		queryKey: [...inventoryKeys.batches(productId), params],
		queryFn: () => api.listBatches(productId, params),
		enabled: Boolean(productId)
	}));
}

export function addBatchMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ productId, body }: { productId: string; body: CreateBatchRequest }) =>
			api.createBatch(productId, body),
		meta: { skipErrorToast: true },
		onSuccess: (_batch, vars) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.batches(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.movements(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success('Batch added');
		}
	}));
}

export function writeOffBatchMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({
			batchId,
			body
		}: {
			productId: string;
			batchId: string;
			body: WriteOffBatchRequest;
		}) => api.writeOffBatch(batchId, body),
		meta: { skipErrorToast: true },
		onSuccess: (_batch, vars) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.batches(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(vars.productId) });
			toast.success('Batch written off');
		}
	}));
}

export function quarantineBatchMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ batchId }: { productId: string; batchId: string }) =>
			api.quarantineBatch(batchId),
		onSuccess: (_batch, vars) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.batches(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(vars.productId) });
			toast.success('Batch quarantined');
		}
	}));
}

// ── Movements ────────────────────────────────────────────────────────

export function movementsInfiniteQuery(productId: string, params: ListMovementsParams = {}) {
	return createInfiniteQuery(() => ({
		queryKey: [...inventoryKeys.movements(productId), params],
		queryFn: ({ pageParam }) =>
			api.listMovements(productId, {
				...params,
				limit: params.limit ?? MOVEMENT_PAGE_SIZE,
				cursor: pageParam as string | undefined
			}),
		enabled: Boolean(productId),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => (last.has_more ? (last.next_cursor ?? undefined) : undefined)
	}));
}

/**
 * Adjust stock — optimistic.
 *
 * onMutate patches the product detail cache (bumps total_quantity_available)
 * + rolls back on error. onSuccess invalidates batches + movements + lists.
 * The toast carries an Undo button that posts the inverse delta with reason
 * 'correction' — the original movement isn't erased (audit trail intact),
 * a compensating movement is recorded.
 */
export function adjustStockMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ productId, body }: { productId: string; body: CreateMovementRequest }) =>
			api.createMovement(productId, body),
		meta: { skipErrorToast: true },
		onMutate: async ({ productId, body }) => {
			await qc.cancelQueries({ queryKey: inventoryKeys.productDetail(productId) });
			const previous = qc.getQueryData<ProductDto>(inventoryKeys.productDetail(productId));
			if (previous) {
				qc.setQueryData<ProductDto>(inventoryKeys.productDetail(productId), {
					...previous,
					total_quantity_available: Math.max(0, previous.total_quantity_available + body.delta)
				});
			}
			return { previous, productId };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) qc.setQueryData(inventoryKeys.productDetail(ctx.productId), ctx.previous);
		},
		onSuccess: (movement, vars) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.batches(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.movements(vars.productId) });
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });

			const sign = movement.delta > 0 ? '+' : '';
			const reasonLabel = movementReasonLabel(movement.reason);
			toast.success(`${sign}${movement.delta} (${reasonLabel})`, {
				duration: 10_000,
				action: {
					label: 'Undo',
					onClick: () =>
						api
							.createMovement(vars.productId, {
								batch_id: vars.body.batch_id,
								delta: -movement.delta,
								reason: 'correction',
								note: `Undo of ${movement.id}`
							})
							.then(() => {
								void qc.invalidateQueries({
									queryKey: inventoryKeys.productDetail(vars.productId)
								});
								void qc.invalidateQueries({ queryKey: inventoryKeys.batches(vars.productId) });
								void qc.invalidateQueries({
									queryKey: inventoryKeys.movements(vars.productId)
								});
								toast.success('Adjustment undone');
							})
				}
			});
		}
	}));
}

// ── Reference data ───────────────────────────────────────────────────

export function categoriesQuery() {
	return createQuery(() => ({
		queryKey: inventoryKeys.categories(),
		queryFn: () => api.listCategories(),
		staleTime: REFERENCE_STALE_MS
	}));
}

export function typesQuery() {
	return createQuery(() => ({
		queryKey: inventoryKeys.types(),
		queryFn: () => api.listTypes(),
		staleTime: REFERENCE_STALE_MS
	}));
}

export function gstDefaultsQuery() {
	return createQuery(() => ({
		queryKey: inventoryKeys.gstDefaults(),
		queryFn: () => api.getGstDefaults(),
		staleTime: REFERENCE_STALE_MS
	}));
}

export function computedPricesQuery(productId: string) {
	return createQuery(() => ({
		queryKey: inventoryKeys.computedPrices(productId),
		queryFn: () => api.getComputedPrices(productId),
		enabled: Boolean(productId)
	}));
}

// ── Bulk upload ──────────────────────────────────────────────────────

export function bulkUploadPreviewMutation() {
	return createMutation(() => ({
		mutationFn: (file: File) => api.bulkUploadPreview(file)
	}));
}

export function bulkUploadCommitMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ file, upsert_by }: { file: File; upsert_by?: 'product_key' | 'none' }) =>
			api.bulkUploadCommit(file, { upsert_by }),
		onSuccess: (result) => {
			void qc.invalidateQueries({ queryKey: inventoryKeys.productLists() });
			toast.success(
				`Inserted ${result.inserted}, updated ${result.updated}${
					result.failed > 0 ? `, ${result.failed} failed` : ''
				}`
			);
		}
	}));
}
