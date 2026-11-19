/** Abort helpers for the API client. Fake-timer friendly (no AbortSignal.timeout). */

/**
 * One signal that aborts when any input aborts (carrying that reason).
 * `AbortSignal.any` needs Safari 17.4+; older engines get the manual combiner.
 */
export function anySignal(signals: readonly AbortSignal[]): AbortSignal {
	if (typeof AbortSignal.any === 'function') return AbortSignal.any([...signals]);
	const ctrl = new AbortController();
	const cleanups: Array<() => void> = [];
	const abortWith = (reason: unknown) => {
		for (const off of cleanups) off();
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
	return ctrl.signal;
}

/** A timeout in ms that is a real limit (0, Infinity, NaN, undefined mean "none"). */
function isFiniteTimeout(ms: number | undefined): ms is number {
	return typeof ms === 'number' && Number.isFinite(ms) && ms > 0;
}

/** A signal combining the caller's signal with an optional timeout; call `dispose` when done. */
export function requestSignal(
	callerSignal: AbortSignal | undefined,
	timeoutMs: number | undefined
): { signal: AbortSignal | undefined; dispose: () => void } {
	if (!isFiniteTimeout(timeoutMs)) return { signal: callerSignal, dispose: () => {} };
	const timer = new AbortController();
	const id = setTimeout(
		() => timer.abort(new DOMException('Request timed out', 'TimeoutError')),
		timeoutMs
	);
	const signal = callerSignal ? anySignal([callerSignal, timer.signal]) : timer.signal;
	return { signal, dispose: () => clearTimeout(id) };
}
