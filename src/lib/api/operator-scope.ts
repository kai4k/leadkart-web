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
import { z } from 'zod';
import { invalidate } from '$app/navigation';
import { api } from './client';
import { hardReset, type ResetReason } from './hard-reset.ts';
import { SCOPE_CHANGE_CHANNEL, SCOPE_DEPENDENCY } from './scope-header.ts';

/** Re-run the (app) layout load: capabilities context, nav, guards and fingerprint follow the scope cookie. */
function refreshTenantContext(): Promise<void> {
	return invalidate(SCOPE_DEPENDENCY);
}

/** What the BFF answers when it enters or ends a context: the fingerprint the layout will commit. */
export const scopeChangeSchema = z.object({ scope_context: z.string().min(1) });

/**
 * DELETE the scope cookie; resolves to the NEW context fingerprint. Follow it with
 * `changeScopeContext` (or use `leaveTenantContext`).
 */
export async function exitOperatorScope(): Promise<string> {
	return (await api.deleteJson('/operator/scope', undefined, scopeChangeSchema)).scope_context;
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
 * (this is the courtesy, the refusal is the guarantee). Sign-in and sign-out use it too, with the
 * `session` reason (what the reloaded tab tells its user).
 */
export function announceContextChange(reason: 'context' | 'session' = 'context'): void {
	scopeChannel()?.postMessage(reason);
}

/**
 * The fingerprint this tab's own enter / exit is waiting to see committed by the layout, until it
 * does (or `OWN_CHANGE_WINDOW_MS` passes). It is the BFF's own answer to the change, so the commit
 * that follows is recognised by its VALUE: another invalidate superseding the scope one still
 * lands on it (absorbed), and a foreign cookie change landing inside the window lands on a
 * different one (a reset). There is no counter of "own changes in flight" deciding that.
 */
let expected: { fingerprint: string; until: number } | undefined;
/** Own calls (POST / DELETE) between "sent" and "answered": the answer does not exist yet. */
let callsInFlight = 0;
/** A foreign announcement arrived while an own call was in flight: act on it once that has committed. */
let foreignDuringOwn: ResetReason | null = null;

/** How long a refusal is blamed on this tab's own change after the BFF answered it. */
const OWN_CHANGE_WINDOW_MS = 5_000;

/**
 * True while this tab's own enter / exit is between its call and the layout commit: a refetch that
 * started then is refused by OUR change (the page still shows the old fingerprint), not by another tab.
 */
function ownScopeChangeInFlight(): boolean {
	return callsInFlight > 0 || (expected !== undefined && Date.now() < expected.until);
}

/** Which kind of evidence says the context was changed by somebody else. */
type ForeignSource = 'announcement' | 'refusal';

function resetForForeignChange(
	qc: Pick<QueryClient, 'clear'> | undefined,
	source: ForeignSource,
	reason: ResetReason
): boolean {
	expected = undefined;
	return hardReset(reason, qc, source);
}

/**
 * The context was changed by someone else (another tab, a sign-in or sign-out elsewhere, a cookie
 * change nothing announced): hard reset this tab (`hard-reset.ts`: `replace`, the reason left for
 * the next page to show, never offline, never in a loop of refusals). Returns true when THIS call
 * started the reset, false when it was not needed or not possible: the tab's own change is between
 * its call and its commit (a refetch that started then is refused by OUR change, not by another
 * tab), the reset is already under way, or a block banner took over. An announcement that arrives
 * while an own call is in flight is not lost: the reset runs once that call has settled.
 *
 * `qc` is cleared first when the caller has one; the reload drops the in-memory cache either way.
 * The layout's committed-context check, the announcements and the BFF's refusals all end here (the
 * check compares values and does not ask whether this tab is changing, see `createCommittedContext`).
 */
export function scopeChangedElsewhere(
	qc?: Pick<QueryClient, 'clear'>,
	source: ForeignSource = 'refusal',
	reason: ResetReason = 'context'
): boolean {
	if (source === 'announcement' ? callsInFlight > 0 : ownScopeChangeInFlight()) {
		if (source === 'announcement') foreignDuringOwn = reason;
		return false;
	}
	return resetForForeignChange(qc, source, reason);
}

/**
 * What the (app) layout last committed as the tab's context. `observe` takes the fingerprint of
 * every commit: the first is remembered; the same one is nothing; the one this tab's own enter /
 * exit was told to expect is absorbed (the in-place flow); ANY other value is somebody else's
 * change (the layout clearing the cookie on lost permission, a sign-in elsewhere, a foreign enter
 * landing inside our own window) and hard-resets the tab, reported as moved. Cookie changes
 * nothing announced re-run the layout in place through a capabilities refresh or any navigation;
 * without this check the page would re-bind under mounted forms and no refusal would ever come
 * (the fingerprint now matches).
 */
export function createCommittedContext(qc: Pick<QueryClient, 'clear'>): {
	observe: (fingerprint: string | undefined) => boolean;
} {
	let committed: string | undefined;
	let seen = false;
	return {
		observe(fingerprint) {
			if (!seen) {
				seen = true;
				committed = fingerprint;
				return false;
			}
			if (fingerprint !== undefined && fingerprint === expected?.fingerprint) {
				expected = undefined;
				committed = fingerprint;
				return false;
			}
			if (fingerprint === committed) return false;
			resetForForeignChange(qc, 'refusal', 'context');
			return true;
		}
	};
}

/**
 * This tab changes the context: `change` is the call that moves the cookie (enter / exit) and
 * answers with the NEW fingerprint, then the change is followed in place (see the header for the
 * order) and the other tabs are told. The call is "in flight" until it answers, and the answer is
 * the fingerprint the layout is expected to commit (see `expected`).
 */
export async function changeScopeContext(
	qc: ContextCache & Pick<QueryClient, 'clear'>,
	change: () => Promise<string>
): Promise<void> {
	callsInFlight++;
	try {
		try {
			const fingerprint = await change();
			expected = { fingerprint, until: Date.now() + OWN_CHANGE_WINDOW_MS };
		} finally {
			callsInFlight--;
		}
		qc.removeQueries({ type: 'inactive' });
		await refreshTenantContext();
		void qc.resetQueries();
		announceContextChange();
	} finally {
		if (callsInFlight === 0 && foreignDuringOwn) {
			const reason = foreignDuringOwn;
			foreignDuringOwn = null;
			scopeChangedElsewhere(qc, 'announcement', reason);
		}
	}
}

/** Follow the context changes other tabs announce (a hard reset). Returns the stop function. */
export function listenForScopeChanges(qc: Pick<QueryClient, 'clear'>): () => void {
	const ch = scopeChannel();
	if (!ch) return () => {};
	const onMessage = (event?: MessageEvent) =>
		void scopeChangedElsewhere(
			qc,
			'announcement',
			event?.data === 'session' ? 'session' : 'context'
		);
	ch.addEventListener('message', onMessage);
	return () => ch.removeEventListener('message', onMessage);
}

/** Leave the context in place: cookie gone, then follow it (the own-exit flow, without navigating). */
export function leaveTenantContext(qc: ContextCache & Pick<QueryClient, 'clear'>): Promise<void> {
	return changeScopeContext(qc, exitOperatorScope);
}
