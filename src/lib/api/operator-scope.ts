/**
 * Everything the browser does about the operator's tenant context, in ONE place: the BFF call that
 * ends it (DELETE /api/operator/scope clears the `lk_op_tenant` cookie), the one way to follow a
 * change of it (`followScopeChange`) and the cross-tab announcement. Shared by the operator
 * feature's enter/exit service and the global session guard, which lives in `lib/api` and so cannot
 * import features. Nothing else may change or follow the scope cookie from the browser.
 *
 * Entering or leaving a context changes what the (app) layout load answers (`inTenantContext`, the
 * fingerprint every API call carries, and with them the nav, the guards and the permission
 * subtraction), but no navigation re-runs that load by itself: the layout declares
 * `depends(SCOPE_DEPENDENCY)` and `followScopeChange` invalidates it.
 *
 * The ORDER is the point (an earlier version cleared the cache after the navigation it had
 * triggered and destroyed the queries of the page it landed on):
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
export function refreshTenantContext(): Promise<void> {
	return invalidate(SCOPE_DEPENDENCY);
}

/** DELETE the scope cookie. Follow it with `followScopeChange`. */
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
 * The cookie changed (here, or in another tab): follow it. `announce` tells the other tabs to do
 * the same at once, instead of finding out on their next call (which the BFF refuses with
 * `scope_changed` anyway: this is the courtesy, the refusal is the guarantee).
 */
export async function followScopeChange(qc: ContextCache, announce = true): Promise<void> {
	qc.removeQueries({ type: 'inactive' });
	await refreshTenantContext();
	void qc.resetQueries();
	if (announce) scopeChannel()?.postMessage('changed');
}

/** Follow the context changes other tabs announce. Returns the stop function. */
export function listenForScopeChanges(qc: ContextCache): () => void {
	const ch = scopeChannel();
	if (!ch) return () => {};
	const onMessage = () => void followScopeChange(qc, false);
	ch.addEventListener('message', onMessage);
	return () => ch.removeEventListener('message', onMessage);
}

/** Leave the context for the session guard (a dead scope): cookie gone, then follow it. */
export async function leaveTenantContext(qc: ContextCache): Promise<void> {
	await exitOperatorScope();
	await followScopeChange(qc);
}
