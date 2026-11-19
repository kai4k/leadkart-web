/**
 * Shared mutation helper. Go mutations return 204 (or an id-only body), so
 * the query layer invalidates and refetches; it never writes a response DTO
 * into the cache.
 *
 * Cache coherence rules (every query hook follows them):
 *  1. A mutation invalidates the detail key of every entity it changes, plus
 *     every list prefix that shows that entity. Invalidation is awaited, so
 *     the mutation resolves after the refetch.
 *  2. No `setQueryData` from mutation responses. Go returns no DTO.
 *  3. Optimistic updates (lead stage and temperature only) use
 *     `useOptimisticMutation`, which snapshots, projects, rolls back and
 *     invalidates on settle.
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
	successToast?: string | ((vars: TVars, data: TData) => string);
	inlineErrors?: boolean;
	onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

export function resourceMutationOptions<TVars, TData>(
	qc: QueryClient,
	o: ResourceMutationOptions<TVars, TData>
) {
	return {
		mutationFn: o.fn,
		meta: o.inlineErrors ? { skipErrorToast: true } : undefined,
		onSuccess: async (data: TData, vars: TVars) => {
			await Promise.all(
				o.invalidate(vars, data).map((queryKey) => qc.invalidateQueries({ queryKey }))
			);
			const copy =
				typeof o.successToast === 'function' ? o.successToast(vars, data) : o.successToast;
			if (copy) toast.success(copy);
			await o.onSuccess?.(data, vars);
		}
	};
}

export function createResourceMutation<TVars, TData = void>(
	o: ResourceMutationOptions<TVars, TData>
) {
	const qc = useQueryClient();
	return createMutation<TData, Error, TVars>(() => resourceMutationOptions(qc, o));
}
