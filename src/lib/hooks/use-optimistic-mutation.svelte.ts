/**
 * `useOptimisticMutation` — thin wrapper over TanStack `createMutation`
 * that bakes in the standard onMutate/onError/onSettled choreography
 * for optimistic updates. Returns the TanStack mutation handle so
 * call sites read just like a normal mutation.
 *
 * The lifecycle:
 *   1. onMutate: caller's `onMutate(vars)` snapshots current state →
 *      ctx. We immediately call `applyOptimistic(vars, ctx)`.
 *   2. mutationFn: caller's HTTP call.
 *   3. onError: `rollback(vars, ctx)` restores the snapshot.
 *   4. onSuccess: optional toast (+ optional Undo action).
 *   5. onSettled: every key returned by `invalidateKeys()` is
 *      invalidated so any optimistic divergence is reconciled.
 */
import { createMutation, useQueryClient, type CreateMutationResult } from '@tanstack/svelte-query';
import { toast } from '$ui';

export interface UseOptimisticMutationOptions<TVariables, TData, TContext> {
	mutationFn: (vars: TVariables) => Promise<TData>;
	/**
	 * Snapshot whatever state will be optimistically mutated and return
	 * it as `TContext`. Called BEFORE `applyOptimistic`.
	 */
	onMutate: (vars: TVariables) => Promise<TContext> | TContext;
	/** Apply the optimistic projection. Receives `vars` + the snapshot. */
	applyOptimistic: (vars: TVariables, ctx: TContext) => void;
	/** Restore the snapshot on error. */
	rollback: (vars: TVariables, ctx: TContext) => void;
	/** Query keys to invalidate after the mutation settles (success OR error). */
	invalidateKeys: () => unknown[][];
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

	return createMutation<TData, Error, TVariables, TContext>(() => ({
		mutationFn: options.mutationFn,
		onMutate: async (vars: TVariables) => {
			const ctx = await options.onMutate(vars);
			options.applyOptimistic(vars, ctx);
			return ctx;
		},
		onError: (_err: Error, vars: TVariables, ctx: TContext | undefined) => {
			if (ctx !== undefined) {
				options.rollback(vars, ctx);
			}
		},
		onSuccess: (data: TData, vars: TVariables) => {
			if (options.successToast) {
				const msg = options.successToast(data, vars);
				const hasUndo = !!options.undo;
				toast('success', msg, {
					duration: options.toastDurationMs ?? (hasUndo ? 10_000 : 5_000),
					action: hasUndo
						? {
								label: 'Undo',
								onClick: () => options.undo!(data, vars)
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
	}));
}
