import { page } from '$app/state';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { startImpersonation, endImpersonation, listImpersonationSessions } from '../api';
import { describeError } from '$api/errors';
import {
	BFF_MAX_UPSTREAM_HOPS,
	DEFAULT_READ_TIMEOUT_MS,
	DEFAULT_UPSTREAM_TIMEOUT_MS
} from '$api/timeouts';
import type { ImpersonationSessionDto, CreateImpersonationSessionRequest } from '../types';
import { announceChange, clearLegacyId, listenForChanges } from './cross-tab';
import { createExpiryTimer, createFollowUp } from './schedule';
import { ImpersonationRefusedError, StartOutcomeUnknownError } from './errors';
import { createSerialQueue, DeadlineError, withDeadline } from './serial-queue';

export { DeadlineError } from './serial-queue';
export {
	AlreadyImpersonatingError,
	ImpersonationRefusedError,
	StartOutcomeUnknownError
} from './errors';

type ImpersonationStatus = 'idle' | 'loading' | 'active' | 'mutating' | 'error';

/** `started`: a session was opened. `already`: the server lists one for this person (it is shown), nothing was posted. */
export type StartResult = { kind: 'started' } | { kind: 'already' };

/**
 * A MUTATION is allowed longer than the BFF can spend on one browser request (3 upstream hops of 10 s plus a margin
 * that clears the read deadline): a write the server committed is never reported as timed out (`api/timeouts.ts`).
 * Past it the outcome is UNKNOWN, not failed.
 */
export const MUTATION_DEADLINE_MS =
	BFF_MAX_UPSTREAM_HOPS * DEFAULT_UPSTREAM_TIMEOUT_MS + DEFAULT_READ_TIMEOUT_MS;

export interface Impersonation {
	/** The session shown: the first the server listed for the signed-in person, or null. */
	readonly active: ImpersonationSessionDto | null;
	/** How many more sessions the server lists for this person (the banner says "+N more"). */
	readonly more: number;
	readonly status: ImpersonationStatus;
	/** The last READ failed (the status could not be checked). Retry reads again; it never ends anything. */
	readonly readError: string | null;
	/** The last END failed for the session shown. Trying again ends that session. */
	readonly endError: string | null;
	/** Nothing is shown and the status could not be checked, or a mutation's outcome is still being checked. */
	readonly unknown: boolean;
	/** A start or end did not answer in time: follow-up reads are running until one tells the truth. */
	readonly checking: boolean;
	/** The company's name, in memory only (the DTO carries an id): the banner says "a company" without it. */
	readonly targetName: string | null;
	/** Read the server's list for the signed-in person. Reads queued behind each other collapse into one. */
	reconcile(): Promise<void>;
	/** Check the server's list, then POST a session only if it lists none. */
	start(req: CreateImpersonationSessionRequest, targetName?: string): Promise<StartResult>;
	/** After a start whose outcome is unknown: resolves once the follow-up reads say whether a session exists. */
	resolveUnknownStart(): Promise<'started' | 'not-started'>;
	/** DELETE a session. The id is the one SHOWN when the user clicked (default: the shown one now). */
	end(sessionId?: string): Promise<void>;
	/** Sign-out / person change: empty the store and drop every result still on its way. */
	forget(): void;
	/** Stop listening to other tabs and cancel timers (tests, and any caller that owns an instance). */
	dispose(): void;
}

export interface ImpersonationOptions {
	/** The signed-in person (null: nobody). State is tagged with it; a result for another person is dropped. */
	personId: () => string | null;
	/** Longest a READ may take before it counts as failed. Default: the client read timeout. */
	deadlineMs?: number;
	/** Longest a START or END may take before its outcome is UNKNOWN. Default: above the BFF's worst case. */
	mutationDeadlineMs?: number;
	/** Follow-up read schedule after an unknown outcome (ms). */
	followUpDelaysMs?: readonly number[];
	now?: () => number;
}

/**
 * Impersonation store: what the SERVER lists for the signed-in person, and nothing the client remembers. A security
 * indicator, so:
 *
 *   - The server's list (`GET /v1/platform/impersonation/sessions`) is the only truth. No session id is kept across
 *     reads, sign-ins or tabs (`cross-tab.ts`: a changing signal, no id).
 *   - State is tagged with the person it was read for. A person change or `forget()` empties it and abandons the old
 *     person's queue; a result that arrives for another person is dropped.
 *   - ONE serial queue (`serial-queue.ts`); `status` is derived.
 *   - `start` re-checks when it RUNS; `end` uses the id captured at click time.
 *   - Reads have a deadline; a mutation has a longer one (`MUTATION_DEADLINE_MS`) and past it the outcome is UNKNOWN:
 *     follow-up reads (`schedule.ts`) run until one answers, and a late answer of the timed-out request is dropped.
 *   - When in doubt the indicator is SHOWN: a successful start shows a provisional session before the follow-up read,
 *     and a failed read never hides a shown session of the same person. At the earliest `expires_at` a read is queued.
 */
export function createImpersonation(opts: ImpersonationOptions): Impersonation {
	const readDeadlineMs = opts.deadlineMs ?? DEFAULT_READ_TIMEOUT_MS;
	const mutationDeadlineMs = opts.mutationDeadlineMs ?? MUTATION_DEADLINE_MS;
	const now = opts.now ?? Date.now;

	let sessions = $state<ImpersonationSessionDto[]>([]);
	let owner = $state<string | null>(null); // the person the state below was read for
	let readError = $state<string | null>(null);
	let endError = $state<string | null>(null);
	let readFailed = $state(false);
	let checking = $state(false);
	let startUnknown = false; // the unknown outcome is a start (it also ends with "not started")
	let waiters: ((r: 'started' | 'not-started') => void)[] = [];
	let named = $state<{ sessionId: string; name: string } | null>(null);
	let epoch = 0; // bumped by forget(): results of older operations are dropped

	const queue = createSerialQueue();
	let mutations = $state(0);
	let reads = $state(0);
	let queuedRead: Promise<void> | null = null;
	const ending = new SvelteSet<string>();
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
					: isMine() && readError
						? 'error'
						: 'idle';

	const stale = (person: string, e: number) => e !== epoch || opts.personId() !== person;

	const expiry = createExpiryTimer(() => void reconcile(), now);

	/** The state belongs to `person`: another person's is thrown away. */
	function adopt(person: string) {
		if (owner === person) return;
		owner = person;
		sessions = [];
		named = null;
		readError = null;
		endError = null;
		readFailed = false;
		expiry.arm(sessions);
	}

	function settleWaiters(result: 'started' | 'not-started') {
		const w = waiters;
		waiters = [];
		for (const resolve of w) resolve(result);
	}

	const followUp = createFollowUp({
		delays: opts.followUpDelaysMs,
		read: async (index) => {
			const e = epoch;
			await reconcile();
			if (e !== epoch) return true; // forgotten: nothing left to look for
			if (readFailed) return false;
			// a start's absence is only believed on the second read: the POST may still be landing
			if (startUnknown && sessions.length === 0 && index < 1) return false;
			return true;
		},
		onRead: (ok) => {
			if (!ok) return;
			checking = false;
			if (startUnknown) settleWaiters(sessions.length > 0 ? 'started' : 'not-started');
			startUnknown = false;
		}
	});

	function enqueue<T>(kind: 'read' | 'mutation', run: () => Promise<T>): Promise<T> {
		const e = epoch;
		if (kind === 'read') reads++;
		else mutations++;
		return queue.run(async () => {
			// a read left in the abandoned chain of a forgotten person must not run as the NEXT person
			if (kind === 'read' && e !== epoch) return undefined as T;
			try {
				return await run();
			} finally {
				// forget() already zeroed the counters: an abandoned operation does not count against the next person
				if (e === epoch) {
					if (kind === 'read') reads--;
					else mutations--;
				}
			}
		});
	}

	/** One read, inside the queue. Never throws: a failure keeps what is shown and records the message. */
	async function read(): Promise<void> {
		const person = opts.personId();
		if (!person) return;
		const e = epoch;
		try {
			const { sessions: list } = await withDeadline(listImpersonationSessions(), readDeadlineMs);
			if (stale(person, e)) return;
			adopt(person);
			sessions = list;
			readError = null;
			readFailed = false;
			const keep = named?.sessionId;
			if (keep && !list.some((s) => s.session_id === keep)) named = null;
			expiry.arm(sessions);
		} catch (err) {
			if (stale(person, e)) return;
			adopt(person);
			readError = describeError(err, { fallback: get(_)('shell.impersonation.readFailed') });
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
				clearLegacyId();
			}
			await read();
		});
		return queuedRead;
	}

	/** A mutation's deadline passed: whatever happened server-side, look until the list says. */
	function outcomeUnknown(isStart: boolean) {
		checking = true;
		if (isStart) startUnknown = true;
		followUp.start();
	}

	function start(req: CreateImpersonationSessionRequest, name?: string): Promise<StartResult> {
		if (mutations > 0)
			return Promise.reject(
				new ImpersonationRefusedError(get(_)('shell.impersonation.inProgress'))
			);
		if (shown()) return Promise.resolve({ kind: 'already' });
		const person = opts.personId(); // who clicked
		const clicked = epoch;
		return enqueue('mutation', async (): Promise<StartResult> => {
			if (!person || stale(person, clicked))
				throw new ImpersonationRefusedError(get(_)('shell.impersonation.signIn'));
			const e = clicked;
			// checked when the operation RUNS: another tab (or a read ahead of us) may have opened a session
			await read();
			if (stale(person, e))
				throw new ImpersonationRefusedError(get(_)('shell.impersonation.changed'));
			if (readFailed)
				throw new ImpersonationRefusedError(readError ?? get(_)('shell.impersonation.readFailed'));
			if (sessions.length > 0) return { kind: 'already' };
			let created;
			try {
				created = await withDeadline(startImpersonation(req), mutationDeadlineMs);
			} catch (err) {
				if (err instanceof DeadlineError) {
					if (!stale(person, e)) outcomeUnknown(true);
					throw new StartOutcomeUnknownError();
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
			readError = null;
			endError = null;
			readFailed = false;
			announceChange(now);
			expiry.arm(sessions);
			await read(); // refines it; a failed read keeps the provisional session shown
			return { kind: 'started' };
		});
	}

	function resolveUnknownStart(): Promise<'started' | 'not-started'> {
		if (!startUnknown) return Promise.resolve(sessions.length > 0 ? 'started' : 'not-started');
		return new Promise((resolve) => waiters.push(resolve));
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
					await withDeadline(endImpersonation(id), mutationDeadlineMs);
				} catch (err) {
					if (stale(person, e)) throw err;
					if (err instanceof DeadlineError) outcomeUnknown(false);
					else endError = describeError(err, { fallback: get(_)('shell.impersonation.endFailed') });
					throw err;
				}
				if (stale(person, e)) return;
				sessions = sessions.filter((s) => s.session_id !== id);
				if (named?.sessionId === id) named = null;
				endError = null;
				announceChange(now);
				expiry.arm(sessions);
				await read();
			} finally {
				ending.delete(id);
			}
		});
	}

	function forget() {
		epoch++;
		queue.abandon(); // the old person's in-flight operations cannot hold up the next person
		queuedRead = null;
		mutations = 0;
		reads = 0;
		followUp.cancel();
		expiry.clear();
		settleWaiters('not-started');
		sessions = [];
		owner = null;
		readError = null;
		endError = null;
		readFailed = false;
		checking = false;
		startUnknown = false;
		named = null;
		ending.clear();
	}

	const stopListening = listenForChanges(() => void reconcile());

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
		get readError() {
			return isMine() ? readError : null;
		},
		get endError() {
			return isMine() ? endError : null;
		},
		get unknown() {
			return isMine() && sessions.length === 0 && (readFailed || checking);
		},
		get checking() {
			return isMine() && checking;
		},
		get targetName() {
			const a = shown();
			return named && a && named.sessionId === a.session_id ? named.name : null;
		},
		reconcile,
		start,
		resolveUnknownStart,
		end,
		forget,
		dispose() {
			followUp.cancel();
			expiry.clear();
			stopListening();
		}
	};
}

export const impersonation = createImpersonation({
	personId: () =>
		(page.data as { capabilities?: { person_id?: string } } | undefined)?.capabilities?.person_id ??
		null
});
