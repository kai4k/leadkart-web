/**
 * TanStack Query client — singleton instance shared across the app.
 *
 * Mount in (app)/+layout.svelte via:
 *   <QueryClientProvider client={queryClient}>
 *     {@render children()}
 *   </QueryClientProvider>
 *
 * Retry policy (per spec §B.1.1):
 *   - NetworkError / ServerError: up to 2 retries (transport fault, retryable)
 *   - AuthError: no retry (401 = not authed, 403 = not permitted)
 *   - Everything else: no retry (4xx are caller faults)
 * Mutations are never auto-retried (not idempotent by default).
 *
 * Global error surfacing (TanStack canon — see "Render Optimizations" docs):
 *   - QueryCache.onError fires for EVERY background query failure. We toast
 *     only when the query already has prior data (background refetch failed
 *     while user is looking at stale-but-rendered data). Fresh-load failures
 *     are surfaced by the component's own isError branch.
 *   - MutationCache.onError fires for EVERY mutation failure. We toast unless
 *     the mutation opts out via `meta: { skipErrorToast: true }` — used when
 *     a dialog shows an inline Alert and a toast would be duplicative.
 */
import { QueryClient, QueryCache, MutationCache } from '@tanstack/svelte-query';
import { ApiError, NetworkError, ServerError, AuthError } from './errors';
import { toast } from '$ui';

function describeError(err: unknown): string {
	if (err instanceof ApiError) return err.message;
	return 'Something went wrong';
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			// Only surface background refetch failures — fresh-load errors
			// are already rendered by the component via query.isError.
			if (query.state.data !== undefined) {
				toast.error(`Couldn't refresh: ${describeError(error)}`);
			}
		}
	}),
	mutationCache: new MutationCache({
		onError: (error, _vars, _ctx, mutation) => {
			// Opt-out: pass meta: { skipErrorToast: true } when the calling
			// dialog renders an inline error and a toast would be noise.
			if (mutation.meta?.skipErrorToast === true) return;
			// AuthError already triggers a signout redirect; suppress the toast
			// so the user doesn't see "permission denied" before being kicked
			// to /signin.
			if (error instanceof AuthError && error.status === 401) return;
			toast.error(describeError(error));
		}
	}),
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			gcTime: 5 * 60_000,
			retry: (failureCount, error) => {
				if (error instanceof AuthError) return false;
				if (error instanceof NetworkError || error instanceof ServerError) {
					return failureCount < 2;
				}
				return false;
			},
			refetchOnWindowFocus: true,
			refetchOnReconnect: true
		},
		mutations: {
			retry: false
		}
	}
});
