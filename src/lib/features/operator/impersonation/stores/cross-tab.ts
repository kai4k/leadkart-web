/**
 * The cross-tab signal of the impersonation store: localStorage holds a pure SIGNAL (a changing value, never a session
 * id) so another tab knows to read the server's list again.
 */
import {
	IMPERSONATION_SESSION_KEY as LEGACY_SESSION_KEY,
	IMPERSONATION_SIGNAL_KEY as SIGNAL_KEY
} from '#lib/utils/impersonation-session-key.ts';

export function announceChange(now: () => number): void {
	try {
		window.localStorage.setItem(SIGNAL_KEY, `${now()}.${Math.random().toString(36).slice(2)}`);
	} catch {
		/* storage blocked: other tabs catch up on focus */
	}
}

/** Call `onChange` when another tab signals; returns the function that stops listening. */
export function listenForChanges(onChange: () => void): () => void {
	if (typeof window === 'undefined') return () => {};
	const handler = (ev: StorageEvent) => {
		if (ev.key === null || ev.key === SIGNAL_KEY) onChange();
	};
	window.addEventListener('storage', handler);
	return () => window.removeEventListener('storage', handler);
}

/** A session id remembered by an older build is removed (the server's list is the only truth). */
export function clearLegacyId(): void {
	try {
		window.localStorage.removeItem(LEGACY_SESSION_KEY);
	} catch {
		/* best effort */
	}
}
