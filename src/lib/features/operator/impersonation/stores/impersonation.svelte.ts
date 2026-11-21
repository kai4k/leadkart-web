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
	/** Read the persisted ID + sync with server. Reads queued behind each other collapse into one. */
	reconcile(): Promise<void>;
	/** POST a new session, show it at once, persist the ID, then read to refine it. Refused while one is active. */
	start(req: CreateImpersonationSessionRequest, targetName?: string): Promise<void>;
	/** DELETE the active session + clear localStorage. A second call while one is queued or running is a no-op. */
	end(): Promise<void>;
}

/**
 * Impersonation store: the operator's currently-active session. A security indicator, so it is built so that no
 * interleaving can hide it.
 *
 * ONE serial queue. Every operation (start, end, a read) is appended to a single promise chain and runs only after the
 * previous one has fully settled, so no two requests of this store are ever in flight together and there is nothing to
 * order afterwards (no sequence numbers, no tickets). A read that is queued but has not started absorbs further
 * `reconcile()` calls. `status` is DERIVED from the queue and the state, never set by hand:
 *   mutating  a start or an end is queued or running
 *   loading   only reads are queued or running
 *   otherwise active (a session is shown) | error (nothing shown, the last read failed) | idle
 *
 * State is what this tab last knew for certain, and when in doubt the indicator is SHOWN:
 *   - a successful start shows a provisional session at once (from the POST and the request) and persists its id BEFORE
 *     the follow-up read; if that read fails, the session stays shown and start() still resolves
 *   - a failed read never hides a shown session
 *   - only a successful read that does not list the session, or a successful end, hides it
 *   - localStorage may throw: the in-memory state is the truth for this tab
 * Another tab's change arrives as a `storage` event and queues a read. Impersonation records the operator's intent for
 * the audit trail; it does not switch permission scope (SOC2 CC4.1 / DPDP §12).
 *
 * Svelte canon: factory + closure over `$state`. Singleton instance exported at the bottom.
 */
function createImpersonation(): Impersonation {
	let active = $state<ImpersonationSessionDto | null>(null);
	let error = $state<string | null>(null);
	// The name belongs to ONE session id: it is shown only while that session is the active one.
	let named = $state<{ sessionId: string; name: string } | null>(null);

	let tail: Promise<void> = Promise.resolve();
	let mutations = $state(0); // queued or running start / end
	let reads = $state(0); // queued or running reads
	let queuedRead: Promise<void> | null = null; // a read that has not started yet
	let ending = false;

	const status = $derived<ImpersonationStatus>(
		mutations > 0
			? 'mutating'
			: reads > 0
				? 'loading'
				: active
					? 'active'
					: error
						? 'error'
						: 'idle'
	);

	const store = {
		get: (): string | null => {
			try {
				return window.localStorage.getItem(ACTIVE_SESSION_KEY);
			} catch {
				return null;
			}
		},
		set: (id: string): void => {
			try {
				window.localStorage.setItem(ACTIVE_SESSION_KEY, id);
			} catch {
				/* storage blocked or full: this tab's memory still shows the session */
			}
		},
		clear: (id: string): void => {
			try {
				// another tab's newer session has its own id: leave its key alone
				if (window.localStorage.getItem(ACTIVE_SESSION_KEY) === id)
					window.localStorage.removeItem(ACTIVE_SESSION_KEY);
			} catch {
				/* as above */
			}
		}
	};

	function enqueue<T>(kind: 'read' | 'mutation', run: () => Promise<T>): Promise<T> {
		if (kind === 'read') reads++;
		else mutations++;
		const op = tail.then(async () => {
			try {
				return await run();
			} finally {
				if (kind === 'read') reads--;
				else mutations--;
			}
		});
		tail = op.then(
			() => undefined,
			() => undefined
		);
		return op;
	}

	/** One read, inside the queue. Never throws: a failure keeps what is shown and records the message. */
	async function read(): Promise<void> {
		const id = store.get() ?? active?.session_id ?? null;
		if (!id) {
			// nothing persisted and nothing shown (another tab ended the session, or there never was one)
			active = null;
			named = null;
			error = null;
			return;
		}
		try {
			const { sessions } = await listImpersonationSessions();
			const match = sessions.find((s) => s.session_id === id);
			error = null;
			if (match) {
				if (named && named.sessionId !== match.session_id) named = null;
				active = match;
			} else {
				store.clear(id);
				active = null;
				named = null;
			}
		} catch (e) {
			error = describeError(e, { fallback: 'Failed to load impersonation sessions' });
		}
	}

	function reconcile(): Promise<void> {
		if (typeof window === 'undefined') return Promise.resolve();
		if (queuedRead) return queuedRead;
		queuedRead = enqueue('read', async () => {
			queuedRead = null; // it has started: a later reconcile() queues a fresh read
			await read();
		});
		return queuedRead;
	}

	function start(req: CreateImpersonationSessionRequest, name?: string): Promise<void> {
		if (active || mutations > 0)
			return Promise.reject(
				new Error(
					active
						? 'An impersonation session is already active: end it first'
						: 'Another impersonation request is in progress'
				)
			);
		return enqueue('mutation', async () => {
			error = null;
			let created;
			try {
				created = await startImpersonation(req);
			} catch (e) {
				error = describeError(e, { fallback: 'Failed to start impersonation' });
				throw e;
			}
			// the server holds an audited session now: show it before anything else can fail
			const now = new Date().toISOString();
			active = {
				session_id: created.session_id,
				operator_id: '',
				target_tenant_id: req.target_tenant_id,
				reason: req.reason,
				created_at: now,
				expires_at: created.expires_at_utc
			};
			named = name ? { sessionId: created.session_id, name } : null;
			store.set(created.session_id);
			// the POST does not return the full DTO: one read refines it (and a failed read keeps the session shown)
			await read();
		});
	}

	function end(): Promise<void> {
		if (!active || ending) return Promise.resolve();
		ending = true;
		return enqueue('mutation', async () => {
			try {
				const id = active?.session_id;
				if (!id) return;
				try {
					await endImpersonation(id);
				} catch (e) {
					error = describeError(e, { fallback: 'Failed to end impersonation' });
					throw e;
				}
				store.clear(id);
				active = null;
				named = null;
				error = null;
				// a session started in another tab meanwhile has its own key: pick it up
				await read();
			} finally {
				ending = false;
			}
		});
	}

	// another tab started or ended a session
	if (typeof window !== 'undefined')
		window.addEventListener('storage', (e) => {
			if (e.key === null || e.key === ACTIVE_SESSION_KEY) void reconcile();
		});

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
