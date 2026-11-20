/**
 * Every server-to-server call to Go carries the caller's address, from ONE place: exactly one
 * `x-forwarded-for` equal to the request's client address, nothing the browser sent (forwarding
 * headers, a command id), and no header at all when the address is not a single IP.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const addr = vi.hoisted(() => ({ read: (() => '203.0.113.7') as () => string }));
vi.mock('$app/server', () => ({
	getRequestEvent: () => ({ getClientAddress: () => addr.read() })
}));

import type { Cookies } from '@sveltejs/kit';
import { goAuthFetch, goFetch } from '#lib/server/go.ts';
import { refreshTokens } from '#lib/server/auth-refresh.ts';
import {
	noteForwardedWithoutAddressHeader,
	resetClientAddressWarning,
	setClientAddress,
	validClientAddress
} from '#lib/server/client-address.ts';
import { GET, POST } from '../../../src/routes/api/[...path]/+server.ts';
import { actions as signinActions } from '../../../src/routes/(auth)/signin/+page.server.ts';
import { scopeFingerprint } from '#lib/server/scope.ts';

const SPOOF = {
	'X-Forwarded-For': '6.6.6.6',
	Forwarded: 'for=9.9.9.9',
	'X-Real-IP': '9.9.9.9',
	'x-client-ip': '9.9.9.9',
	'cf-connecting-ip': '9.9.9.9',
	'true-client-ip': '9.9.9.9',
	'X-Command-Id': 'attacker-command',
	'x-forwarded-host': 'evil.example',
	'x-keep': 'kept'
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	addr.read = () => '203.0.113.7';
	resetClientAddressWarning();
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const jar = (values: Record<string, string>): Cookies => {
	const store = new Map(Object.entries(values));
	return {
		get: (n: string) => store.get(n),
		set: (n: string, v: string) => void store.set(n, v),
		delete: (n: string) => void store.delete(n),
		getAll: () => [],
		serialize: () => ''
	} as unknown as Cookies;
};

/** Every header of one outgoing Go request, lower-cased; a name sent twice fails the test. */
function sentHeaders(init: RequestInit): Record<string, string> {
	const h = init.headers;
	const entries =
		h instanceof Headers ? [...h.entries()] : Object.entries(h as Record<string, string>);
	const out: Record<string, string> = {};
	for (const [k, v] of entries) {
		const key = k.toLowerCase();
		expect(out[key], `${key} sent twice`).toBeUndefined();
		out[key] = v;
	}
	return out;
}
const lastInit = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)![1] as RequestInit;
const FORBIDDEN = [
	'forwarded',
	'x-real-ip',
	'x-client-ip',
	'cf-connecting-ip',
	'true-client-ip',
	'x-command-id',
	'x-forwarded-host'
];

describe('the address itself', () => {
	it.each(['203.0.113.7', '2001:db8::1', '::1'])('accepts %s', (ip) => {
		expect(validClientAddress(() => ip)).toBe(ip);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['a list', '1.1.1.1, 2.2.2.2'],
		['empty', ''],
		['a name', 'unknown'],
		['a host:port', '203.0.113.7:443']
	])('refuses %s: no header, one warning for the process', (_n, value) => {
		expect(validClientAddress(() => value)).toBeUndefined();
		expect(validClientAddress(() => value)).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('a getClientAddress that throws is no header, logged once', () => {
		const read = () => {
			throw new Error('no address');
		};
		expect(validClientAddress(read)).toBeUndefined();
		expect(validClientAddress(read)).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('setClientAddress replaces, never appends', () => {
		const h = new Headers({ 'x-forwarded-for': '6.6.6.6' });
		setClientAddress(h, () => '203.0.113.7');
		expect(h.get('x-forwarded-for')).toBe('203.0.113.7');
	});
});

describe('the address: zone ids and IPv4-mapped forms', () => {
	it.each(['fe80::1%eth0', 'fe80::1%25eth0', '::1%lo'])(
		'refuses %s: Go would ignore the whole header, so none is sent',
		(value) => {
			expect(validClientAddress(() => value)).toBeUndefined();
			expect(warn).toHaveBeenCalledTimes(1);
		}
	);

	it.each([
		['::ffff:192.0.2.4', '192.0.2.4'],
		['::FFFF:192.0.2.4', '192.0.2.4'],
		['::ffff:c000:204', '192.0.2.4'],
		['0:0:0:0:0:ffff:192.0.2.4', '192.0.2.4'],
		['::ffff:0.0.0.0', '0.0.0.0'],
		['::ffff:255.255.255.255', '255.255.255.255']
	])('sends %s as the IPv4 %s (Go unmaps it too)', (value, expected) => {
		expect(validClientAddress(() => value)).toBe(expected);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each(['2001:db8::1', '::1', '::', '64:ff9b::192.0.2.4', '::ffff:0:192.0.2.4', '203.0.113.7'])(
		'leaves %s as it is',
		(value) => {
			expect(validClientAddress(() => value)).toBe(value);
		}
	);

	it('a very long value is refused before any parsing', () => {
		expect(validClientAddress(() => `::${'1:'.repeat(200)}1`)).toBeUndefined();
	});
});

describe('the warnings are visible while the misconfiguration lasts', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('at most one warning per five minutes, with the count of what was suppressed', () => {
		const bad = () => 'not an ip';
		validClientAddress(bad);
		validClientAddress(bad);
		validClientAddress(bad);
		expect(warn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(4 * 60_000);
		validClientAddress(bad);
		expect(warn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(60_001);
		validClientAddress(bad);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(String(warn.mock.calls[1]![0])).toContain('3 more since the last warning');
		expect(String(warn.mock.calls[0]![0])).not.toContain('more since');
	});

	it('X-Forwarded-For with no ADDRESS_HEADER is its own warning (the BFF reports the proxy address)', () => {
		vi.stubEnv('ADDRESS_HEADER', '');
		const proxied = new Request('http://x/', { headers: { 'x-forwarded-for': '198.51.100.20' } });
		noteForwardedWithoutAddressHeader(proxied);
		noteForwardedWithoutAddressHeader(proxied);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]![0])).toContain('ADDRESS_HEADER is not set');
		// ... independent of the "no header sent" warning
		validClientAddress(() => 'nope');
		expect(warn).toHaveBeenCalledTimes(2);
		vi.unstubAllEnvs();
	});

	it('no warning when ADDRESS_HEADER is set, or when no X-Forwarded-For arrived', () => {
		vi.stubEnv('ADDRESS_HEADER', 'x-forwarded-for');
		noteForwardedWithoutAddressHeader(
			new Request('http://x/', { headers: { 'x-forwarded-for': '198.51.100.20' } })
		);
		vi.stubEnv('ADDRESS_HEADER', '');
		noteForwardedWithoutAddressHeader(new Request('http://x/'));
		noteForwardedWithoutAddressHeader(undefined);
		expect(warn).not.toHaveBeenCalled();
		vi.unstubAllEnvs();
	});

	it('the proxy path says it too (setClientAddress is given the request)', () => {
		vi.stubEnv('ADDRESS_HEADER', '');
		const h = new Headers();
		setClientAddress(
			h,
			() => '203.0.113.7',
			new Request('http://x/', { headers: { 'x-forwarded-for': '198.51.100.20' } })
		);
		expect(h.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(warn).toHaveBeenCalledTimes(1);
		vi.unstubAllEnvs();
	});
});

describe('goFetch (server loads and form actions)', () => {
	it('sends exactly one x-forwarded-for, the request address; every caller-supplied forwarding header is dropped', async () => {
		const f = vi.fn((_u: string, _i: RequestInit) => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', f);
		await goFetch(jar({ lk_access: 'tok' }), '/v1/users', { headers: SPOOF });
		const sent = sentHeaders(lastInit(f));
		expect(sent['x-forwarded-for']).toBe('203.0.113.7');
		for (const name of FORBIDDEN) expect(sent, name).not.toHaveProperty(name);
		expect(sent['x-keep']).toBeUndefined(); // goFetch sends only what its allowlist names
	});

	it('an unusable address sends NO header (and none of the caller)', async () => {
		addr.read = () => '1.1.1.1, 2.2.2.2';
		const f = vi.fn((_u: string, _i: RequestInit) => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', f);
		await goFetch(jar({ lk_access: 'tok' }), '/v1/users', { headers: SPOOF });
		expect(sentHeaders(lastInit(f))).not.toHaveProperty('x-forwarded-for');
	});
});

describe('goAuthFetch (sign-in, forgot, reset, confirm, logout, refresh)', () => {
	it('sends the request address', async () => {
		const f = vi.fn((_u: string, _i: RequestInit) => Promise.resolve(new Response('{}')));
		await goAuthFetch('/v1/auth/login', { body: { email: 'a@b.co' } }, f as never);
		expect(sentHeaders(lastInit(f))['x-forwarded-for']).toBe('203.0.113.7');
	});

	it('sends nothing for an invalid address', async () => {
		addr.read = () => 'not-an-ip';
		const f = vi.fn((_u: string, _i: RequestInit) => Promise.resolve(new Response('{}')));
		await goAuthFetch('/v1/auth/login', { body: {} }, f as never);
		expect(sentHeaders(lastInit(f))).not.toHaveProperty('x-forwarded-for');
	});

	it('the refresh goes through it: its call carries the address', async () => {
		const f = vi.fn((_u: string, _i: RequestInit) =>
			Promise.resolve(
				new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r' }), {
					headers: { 'content-type': 'application/json' }
				})
			)
		);
		await refreshTokens('rt-address', f as never);
		expect(sentHeaders(lastInit(f))['x-forwarded-for']).toBe('203.0.113.7');
	});

	it('a 429 on refresh is "unavailable" (the session is kept), never "rejected"', async () => {
		const f = vi.fn(() => Promise.resolve(new Response('{}', { status: 429 })));
		expect(await refreshTokens('rt-429', f as never)).toEqual({
			ok: false,
			reason: 'unavailable'
		});
	});
});

const accessFor = (person: string) => {
	const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
	return `${seg({ alg: 'none' })}.${seg({ sub: person, tenant_id: 't', membership_id: 'm', exp: 4_000_000_000 })}.sig`;
};

describe('the generic proxy', () => {
	const call = (
		handler: typeof GET,
		address: () => string,
		headers: Record<string, string> = {}
	) => {
		const cookies = jar({ lk_access: accessFor('p1'), lk_csrf: 'c' });
		const method = handler === POST ? 'POST' : 'GET';
		return (handler as (e: never) => Promise<Response>)({
			request: new Request('http://app/api/v1/users', {
				method,
				headers: {
					...headers,
					'x-lk-scope-context': scopeFingerprint({ state: 'none' }, cookies),
					...(method === 'POST' ? { 'x-csrf-token': 'c' } : {})
				},
				body: method === 'POST' ? '{}' : undefined
			}),
			params: { path: 'v1/users' },
			cookies,
			getClientAddress: address
		} as never);
	};

	it.each([
		['GET', GET],
		['POST', POST]
	])(
		'%s: one x-forwarded-for equal to the client address; nothing the browser sent reaches Go',
		async (_m, handler) => {
			const f = vi.fn((_u: string | URL, _i: RequestInit) => Promise.resolve(Response.json({})));
			vi.stubGlobal('fetch', f);
			await call(handler, () => '198.51.100.20', SPOOF);
			const sent = sentHeaders(lastInit(f));
			expect(sent['x-forwarded-for']).toBe('198.51.100.20');
			for (const name of FORBIDDEN) expect(sent, name).not.toHaveProperty(name);
			expect(sent).not.toHaveProperty('x-keep'); // an allowlist: unknown headers never go through
		}
	);

	it.each([
		['not an IP', () => 'garbage'],
		['a list', () => '1.1.1.1, 2.2.2.2'],
		[
			'a getClientAddress that throws',
			() => {
				throw new Error('x');
			}
		]
	])('%s: no x-forwarded-for at all', async (_n, address) => {
		const f = vi.fn((_u: string | URL, _i: RequestInit) => Promise.resolve(Response.json({})));
		vi.stubGlobal('fetch', f);
		await call(GET, address, SPOOF);
		expect(sentHeaders(lastInit(f))).not.toHaveProperty('x-forwarded-for');
		// SPOOF carries an X-Forwarded-For and the test has no ADDRESS_HEADER: that has its own warning.
		const noHeader = warn.mock.calls.filter((c: unknown[]) =>
			String(c[0]).includes('no X-Forwarded-For sent')
		);
		expect(noHeader).toHaveLength(1);
	});
});

describe('sign-in answers that must not tell accounts apart', () => {
	it('a 423 is the same lockout copy for any email, with the retry-after Go sent', async () => {
		const answers: unknown[] = [];
		for (const email of ['exists@example.com', 'nobody@example.com']) {
			vi.stubGlobal('fetch', () =>
				Promise.resolve(
					new Response('{"error":"account_locked"}', {
						status: 423,
						headers: { 'retry-after': '120', 'content-type': 'application/json' }
					})
				)
			);
			const r = (await (signinActions.default as (e: never) => Promise<unknown>)({
				request: new Request('http://x/', {
					method: 'POST',
					body: new URLSearchParams({ email, password: 'Whatever.123!' })
				}),
				cookies: jar({}),
				url: new URL('http://x/signin')
			} as never)) as { status: number; data: Record<string, unknown> };
			answers.push({ ...r, data: { ...r.data, values: undefined } });
		}
		expect(answers[0]).toEqual(answers[1]);
		expect(answers[0]).toMatchObject({
			status: 423,
			data: { formErrorKey: 'auth.errors.accountLocked', retryAfterSeconds: 120 }
		});
	});
});
