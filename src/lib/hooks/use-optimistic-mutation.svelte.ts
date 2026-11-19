/**
 * `useOptimisticMutation` — `createResourceMutation`'s vocabulary plus the standard
 * onMutate/onError choreography for optimistic updates. Invalidation, the success toast
 * (with optional Undo), `inlineErrors` -> `meta.skipErrorToast`, `mutationKey` and
 * `onSuccess` all come from `resourceMutationOptions` (one implementation); the same
 * option names and `(vars, data)` argument order apply.
 *
 * IDS TRAVEL IN THE MUTATION VARIABLES: `fn`, `invalidate`, `onMutate` etc. receive the
 * entity id through `vars`. Never close over a route param or `$state` id when the
 * mutation is created (it goes stale on navigation).
 *
 * Optimistic-only options:
 *   1. onMutate:
 *      a. Cancel every key in `cancelKeys(vars)`. Cancellation is required BEFORE
 *         the snapshot — otherwise an in-flight refetch can land mid-flip and
 *         overwrite our optimistic projection.
 *      b. Caller's `onMutate(vars)` snapshots whatever state will be mutated →
 *         returned as `TContext`.
 *      c. `applyOptimistic(vars, ctx)` flips the cache.
 *      d. If `projectInLists` is set, every cached list page matching the
 *         queryKey prefix is snapshotted and rewritten with `project(page, vars)`.
 *   2. onError: `rollback(vars, ctx)` restores the snapshot, then each list-page
 *      snapshot; the keys in `cancelKeys(vars)` are invalidated to reconcile.
 *   3. onSuccess (shared): `invalidate(vars, data)` awaited, then toast (+ Undo), then
 *      the caller's `onSuccess`.
 *
 * `projectInLists` fixes the kanban flicker: when a card is dragged across columns the
 * detail cache flips immediately AND every cached list page is rewritten, so the row
 * shows the new stage in place instead of snapping back while the list refetches.
 */
import { createMutation, useQueryClient, type CreateMutationResult } from '@tanstack/svelte-query';
import { resourceMutationOptions, type ResourceMutationOptions } from '#lib/api/mutations.ts';

interface ProjectInLists<TVars> {
	/**
	 * Returns the list-key PREFIXES to project into. Each prefix is matched via
	 * TanStack's `getQueriesData({ queryKey })` partial-match, so `[['leads', 'list']]`
	 * matches every cached `['leads', 'list', { ...params }]` query.
	 */
	queryKey: () => ReadonlyArray<readonly unknown[]>;
	/**
	 * Pure projection applied to every matching cached value (for
	 * `createInfiniteQuery` that is `{ pages, pageParams }`). Returning `old`
	 * unchanged is a no-op.
	 */
	project: (page: unknown, vars: TVars) => unknown;
}

/** Internal context wrapper; consumers only ever see their own TContext. */
interface OptimisticContext<TContext> {
	user: TContext;
	listSnapshots: ReadonlyArray<readonly [readonly unknown[], unknown]>;
}

export interface UseOptimisticMutationOptions<
	TVars,
	TData,
	TContext
> extends ResourceMutationOptions<TVars, TData> {
	/** Query keys cancelled before the snapshot and invalidated if the mutation fails. */
	cancelKeys: (vars: TVars) => ReadonlyArray<readonly unknown[]>;
	/** Snapshot whatever state will be optimistically mutated; returned as `TContext`. */
	onMutate: (vars: TVars) => Promise<TContext> | TContext;
	/** Apply the optimistic projection to the cache. */
	applyOptimistic: (vars: TVars, ctx: TContext) => void;
	/** Optional list-cache projection; snapshots are taken and restored automatically. */
	projectInLists?: ProjectInLists<TVars>;
	/** Restore the snapshot on error. List snapshots are restored automatically. */
	rollback: (vars: TVars, ctx: TContext) => void;
}

export type OptimisticMutationHandle<TVars, TData, TContext> = CreateMutationResult<
	TData,
	Error,
	TVars,
	OptimisticContext<TContext>
>;

export function useOptimisticMutation<TVars, TData = unknown, TContext = unknown>(
	options: UseOptimisticMutationOptions<TVars, TData, TContext>
): OptimisticMutationHandle<TVars, TData, TContext> {
	const qc = useQueryClient();

	return createMutation<TData, Error, TVars, OptimisticContext<TContext>>(() => ({
		...resourceMutationOptions(qc, options),
		onMutate: async (vars: TVars) => {
			await Promise.all(options.cancelKeys(vars).map((key) => qc.cancelQueries({ queryKey: key })));

			const userCtx = await options.onMutate(vars);
			options.applyOptimistic(vars, userCtx);

			const listSnapshots: Array<readonly [readonly unknown[], unknown]> = [];
			if (options.projectInLists) {
				const project = options.projectInLists.project;
				for (const prefix of options.projectInLists.queryKey()) {
					for (const [matchedKey, data] of qc.getQueriesData({ queryKey: prefix })) {
						listSnapshots.push([matchedKey, data]);
					}
					qc.setQueriesData({ queryKey: prefix }, (old: unknown) =>
						old === undefined ? old : project(old, vars)
					);
				}
			}

			return { user: userCtx, listSnapshots };
		},
		onError: (_err: Error, vars: TVars, ctx: OptimisticContext<TContext> | undefined) => {
			if (ctx) {
				options.rollback(vars, ctx.user);
				for (const [key, snapshot] of ctx.listSnapshots) qc.setQueryData(key, snapshot);
			}
			for (const key of options.cancelKeys(vars)) void qc.invalidateQueries({ queryKey: key });
		}
	}));
}
