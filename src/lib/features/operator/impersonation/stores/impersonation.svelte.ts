import { startImpersonation, endImpersonation, listImpersonationSessions } from '../api';
import { describeError } from '$api/errors';
import { IMPERSONATION_SESSION_KEY as ACTIVE_SESSION_KEY } from '#lib/utils/impersonation-session-key.ts';
import type { ImpersonationSessionDto, CreateImpersonationSessionRequest } from '../types';

type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

export interface Impersonation {
	readonly active: ImpersonationSessionDto | null;
	readonly status: ImpersonationStatus;
	readonly error: string | null;
	/**
	 * The company's name, for the banner. Kept in memory only (the session DTO carries just an id and
	 * sign-out must leave nothing of it behind), so after a reload the banner says "a company".
	 */
	readonly targetName: string | null;
	/** Read the persisted ID + sync with server. Called once on app shell mount. */
	reconcile(): Promise<void>;
	/** POST a new session, persist the ID, then reconcile to populate active DTO. */
	start(req: CreateImpersonationSessionRequest, targetName?: string): Promise<void>;
	/** DELETE the active session + clear localStorage. */
	end(): Promise<void>;
}

/**
 * Impersonation store — tracks the operator's currently-active session.
 *
 * Persistence: the active session_id is persisted to localStorage so a
 * page reload doesn't lose the banner state. On mount, the store
 * reconciles with the server (GET /sessions) — if the persisted ID is
 * no longer active (expired / ended elsewhere), the local state is
 * cleared.
 *
 * Semantics: impersonation is an audit-trail recorder — the session
 * records the operator's intent + reason. It does NOT reissue JWTs or
 * switch permission scope. The banner reminds the operator their
 * actions are flagged + audited under the session ID (SOC2 CC4.1 /
 * DPDP §12).
 *
 * Svelte canon: factory + closure over `$state`. Singleton instance
 * exported at the bottom.
 */
function createImpersonation(): Impersonation {
	let active = $state<ImpersonationSessionDto | null>(null);
	let status = $state<ImpersonationStatus>('idle');
	let error = $state<string | null>(null);
	// The name belongs to ONE session id: it is shown only while that session is the active one.
	let named = $state<{ sessionId: string; name: string } | null>(null);

	// Ordering, in two counters. READS are numbered (`readSeq`); a read is applied only if it is newer than the last read
	// that was APPLIED (`appliedSeq`), so an older good answer still beats a newer FAILED one, and a newer good answer
	// beats an older one that arrives late. MUTATIONS (start, end) bump `epoch`: every read begun before one is dropped,
	// so neither puts an ended session back on the banner nor resets 'mutating' mid-DELETE. A failed read never clears a
	// shown session: when in doubt the indicator stays shown.
	let readSeq = 0;
	let appliedSeq = 0;
	let epoch = 0;
	let readsInFlight = 0;

	/** 'loading' and 'mutating' are never left behind: every operation ends by settling to what the state really is. */
	function settle(): void {
		if (status === 'loading' && readsInFlight === 0) status = active ? 'active' : 'idle';
	}

	async function load(): Promise<void> {
		if (typeof window === 'undefined') return;
		const seq = ++readSeq;
		const myEpoch = epoch;
		const persistedId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
		if (!persistedId) {
			// the key was removed (another tab ended the session): this is the newest read and it is synchronous
			active = null;
			named = null;
			error = null;
			appliedSeq = seq;
			if (status === 'loading' || status === 'active' || status === 'error') status = 'idle';
			return;
		}
		if (status !== 'mutating') status = 'loading';
		readsInFlight++;
		try {
			const { sessions } = await listImpersonationSessions();
			if (myEpoch !== epoch || seq < appliedSeq) return; // stale: a newer operation owns the state
			appliedSeq = seq;
			const match = sessions.find((s) => s.session_id === persistedId);
			error = null;
			if (match) {
				if (named && named.sessionId !== match.session_id) named = null;
				active = match;
				status = 'active';
			} else {
				if (window.localStorage.getItem(ACTIVE_SESSION_KEY) === persistedId)
					window.localStorage.removeItem(ACTIVE_SESSION_KEY);
				active = null;
				named = null;
				status = 'idle';
			}
		} catch (e) {
			if (myEpoch !== epoch) return;
			// a failed read leaves the last known state: a shown session stays shown
			error = describeError(e, { fallback: 'Failed to load impersonation sessions' });
			if (status === 'loading' && !active) status = 'error';
		} finally {
			readsInFlight--;
			settle();
		}
	}

	/** Never while a start or an end is running (they own the state); otherwise this is the newest read. */
	async function reconcile(): Promise<void> {
		if (status === 'mutating') return;
		return load();
	}

	async function start(req: CreateImpersonationSessionRequest, name?: string): Promise<void> {
		epoch++;
		status = 'mutating';
		error = null;
		try {
			const { session_id } = await startImpersonation(req);
			window.localStorage.setItem(ACTIVE_SESSION_KEY, session_id);
			named = name ? { sessionId: session_id, name } : null;
			epoch++; // reads begun while the POST ran are older than the session
			status = 'idle';
			// Server doesn't return the full DTO on POST; refetch to populate.
			await load();
		} catch (e) {
			status = active ? 'active' : 'error';
			error = describeError(e, { fallback: 'Failed to start impersonation' });
			throw e;
		} finally {
			if (status === 'mutating') status = active ? 'active' : 'idle';
			settle();
		}
	}

	async function end(): Promise<void> {
		if (!active || status === 'mutating') return;
		const endedId = active.session_id;
		epoch++; // any read already in flight is now stale
		status = 'mutating';
		try {
			await endImpersonation(endedId);
			// a session started in another tab during the DELETE has its own id: leave its key alone
			if (window.localStorage.getItem(ACTIVE_SESSION_KEY) === endedId)
				window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			active = null;
			named = null;
			status = 'idle';
		} catch (e) {
			status = 'error';
			error = describeError(e, { fallback: 'Failed to end impersonation' });
			throw e;
		} finally {
			if (status === 'mutating') status = active ? 'active' : 'idle';
		}
	}

	return {
		get active() {
			return active;
		},
		get status() {
			return status;
		},
		get error() {
			return error;
		},
		get targetName() {
			return named && active && named.sessionId === active.session_id ? named.name : null;
		},
		reconcile,
		start,
		end
	};
}

export const impersonation = createImpersonation();
