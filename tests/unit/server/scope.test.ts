import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '#lib/server/config.ts';
import {
	getOperatorScope,
	readOperatorScope,
	SCOPE_COOKIE_MAX_AGE_SECONDS,
	SCOPE_TTL_SECONDS,
	setOperatorScope
} from '#lib/server/scope.ts';

function signed(payload: unknown, secret: string = config.SCOPE_COOKIE_SECRET): string {
	const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${p}.${createHmac('sha256', secret).update(p).digest('base64url')}`;
}

function jar(initial?: string) {
	let value = initial;
	return {
		get value() {
			return value;
		},
		api: {
			get: () => value,
			set: (_n: string, v: string) => {
				value = v;
			},
			delete: () => {
				value = undefined;
			}
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
				get: () => undefined,
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
			JSON.stringify({ ...scope, id: '11111111-1111-4111-8111-111111111111' })
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
			expect(readOperatorScope(jar(signed({ ...scope, exp }, 'other-secret')).api)).toEqual({
				state: 'invalid'
			});
		});

		it.each(['abc', 'abc.', '.sig'])('invalid for malformed value %s', (raw) => {
			expect(readOperatorScope(jar(raw).api)).toEqual({ state: 'invalid' });
		});

		it('invalid for a validly signed payload with a non-UUID id', () => {
			const exp = Math.floor(Date.now() / 1000) + 60;
			expect(readOperatorScope(jar(signed({ ...scope, id: '../../admin', exp })).api)).toEqual({
				state: 'invalid'
			});
		});

		it('invalid for a validly signed payload without exp', () => {
			expect(readOperatorScope(jar(signed(scope)).api)).toEqual({ state: 'invalid' });
		});
	});
});
