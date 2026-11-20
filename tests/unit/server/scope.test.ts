import { createHash, createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '#lib/server/config.ts';
import {
	getOperatorScope,
	readOperatorScope,
	SCOPE_COOKIE_MAX_AGE_SECONDS,
	SCOPE_TTL_SECONDS,
	scopeFingerprint,
	setOperatorScope
} from '#lib/server/scope.ts';

const PERSON = 'person-aaaa';
const OTHER_PERSON = 'person-bbbb';

/** An access token whose `sub` is `person` (the claims the scope cookie is bound to). */
function accessFor(person: string | null): string | undefined {
	if (person === null) return undefined;
	const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
	return `${seg({ alg: 'none' })}.${seg({ sub: person, tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.sig`;
}

function signed(payload: unknown, secret: string = config.SCOPE_COOKIE_SECRET): string {
	const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${p}.${createHmac('sha256', secret).update(p).digest('base64url')}`;
}

/** A cookie jar with the scope cookie (`initial`) and the caller's access cookie (`person`). */
function jar(initial?: string, person: string | null = PERSON) {
	const store = new Map<string, string>();
	if (initial !== undefined) store.set('lk_op_tenant', initial);
	const access = accessFor(person);
	if (access) store.set('lk_access', access);
	return {
		get value() {
			return store.get('lk_op_tenant');
		},
		api: {
			get: (n: string) => store.get(n),
			set: (n: string, v: string) => void store.set(n, v),
			delete: (n: string) => void store.delete(n)
		} as never
	};
}
const scope = {
	id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
	slug: 'acme',
	display_name: 'Acme Pharma'
};

describe('operator scope cookie', () => {
	it('outlives the signed expiry so an expired scope is read as invalid, not none', () => {
		expect(SCOPE_COOKIE_MAX_AGE_SECONDS).toBeGreaterThan(SCOPE_TTL_SECONDS);
		let options: { maxAge?: number } = {};
		setOperatorScope(
			{
				get: (n: string) => (n === 'lk_access' ? accessFor(PERSON) : undefined),
				set: (_n: string, _v: string, o: { maxAge?: number }) => {
					options = o;
				}
			} as never,
			scope
		);
		expect(options.maxAge).toBe(SCOPE_COOKIE_MAX_AGE_SECONDS);
	});

	it('round-trips a signed value', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		expect(getOperatorScope(j.api)).toEqual(scope);
	});

	it('rejects a hand-written unsigned JSON cookie', () => {
		expect(getOperatorScope(jar(JSON.stringify(scope)).api)).toBeNull();
	});

	it('rejects a payload changed after signing', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		const [, sig] = j.value!.split('.');
		const forged = Buffer.from(
			JSON.stringify({ ...scope, id: '11111111-1111-4111-8111-111111111111', pid: PERSON })
		).toString('base64url');
		expect(getOperatorScope(jar(`${forged}.${sig}`).api)).toBeNull();
	});

	it('refuses to sign a non-UUID id (path-injection guard)', () => {
		expect(() => setOperatorScope(jar().api, { ...scope, id: '../../admin' })).toThrow();
	});

	describe('readOperatorScope states', () => {
		afterEach(() => vi.useRealTimers());

		it('none when the cookie is absent', () => {
			expect(readOperatorScope(jar().api)).toEqual({ state: 'none' });
			expect(getOperatorScope(jar().api)).toBeNull();
		});

		it('valid round-trip strips exp', () => {
			const j = jar();
			setOperatorScope(j.api, scope);
			expect(readOperatorScope(j.api)).toEqual({ state: 'valid', scope });
		});

		it('invalid after the signed expiry passes', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const j = jar();
			setOperatorScope(j.api, scope);
			vi.setSystemTime(new Date('2026-01-01T07:59:00Z'));
			expect(readOperatorScope(j.api).state).toBe('valid');
			vi.setSystemTime(new Date('2026-01-01T08:00:01Z'));
			expect(readOperatorScope(j.api)).toEqual({ state: 'invalid' });
			expect(getOperatorScope(j.api)).toBeNull();
		});

		it('invalid for a signature made with the wrong secret', () => {
			const exp = Math.floor(Date.now() / 1000) + 60;
			expect(
				readOperatorScope(jar(signed({ ...scope, pid: PERSON, exp }, 'other-secret')).api)
			).toEqual({
				state: 'invalid'
			});
		});

		it.each(['abc', 'abc.', '.sig'])('invalid for malformed value %s', (raw) => {
			expect(readOperatorScope(jar(raw).api)).toEqual({ state: 'invalid' });
		});

		it('invalid for a validly signed payload with a non-UUID id', () => {
			const exp = Math.floor(Date.now() / 1000) + 60;
			expect(
				readOperatorScope(jar(signed({ ...scope, id: '../../admin', pid: PERSON, exp })).api)
			).toEqual({
				state: 'invalid'
			});
		});

		it('invalid for a validly signed payload without exp', () => {
			expect(readOperatorScope(jar(signed({ ...scope, pid: PERSON })).api)).toEqual({
				state: 'invalid'
			});
		});
	});

	describe('bound to the person who entered the context', () => {
		it('valid for the person it was signed for', () => {
			const j = jar();
			setOperatorScope(j.api, scope);
			expect(readOperatorScope(j.api).state).toBe('valid');
		});

		it('a cookie replayed by another signed-in person is invalid, never valid', () => {
			const entered = jar();
			setOperatorScope(entered.api, scope);
			const replayed = jar(entered.value, OTHER_PERSON);
			expect(readOperatorScope(replayed.api)).toEqual({ state: 'invalid' });
			expect(getOperatorScope(replayed.api)).toBeNull();
		});

		it('with no access cookie nobody can be shown to own it: invalid', () => {
			const entered = jar();
			setOperatorScope(entered.api, scope);
			expect(readOperatorScope(jar(entered.value, null).api)).toEqual({ state: 'invalid' });
		});

		it('an old-format cookie (signed, unexpired, no person) fails closed', () => {
			const exp = Math.floor(Date.now() / 1000) + 60;
			expect(readOperatorScope(jar(signed({ ...scope, exp })).api)).toEqual({ state: 'invalid' });
		});

		it('refuses to write a cookie when the caller is unknown', () => {
			expect(() => setOperatorScope(jar(undefined, null).api, scope)).toThrow();
		});
	});
});

describe('scope fingerprint (what a page sends to prove which context it shows)', () => {
	const other = { ...scope, id: '9d9c7a52-0c7b-4e8d-8a3e-0e5d3e0b9f11' };

	it('is "none" without a cookie and "invalid" for an unusable one', () => {
		expect(scopeFingerprint({ state: 'none' })).toBe('none');
		expect(scopeFingerprint({ state: 'invalid' })).toBe('invalid');
	});

	it('is stable per tenant and differs between tenants', () => {
		const a = scopeFingerprint({ state: 'valid', scope });
		expect(a).toBe(scopeFingerprint({ state: 'valid', scope: { ...scope, slug: 'renamed' } }));
		expect(a).not.toBe(scopeFingerprint({ state: 'valid', scope: other }));
		expect(a).not.toBe('none');
	});

	it('never reveals the tenant id, slug or name', () => {
		const fp = scopeFingerprint({ state: 'valid', scope });
		expect(fp).toMatch(/^[A-Za-z0-9_-]{22,}$/);
		for (const secret of [scope.id, scope.id.replaceAll('-', ''), scope.slug, scope.display_name]) {
			expect(fp).not.toContain(secret);
		}
	});

	it('is keyed with the server secret: it is not the plain hash of the id', () => {
		const fp = scopeFingerprint({ state: 'valid', scope });
		expect(fp).not.toBe(
			createHash('sha256').update(scope.id).digest('base64url').slice(0, fp.length)
		);
		expect(fp).not.toBe(
			createHash('sha256').update(`fp:${scope.id}`).digest('base64url').slice(0, fp.length)
		);
	});
});
