/**
 * The ONE place the browser reacts to "your session/scope is gone" API
 * errors. QueryCache and MutationCache `onError` both call `handle`.
 *
 *   401 `session_expired` -> the BFF already tried to refresh and failed: clear
 *                            the cache and go to /signin?next=. Any other 401
 *                            (e.g. a credential check failing) is the call's own
 *                            error and does NOT sign the user out.
 *   ScopeInvalidError     -> the operator scope cookie is expired/tampered/gone:
 *                            drop the stale cookie (the DELETE), then a FULL navigation to
 *                            /operator/tenants (cache cleared, reason left for the toast after the
 *                            load). Never an in-place follow: until it finished, the page would stay
 *                            mounted on the home context with a live, filled-in form. If leaving scope
 *                            fails, sign out instead (the server clears the scope
 *                            cookie on sign-in) rather than loop on 409s.
 *   ScopeChangedError     -> another tab changed the tenant context this page shows: hand it to the
 *                            one foreign-change path (a hard reset that tells the user AFTER the load:
 *                            re-running the layout in place would re-bind forms that stay mounted).
 *                            Nothing was run. A refusal caused by THIS tab's own enter or exit in
 *                            flight is not a foreign change and is ignored there.
 *
 * Each fires once; later failures from in-flight queries are swallowed until
 * the navigation settles. Dependencies are injected so the guard is
 * unit-testable without a router.
 */
import { AuthError, ScopeChangedError, ScopeInvalidError, SESSION_EXPIRED_CODE } from './errors';

export interface SessionGuardDeps {
	goto: (url: string) => unknown;
	/** Drop every cached query (the session is over; nothing may survive). */
	clearCache: () => void;
	notify: (message: string) => void;
	/** Delete the stale scope cookie server-side so /operator/tenants is not itself answered 409. */
	exitScope: () => Promise<unknown>;
	/** The cookie is gone: leave for /operator/tenants with a full navigation (cache cleared, reason kept for after the load). */
	leaveScope: () => void;
	/** The context was changed by someone else: hard reset this tab (declined while an own change is in flight). */
	foreignChange: () => void;
	location: () => { pathname: string; search: string };
}

export interface SessionGuard {
	/** True when the error was a session error and has been handled here. */
	handle: (error: unknown) => boolean;
}

/**
 * An error that ends the session, the operator scope or this page's view of it (the ones handle
 * reacts to). Orchestration
 * that settles many calls (bulk actions) rethrows these instead of counting them as failed rows,
 * so the global handler gets to run the guard.
 */
export function isSessionEndingError(error: unknown): boolean {
	return (
		(error instanceof AuthError && error.status === 401 && error.code === SESSION_EXPIRED_CODE) ||
		error instanceof ScopeInvalidError ||
		error instanceof ScopeChangedError
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
				void deps.exitScope().then(
					() => {
						// The cookie is gone: leave by a full navigation (clears the cache, keeps the reason).
						// The page never follows the new "no context" in place, so no form of it can submit into
						// the home tenant before the navigation lands. `redirecting` stays set: the page is
						// leaving, a straggling 409 must not start a second exit.
						deps.leaveScope();
					},
					(failure: unknown) => {
						// The exit itself was refused because another tab moved the context meanwhile: a valid
						// session in a new context, not a failure to leave. Reset; never sign out for it.
						if (failure instanceof ScopeChangedError) {
							deps.foreignChange();
							redirecting = false;
							return;
						}
						deps.clearCache();
						deps.notify(SCOPE_EXIT_FAILED_MESSAGE);
						settle(deps.goto('/signin'));
					}
				);
				return true;
			}
			if (error instanceof ScopeChangedError) {
				deps.foreignChange();
				return true;
			}
			return false;
		}
	};
}
