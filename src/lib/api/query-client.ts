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
 */
import { QueryClient } from '@tanstack/svelte-query';
import { NetworkError, ServerError, AuthError } from './errors';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000, // 30 s stale-while-revalidate window
			gcTime: 5 * 60_000, // 5 min cache retention after unmount
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
			retry: false // mutations are not idempotent by default
		}
	}
});
