/**
 * `useOptimisticMutation` — thin wrapper over TanStack `createMutation`
 * that bakes in the standard onMutate/onError/onSettled choreography
 * for optimistic updates. Returns the TanStack mutation handle so
 * call sites read just like a normal mutation.
 *
 * The lifecycle:
 *   1. onMutate:
 *      a. Cancel every key in `cancelKeys()` (defaults to `invalidateKeys()`).
 *         Cancellation is required BEFORE the snapshot — otherwise an
 *         in-flight refetch can land mid-flip and overwrite our optimistic
 *         projection.
 *      b. Caller's `onMutate(vars)` snapshots whatever DETAIL state will
 *         be mutated → returned as `TContext`.
 *      c. We immediately call `applyOptimistic(vars, ctx)` to flip the
 *         detail cache.
 *      d. If `projectInLists` is set, snapshot every cached list page
 *         matching the queryKey prefix AND apply `project(page, vars)`
 *         to each. The snapshot lives on the context under
 *         `__listSnapshots` so onError can restore.
 *   2. mutationFn: caller's HTTP call.
 *   3. onError: `rollback(vars, ctx)` restores the detail snapshot, then
 *      restore each list-page snapshot in turn.
 *   4. onSuccess: optional toast (+ optional Undo action).
 *   5. onSettled: every key returned by `invalidateKeys()` is
 *      invalidated so any optimistic divergence is reconciled.
 *
 * The `projectInLists` option fixes the kanban flicker: when a card is
 * dragged across columns, the detail cache flips immediately AND every
 * cached list page is rewritten so the row shows the new stage in place
 * (instead of briefly snapping back when the list refetches).
 */
import { createMutation, useQueryClient, type CreateMutationResult } from '@tanstack/svelte-query';
import { toast } from '$ui';

export interface ProjectInLists<TVariables> {
	/**
	 * Reactive function returning the list-key PREFIXES to project into.
	 * Each prefix is matched via TanStack's `getQueriesData({ queryKey })`
	 * partial-match, so passing `[['leads', 'list']]` matches every
	 * cached `['leads', 'list', { ...params }]` query.
	 */
	queryKey: () => ReadonlyArray<readonly unknown[]>;
	/**
	 * Pure projection applied to every matching cached page envelope.
	 * Receives whatever the cache holds (the entire `data` value — for
	 * `createInfiniteQuery` that's `{ pages: ..., pageParams: ... }`; for
	 * plain `createQuery` it's the list envelope itself) and returns the
	 * replacement. Returning `old` unchanged is a no-op.
	 */
	project: (page: unknown, vars: TVariables) => unknown;
}

/**
 * Internal context wrapper — the caller's TContext lives under `user`,
 * and we tack a list-snapshot array onto `__listSnapshots` for rollback.
 * Consumers never see this shape; the caller's `applyOptimistic` /
 * `rollback` receive their original TContext.
 */
interface OptimisticContext<TContext> {
	user: TContext;
	listSnapshots: ReadonlyArray<readonly [readonly unknown[], unknown]>;
}

export interface UseOptimisticMutationOptions<TVariables, TData, TContext> {
	mutationFn: (vars: TVariables) => Promise<TData>;
	/**
	 * Query keys to cancel before snapshotting. Defaults to
	 * `invalidateKeys()` so callers who don't care still get a sensible
	 * "cancel what we'll invalidate" behaviour. Override when you need to
	 * cancel BOTH the detail key AND the list keys before the optimistic
	 * flip (the kanban case).
	 */
	cancelKeys?: () => ReadonlyArray<readonly unknown[]>;
	/**
	 * Snapshot whatever state will be optimistically mutated and return
	 * it as `TContext`. Called BEFORE `applyOptimistic`.
	 */
	onMutate: (vars: TVariables) => Promise<TContext> | TContext;
	/** Apply the optimistic projection to the DETAIL cache. */
	applyOptimistic: (vars: TVariables, ctx: TContext) => void;
	/**
	 * Optional list-cache projection — applies `project(page, vars)` to
	 * every cached list page matching `queryKey()` so the mutated row
	 * shows its new value in place. Snapshots are taken automatically and
	 * restored on error.
	 */
	projectInLists?: ProjectInLists<TVariables>;
	/** Restore the DETAIL snapshot on error. List snapshots are restored automatically. */
	rollback: (vars: TVariables, ctx: TContext) => void;
	/** Query keys to invalidate after the mutation settles (success OR error). */
	invalidateKeys: () => ReadonlyArray<readonly unknown[]>;
	/** Optional toast emitted on success. */
	successToast?: (data: TData, vars: TVariables) => string;
	/**
	 * Optional Undo action wired to the success toast. Click the Undo
	 * button to call this — typical use case is a soft delete that
	 * re-creates the row.
	 */
	undo?: (data: TData, vars: TVariables) => void | Promise<void>;
	/** Toast duration. Defaults to 5s (10s when `undo` is wired). */
	toastDurationMs?: number;
}

export type OptimisticMutationHandle<TVariables, TData, TContext> = CreateMutationResult<
	TData,
	Error,
	TVariables,
	TContext
>;

export function useOptimisticMutation<TVariables, TData = unknown, TContext = unknown>(
	options: UseOptimisticMutationOptions<TVariables, TData, TContext>
): OptimisticMutationHandle<TVariables, TData, TContext> {
	const qc = useQueryClient();

	return createMutation<TData, Error, TVariables, OptimisticContext<TContext>>(() => ({
		mutationFn: options.mutationFn,
		onMutate: async (vars: TVariables) => {
			// 1. Cancel in-flight refetches for every key we'll touch so a
			//    late response can't overwrite our optimistic projection.
			const cancelKeys = options.cancelKeys?.() ?? options.invalidateKeys();
			await Promise.all(cancelKeys.map((key) => qc.cancelQueries({ queryKey: key })));

			// 2. Caller's detail snapshot.
			const userCtx = await options.onMutate(vars);

			// 3. Detail-cache projection.
			options.applyOptimistic(vars, userCtx);

			// 4. List-cache projection (snapshot + apply).
			const listSnapshots: Array<readonly [readonly unknown[], unknown]> = [];
			if (options.projectInLists) {
				const project = options.projectInLists.project;
				for (const prefix of options.projectInLists.queryKey()) {
					const matches = qc.getQueriesData({ queryKey: prefix });
					for (const [matchedKey, data] of matches) {
						listSnapshots.push([matchedKey, data]);
					}
					qc.setQueriesData({ queryKey: prefix }, (old: unknown) =>
						old === undefined ? old : project(old, vars)
					);
				}
			}

			return { user: userCtx, listSnapshots };
		},
		onError: (_err: Error, vars: TVariables, ctx: OptimisticContext<TContext> | undefined) => {
			if (!ctx) return;
			// Detail rollback first — that's the caller's authoritative state.
			options.rollback(vars, ctx.user);
			// Then restore each list-page snapshot in the order they were taken.
			for (const [key, snapshot] of ctx.listSnapshots) {
				qc.setQueryData(key, snapshot);
			}
		},
		onSuccess: (data: TData, vars: TVariables) => {
			if (options.successToast) {
				const msg = options.successToast(data, vars);
				const undo = options.undo;
				toast.success(msg, {
					duration: options.toastDurationMs ?? (undo ? 10_000 : 5_000),
					action: undo
						? {
								label: 'Undo',
								onClick: () => undo(data, vars)
							}
						: undefined
				});
			}
		},
		onSettled: () => {
			for (const key of options.invalidateKeys()) {
				void qc.invalidateQueries({ queryKey: key });
			}
		}
	})) as unknown as OptimisticMutationHandle<TVariables, TData, TContext>;
}
