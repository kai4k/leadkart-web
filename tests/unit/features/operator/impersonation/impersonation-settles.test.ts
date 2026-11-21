/**
 * The impersonation indicator is a security signal, so the store must never be left in 'loading' or 'mutating' (the
 * banner's focus / visibility trigger refuses while it is, and a session started elsewhere would then never show) and a
 * FAILED newer read must never hide a session that an older read showed (fix round F: I3, M1). Controlled promises, one
 * table row per interleaving the review lists; after each, once every promise has settled, the status is settled.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
	reason: 'support',
	expires_at: '2030-01-01T00:00:00Z'
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
const SETTLED = ['idle', 'active', 'error'];
const settled = () =>
	expect(SETTLED, `status ${impersonation.status}`).toContain(impersonation.status);
const keyHolds = (id: string | null) => expect(window.localStorage.getItem(KEY)).toBe(id);

beforeEach(async () => {
	vi.resetAllMocks();
	window.localStorage.clear();
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	await impersonation.reconcile();
	await flush();
});

/** The operator has session `id` active in this tab. */
async function showing(id: string) {
	window.localStorage.setItem(KEY, id);
	api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto(id)] });
	await impersonation.reconcile();
	expect(impersonation.active?.session_id).toBe(id);
}

describe('the status always settles', () => {
	it('I3: reconcile in flight, the key is removed by another tab, a second reconcile takes the no-key branch, the first GET arrives stale: NOT stuck in loading', async () => {
		await showing('A');
		const first = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(first.promise);
		const a = impersonation.reconcile();
		expect(impersonation.status).toBe('loading');
		window.localStorage.removeItem(KEY); // another tab ended the session
		await impersonation.reconcile(); // the capabilities effect: no key, answers synchronously
		expect(impersonation.status).toBe('idle');
		expect(impersonation.active).toBeNull();
		first.resolve({ sessions: [dto('A')] }); // stale
		await a;
		await flush();
		expect(impersonation.status).toBe('idle');
		expect(impersonation.active).toBeNull();
	});

	it('...and a session started in another tab afterwards DOES show here (the trigger is not refused)', async () => {
		await showing('A');
		const first = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(first.promise);
		const a = impersonation.reconcile();
		window.localStorage.removeItem(KEY);
		await impersonation.reconcile();
		first.resolve({ sessions: [dto('A')] });
		await a;
		// another tab starts session B: the focus trigger reconciles
		window.localStorage.setItem(KEY, 'B');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('B')] });
		await impersonation.reconcile();
		expect(impersonation.status).toBe('active');
		expect(impersonation.active?.session_id).toBe('B');
	});

	const rows: Array<[string, () => Promise<void>]> = [
		[
			'reconcile in flight -> End -> DELETE resolves -> GET resolves',
			async () => {
				await showing('A');
				const get = deferred<List>();
				api.listImpersonationSessions.mockReturnValueOnce(get.promise);
				api.endImpersonation.mockResolvedValue(undefined);
				const late = impersonation.reconcile();
				await impersonation.end();
				get.resolve({ sessions: [dto('A')] });
				await late;
				expect(impersonation.active).toBeNull();
				keyHolds(null);
			}
		],
		[
			'End -> focus (reconcile refused while mutating) -> DELETE resolves -> reconcile',
			async () => {
				await showing('A');
				const del = deferred<void>();
				api.endImpersonation.mockReturnValueOnce(del.promise);
				const ending = impersonation.end();
				expect(impersonation.status).toBe('mutating');
				await impersonation.reconcile(); // refused: End owns the state
				expect(impersonation.status).toBe('mutating');
				del.resolve();
				await ending;
				expect(impersonation.status).toBe('idle');
				await impersonation.reconcile();
				expect(impersonation.active).toBeNull();
			}
		],
		[
			'End fails (the session stays shown, the error is reported, the status is not mutating)',
			async () => {
				await showing('A');
				api.endImpersonation.mockRejectedValueOnce(new Error('boom'));
				await expect(impersonation.end()).rejects.toThrow('boom');
				expect(impersonation.active?.session_id).toBe('A');
				expect(impersonation.error).toBeTruthy();
				keyHolds('A');
			}
		],
		[
			'start in another tab during End: End does not remove the OTHER session key',
			async () => {
				await showing('A');
				const del = deferred<void>();
				api.endImpersonation.mockReturnValueOnce(del.promise);
				const ending = impersonation.end();
				window.localStorage.setItem(KEY, 'B'); // another tab started B while the DELETE ran
				del.resolve();
				await ending;
				expect(impersonation.active).toBeNull();
				keyHolds('B');
			}
		],
		[
			'two reconciles: the older answer arrives last and is dropped',
			async () => {
				await showing('A');
				const older = deferred<List>();
				const newer = deferred<List>();
				api.listImpersonationSessions
					.mockReturnValueOnce(older.promise)
					.mockReturnValueOnce(newer.promise);
				const a = impersonation.reconcile();
				const b = impersonation.reconcile();
				newer.resolve({ sessions: [] }); // the session ended
				await b;
				expect(impersonation.active).toBeNull();
				older.resolve({ sessions: [dto('A')] }); // late and stale
				await a;
				expect(impersonation.active).toBeNull();
			}
		],
		[
			'start: POST fails',
			async () => {
				api.startImpersonation.mockRejectedValueOnce(new Error('denied'));
				await expect(
					impersonation.start({ tenant_id: 't', reason: 'r', duration_minutes: 5 } as never)
				).rejects.toThrow('denied');
				expect(impersonation.active).toBeNull();
			}
		],
		[
			'start: POST ok, the follow-up read fails (the key is set, no session is shown, status is not loading)',
			async () => {
				api.startImpersonation.mockResolvedValueOnce({ session_id: 'N' });
				api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
				await impersonation.start({ tenant_id: 't', reason: 'r', duration_minutes: 5 } as never);
				keyHolds('N');
				expect(impersonation.error).toBeTruthy();
			}
		],
		[
			'a read fails and nothing was shown',
			async () => {
				window.localStorage.setItem(KEY, 'A');
				api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
				await impersonation.reconcile();
				expect(impersonation.status).toBe('error');
				expect(impersonation.active).toBeNull();
			}
		],
		[
			'the key is removed while the only read is in flight, and that read then answers with the session',
			async () => {
				window.localStorage.setItem(KEY, 'A');
				const get = deferred<List>();
				api.listImpersonationSessions.mockReturnValueOnce(get.promise);
				const a = impersonation.reconcile();
				window.localStorage.removeItem(KEY);
				get.resolve({ sessions: [dto('A')] }); // the server still lists it: the server is the truth
				await a;
				expect(impersonation.active?.session_id).toBe('A');
			}
		]
	];
	it.each(rows)('%s', async (_name, run) => {
		await run();
		await flush();
		settled();
	});
});

describe('a newer FAILED read never hides what an older good read showed (M1)', () => {
	it('older good, newer failed: the session stays shown and the status is settled', async () => {
		window.localStorage.setItem(KEY, 'B');
		const older = deferred<List>();
		const newer = deferred<List>();
		api.listImpersonationSessions
			.mockReturnValueOnce(older.promise)
			.mockReturnValueOnce(newer.promise);
		const a = impersonation.reconcile();
		const b = impersonation.reconcile();
		newer.reject(new Error('net')); // the newer read fails first
		await b;
		older.resolve({ sessions: [dto('B')] }); // the older one still shows the banner
		await a;
		await flush();
		expect(impersonation.active?.session_id).toBe('B');
		settled();
	});
	it('a failed read after a good one leaves the shown session on screen', async () => {
		await showing('A');
		api.listImpersonationSessions.mockRejectedValueOnce(new Error('net'));
		await impersonation.reconcile();
		expect(impersonation.active?.session_id).toBe('A');
		expect(impersonation.error).toBeTruthy();
		expect(impersonation.status).toBe('active');
		// and the next reconcile is allowed (the trigger is not blocked)
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('A')] });
		await impersonation.reconcile();
		expect(impersonation.error).toBeNull();
		expect(impersonation.status).toBe('active');
	});
	it('only a mutation invalidates earlier reads: a read begun before End is dropped, one begun after is applied', async () => {
		await showing('A');
		const before = deferred<List>();
		api.listImpersonationSessions.mockReturnValueOnce(before.promise);
		api.endImpersonation.mockResolvedValue(undefined);
		const p = impersonation.reconcile();
		await impersonation.end();
		before.resolve({ sessions: [dto('A')] });
		await p;
		expect(impersonation.active).toBeNull();
		window.localStorage.setItem(KEY, 'C');
		api.listImpersonationSessions.mockResolvedValueOnce({ sessions: [dto('C')] });
		await impersonation.reconcile();
		expect(impersonation.active?.session_id).toBe('C');
	});
});
