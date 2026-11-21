/**
 * The impersonation indicator is a security signal, so the store is ONE serial queue: no two requests are ever in
 * flight together, the status is derived from the queue, and when in doubt the indicator is shown. Named scenarios
 * (the review's I3 and I4 and M7, and the earlier rounds' races), then a property test: random sequences of operations
 * against a model server, responses settled in a random order, invariants checked after every step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import { impersonation } from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import { IMPERSONATION_SESSION_KEY as KEY } from '#lib/utils/impersonation-session-key.ts';

const dto = (id: string) => ({
	session_id: id,
	operator_id: 'op',
	target_tenant_id: 't',
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2030-01-01T01:00:00Z'
});
type List = { sessions: ReturnType<typeof dto>[] };
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const created = (id: string) => ({ session_id: id, expires_at_utc: '2030-01-01T01:00:00Z' });
const SETTLED = ['idle', 'active', 'error'];
const keyHolds = (id: string | null) => expect(window.localStorage.getItem(KEY)).toBe(id);

beforeEach(async () => {
	vi.resetAllMocks();
	window.localStorage.clear();
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	api.endImpersonation.mockResolvedValue(undefined);
	await impersonation.reconcile();
	await flush();
});
afterEach(async () => {
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	await impersonation.reconcile();
	await flush();
	expect(SETTLED).toContain(impersonation.status);
});

async function showing(id: string) {
	window.localStorage.setItem(KEY, id);
	api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto(id)] });
	await impersonation.reconcile();
	expect(impersonation.active?.session_id).toBe(id);
}

describe('one serial queue', () => {
	it('two reconciles in a row make ONE request; a read queued behind a running one runs after it', async () => {
		window.localStorage.setItem(KEY, 'A');
		const first = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(first.promise);
		const a = impersonation.reconcile();
		await flush();
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1);
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('A')] });
		const b = impersonation.reconcile();
		const c = impersonation.reconcile(); // absorbed by b
		await flush();
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1); // b has not started: one in flight
		first.resolve({ sessions: [dto('A')] });
		await Promise.all([a, b, c]);
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(2);
		expect(impersonation.status).toBe('active');
	});

	it('status is derived: loading for a read, mutating for a start or end, then what is shown', async () => {
		await showing('A');
		const read = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(read.promise);
		const r = impersonation.reconcile();
		expect(impersonation.status).toBe('loading');
		const del = deferred<void>();
		api.endImpersonation.mockReturnValueOnce(del.promise);
		const e = impersonation.end();
		expect(impersonation.status).toBe('mutating');
		read.resolve({ sessions: [dto('A')] });
		await r;
		expect(api.endImpersonation).not.toHaveBeenCalled(); // End waits for the read to settle
		del.resolve();
		await e;
		expect(impersonation.active).toBeNull();
		expect(impersonation.status).toBe('idle');
	});
});

describe('start', () => {
	it('I3: POST ok and the follow-up read fails: the session is SHOWN, the key is set, start() resolves', async () => {
		api.startImpersonation.mockResolvedValueOnce(created('N'));
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await impersonation.start(START, 'Alpha');
		expect(impersonation.active?.session_id).toBe('N');
		expect(impersonation.active?.reason).toBe('a reason that is long enough');
		expect(impersonation.targetName).toBe('Alpha');
		keyHolds('N');
		expect(impersonation.status).toBe('active');
	});

	it('a storage failure never turns a successful server start into "Failed to start"', async () => {
		api.startImpersonation.mockResolvedValueOnce(created('N'));
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('N')] });
		const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota');
		});
		try {
			await impersonation.start(START);
			expect(impersonation.active?.session_id).toBe('N');
			expect(impersonation.error).toBeNull();
		} finally {
			set.mockRestore();
		}
	});

	it('the POST fails: nothing is shown and the error is reported', async () => {
		api.startImpersonation.mockRejectedValueOnce(new Error('denied'));
		await expect(impersonation.start(START)).rejects.toThrow('denied');
		expect(impersonation.active).toBeNull();
		expect(impersonation.status).toBe('error');
	});

	it('I4: start is refused while a session is active (the store, not only the button)', async () => {
		await showing('A');
		await expect(impersonation.start(START)).rejects.toThrow(/already active/);
		expect(api.startImpersonation).not.toHaveBeenCalled();
	});

	it('I4: start is refused while another start or end is queued', async () => {
		const post = deferred<ReturnType<typeof created>>();
		api.startImpersonation.mockReturnValueOnce(post.promise);
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('N')] });
		const first = impersonation.start(START);
		await expect(impersonation.start(START)).rejects.toThrow(/in progress/);
		post.resolve(created('N'));
		await first;
		expect(api.startImpersonation).toHaveBeenCalledTimes(1);
	});

	it('I4: session A shown, start(B) refused, End sends exactly ONE DELETE and the key is not left behind', async () => {
		await showing('A');
		await expect(impersonation.start(START)).rejects.toBeTruthy();
		const del = deferred<void>();
		api.endImpersonation.mockReturnValueOnce(del.promise);
		const e1 = impersonation.end();
		const e2 = impersonation.end();
		del.resolve();
		await Promise.all([e1, e2]);
		expect(api.endImpersonation).toHaveBeenCalledTimes(1);
		expect(impersonation.active).toBeNull();
		keyHolds(null);
	});
});

describe('end', () => {
	it('fails: the session stays shown, the error is reported, the key stays', async () => {
		await showing('A');
		api.endImpersonation.mockRejectedValueOnce(new Error('boom'));
		await expect(impersonation.end()).rejects.toThrow('boom');
		expect(impersonation.active?.session_id).toBe('A');
		expect(impersonation.error).toBeTruthy();
		expect(impersonation.status).toBe('active');
		keyHolds('A');
		// and it can be tried again
		await impersonation.end();
		expect(impersonation.active).toBeNull();
	});

	it('M7: a session started in another tab during End is picked up by the read after it, and its key is left alone', async () => {
		await showing('A');
		const del = deferred<void>();
		api.endImpersonation.mockReturnValueOnce(del.promise);
		const ending = impersonation.end();
		window.localStorage.setItem(KEY, 'B');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('B')] });
		del.resolve();
		await ending;
		expect(impersonation.active?.session_id).toBe('B');
		keyHolds('B');
	});

	it('a read queued before End cannot bring the ended session back', async () => {
		await showing('A');
		const get = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(get.promise);
		const late = impersonation.reconcile();
		const ending = impersonation.end();
		get.resolve({ sessions: [dto('A')] });
		await late;
		await ending;
		expect(impersonation.active).toBeNull();
		keyHolds(null);
	});
});

describe('reads', () => {
	it('a failed read never hides a shown session, keeps the error until the next success', async () => {
		await showing('A');
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await impersonation.reconcile();
		expect(impersonation.active?.session_id).toBe('A');
		expect(impersonation.error).toBeTruthy();
		expect(impersonation.status).toBe('active');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('A')] });
		await impersonation.reconcile();
		expect(impersonation.error).toBeNull();
	});

	it('a read that fails with nothing shown is an error; a read that lists nothing hides the session and the key', async () => {
		window.localStorage.setItem(KEY, 'A');
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await impersonation.reconcile();
		expect(impersonation.status).toBe('error');
		await showing('B');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [] });
		await impersonation.reconcile();
		expect(impersonation.active).toBeNull();
		keyHolds(null);
	});

	it('a storage event for the key (another tab started or ended a session) queues a read', async () => {
		window.localStorage.setItem(KEY, 'B');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('B')] });
		window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
		await vi.waitFor(() => expect(impersonation.active?.session_id).toBe('B'));
		window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
		await flush();
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------------------------------------------------
// Property test: a model server, random operations, responses settled in a random order.

function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe('property: any interleaving', () => {
	it('300 random sequences: one request at a time, a known session is never hidden, an ended one never returns, no repeated DELETE', async () => {
		const r = rng(20261121);
		const server = new Set<string>(); // sessions the server holds
		const inflight: Array<{ settle: (ok: boolean) => void; kind: string }> = [];
		let concurrent = 0;
		let maxConcurrent = 0;
		const ended = new Set<string>(); // ids a successful DELETE removed
		const deletes: Array<{ id: string; ok: boolean | null }> = [];
		let known: string | null = null; // what this tab knows for certain (the model of the store's contract)
		let n = 0;

		const track = <T>(kind: string, run: (ok: boolean) => T) => {
			const d = deferred<T>();
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);
			inflight.push({
				kind,
				settle: (ok) => {
					concurrent--;
					if (ok) d.resolve(run(true));
					else {
						run(false);
						d.reject(new Error('net'));
					}
				}
			});
			return d.promise;
		};

		api.startImpersonation.mockImplementation(() => {
			const id = `S${++n}`;
			return track('post', (ok) => {
				if (ok) {
					server.add(id);
					known = id;
				}
				return created(id);
			});
		});
		api.endImpersonation.mockImplementation((id: string) => {
			const rec = { id, ok: null as boolean | null };
			deletes.push(rec);
			return track('delete', (ok) => {
				rec.ok = ok;
				if (ok) {
					server.delete(id);
					ended.add(id);
					if (known === id) known = null;
					if (window.localStorage.getItem(KEY) === id) window.localStorage.removeItem(KEY);
				}
				return undefined;
			});
		});
		api.listImpersonationSessions.mockImplementation(() => {
			const snapshot = [...server];
			const keyAtCall = window.localStorage.getItem(KEY);
			const idAsked = keyAtCall ?? known;
			return track('get', (ok) => {
				if (ok) known = idAsked && snapshot.includes(idAsked) ? idAsked : null;
				return { sessions: snapshot.map(dto) };
			});
		});

		// the store has no timers: a few microtask turns let every settled promise run its continuation
		const quiet = async () => {
			for (let i = 0; i < 30; i++) await Promise.resolve();
		};
		const checkAlways = (where: string) => {
			expect(maxConcurrent, `${where}: requests in flight together`).toBeLessThanOrEqual(1);
			if (known !== null)
				expect(impersonation.active?.session_id, `${where}: a known session is shown`).toBe(known);
			if (impersonation.active)
				expect(ended.has(impersonation.active.session_id), `${where}: an ended session`).toBe(
					false
				);
			// no DELETE for an id after one succeeded, and never two for one id at once
			for (const d of deletes) {
				if (d.ok === true)
					expect(deletes.filter((x) => x.id === d.id && x.ok === true).length).toBe(1);
				expect(deletes.filter((x) => x.id === d.id && x.ok === null).length).toBeLessThanOrEqual(1);
			}
		};

		for (let seq = 0; seq < 300; seq++) {
			const steps = 5 + Math.floor(r() * 12);
			for (let i = 0; i < steps; i++) {
				const x = r();
				const where = `seq ${seq} step ${i}`;
				if (x < 0.2) void impersonation.start(START, 'Name').catch(() => {});
				else if (x < 0.34) void impersonation.end().catch(() => {});
				else if (x < 0.5) void impersonation.reconcile();
				else if (x < 0.56) {
					// another tab started a session: the server has it, the key names it, a storage event arrives
					const id = `X${++n}`;
					server.add(id);
					window.localStorage.setItem(KEY, id);
					window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
					// the store learns of it only from a successful read: the model learns it the same way
				} else if (x < 0.62) {
					// another tab ended the session it was showing
					const id = window.localStorage.getItem(KEY);
					if (id) {
						server.delete(id);
						window.localStorage.removeItem(KEY);
						window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
					}
				} else if (inflight.length) {
					const [op] = inflight.splice(Math.floor(r() * inflight.length), 1);
					op!.settle(r() < 0.7);
				}
				await quiet();
				checkAlways(where);
			}
			// drain: settle everything still in flight, in a random order
			while (inflight.length || SETTLED.indexOf(impersonation.status) < 0) {
				if (inflight.length) {
					const [op] = inflight.splice(Math.floor(r() * inflight.length), 1);
					op!.settle(r() < 0.8);
				}
				await quiet();
				checkAlways(`seq ${seq} drain`);
				if (!inflight.length && SETTLED.indexOf(impersonation.status) < 0) {
					// a queued operation has not started yet: give it time
					await quiet();
					if (!inflight.length) break;
				}
			}
			expect(SETTLED, `seq ${seq}: status settles once the queue is empty`).toContain(
				impersonation.status
			);
		}
		expect(maxConcurrent).toBe(1);
	}, 240_000);
});
