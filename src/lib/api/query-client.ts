/**
 * TanStack Query clients — ONE factory (`createQueryClient`) holds the
 * defaults; who gets which instance is decided here too:
 *
 *   browser: one long-lived client for the whole tab (`renderQueryClient`
 *            returns it; the session guard and `clearUserBrowserState` act on it).
 *   server:  a fresh client per request (`renderQueryClient` builds one and
 *            drops it when the render ends). The Node process renders every
 *            user's pages, so a shared server cache hands one user's data
 *            (capabilities seeded from `initialData`) to the next user's HTML.
 *
 * Mount in (app)/+layout.svelte via:
 *   const client = renderQueryClient();
 *   <QueryClientProvider {client}>…</QueryClientProvider>
 * Everything else reaches the client through `useQueryClient()` (context).
 * `check-query-client-per-request` keeps it that way.
 *
 * Retry policy (per spec §B.1.1):
 *   - NetworkError / ServerError: up to 2 retries (transport fault, retryable)
 *   - TimeoutError: ONE retry (queries are GETs; a hung read is worth one more try)
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
import { onDestroy } from 'svelte';
import { browser } from '$app/env';
import { goto } from '$app/navigation';
import { toast } from '$ui';
import { describeError, NetworkError, ServerError, AuthError, TimeoutError } from './errors';
import { exitOperatorScope } from './operator-scope';
import { createSessionGuard } from './session-guard';
import { clearPrivateCaches, IMPERSONATION_SESSION_KEY } from '#lib/utils/private-caches.ts';

/** A client with the app's defaults and the session guard wired to it. */
export function createQueryClient(): QueryClient {
	const sessionGuard = createSessionGuard({
		// Targets are internal constants plus an encoded `next`; resolve() takes route ids, not query strings.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto: (url) => goto(url),
		clearCache: () => void clearUserBrowserState(),
		resetCache: () => void client.resetQueries(),
		notify: (message) => toast.error(message),
		exitScope: exitOperatorScope,
		location: () => window.location
	});

	const client: QueryClient = new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (sessionGuard.handle(error)) return;
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
				// Session errors (401) redirect to /signin; no toast on the way out.
				if (sessionGuard.handle(error)) return;
				if (mutation.meta?.skipErrorToast === true) return;
				toast.error(describeError(error));
			}
		}),
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				gcTime: 5 * 60_000,
				retry: (failureCount, error) => {
					if (error instanceof AuthError) return false;
					if (error instanceof TimeoutError) return failureCount < 1;
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
	return client;
}

// The tab's client, created on first use. Browser only: never assigned on the server.
let browserClient: QueryClient | undefined;

/**
 * The client for the current render. Call during component initialisation
 * (it registers the server-side teardown).
 */
export function renderQueryClient(): QueryClient {
	if (browser) return (browserClient ??= createQueryClient());
	const client = createQueryClient();
	// Queries never fetch during SSR, but the cache holds this request's data
	// and gc timers; drop both once the render is done.
	onDestroy(() => client.clear());
	return client;
}

/**
 * Clear everything user-specific the browser holds: the query cache, the
 * service-worker private caches and the impersonation-session marker. The ONE
 * implementation behind logout, the session guard and arrival on an auth page
 * (a session ended by a server redirect never ran the client guard).
 */
export async function clearUserBrowserState(): Promise<void> {
	browserClient?.clear();
	try {
		window.localStorage.removeItem(IMPERSONATION_SESSION_KEY);
	} catch {
		// Storage can be unavailable (privacy mode); clearing is best-effort.
	}
	await clearPrivateCaches();
}
