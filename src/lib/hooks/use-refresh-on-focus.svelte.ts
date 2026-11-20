/**
 * Run a refresh when the window regains focus after the page has been away (or idle) for longer
 * than `minMs` since the last run. A tab left open overnight, or a permission changed by an admin
 * in another window, is picked up the moment the user comes back, without a refetch on every
 * focus. `createStaleGuard` is the decision, kept pure so it can be tested without a window.
 */

export interface StaleGuard {
	/** Call when the window regained focus / became visible. */
	regained(): void;
}

export function createStaleGuard(
	run: () => void | Promise<void>,
	minMs = 60_000,
	now: () => number = Date.now
): StaleGuard {
	let last = now();
	return {
		regained() {
			const t = now();
			if (t - last <= minMs) return;
			last = t;
			void run();
		}
	};
}

/** Wire the guard to the window; call during component setup. */
export function useRefreshOnFocus(run: () => void | Promise<void>, minMs = 60_000): void {
	$effect(() => {
		const guard = createStaleGuard(run, minMs);
		const onVisible = () => {
			if (document.visibilityState === 'visible') guard.regained();
		};
		window.addEventListener('focus', guard.regained);
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			window.removeEventListener('focus', guard.regained);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
}
