/**
 * Abort + deadline helpers shared by the browser client and the BFF (`lib/server/proxy.ts`):
 * ONE implementation of "a signal that follows a parent and aborts with a TimeoutError".
 * Fake-timer friendly (no AbortSignal.timeout).
 */

/**
 * One signal that aborts when any input aborts (carrying that reason). `cleanup` removes the
 * listeners the manual combiner put on the inputs; call it when the signal is no longer needed.
 * `AbortSignal.any` needs Safari 17.4+; older engines get the manual combiner.
 */
export function anySignal(signals: readonly AbortSignal[]): {
	signal: AbortSignal;
	cleanup: () => void;
} {
	if (typeof AbortSignal.any === 'function') {
		return { signal: AbortSignal.any([...signals]), cleanup: () => {} };
	}
	const ctrl = new AbortController();
	const cleanups: Array<() => void> = [];
	const cleanup = () => {
		for (const off of cleanups.splice(0)) off();
	};
	const abortWith = (reason: unknown) => {
		cleanup();
		ctrl.abort(reason);
	};
	for (const s of signals) {
		if (s.aborted) {
			abortWith(s.reason);
			break;
		}
		const onAbort = () => abortWith(s.reason);
		s.addEventListener('abort', onAbort, { once: true });
		cleanups.push(() => s.removeEventListener('abort', onAbort));
	}
	return { signal: ctrl.signal, cleanup };
}

/** A timeout in ms that is a real limit (0, Infinity, NaN, undefined mean "none"). */
function isFiniteTimeout(ms: number | undefined): ms is number {
	return typeof ms === 'number' && Number.isFinite(ms) && ms > 0;
}

export interface Deadline {
	/** Aborts with the parent's reason, or with a `TimeoutError` DOMException at the deadline. */
	signal: AbortSignal;
	/** True when the deadline fired (the timer's own signal), whatever rejection reached the caller. */
	timedOut: () => boolean;
	/** Stops the clock only; the signal keeps following the parent (BFF: after response headers arrive). */
	stopTimer: () => void;
	/** Stops the clock and releases every listener put on the parent. */
	dispose: () => void;
}

/** `parent` combined with a deadline of `ms` (must be a finite positive number). */
export function deadlineSignal(parent: AbortSignal | undefined, ms: number): Deadline {
	const timer = new AbortController();
	const id = setTimeout(
		() => timer.abort(new DOMException('Request timed out', 'TimeoutError')),
		ms
	);
	const stopTimer = () => clearTimeout(id);
	const combined = parent ? anySignal([parent, timer.signal]) : undefined;
	return {
		signal: combined?.signal ?? timer.signal,
		timedOut: () => timer.signal.aborted,
		stopTimer,
		dispose: () => {
			stopTimer();
			combined?.cleanup();
		}
	};
}

export interface RequestSignal {
	signal: AbortSignal | undefined;
	timedOut: () => boolean;
	/** Stops the clock only (response headers are in); the signal keeps following the caller's. */
	stopTimer: () => void;
	dispose: () => void;
}

/** A signal combining the caller's signal with an optional timeout; call `dispose` when done. */
export function requestSignal(
	callerSignal: AbortSignal | undefined,
	timeoutMs: number | undefined
): RequestSignal {
	if (!isFiniteTimeout(timeoutMs)) {
		return { signal: callerSignal, timedOut: () => false, stopTimer: () => {}, dispose: () => {} };
	}
	const { signal, timedOut, stopTimer, dispose } = deadlineSignal(callerSignal, timeoutMs);
	return { signal, timedOut, stopTimer, dispose };
}
