/**
 * The ONE place the browser reacts to "your session/scope is gone" API
 * errors. QueryCache and MutationCache `onError` both call `handle`.
 *
 *   401 AuthError → the BFF already tried to refresh and failed: clear the
 *                   cache and go to /signin (once; later failures from
 *                   in-flight queries are swallowed).
 *
 * Dependencies are injected so the guard is unit-testable without a router.
 */
import { AuthError } from './errors';

export interface SessionGuardDeps {
	goto: (url: string) => unknown;
	clearCache: () => void;
	notify: (message: string) => void;
	location: () => { pathname: string; search: string };
}

export interface SessionGuard {
	/** True when the error was a session error and has been handled here. */
	handle: (error: unknown) => boolean;
}

export function createSessionGuard(deps: SessionGuardDeps): SessionGuard {
	let redirecting = false;

	function redirectOnce(target: (here: string) => string | null): void {
		if (redirecting) return;
		const { pathname, search } = deps.location();
		const dest = target(pathname + search);
		if (dest === null) return;
		redirecting = true;
		deps.clearCache();
		void deps.goto(dest);
	}

	return {
		handle(error) {
			if (error instanceof AuthError && error.status === 401) {
				redirectOnce((here) =>
					here.startsWith('/signin') ? null : `/signin?next=${encodeURIComponent(here)}`
				);
				return true;
			}
			return false;
		}
	};
}
