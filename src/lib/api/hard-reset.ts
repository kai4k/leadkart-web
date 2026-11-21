/**
 * THE hard reset: the one way the browser leaves a page whose context (company, account, session)
 * moved under it. Every caller (a broadcast from another tab, a refusal from the BFF, a layout that
 * committed another context, a dead operator scope) comes through `navigateHard`.
 *
 *   - `location.replace`, never `location.reload`: on a native-POST result page `reload()` re-POSTs
 *     the stale body behind the browser's resubmit prompt; `replace` of the page's own URL is a GET.
 *   - The reason is written to `sessionStorage` (`lk_reload_reason`, with a timestamp) BEFORE the
 *     navigation, so the page that loads can tell the user why (`takeReloadReason`, shown by
 *     `ReloadNotice.svelte`). A toast posted before the navigation dies with the document.
 *   - Not while offline: the reload would land on the offline page. The block banner stands in.
 *   - Never twice in a row, for resets a REFUSAL or the layout's committed-context check start: when
 *     the page that just loaded was itself the result of such a reset (flag under 10 s old) another
 *     one would loop; the block banner offers signing in again instead. An ANNOUNCEMENT from another
 *     tab always resets and never counts towards the loop: a tab never hears its own announcement,
 *     so announcements cannot loop, and two legitimate changes made in another tab seconds apart
 *     must both be followed.
 *   - `reloading` swallows the burst of refusals that follows the first one and is the LATCH that
 *     keeps the page from sending: it is released only by `pageshow` (a new or restored document),
 *     never by a timeout. A reset still pending after a few seconds (the browser cancelled it with a
 *     `beforeunload` prompt or Stop, or the reload is very slow) shows the `stalled` block banner
 *     instead: the page's children are removed, Reload is offered, the latch stays closed. The reason
 *     flag is not cleared either (a slow navigation would land without its toast); it expires by its
 *     own timestamp. Live toasts (and their Undo actions) are dismissed when a reset starts.
 *   - `resetPending()` is true while a reset is under way or a declined one has a banner up: the API
 *     client sends nothing then, so no code outside the page's removed children (a toast's Undo)
 *     can write under the new context.
 *
 * Storage can be unavailable (privacy mode): the reset then works without the reason.
 */
import { toast } from 'svelte-sonner';
import { resetBlock } from './reset-block.svelte.ts';

export type ResetReason = 'context' | 'session' | 'scope';

export const RELOAD_REASON_KEY = 'lk_reload_reason';

/** A page that loads from a reset younger than this must not start another one. */
const LOOP_WINDOW_MS = 10_000;
/** A reset whose document is still here after this long stalled (cancelled, or a very slow reload). */
const STALL_AFTER_MS = 5_000;
/** A reason older than this is a leftover, not the reason for this load. */
const REASON_MAX_AGE_MS = 60_000;

const REASONS: readonly ResetReason[] = ['context', 'session', 'scope'];

let reloading = false;
/** When the page this document replaced started its reset (set once the reason was taken). */
let arrivedByResetAt: number | undefined;
/** The `at` of the flag THIS document wrote: such a flag is for the next page, not evidence about this one. */
let wroteFlagAt: number | undefined;

/** What started a reset: another tab's announcement, or a refusal / the layout's own check. */
export type ResetSource = 'announcement' | 'refusal';

interface Flag {
	reason: ResetReason;
	at: number;
	source: ResetSource;
}

function readFlag(): Flag | null {
	try {
		const raw = sessionStorage.getItem(RELOAD_REASON_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<Flag> | null;
		if (
			parsed &&
			REASONS.includes(parsed.reason as ResetReason) &&
			typeof parsed.at === 'number' &&
			Number.isFinite(parsed.at)
		) {
			return {
				reason: parsed.reason as ResetReason,
				at: parsed.at,
				// A flag without a source predates the field: it counts towards the loop stop.
				source: parsed.source === 'announcement' ? 'announcement' : 'refusal'
			};
		}
	} catch {
		// unavailable or not ours
	}
	return null;
}

function writeFlag(reason: ResetReason, source: ResetSource): void {
	try {
		wroteFlagAt = Date.now();
		sessionStorage.setItem(
			RELOAD_REASON_KEY,
			JSON.stringify({ reason, at: wroteFlagAt, source } satisfies Flag)
		);
	} catch {
		// unavailable: the reset still happens, just without a reason to show
	}
}

function clearFlag(): void {
	try {
		sessionStorage.removeItem(RELOAD_REASON_KEY);
	} catch {
		// unavailable
	}
}

/**
 * The reason this document was loaded by a reset, once: reads and removes the flag, remembers when
 * it was set (the loop stop needs it after the flag is gone). Null for an ordinary load.
 */
export function takeReloadReason(): ResetReason | null {
	const flag = readFlag();
	clearFlag();
	if (!flag) return null;
	// Only a reset a refusal started can be one step of a loop (see the header).
	arrivedByResetAt = flag.source === 'refusal' ? flag.at : undefined;
	return Date.now() - flag.at < REASON_MAX_AGE_MS ? flag.reason : null;
}

function arrivedByRecentReset(): boolean {
	// Before the reason is taken, the flag in storage is the previous page's, unless this document wrote it.
	const flag = readFlag();
	const left = flag && flag.at !== wroteFlagAt && flag.source === 'refusal' ? flag.at : undefined;
	const at = arrivedByResetAt ?? left;
	if (at === undefined) return false;
	const age = Date.now() - at;
	return age >= 0 && age < LOOP_WINDOW_MS;
}

/** Navigate this tab to `url`, replacing the entry. The only `location.replace` in the app. */
export function replaceLocation(url: string): void {
	location.replace(url);
}

/**
 * The latch stays closed until the document is replaced or restored (`pageshow`). It is NOT reopened
 * by a timeout: for a reset the committed-context check started, `page.data` already holds the NEW
 * fingerprint and code outside the removed children (a toast's Undo, the command palette, the user
 * menu) would send under it, accepted by the BFF. A reset still pending after `STALL_AFTER_MS` was
 * cancelled or is very slow: the block banner takes over (children removed, a Reload button).
 */
function armRelease(reason: ResetReason, source: ResetSource): void {
	const timer = setTimeout(() => {
		if (reloading) resetBlock.show('stalled', { reason, source });
	}, STALL_AFTER_MS);
	const release = () => {
		reloading = false;
		notifyPendingChange();
		window.removeEventListener('pageshow', release);
		clearTimeout(timer);
	};
	window.addEventListener('pageshow', release);
}

/**
 * True while a reset is under way, or one was declined and its banner is showing: the page is stale
 * and nothing may be sent from it (the API client refuses, before any network call).
 */
export function resetPending(): boolean {
	return reloading || resetBlock.kind !== null;
}

const pendingListeners = new Set<() => void>();

/** Additive, read-only hook: `listener` runs after `reloading` changed. It cannot change the latch. */
export function onResetPendingChange(listener: () => void): () => void {
	pendingListeners.add(listener);
	return () => {
		pendingListeners.delete(listener);
	};
}

function notifyPendingChange(): void {
	// a throwing listener must not strand the tab: it is isolated, and the latch is already decided
	for (const listener of pendingListeners) {
		try {
			listener();
		} catch {
			/* observers only */
		}
	}
}

/**
 * Hard-navigate this tab to `url` for `reason`. True when THIS call started it; false when it was
 * declined (already under way, a block banner took over). `qc` is cleared first when given.
 * `source` says what started it: only a `refusal` is subject to the loop stop.
 */
export function navigateHard(
	url: string,
	reason: ResetReason,
	qc?: { clear: () => void },
	source: ResetSource = 'refusal'
): boolean {
	if (reloading) return false;
	if (source === 'refusal' && arrivedByRecentReset()) {
		resetBlock.show('loop', { reason, source });
		return false;
	}
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		resetBlock.show('offline', { reason, source });
		return false;
	}
	reloading = true;
	qc?.clear();
	// Nothing actionable from the old context stays on screen (a toast's Undo would send from it).
	toast.dismiss();
	writeFlag(reason, source);
	armRelease(reason, source);
	replaceLocation(url);
	// observers run last: a throwing one can no longer keep the navigation from being requested
	notifyPendingChange();
	return true;
}

/** Reload this page's own URL as a GET (see the header). */
export function hardReset(
	reason: ResetReason,
	qc?: { clear: () => void },
	source: ResetSource = 'refusal'
): boolean {
	return navigateHard(location.pathname + location.search, reason, qc, source);
}
