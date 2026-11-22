/**
 * The impersonation store shows what the SERVER lists for the signed-in person, and nothing it remembers.
 * Each test below kills one mutant of the design (named in the title): the remembered-id fallback, no person tag,
 * a start guard that only runs at call time, an `end` that reads the id at run time, and no deadline.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import {
	createImpersonation,
	DeadlineError,
	StartOutcomeUnknownError,
	type Impersonation
} from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import {
	IMPERSONATION_SESSION_KEY,
	IMPERSONATION_SIGNAL_KEY
} from '#lib/utils/impersonation-session-key.ts';

export const dto = (id: string, expires = '2099-01-01T00:00:00Z') => ({
	session_id: id,
	operator_id: 'op',
	target_tenant_id: 't',
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: expires
});
const created = (id: string) => ({ session_id: id, expires_at_utc: '2099-01-01T00:00:00Z' });
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const flush = () => new Promise((r) => setTimeout(r, 0));
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

let person: string | null;
let store: Impersonation;
beforeEach(() => {
	vi.resetAllMocks();
	window.localStorage.clear();
	person = 'A';
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	api.endImpersonation.mockResolvedValue(undefined);
	store = createImpersonation({ personId: () => person, deadlineMs: 40, mutationDeadlineMs: 40 });
});
afterEach(() => {
	store.dispose();
	vi.useRealTimers();
});

async function showing(id: string) {
	api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto(id)] });
	await store.reconcile();
	expect(store.active?.session_id).toBe(id);
}

describe('the target name belongs to one session', () => {
	it('is shown while its session is the one listed, dropped when another replaces it or it disappears', async () => {
		api.startImpersonation.mockResolvedValue(created('A1'));
		api.listImpersonationSessions
			.mockResolvedValueOnce({ sessions: [] }) // start's own check
			.mockResolvedValue({ sessions: [dto('A1')] });
		await store.start(START, 'Alpha');
		expect(store.targetName).toBe('Alpha');
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('B1')] });
		await store.reconcile();
		expect(store.active?.session_id).toBe('B1');
		expect(store.targetName).toBeNull();
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		await store.reconcile();
		expect(store.active).toBeNull();
	});
});

describe('the server list is the only truth (mutant: the remembered-id fallback)', () => {
	it('nothing is stored under the old session key, and the signal key holds no session id', async () => {
		api.startImpersonation.mockResolvedValue(created('SECRET-ID'));
		api.listImpersonationSessions
			.mockResolvedValueOnce({ sessions: [] })
			.mockResolvedValue({ sessions: [dto('SECRET-ID')] });
		await store.start(START);
		expect(window.localStorage.getItem(IMPERSONATION_SESSION_KEY)).toBeNull();
		const signal = window.localStorage.getItem(IMPERSONATION_SIGNAL_KEY);
		expect(signal).toBeTruthy();
		expect(JSON.stringify({ ...window.localStorage })).not.toContain('SECRET-ID');
	});

	it('a failed read never brings back a session the server no longer lists, and shows nothing it remembers', async () => {
		await showing('A1');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [] });
		await store.reconcile();
		expect(store.active).toBeNull();
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await store.reconcile();
		expect(store.active).toBeNull(); // nothing remembered to fall back on
		expect(store.unknown).toBe(true);
	});

	it('an id an older build left in localStorage is ignored and removed', async () => {
		window.localStorage.setItem(IMPERSONATION_SESSION_KEY, 'OLD');
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		await store.reconcile();
		expect(store.active).toBeNull();
		expect(window.localStorage.getItem(IMPERSONATION_SESSION_KEY)).toBeNull();
	});

	it('several listed sessions: the first is shown, "more" counts the rest, End ends the shown one and the next shows', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S1'), dto('S2')] });
		await store.reconcile();
		expect(store.active?.session_id).toBe('S1');
		expect(store.more).toBe(1);
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S2')] });
		await store.end('S1');
		expect(api.endImpersonation).toHaveBeenCalledWith('S1');
		expect(store.active?.session_id).toBe('S2');
		expect(store.more).toBe(0);
	});
});

describe('state belongs to the signed-in person (mutant: no person tag)', () => {
	it('A impersonates, signs out without a reload, B signs in: no banner, no A data, no DELETE for A', async () => {
		api.startImpersonation.mockResolvedValue(created('A1'));
		api.listImpersonationSessions
			.mockResolvedValueOnce({ sessions: [] })
			.mockResolvedValue({ sessions: [dto('A1')] });
		await store.start(START, 'Alpha Pharma');
		expect(store.active?.session_id).toBe('A1');

		person = 'B'; // the next person signs in on the same tab; the SERVER STILL LISTS A1 (the old test hid this)
		expect(store.active).toBeNull();
		expect(store.targetName).toBeNull();
		expect(store.readError).toBeNull();
		await expect(store.end()).resolves.toBeUndefined(); // nothing shown, nothing to end
		expect(api.endImpersonation).not.toHaveBeenCalled();

		// B's read fails: still nothing of A
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('403'));
		await store.reconcile();
		expect(store.active).toBeNull();
		expect(store.targetName).toBeNull();
		expect(store.unknown).toBe(true);
		await store.end();
		expect(api.endImpersonation).not.toHaveBeenCalled();
	});

	it('forget() empties the store and a read still on its way for the old state is dropped', async () => {
		await showing('A1');
		const slow = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(slow.promise);
		const r = store.reconcile();
		await flush();
		store.forget();
		expect(store.active).toBeNull();
		slow.resolve({ sessions: [dto('A1')] });
		await r;
		expect(store.active).toBeNull();
	});

	it('a result that arrives after the person changed is dropped', async () => {
		const slow = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(slow.promise);
		const r = store.reconcile();
		await flush();
		person = 'B';
		slow.resolve({ sessions: [dto('A1')] });
		await r;
		expect(store.active).toBeNull();
	});

	it('nobody signed in: no read is made', async () => {
		person = null;
		await store.reconcile();
		expect(api.listImpersonationSessions).not.toHaveBeenCalled();
	});
});

describe('start (mutant: the guard only at call time)', () => {
	it('a read queued ahead of start that lists a session means NO POST; start resolves "already"', async () => {
		const slow = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(slow.promise);
		const r = store.reconcile(); // another tab started X; this read will show it
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('X')] });
		const s = store.start(START); // accepted at call time: nothing is shown yet
		slow.resolve({ sessions: [dto('X')] });
		await r;
		await expect(s).resolves.toEqual({ kind: 'already' });
		expect(api.startImpersonation).not.toHaveBeenCalled();
		expect(store.active?.session_id).toBe('X');
	});

	it('a second tab started a session first: its own check lists it, so no POST', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('OTHERTAB')] });
		await expect(store.start(START)).resolves.toEqual({ kind: 'already' });
		expect(api.startImpersonation).not.toHaveBeenCalled();
	});

	it('the check read fails: nothing is posted (it cannot be known that there is none)', async () => {
		api.listImpersonationSessions.mockRejectedValue(new Error('net'));
		await expect(store.start(START)).rejects.toBeTruthy();
		expect(api.startImpersonation).not.toHaveBeenCalled();
	});

	it('POST ok, follow-up read fails: the provisional session stays shown, the signal is sent, start resolves', async () => {
		api.startImpersonation.mockResolvedValue(created('N'));
		api.listImpersonationSessions
			.mockResolvedValueOnce({ sessions: [] })
			.mockRejectedValueOnce(new Error('net'));
		await expect(store.start(START, 'Alpha')).resolves.toEqual({ kind: 'started' });
		expect(store.active?.session_id).toBe('N');
		expect(store.active?.reason).toBe('a reason that is long enough');
		expect(store.targetName).toBe('Alpha');
		expect(store.status).toBe('active');
	});

	it('the POST fails: nothing is shown and the error is reported', async () => {
		api.startImpersonation.mockRejectedValueOnce(new Error('denied'));
		await expect(store.start(START)).rejects.toThrow('denied');
		expect(store.active).toBeNull();
		expect(store.status).toBe('idle');
	});

	it('refused while another start or end is queued; resolves "already" while one is shown', async () => {
		const post = deferred<ReturnType<typeof created>>();
		api.startImpersonation.mockReturnValueOnce(post.promise);
		const first = store.start(START);
		await expect(store.start(START)).rejects.toThrow(/in progress/);
		api.listImpersonationSessions
			.mockResolvedValueOnce({ sessions: [] })
			.mockResolvedValue({ sessions: [dto('N')] });
		post.resolve(created('N'));
		await first;
		await expect(store.start(START)).resolves.toEqual({ kind: 'already' });
		expect(api.startImpersonation).toHaveBeenCalledTimes(1);
	});
});

describe('end (mutant: the id read at run time)', () => {
	it('deletes the session that was shown when the user clicked, even if a read switched the shown one before it ran', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S1'), dto('S2')] });
		await store.reconcile();
		const clicked = store.active!.session_id; // S1
		const slow = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(slow.promise);
		const r = store.reconcile(); // ahead of End in the queue
		const e = store.end(clicked);
		slow.resolve({ sessions: [dto('S2')] }); // S1 vanished (another tab), S2 is now the shown one
		await r;
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		await e;
		expect(api.endImpersonation).toHaveBeenCalledTimes(1);
		expect(api.endImpersonation).toHaveBeenCalledWith('S1');
	});

	it('two clicks make one DELETE; a failure keeps the session SHOWN with an error, and it can be retried', async () => {
		await showing('S1');
		api.endImpersonation.mockRejectedValueOnce(new Error('boom'));
		await expect(store.end('S1')).rejects.toThrow('boom');
		expect(store.active?.session_id).toBe('S1');
		expect(store.endError).toBeTruthy();
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		const a = store.end('S1');
		const b = store.end('S1');
		await Promise.all([a, b]);
		expect(api.endImpersonation).toHaveBeenCalledTimes(2); // the failed one + the retry
		expect(store.active).toBeNull();
	});
});

describe('every operation has a deadline (mutant: none)', () => {
	it('a read that never settles fails, the queue goes on, a late answer is dropped', async () => {
		api.listImpersonationSessions.mockReturnValueOnce(new Promise(() => {}));
		await store.reconcile(); // returns after the deadline
		expect(store.unknown).toBe(true);
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('A1')] });
		await store.reconcile();
		expect(store.active?.session_id).toBe('A1');
	});

	it('a POST that never settles is an UNKNOWN outcome, not a failure: later starts are not refused for ever', async () => {
		api.startImpersonation.mockReturnValueOnce(new Promise(() => {}));
		await expect(store.start(START)).rejects.toBeInstanceOf(StartOutcomeUnknownError);
		expect(store.status).not.toBe('mutating');
		expect(store.checking).toBe(true);
		api.startImpersonation.mockResolvedValueOnce(created('N'));
		await expect(store.start(START)).resolves.toEqual({ kind: 'started' });
	});

	it('a DELETE that never settles: the session stays shown, no end error, the store is checking', async () => {
		await showing('S1');
		api.endImpersonation.mockReturnValueOnce(new Promise(() => {}));
		await expect(store.end('S1')).rejects.toBeInstanceOf(DeadlineError);
		expect(store.active?.session_id).toBe('S1');
		expect(store.endError).toBeNull();
		expect(store.checking).toBe(true);
	});

	it('a late answer from a timed-out read does not overwrite what came after it', async () => {
		const late = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(late.promise);
		await store.reconcile(); // times out
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [] });
		await store.reconcile();
		late.resolve({ sessions: [dto('GHOST')] });
		await flush();
		expect(store.active).toBeNull();
	});
});

describe('other tabs and the clock', () => {
	it('a storage event for the signal key queues a read; other keys do not', async () => {
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('B')] });
		window.dispatchEvent(new StorageEvent('storage', { key: IMPERSONATION_SIGNAL_KEY }));
		await vi.waitFor(() => expect(store.active?.session_id).toBe('B'));
		window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
		await flush();
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1);
	});

	it('at expires_at a read is queued (never a client-side hide); forget() clears the timer', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		const soon = new Date(Date.now() + 60_000).toISOString();
		const s = createImpersonation({ personId: () => person, deadlineMs: 10_000 });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A1', soon)] });
		await s.reconcile();
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(61_500);
		expect(api.listImpersonationSessions.mock.calls.length).toBeGreaterThanOrEqual(2);
		expect(s.active?.session_id).toBe('A1'); // the server still lists it: still shown
		s.forget();
		const calls = api.listImpersonationSessions.mock.calls.length;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(api.listImpersonationSessions.mock.calls.length).toBe(calls);
		s.dispose();
	});
});
