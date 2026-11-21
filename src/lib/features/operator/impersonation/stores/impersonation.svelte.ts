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

	// A ticket per operation (a reconcile or a mutation). A response is applied ONLY while its ticket is still the
	// latest: a reconcile that was in flight when End started (or when a newer reconcile started) is stale, and
	// neither puts an ended session back on the banner nor resets the 'mutating' state mid-DELETE.
	let ticket = 0;

	async function load(mine: number): Promise<void> {
		if (typeof window === 'undefined') return;
		const persistedId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
		if (!persistedId) {
			active = null;
			named = null;
			return;
		}
		status = 'loading';
		try {
			const { sessions } = await listImpersonationSessions();
			if (mine !== ticket) return; // stale: a newer operation owns the state
			const match = sessions.find((s) => s.session_id === persistedId);
			if (match) {
				if (named && named.sessionId !== match.session_id) named = null;
				active = match;
				status = 'active';
			} else {
				window.localStorage.removeItem(ACTIVE_SESSION_KEY);
				active = null;
				named = null;
				status = 'idle';
			}
		} catch (e) {
			if (mine !== ticket) return;
			status = 'error';
			error = describeError(e, { fallback: 'Failed to load impersonation sessions' });
		}
	}

	/** Never while a start or an end is running (they own the state); otherwise this is the newest operation. */
	async function reconcile(): Promise<void> {
		if (status === 'mutating') return;
		return load(++ticket);
	}

	async function start(req: CreateImpersonationSessionRequest, name?: string): Promise<void> {
		const mine = ++ticket;
		status = 'mutating';
		error = null;
		try {
			const { session_id } = await startImpersonation(req);
			window.localStorage.setItem(ACTIVE_SESSION_KEY, session_id);
			named = name ? { sessionId: session_id, name } : null;
			// Server doesn't return the full DTO on POST; refetch to populate.
			await load(mine);
		} catch (e) {
			status = 'error';
			error = describeError(e, { fallback: 'Failed to start impersonation' });
			throw e;
		}
	}

	async function end(): Promise<void> {
		if (!active || status === 'mutating') return;
		++ticket; // any reconcile already in flight is now stale
		status = 'mutating';
		try {
			await endImpersonation(active.session_id);
			window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			active = null;
			named = null;
			status = 'idle';
		} catch (e) {
			status = 'error';
			error = describeError(e, { fallback: 'Failed to end impersonation' });
			throw e;
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
