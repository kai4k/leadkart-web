/**
 * Everything the browser does about the operator's tenant context, in ONE place: the BFF call that
 * ends it (DELETE /api/operator/scope clears the `lk_op_tenant` cookie), the two ways to follow a
 * change of it and the cross-tab announcement. Shared by the operator feature's enter/exit service,
 * the global session guard and the context field, which live in `lib/api` / `lib/components` and
 * so cannot import features. Nothing else may change or follow the scope cookie from the browser.
 *
 * A change is either THIS tab's own (it entered or left a context: `changeScopeContext`) or somebody
 * else's (another tab, a sign-in or sign-out elsewhere, a refusal that says the page is behind the
 * cookie: `scopeChangedElsewhere`). The two are handled differently on purpose:
 *
 *   own:     followed in place. The (app) layout declares `depends(SCOPE_DEPENDENCY)` and is re-run,
 *            the user's own navigation follows, nothing typed is lost that the user did not leave.
 *   foreign: a HARD reset (cache cleared, page reloaded). Re-running the layout in place would swap
 *            the fingerprint under components that stay mounted (a filled-in "Add member" dialog,
 *            typed values, a bulk selection): the next submit would carry the NEW context's
 *            fingerprint with values meant for the old one. A reload drops all of that. The route
 *            guards then decide where the user lands (a scope page with no context redirects to
 *            /operator/tenants).
 *
 * `scopeChangedElsewhere` is the ONE place that decides own versus foreign.
 *
 * The ORDER of an own change is the point (an earlier version cleared the cache after the
 * navigation it had triggered and destroyed the queries of the page it landed on):
 *   1. cached data nothing shows is dropped now, so the new context's pages cannot mount on it;
 *   2. the layout is re-run (new fingerprint; a guard may redirect and the destination mounts);
 *   3. what IS mounted is reset: its data is dropped and refetched under the new context.
 * Reset (not clear) because a mounted observer keeps working through a reset.
 */
import type { QueryClient } from '@tanstack/svelte-query';
import { invalidate } from '$app/navigation';
import { api } from './client';
import { SCOPE_CHANGE_CHANNEL, SCOPE_DEPENDENCY } from './scope-header.ts';

/** Re-run the (app) layout load: capabilities context, nav, guards and fingerprint follow the scope cookie. */
function refreshTenantContext(): Promise<void> {
	return invalidate(SCOPE_DEPENDENCY);
}

/** DELETE the scope cookie. Follow it with `changeScopeContext` (or use `leaveTenantContext`). */
export async function exitOperatorScope(): Promise<void> {
	await api.delete('/operator/scope');
}

type ContextCache = Pick<QueryClient, 'removeQueries' | 'resetQueries'>;

// One channel per tab: it announces this tab's changes and receives the other tabs'. A channel never
// delivers to itself, so a tab does not follow its own announcement.
let channel: BroadcastChannel | undefined;
function scopeChannel(): BroadcastChannel | undefined {
	if (typeof BroadcastChannel === 'undefined') return undefined;
	channel ??= new BroadcastChannel(SCOPE_CHANGE_CHANNEL);
	return channel;
}

/**
 * Tell the other tabs the context (or the signed-in person) changed here: they reload at once,
 * instead of finding out on their next call, which the BFF refuses with `scope_changed` anyway
 * (this is the courtesy, the refusal is the guarantee). Sign-in and sign-out use it too.
 */
export function announceContextChange(): void {
	scopeChannel()?.postMessage('changed');
}

/** Own changes in progress (a POST/DELETE has gone out and the layout has not committed yet). */
let ownChangesInFlight = 0;
/** A foreign announcement arrived while an own change was in flight: act on it once that has committed. */
let foreignDuringOwn = false;
/** The hard reset has started: nothing after it matters, and a burst of refusals must not stack. */
let reloading = false;

/** Which kind of evidence says the context was changed by somebody else. */
type ForeignSource = 'announcement' | 'refusal';

/**
 * The context was changed by someone else (another tab, a sign-in or sign-out elsewhere): hard
 * reset this tab. Returns true when THIS call started the reload (so the caller tells the user
 * once), false when it was not needed: the tab's own change is in flight (a refetch that started
 * between the POST/DELETE and the layout commit is refused by OUR change, not by another tab), or
 * the reload is already under way. An announcement that arrives during an own change is not lost:
 * the reload runs once that change has committed.
 *
 * `qc` is cleared first when the caller has one; the reload drops the in-memory cache either way.
 */
export function scopeChangedElsewhere(
	qc?: Pick<QueryClient, 'clear'>,
	source: ForeignSource = 'refusal'
): boolean {
	if (reloading) return false;
	if (ownChangesInFlight > 0) {
		if (source === 'announcement') foreignDuringOwn = true;
		return false;
	}
	reloading = true;
	qc?.clear();
	location.reload();
	return true;
}

/**
 * This tab changes the context: `change` is the call that moves the cookie (enter / exit), then the
 * change is followed in place (see the header for the order) and the other tabs are told. The
 * in-flight flag spans the call AND the layout commit, so refusals caused by this very change are not
 * mistaken for another tab's.
 */
export async function changeScopeContext(
	qc: ContextCache & Pick<QueryClient, 'clear'>,
	change: () => Promise<unknown>
): Promise<void> {
	ownChangesInFlight++;
	try {
		await change();
		qc.removeQueries({ type: 'inactive' });
		await refreshTenantContext();
		void qc.resetQueries();
		announceContextChange();
	} finally {
		ownChangesInFlight--;
		if (ownChangesInFlight === 0 && foreignDuringOwn) {
			foreignDuringOwn = false;
			scopeChangedElsewhere(qc, 'announcement');
		}
	}
}

/** Follow the context changes other tabs announce (a hard reset). Returns the stop function. */
export function listenForScopeChanges(qc: Pick<QueryClient, 'clear'>): () => void {
	const ch = scopeChannel();
	if (!ch) return () => {};
	const onMessage = () => void scopeChangedElsewhere(qc, 'announcement');
	ch.addEventListener('message', onMessage);
	return () => ch.removeEventListener('message', onMessage);
}

/** Leave the context for the session guard (a dead scope): cookie gone, then follow it. */
export function leaveTenantContext(qc: ContextCache & Pick<QueryClient, 'clear'>): Promise<void> {
	return changeScopeContext(qc, exitOperatorScope);
}
