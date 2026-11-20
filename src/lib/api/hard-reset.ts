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
 *   - Never twice in a row: when the page that just loaded was itself the result of a reset (flag
 *     under 10 s old) another reset would loop; the block banner offers signing in again instead.
 *   - `reloading` swallows the burst of refusals that follows the first one. A reset the browser
 *     cancels (a `beforeunload` prompt, Stop) must not leave it set for ever: it is released on
 *     `pageshow` and after a short timeout, and the stale reason with it.
 *
 * Storage can be unavailable (privacy mode): the reset then works without the reason.
 */
import { resetBlock } from './reset-block.svelte.ts';

export type ResetReason = 'context' | 'session' | 'scope';

export const RELOAD_REASON_KEY = 'lk_reload_reason';

/** A page that loads from a reset younger than this must not start another one. */
const LOOP_WINDOW_MS = 10_000;
/** A reset still not navigated away after this long was cancelled. */
const RELEASE_AFTER_MS = 5_000;
/** A reason older than this is a leftover, not the reason for this load. */
const REASON_MAX_AGE_MS = 60_000;

const REASONS: readonly ResetReason[] = ['context', 'session', 'scope'];

let reloading = false;
/** When the page this document replaced started its reset (set once the reason was taken). */
let arrivedByResetAt: number | undefined;

interface Flag {
	reason: ResetReason;
	at: number;
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
			return { reason: parsed.reason as ResetReason, at: parsed.at };
		}
	} catch {
		// unavailable or not ours
	}
	return null;
}

function writeFlag(reason: ResetReason): void {
	try {
		sessionStorage.setItem(RELOAD_REASON_KEY, JSON.stringify({ reason, at: Date.now() }));
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
	arrivedByResetAt = flag.at;
	return Date.now() - flag.at < REASON_MAX_AGE_MS ? flag.reason : null;
}

function arrivedByRecentReset(): boolean {
	const at = arrivedByResetAt ?? readFlag()?.at;
	if (at === undefined) return false;
	const age = Date.now() - at;
	return age >= 0 && age < LOOP_WINDOW_MS;
}

/** Navigate this tab to `url`, replacing the entry. The only `location.replace` in the app. */
export function replaceLocation(url: string): void {
	location.replace(url);
}

function armRelease(): void {
	const release = () => {
		reloading = false;
		clearFlag();
		window.removeEventListener('pageshow', release);
	};
	window.addEventListener('pageshow', release);
	setTimeout(release, RELEASE_AFTER_MS);
}

/**
 * Hard-navigate this tab to `url` for `reason`. True when THIS call started it; false when it was
 * declined (already under way, a block banner took over). `qc` is cleared first when given.
 */
export function navigateHard(
	url: string,
	reason: ResetReason,
	qc?: { clear: () => void }
): boolean {
	if (reloading) return false;
	if (arrivedByRecentReset()) {
		resetBlock.show('loop');
		return false;
	}
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		resetBlock.show('offline');
		return false;
	}
	reloading = true;
	qc?.clear();
	writeFlag(reason);
	armRelease();
	replaceLocation(url);
	return true;
}

/** Reload this page's own URL as a GET (see the header). */
export function hardReset(reason: ResetReason, qc?: { clear: () => void }): boolean {
	return navigateHard(location.pathname + location.search, reason, qc);
}
