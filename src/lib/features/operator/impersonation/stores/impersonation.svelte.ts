import { page } from '$app/state';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { startImpersonation, endImpersonation, listImpersonationSessions } from '../api';
import { describeError } from '$api/errors';
import { DEFAULT_READ_TIMEOUT_MS } from '$api/timeouts';
import type { ImpersonationSessionDto, CreateImpersonationSessionRequest } from '../types';
import {
	MUTATION_DEADLINE_MS,
	type Impersonation,
	type ImpersonationOptions,
	type ImpersonationStatus,
	type StartResult
} from './impersonation-types';
import { announceChange, clearLegacyId, listenForChanges } from './cross-tab';
import { createExpiryTimer } from './schedule';
import { createUnknownOutcome } from './unknown-outcome.svelte';
import { ImpersonationRefusedError, StartOutcomeUnknownError } from './errors';
import { createSerialQueue, DeadlineError, withDeadline } from './serial-queue';

export { DeadlineError } from './serial-queue';
export { MUTATION_DEADLINE_MS } from './impersonation-types';
export type { Impersonation, ImpersonationOptions, StartResult } from './impersonation-types';
export {
	AlreadyImpersonatingError,
	ImpersonationRefusedError,
	StartOutcomeUnknownError
} from './errors';

/**
 * Impersonation store: what the SERVER lists for the signed-in person, and nothing the client remembers (a security
 * indicator). No session id is kept across reads, sign-ins or tabs. State is tagged with the person it was read for; a
 * person change or `forget()` empties it and abandons the old person's queue, and a result for another person is dropped.
 * ONE serial queue (`serial-queue.ts`); `start` re-checks when it RUNS; `end` uses the id captured at click time. A
 * mutation has a deadline (`MUTATION_DEADLINE_MS`); past it the outcome is UNKNOWN and `unknown-outcome.svelte.ts` looks
 * until a read answers. When in doubt the indicator is SHOWN: a successful start shows a provisional session before the
 * follow-up read, a failed read never hides a shown session, and a read is queued at the earliest `expires_at`.
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

	const unknown = createUnknownOutcome({
		delays: opts.followUpDelaysMs,
		reconcile: () => reconcile(),
		epoch: () => epoch,
		readFailed: () => readFailed,
		sessionCount: () => sessions.length
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
					if (!stale(person, e)) unknown.begin(true);
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
					if (err instanceof DeadlineError) unknown.begin(false);
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
		unknown.reset();
		expiry.clear();
		sessions = [];
		owner = null;
		readError = null;
		endError = null;
		readFailed = false;
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
			return isMine() && sessions.length === 0 && (readFailed || unknown.checking);
		},
		get checking() {
			return isMine() && unknown.checking;
		},
		get targetName() {
			const a = shown();
			return named && a && named.sessionId === a.session_id ? named.name : null;
		},
		reconcile,
		start,
		resolveUnknownStart: unknown.resolveStart,
		end,
		forget,
		dispose() {
			unknown.cancel();
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
