import {
	startImpersonation,
	endImpersonation,
	listImpersonationSessions
} from '$features/operator/impersonation/api';
import { ApiError } from '$api/errors';
import type {
	ImpersonationSessionDto,
	CreateImpersonationSessionRequest
} from '$features/operator/impersonation/types';

const ACTIVE_SESSION_KEY = 'leadkart-impersonation-session';

export type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

export interface Impersonation {
	readonly active: ImpersonationSessionDto | null;
	readonly status: ImpersonationStatus;
	readonly error: string | null;
	/** Read the persisted ID + sync with server. Called once on app shell mount. */
	reconcile(): Promise<void>;
	/** POST a new session, persist the ID, then reconcile to populate active DTO. */
	start(req: CreateImpersonationSessionRequest): Promise<void>;
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

	async function reconcile(): Promise<void> {
		if (typeof window === 'undefined') return;
		const persistedId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
		if (!persistedId) {
			active = null;
			return;
		}
		status = 'loading';
		try {
			const { sessions } = await listImpersonationSessions();
			const match = sessions.find((s) => s.session_id === persistedId);
			if (match) {
				active = match;
				status = 'active';
			} else {
				window.localStorage.removeItem(ACTIVE_SESSION_KEY);
				active = null;
				status = 'idle';
			}
		} catch (e) {
			status = 'error';
			error = e instanceof ApiError ? e.message : 'Failed to load impersonation sessions';
		}
	}

	async function start(req: CreateImpersonationSessionRequest): Promise<void> {
		status = 'mutating';
		error = null;
		try {
			const { session_id } = await startImpersonation(req);
			window.localStorage.setItem(ACTIVE_SESSION_KEY, session_id);
			// Server doesn't return the full DTO on POST; refetch to populate.
			await reconcile();
		} catch (e) {
			status = 'error';
			error = e instanceof ApiError ? e.message : 'Failed to start impersonation';
			throw e;
		}
	}

	async function end(): Promise<void> {
		if (!active) return;
		status = 'mutating';
		try {
			await endImpersonation(active.session_id);
			window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			active = null;
			status = 'idle';
		} catch (e) {
			status = 'error';
			error = e instanceof ApiError ? e.message : 'Failed to end impersonation';
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
		reconcile,
		start,
		end
	};
}

export const impersonation = createImpersonation();
