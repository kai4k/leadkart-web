/**
 * The ONE place the browser reacts to "your session/scope is gone" API
 * errors. QueryCache and MutationCache `onError` both call `handle`.
 *
 *   401 AuthError         -> the BFF already tried to refresh and failed: clear
 *                            the cache and go to /signin?next=.
 *   409 ScopeInvalidError -> the operator scope cookie is expired/tampered/gone:
 *                            clear the cache, toast, drop the stale cookie
 *                            (exit scope) and go back to /operator/tenants.
 *
 * Each fires once; later failures from in-flight queries are swallowed until
 * the navigation settles. Dependencies are injected so the guard is
 * unit-testable without a router.
 */
import { AuthError, ScopeInvalidError } from './errors';

export interface SessionGuardDeps {
	goto: (url: string) => unknown;
	clearCache: () => void;
	notify: (message: string) => void;
	/** Delete the stale scope cookie server-side so /operator/tenants is not itself answered 409. */
	exitScope: () => Promise<unknown>;
	location: () => { pathname: string; search: string };
}

export interface SessionGuard {
	/** True when the error was a session error and has been handled here. */
	handle: (error: unknown) => boolean;
}

export const SCOPE_EXPIRED_MESSAGE = 'Operator scope expired — select the tenant again';

export function createSessionGuard(deps: SessionGuardDeps): SessionGuard {
	let redirecting = false;

	function settle(navigation: unknown): void {
		void Promise.resolve(navigation).finally(() => {
			redirecting = false;
		});
	}

	return {
		handle(error) {
			if (error instanceof AuthError && error.status === 401) {
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
				redirecting = true;
				deps.clearCache();
				deps.notify(SCOPE_EXPIRED_MESSAGE);
				settle(
					deps
						.exitScope()
						.catch(() => undefined)
						.then(() => deps.goto('/operator/tenants'))
				);
				return true;
			}
			return false;
		}
	};
}
