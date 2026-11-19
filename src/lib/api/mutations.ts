/**
 * Shared mutation helper. Go mutations return 204 (or an id-only body), so
 * the query layer invalidates and refetches; it never writes a response DTO
 * into the cache.
 *
 * ONE vocabulary (also used by `useOptimisticMutation`, which is built on
 * `resourceMutationOptions`): `fn`, `invalidate(vars, data)`, `successToast(vars, data)`,
 * `inlineErrors`, `onSuccess(vars, data)`, `undo(vars, data)`, `mutationKey`.
 * Arguments are ALWAYS `(vars, data)`.
 *
 * IDS TRAVEL IN THE MUTATION VARIABLES. `fn`, `invalidate` and `successToast` receive the
 * entity id through `vars`; never close over a route param or `$state` id when the
 * mutation is created (the creation-time value goes stale on navigation: a prior bug class
 * in this repo). Create the mutation once, call `mutate({ id, ... })`.
 *
 * Cache coherence rules (every query hook follows them):
 *  1. A mutation invalidates the detail key of every entity it changes, plus
 *     every list prefix that shows that entity. Invalidation is awaited, so
 *     the mutation resolves after the refetch.
 *  2. No `setQueryData` from mutation responses. Go returns no DTO.
 *  3. Optimistic updates (lead stage and temperature, session revoke) use
 *     `useOptimisticMutation`, which snapshots, projects, rolls back and
 *     reuses this helper for invalidation, toast and meta.
 *  4. A form or dialog that shows the error inline sets `inlineErrors: true`.
 *     That sets `meta.skipErrorToast` and avoids a double toast. Otherwise
 *     the global `MutationCache` toast is the only error toast, and hooks
 *     never toast errors themselves.
 */
import {
	createMutation,
	useQueryClient,
	type QueryClient,
	type QueryKey
} from '@tanstack/svelte-query';
import { toast } from '$ui';

export interface ResourceMutationOptions<TVars, TData> {
	fn: (vars: TVars) => Promise<TData>;
	invalidate: (vars: TVars, data: TData) => readonly QueryKey[];
	/** An empty string shows no toast. */
	successToast?: string | ((vars: TVars, data: TData) => string);
	/** `warning` for a partial success; defaults to `success`. */
	successToastVariant?: (vars: TVars, data: TData) => 'success' | 'warning';
	inlineErrors?: boolean;
	onSuccess?: (vars: TVars, data: TData) => void | Promise<void>;
	/** Adds an Undo button to the success toast (needs `successToast`). */
	undo?: (vars: TVars, data: TData) => void | Promise<void>;
	/** Toast duration; defaults to 5 s (10 s when `undo` is set). */
	toastDurationMs?: number;
	mutationKey?: QueryKey;
}

export function resourceMutationOptions<TVars, TData>(
	qc: QueryClient,
	o: ResourceMutationOptions<TVars, TData>
) {
	return {
		mutationKey: o.mutationKey,
		mutationFn: o.fn,
		meta: o.inlineErrors ? { skipErrorToast: true } : undefined,
		onSuccess: async (data: TData, vars: TVars) => {
			await Promise.all(
				o.invalidate(vars, data).map((queryKey) => qc.invalidateQueries({ queryKey }))
			);
			const copy =
				typeof o.successToast === 'function' ? o.successToast(vars, data) : o.successToast;
			if (copy) {
				const undo = o.undo;
				const show =
					o.successToastVariant?.(vars, data) === 'warning' ? toast.warning : toast.success;
				show(
					copy,
					undo
						? {
								duration: o.toastDurationMs ?? 10_000,
								action: {
									label: 'Undo',
									// The undo runs as a mutation of its own, so a failure reaches the
									// MutationCache's one global handler (session guard, then toast).
									onClick: () => {
										void qc
											.getMutationCache()
											.build(qc, { mutationFn: async () => undo(vars, data) })
											.execute(undefined)
											.catch(() => {}); // already reported by that handler
									}
								}
							}
						: o.toastDurationMs
							? { duration: o.toastDurationMs }
							: undefined
				);
			}
			await o.onSuccess?.(vars, data);
		}
	};
}

export function createResourceMutation<TVars, TData = void>(
	o: ResourceMutationOptions<TVars, TData>
) {
	const qc = useQueryClient();
	return createMutation<TData, Error, TVars>(() => resourceMutationOptions(qc, o));
}
