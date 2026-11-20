/**
 * `resetPending()` as a reactive read for the shell: true while a hard reset is under way or its
 * block banner is up. The latch lives in `#lib/api/hard-reset.ts` (a plain boolean); this subscribes
 * to its change hook so a banner's control looks stale the moment a reset starts, not only at the
 * next unrelated render.
 */
import { createSubscriber } from 'svelte/reactivity';
import { onResetPendingChange, resetPending } from '#lib/api/hard-reset.ts';

export interface ResetPendingReader {
	readonly pending: boolean;
}

export function createResetPendingReader(): ResetPendingReader {
	const subscribe = createSubscriber((update) => onResetPendingChange(update));
	return {
		get pending() {
			subscribe();
			return resetPending();
		}
	};
}
