/**
 * The ONE place the browser reacts to "your session/scope is gone" API
 * errors. QueryCache and MutationCache `onError` both call `handle`.
 *
 *   401 `session_expired` -> the BFF already tried to refresh and failed: clear
 *                            the cache and go to /signin?next=. Any other 401
 *                            (e.g. a credential check failing) is the call's own
 *                            error and does NOT sign the user out.
 *   ScopeInvalidError     -> the operator scope cookie is expired/tampered/gone:
 *                            drop the stale cookie (exit scope), reset the cache
 *                            and go back to /operator/tenants. If leaving scope
 *                            fails, sign out instead (the server clears the scope
 *                            cookie on sign-in) rather than loop on 409s.
 *
 * Each fires once; later failures from in-flight queries are swallowed until
 * the navigation settles. Dependencies are injected so the guard is
 * unit-testable without a router.
 */
import { SCOPE_EXPIRED_MESSAGE } from './scope-header.ts';
import { AuthError, ScopeInvalidError, SESSION_EXPIRED_CODE } from './errors';

export interface SessionGuardDeps {
	goto: (url: string) => unknown;
	/** Drop every cached query (the session is over; nothing may survive). */
	clearCache: () => void;
	/**
	 * Empty the cache but keep observers alive and refetch the active ones
	 * (TanStack `clear()` detaches them, leaving a page on /operator/tenants stuck).
	 */
	resetCache: () => void;
	notify: (message: string) => void;
	/** Delete the stale scope cookie server-side so /operator/tenants is not itself answered 409. */
	exitScope: () => Promise<unknown>;
	location: () => { pathname: string; search: string };
}

export interface SessionGuard {
	/** True when the error was a session error and has been handled here. */
	handle: (error: unknown) => boolean;
}

/**
 * An error that ends the session or the operator scope (the ones handle reacts to). Orchestration
 * that settles many calls (bulk actions) rethrows these instead of counting them as failed rows,
 * so the global handler gets to run the guard.
 */
export function isSessionEndingError(error: unknown): boolean {
	return (
		(error instanceof AuthError && error.status === 401 && error.code === SESSION_EXPIRED_CODE) ||
		error instanceof ScopeInvalidError
	);
}

const SCOPE_EXIT_FAILED_MESSAGE = 'Could not leave the tenant context — signing out';

export function createSessionGuard(deps: SessionGuardDeps): SessionGuard {
	let redirecting = false;

	function settle(navigation: unknown): void {
		void Promise.resolve(navigation).finally(() => {
			redirecting = false;
		});
	}

	return {
		handle(error) {
			if (error instanceof AuthError && isSessionEndingError(error)) {
				if (redirecting) return true;
				const { pathname, search } = deps.location();
				if (pathname.startsWith('/signin')) return true;
				redirecting = true;
				deps.clearCache();
				settle(deps.goto(`/signin?next=${encodeURIComponent(pathname + search)}`));
				return true;
			}
			if (error instanceof ScopeInvalidError) {
				if (redirecting) return true;
				// Already leaving for /signin (scope exit failed): nothing left to repair.
				if (deps.location().pathname.startsWith('/signin')) return true;
				redirecting = true;
				settle(
					deps.exitScope().then(
						() => {
							// After the exit: reset refetches the active queries, which now
							// run unscoped. Done before navigating so no scoped data survives.
							deps.resetCache();
							deps.notify(SCOPE_EXPIRED_MESSAGE);
							return deps.goto('/operator/tenants');
						},
						() => {
							deps.clearCache();
							deps.notify(SCOPE_EXIT_FAILED_MESSAGE);
							return deps.goto('/signin');
						}
					)
				);
				return true;
			}
			return false;
		}
	};
}
