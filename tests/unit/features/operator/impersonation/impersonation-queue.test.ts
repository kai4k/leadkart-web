/**
 * Property test: a model server (sessions per person), random operations (start, end, read, another tab starting or
 * ending, a person switch), responses settled in a random order, some never settling. Invariants after every step:
 * one request at a time; no state from person A is observable while person B is current; no DELETE for a session
 * that is not the current person's; no POST while the store shows a session; the status settles.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import { createImpersonation } from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';

const dto = (id: string) => ({
	session_id: id,
	operator_id: 'op',
	target_tenant_id: 't',
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2099-01-01T01:00:00Z'
});
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const DEADLINE = 1000;

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
function deferred<T>() {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

beforeEach(() => {
	vi.resetAllMocks();
	window.localStorage.clear();
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => vi.useRealTimers());

describe('property: any interleaving', () => {
	it('300 random sequences, seed 20261121', async () => {
		const r = rng(20261121);
		let person: string | null = 'A';
		const store = createImpersonation({ personId: () => person, deadlineMs: DEADLINE });
		const server = new Map<string, Set<string>>([
			['A', new Set()],
			['B', new Set()]
		]);
		const ownerOf = new Map<string, string>(); // session id -> the person it was created for
		const inflight: Array<{ settle: (how: 'ok' | 'fail' | 'hang') => void }> = [];
		let concurrent = 0;
		let maxConcurrent = 0;
		let n = 0;
		// recorded, not asserted, inside the mocks: a throw there would be swallowed as an ordinary request failure
		const violations: string[] = [];

		const track = <T>(run: (ok: boolean) => T) => {
			const d = deferred<T>();
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);
			let done = false;
			inflight.push({
				settle: (how) => {
					if (done) return;
					done = true;
					concurrent--;
					if (how === 'hang') return; // never settles: only the deadline frees the queue
					if (how === 'ok') d.resolve(run(true));
					else {
						run(false);
						d.reject(new Error('net'));
					}
				}
			});
			return d.promise;
		};

		api.startImpersonation.mockImplementation(() => {
			const who = person!;
			const id = `S${++n}`;
			// a start never POSTs while the store itself shows a session of the person it posts for
			if (store.active) violations.push('POST while a session is shown');
			return track((ok) => {
				if (ok) {
					server.get(who)!.add(id);
					ownerOf.set(id, who);
				}
				return { session_id: id, expires_at_utc: '2099-01-01T01:00:00Z' };
			});
		});
		api.endImpersonation.mockImplementation((id: string) => {
			// never a DELETE for another person's session
			if (ownerOf.get(id) !== person) violations.push(`DELETE ${id} sent for another person`);
			const who = person!;
			return track((ok) => {
				if (ok) server.get(who)!.delete(id);
				return undefined;
			});
		});
		api.listImpersonationSessions.mockImplementation(() => {
			const snapshot = [...(server.get(person ?? '') ?? [])];
			return track(() => ({ sessions: snapshot.map(dto) }));
		});

		const quiet = async () => {
			for (let i = 0; i < 40; i++) await Promise.resolve();
		};
		const checkAlways = (where: string) => {
			expect(violations, `${where} ${JSON.stringify(violations)}`).toEqual([]);
			expect(maxConcurrent, `${where}: requests in flight together`).toBeLessThanOrEqual(1);
			const a = store.active;
			if (a)
				expect(
					ownerOf.get(a.session_id) ?? person,
					`${where}: a session of another person shown`
				).toBe(person);
			if (person === 'B' && !a) expect(store.targetName, `${where}: A's name`).toBeNull();
		};
		const settled = () => ['idle', 'active', 'error'].includes(store.status);

		for (let seq = 0; seq < 300; seq++) {
			const steps = 5 + Math.floor(r() * 12);
			for (let i = 0; i < steps; i++) {
				const x = r();
				const where = `seq ${seq} step ${i}`;
				if (x < 0.18) void store.start(START, 'Name').catch(() => {});
				else if (x < 0.3) void store.end().catch(() => {});
				else if (x < 0.44) void store.reconcile();
				else if (x < 0.5) {
					// another tab started a session for this person and signalled
					const id = `X${++n}`;
					server.get(person ?? 'A')!.add(id);
					ownerOf.set(id, person ?? 'A');
					window.dispatchEvent(
						new StorageEvent('storage', { key: 'leadkart-impersonation-signal' })
					);
				} else if (x < 0.55) {
					// another tab ended one
					const set = server.get(person ?? 'A')!;
					const id = [...set][0];
					if (id) set.delete(id);
					window.dispatchEvent(
						new StorageEvent('storage', { key: 'leadkart-impersonation-signal' })
					);
				} else if (x < 0.6) {
					// sign-out without a reload, then the other person signs in (the old person's sessions stay on the server)
					person = person === 'A' ? 'B' : 'A';
					if (r() < 0.5) store.forget();
				} else if (inflight.length) {
					const [op] = inflight.splice(Math.floor(r() * inflight.length), 1);
					const k = r();
					op!.settle(k < 0.65 ? 'ok' : k < 0.95 ? 'fail' : 'hang');
				}
				await quiet();
				checkAlways(where);
			}
			// drain: settle everything, in a random order; hung requests are freed by the deadline
			for (let guard = 0; guard < 200 && (inflight.length || !settled()); guard++) {
				if (inflight.length) {
					const [op] = inflight.splice(Math.floor(r() * inflight.length), 1);
					op!.settle(r() < 0.8 ? 'ok' : r() < 0.7 ? 'fail' : 'hang');
				} else {
					await vi.advanceTimersByTimeAsync(DEADLINE + 10);
				}
				await quiet();
				checkAlways(`seq ${seq} drain`);
			}
			expect(
				settled(),
				`seq ${seq}: status settles once the queue is empty (${store.status})`
			).toBe(true);
		}
		expect(maxConcurrent).toBe(1);
		store.dispose();
	}, 240_000);
});
