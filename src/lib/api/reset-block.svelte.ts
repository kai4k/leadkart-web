/**
 * Why a hard reset did NOT happen, for the banner that stands in for it (`ReloadNotice.svelte`):
 * the tab is offline (a reload would land on the offline page and lose more than it saves) or the
 * page that just loaded was itself the result of a reset (reloading again would loop). While a
 * block is showing the page is stale: the BFF keeps refusing its calls, and the banner says so.
 */
type ResetBlockKind = 'offline' | 'loop';

/** What the declined reset was for, so a retry (back online) is the SAME reset. */
interface ResetRetry {
	reason: 'context' | 'session' | 'scope';
	source: 'announcement' | 'refusal';
}

export interface ResetBlock {
	readonly kind: ResetBlockKind | null;
	readonly retry: ResetRetry;
	show: (kind: ResetBlockKind, retry?: ResetRetry) => void;
	clear: () => void;
}

const DEFAULT_RETRY: ResetRetry = { reason: 'context', source: 'refusal' };

function createResetBlock(): ResetBlock {
	let kind = $state<ResetBlockKind | null>(null);
	let retry: ResetRetry = DEFAULT_RETRY;
	return {
		get kind() {
			return kind;
		},
		get retry() {
			return retry;
		},
		show(next, forRetry = DEFAULT_RETRY) {
			kind = next;
			retry = forRetry;
		},
		clear() {
			kind = null;
			retry = DEFAULT_RETRY;
		}
	};
}

/** The tab's one block state (browser only: nothing on the server ever shows it). */
export const resetBlock = createResetBlock();
