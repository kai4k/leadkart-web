/**
 * A mutation that does not answer inside its deadline has an UNKNOWN outcome (the BFF may still commit it): the store
 * checks again on a schedule and the first successful read is the truth. Each test names the mutant it kills.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BFF_MAX_UPSTREAM_HOPS, DEFAULT_UPSTREAM_TIMEOUT_MS } from '#lib/api/timeouts.ts';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import {
	createImpersonation,
	MUTATION_DEADLINE_MS,
	StartOutcomeUnknownError,
	type Impersonation
} from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';

const dto = (id: string) => ({
	session_id: id,
	operator_id: 'op',
	target_tenant_id: 't',
	tenant_display_name: `Company ${id}`,
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2099-01-01T00:00:00Z'
});
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((res) => (resolve = res));
	return { promise, resolve };
}

let person: string | null;
let store: Impersonation;
beforeEach(() => {
	vi.resetAllMocks();
	window.localStorage.clear();
	person = 'A';
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	store = createImpersonation({
		personId: () => person,
		deadlineMs: 200,
		mutationDeadlineMs: 30,
		followUpDelaysMs: [20, 40, 60, 80]
	});
});
afterEach(() => store.dispose());

describe('the mutation deadline is above what the BFF can spend', () => {
	it('MUTATION_DEADLINE_MS exceeds 3 upstream hops of the BFF (fails if the BFF figures are raised past it)', () => {
		expect(MUTATION_DEADLINE_MS).toBeGreaterThan(
			BFF_MAX_UPSTREAM_HOPS * DEFAULT_UPSTREAM_TIMEOUT_MS
		);
	});
});

describe('a start that lands after its deadline', () => {
	it('timed-out POST queues follow-up reads: the server created the session late, the banner state shows it', async () => {
		const post = deferred<{
			session_id: string;
			tenant_display_name: string;
			expires_at_utc: string;
		}>();
		api.startImpersonation.mockReturnValueOnce(post.promise);
		await expect(store.start(START)).rejects.toBeInstanceOf(StartOutcomeUnknownError);
		expect(store.active).toBeNull();
		expect(store.unknown).toBe(true); // when in doubt it is shown as such
		// the server commits AFTER the deadline (and after the first follow-up read)
		await wait(25);
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('LATE')] });
		await wait(120);
		expect(store.active?.session_id).toBe('LATE');
		expect(store.checking).toBe(false);
		post.resolve({
			session_id: 'LATE',
			tenant_display_name: 'Late',
			expires_at_utc: '2099-01-01T00:00:00Z'
		}); // the late answer changes nothing
		await wait(10);
		expect(store.active?.session_id).toBe('LATE');
	});

	it('resolveUnknownStart: "started" when a follow-up read lists a session', async () => {
		api.startImpersonation.mockReturnValueOnce(new Promise(() => {}));
		await expect(store.start(START)).rejects.toBeInstanceOf(StartOutcomeUnknownError);
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('X')] });
		await expect(store.resolveUnknownStart()).resolves.toBe('started');
	});

	it('resolveUnknownStart: "not-started" only after the SECOND read finds nothing', async () => {
		api.startImpersonation.mockReturnValueOnce(new Promise(() => {}));
		await expect(store.start(START)).rejects.toBeInstanceOf(StartOutcomeUnknownError);
		const reads = api.listImpersonationSessions.mock.calls.length;
		await expect(store.resolveUnknownStart()).resolves.toBe('not-started');
		expect(api.listImpersonationSessions.mock.calls.length - reads).toBeGreaterThanOrEqual(2);
	});

	it('a late-successful DELETE: the follow-up read removes the session', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S1')] });
		await store.reconcile();
		expect(store.active?.session_id).toBe('S1');
		api.endImpersonation.mockReturnValueOnce(new Promise(() => {}));
		await expect(store.end('S1')).rejects.toBeTruthy();
		expect(store.active?.session_id).toBe('S1'); // still shown while unknown
		api.listImpersonationSessions.mockResolvedValue({ sessions: [] }); // the server did delete it
		await wait(120);
		expect(store.active).toBeNull();
		expect(store.checking).toBe(false);
	});
});

describe('person boundary, each mutant by name', () => {
	it('end: no person check - an End queued behind a read sends nothing once another person is signed in', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S1')] });
		await store.reconcile();
		const slow = deferred<{ sessions: ReturnType<typeof dto>[] }>();
		api.listImpersonationSessions.mockReturnValueOnce(slow.promise);
		void store.reconcile();
		const ended = store.end('S1').catch(() => {});
		person = 'B';
		slow.resolve({ sessions: [dto('S1')] });
		await ended;
		expect(api.endImpersonation).not.toHaveBeenCalled();
	});

	it('getter tag only: without forget(), a person change hides A at once (sessions, name, errors, unknown)', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('S1')] });
		await store.reconcile();
		person = 'B';
		expect(store.active).toBeNull();
		expect(store.more).toBe(0);
		expect(store.readError).toBeNull();
		expect(store.endError).toBeNull();
		expect(store.unknown).toBe(false);
	});

	it("forget abandons the old person queue: A's hung start does not block B", async () => {
		api.startImpersonation.mockReturnValueOnce(new Promise(() => {}));
		void store.start(START).catch(() => {});
		await wait(5);
		store.forget();
		person = 'B';
		api.startImpersonation.mockResolvedValueOnce({
			session_id: 'B1',
			tenant_display_name: 'Company B1',
			expires_at_utc: '2099-01-01T00:00:00Z'
		});
		await expect(store.start(START)).resolves.toEqual({ kind: 'started' });
	});

	it('the earliest expiry among listed sessions arms the timer (not the first listed)', async () => {
		const { earliestExpiry } =
			await import('#lib/features/operator/impersonation/stores/schedule.ts');
		const later = { ...dto('A'), expires_at: '2099-01-01T00:00:00Z' };
		const sooner = { ...dto('B'), expires_at: '2050-01-01T00:00:00Z' };
		expect(earliestExpiry([later, sooner])).toBe(Date.parse('2050-01-01T00:00:00Z'));
		expect(earliestExpiry([])).toBeNull();
	});
});
