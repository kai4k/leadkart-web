import {
	startImpersonation,
	endImpersonation,
	listImpersonationSessions
} from '$features/operator/impersonation/api';
import type {
	ImpersonationSessionDto,
	CreateImpersonationSessionRequest
} from '$features/operator/impersonation/types';

const ACTIVE_SESSION_KEY = 'leadkart-impersonation-session';

export type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

/**
 * ImpersonationStore — tracks the operator's currently-active session.
 *
 * Persistence: the active session_id is persisted to localStorage so a
 * page reload doesn't lose the banner state. On mount, the store
 * reconciles with the server (GET /sessions) — if the persisted ID
 * is no longer active (expired / ended elsewhere), the local state
 * is cleared.
 *
 * Semantics: impersonation is an audit-trail recorder — the session
 * records the operator's intent + reason. It does NOT reissue JWTs or
 * switch permission scope. The banner reminds the operator their actions
 * are flagged + audited under the session ID (SOC2 CC4.1 / DPDP §12).
 */
export class ImpersonationStore {
	active = $state<ImpersonationSessionDto | null>(null);
	status = $state<ImpersonationStatus>('idle');
	error = $state<string | null>(null);

	/** Read the persisted ID + sync with server. Called once on app shell mount. */
	async reconcile(): Promise<void> {
		if (typeof window === 'undefined') return;
		const persistedId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
		if (!persistedId) {
			this.active = null;
			return;
		}
		this.status = 'loading';
		try {
			const { sessions } = await listImpersonationSessions();
			const match = sessions.find((s) => s.session_id === persistedId);
			if (match) {
				this.active = match;
				this.status = 'active';
			} else {
				window.localStorage.removeItem(ACTIVE_SESSION_KEY);
				this.active = null;
				this.status = 'idle';
			}
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load impersonation sessions';
		}
	}

	/** POST a new session, persist the ID, then reconcile to populate active DTO. */
	async start(req: CreateImpersonationSessionRequest): Promise<void> {
		this.status = 'mutating';
		this.error = null;
		try {
			const { session_id } = await startImpersonation(req);
			window.localStorage.setItem(ACTIVE_SESSION_KEY, session_id);
			// Server doesn't return the full DTO on POST; refetch to populate.
			await this.reconcile();
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to start impersonation';
			throw e;
		}
	}

	/** DELETE the active session + clear localStorage. */
	async end(): Promise<void> {
		if (!this.active) return;
		this.status = 'mutating';
		try {
			await endImpersonation(this.active.session_id);
			window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			this.active = null;
			this.status = 'idle';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to end impersonation';
			throw e;
		}
	}
}

export const impersonation = new ImpersonationStore();
