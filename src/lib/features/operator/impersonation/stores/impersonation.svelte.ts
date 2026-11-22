import { page } from '$app/state';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { startImpersonation, endImpersonation, listImpersonationSessions } from '../api';
import { ApiError, describeError } from '$api/errors';
import {
	IMPERSONATION_SESSION_KEY as LEGACY_SESSION_KEY,
	IMPERSONATION_SIGNAL_KEY as SIGNAL_KEY
} from '#lib/utils/impersonation-session-key.ts';
import type { ImpersonationSessionDto, CreateImpersonationSessionRequest } from '../types';

type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

/** `started`: a session was opened. `already`: the server lists one for this person (it is shown), nothing was posted. */
export type StartResult = { kind: 'started' } | { kind: 'already' };

/** The UI's rendering of `already` for a form: an error whose message is the one line. */
export class AlreadyImpersonatingError extends ApiError {
	constructor() {
		super();
		this.name = 'AlreadyImpersonatingError';
		this.message = 'You are already impersonating a company. End that session first.';
	}
}

/** A refusal the store itself makes (nobody signed in, the state changed, the status could not be checked). */
export class ImpersonationRefusedError extends ApiError {
	constructor(message: string) {
		super();
		this.name = 'ImpersonationRefusedError';
		this.message = message;
	}
}

/** An operation did not settle inside its deadline: treated as failed, and a late answer is dropped. */
export class DeadlineError extends Error {
	constructor() {
		super('The request took too long.');
		this.name = 'DeadlineError';
	}
}

export interface Impersonation {
	/** The session shown: the first the server listed for the signed-in person, or null. */
	readonly active: ImpersonationSessionDto | null;
	/** How many more sessions the server lists for this person (the banner says "+N more"). */
	readonly more: number;
	readonly status: ImpersonationStatus;
	readonly error: string | null;
	/** The last read failed and nothing is shown: the status is unknown, not "none". */
	readonly unknown: boolean;
	/** The company's name, in memory only (the DTO carries an id): after a reload the banner says "a company". */
	readonly targetName: string | null;
	/** Read the server's list for the signed-in person. Reads queued behind each other collapse into one. */
	reconcile(): Promise<void>;
	/** Check the server's list, then POST a session only if it lists none. */
	start(req: CreateImpersonationSessionRequest, targetName?: string): Promise<StartResult>;
	/** DELETE a session. The id is the one SHOWN when the user clicked (default: the shown one now). */
	end(sessionId?: string): Promise<void>;
	/** Sign-out / person change: empty the store and drop every result still on its way. */
	forget(): void;
	/** Stop listening to other tabs (tests, and any caller that owns an instance). */
	dispose(): void;
}

export interface ImpersonationOptions {
	/** The signed-in person (null: nobody). State is tagged with it; a result for another person is dropped. */
	personId: () => string | null;
	/** Longest an operation may take before it counts as failed. Default 30 s. */
	deadlineMs?: number;
	now?: () => number;
}

const MAX_TIMER = 2 ** 31 - 1;

/**
 * Impersonation store: what the SERVER lists for the signed-in person, and nothing the client remembers. A security
 * indicator, so:
 *
 *   - The server's list (`GET /v1/platform/impersonation/sessions`) is the only truth. No session id is kept across
 *     reads, sign-ins or tabs; localStorage holds a pure cross-tab SIGNAL (a changing value, no id).
 *   - State is tagged with the person it was read for. A person change or `forget()` empties it, and a result that
 *     arrives for another person (or after `forget()`) is dropped, so one person's banner, tenant name or End can never
 *     reach the next person who signs in on the same tab.
 *   - ONE serial queue (no two requests of this store in flight together); `status` is derived.
 *   - `start` re-checks when it RUNS (a fresh read: any listed session means no POST); `end` uses the id captured at
 *     click time.
 *   - Every operation has a deadline: a request that never settles fails, the queue goes on, a late answer is dropped.
 *   - When in doubt the indicator is SHOWN: a successful start shows a provisional session before the follow-up read,
 *     and a failed read never hides a shown session of the same person. At `expires_at` a read is queued (the client
 *     clock never hides the banner on its own).
 */
export function createImpersonation(opts: ImpersonationOptions): Impersonation {
	const deadlineMs = opts.deadlineMs ?? 30_000;
	const now = opts.now ?? Date.now;

	let sessions = $state<ImpersonationSessionDto[]>([]);
	let owner = $state<string | null>(null); // the person the state below was read for
	let error = $state<string | null>(null);
	let readFailed = $state(false);
	let named = $state<{ sessionId: string; name: string } | null>(null);
	let epoch = 0; // bumped by forget(): results of older operations are dropped

	let tail: Promise<void> = Promise.resolve();
	let mutations = $state(0);
	let reads = $state(0);
	let queuedRead: Promise<void> | null = null;
	const ending = new SvelteSet<string>();
	let expiryTimer: ReturnType<typeof setTimeout> | undefined;
	let legacyCleared = false;

	// plain reads, not $derived: they depend on the signed-in person, which a caller supplies (page.data is reactive,
	// so a component reading these still follows it)
	const isMine = () => owner !== null && owner === opts.personId();
	const shown = () => (isMine() ? (sessions[0] ?? null) : null);
	const statusNow = (): ImpersonationStatus =>
		mutations > 0
			? 'mutating'
			: reads > 0
				? 'loading'
				: shown()
					? 'active'
					: isMine() && error
						? 'error'
						: 'idle';

	const stale = (person: string, e: number) => e !== epoch || opts.personId() !== person;

	/** The state belongs to `person`: another person's is thrown away. */
	function adopt(person: string) {
		if (owner === person) return;
		owner = person;
		sessions = [];
		named = null;
		error = null;
		readFailed = false;
		armExpiry();
	}

	function signal() {
		try {
			window.localStorage.setItem(SIGNAL_KEY, `${now()}.${Math.random().toString(36).slice(2)}`);
		} catch {
			/* storage blocked: other tabs catch up on focus */
		}
	}

	function armExpiry() {
		clearTimeout(expiryTimer);
		expiryTimer = undefined;
		const s = sessions[0];
		if (!s || typeof window === 'undefined') return;
		const at = Date.parse(s.expires_at);
		if (!Number.isFinite(at)) return;
		// a read, never a hide; if the server still lists it (clock skew) the next read re-arms a later one
		const delay = Math.min(Math.max(at - now() + 1000, 5000), MAX_TIMER);
		expiryTimer = setTimeout(() => void reconcile(), delay);
	}

	function within<T>(p: Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => reject(new DeadlineError()), deadlineMs);
			p.then(
				(v) => {
					clearTimeout(timer);
					resolve(v);
				},
				(e: unknown) => {
					clearTimeout(timer);
					reject(e);
				}
			);
		});
	}

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
		const person = opts.personId();
		if (!person) return;
		const e = epoch;
		try {
			const { sessions: list } = await within(listImpersonationSessions());
			if (stale(person, e)) return;
			adopt(person);
			sessions = list;
			error = null;
			readFailed = false;
			const keep = named?.sessionId;
			if (keep && !list.some((s) => s.session_id === keep)) named = null;
			armExpiry();
		} catch (err) {
			if (stale(person, e)) return;
			adopt(person);
			error = describeError(err, { fallback: 'Failed to load impersonation sessions' });
			readFailed = true;
		}
	}

	function reconcile(): Promise<void> {
		if (typeof window === 'undefined' || !opts.personId()) return Promise.resolve();
		if (queuedRead) return queuedRead;
		queuedRead = enqueue('read', async () => {
			queuedRead = null;
			if (!legacyCleared) {
				legacyCleared = true;
				try {
					window.localStorage.removeItem(LEGACY_SESSION_KEY); // an id remembered by an older build
				} catch {
					/* best effort */
				}
			}
			await read();
		});
		return queuedRead;
	}

	function start(req: CreateImpersonationSessionRequest, name?: string): Promise<StartResult> {
		if (mutations > 0)
			return Promise.reject(
				new ImpersonationRefusedError('Another impersonation request is in progress')
			);
		if (shown()) return Promise.resolve({ kind: 'already' });
		const person = opts.personId(); // who clicked
		const clicked = epoch;
		return enqueue('mutation', async (): Promise<StartResult> => {
			if (!person || stale(person, clicked))
				throw new ImpersonationRefusedError('Sign in to continue.');
			const e = clicked;
			// checked when the operation RUNS: another tab (or a read ahead of us) may have opened a session
			await read();
			if (stale(person, e)) throw new ImpersonationRefusedError('The session changed. Try again.');
			if (readFailed)
				throw new ImpersonationRefusedError(error ?? 'Could not check impersonation status.');
			if (sessions.length > 0) return { kind: 'already' };
			let created;
			try {
				created = await within(startImpersonation(req));
			} catch (err) {
				if (!stale(person, e)) {
					error = describeError(err, { fallback: 'Failed to start impersonation' });
					// a timed-out POST may still have landed: look again once the queue is free
					if (err instanceof DeadlineError) queueMicrotask(() => void reconcile());
				}
				throw err;
			}
			if (stale(person, e)) return { kind: 'started' };
			adopt(person);
			sessions = [
				{
					session_id: created.session_id,
					operator_id: '',
					target_tenant_id: req.target_tenant_id,
					reason: req.reason,
					created_at: new SvelteDate(now()).toISOString(),
					expires_at: created.expires_at_utc
				}
			];
			named = name ? { sessionId: created.session_id, name } : null;
			error = null;
			readFailed = false;
			signal();
			armExpiry();
			await read(); // refines it; a failed read keeps the provisional session shown
			return { kind: 'started' };
		});
	}

	function end(sessionId?: string): Promise<void> {
		const id = sessionId ?? shown()?.session_id;
		if (!id || ending.has(id)) return Promise.resolve();
		ending.add(id);
		const person = opts.personId(); // the id belongs to whoever was signed in when it was clicked
		const e = epoch;
		return enqueue('mutation', async () => {
			try {
				if (!person || stale(person, e)) return; // another person is signed in now: never send this id as them
				try {
					await within(endImpersonation(id));
				} catch (err) {
					if (!stale(person, e))
						error = describeError(err, { fallback: 'Failed to end impersonation' });
					throw err;
				}
				if (stale(person, e)) return;
				sessions = sessions.filter((s) => s.session_id !== id);
				if (named?.sessionId === id) named = null;
				error = null;
				signal();
				armExpiry();
				await read();
			} finally {
				ending.delete(id);
			}
		});
	}

	function forget() {
		epoch++;
		clearTimeout(expiryTimer);
		expiryTimer = undefined;
		sessions = [];
		owner = null;
		error = null;
		readFailed = false;
		named = null;
	}

	const onStorage = (ev: StorageEvent) => {
		if (ev.key === null || ev.key === SIGNAL_KEY) void reconcile();
	};
	if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

	return {
		get active() {
			return shown();
		},
		get more() {
			return isMine() ? Math.max(0, sessions.length - 1) : 0;
		},
		get status() {
			return statusNow();
		},
		get error() {
			return isMine() ? error : null;
		},
		get unknown() {
			return isMine() && readFailed && sessions.length === 0;
		},
		get targetName() {
			const a = shown();
			return named && a && named.sessionId === a.session_id ? named.name : null;
		},
		reconcile,
		start,
		end,
		forget,
		dispose() {
			clearTimeout(expiryTimer);
			if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
		}
	};
}

export const impersonation = createImpersonation({
	personId: () =>
		(page.data as { capabilities?: { person_id?: string } } | undefined)?.capabilities?.person_id ??
		null
});
