/**
 * Why a hard reset did NOT happen, for the banner that stands in for it (`ReloadNotice.svelte`):
 * the tab is offline (a reload would land on the offline page and lose more than it saves) or the
 * page that just loaded was itself the result of a reset (reloading again would loop). While a
 * block is showing the page is stale: the BFF keeps refusing its calls, and the banner says so.
 */
export type ResetBlockKind = 'offline' | 'loop';

export interface ResetBlock {
	readonly kind: ResetBlockKind | null;
	show: (kind: ResetBlockKind) => void;
	clear: () => void;
}

export function createResetBlock(): ResetBlock {
	let kind = $state<ResetBlockKind | null>(null);
	return {
		get kind() {
			return kind;
		},
		show(next) {
			kind = next;
		},
		clear() {
			kind = null;
		}
	};
}

/** The tab's one block state (browser only: nothing on the server ever shows it). */
export const resetBlock = createResetBlock();
