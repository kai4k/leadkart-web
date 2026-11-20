import { afterEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../../../src/hooks.server.ts';
import { actions as signinActions } from '../../../src/routes/(auth)/signin/+page.server.ts';
import { actions as forgotActions } from '../../../src/routes/(auth)/forgot-password/+page.server.ts';
import { actions as resetActions } from '../../../src/routes/(auth)/reset-password/+page.server.ts';
import { actions as mustChangeActions } from '../../../src/routes/(app)/must-change-password/+page.server.ts';
import { actions as securityActions } from '../../../src/routes/(app)/settings/account/security/+page.server.ts';

// These tests are about how Go's answers map to form copy. That the form comes from the page of the
// SAME person and context is the subject of self-service-actions.test.ts, with the real scope code:
// here every form carries a fingerprint (the field is required) and the comparison is stubbed true.
vi.mock('#lib/server/scope-context.ts', () => ({
	pageShowsContext: () => true,
	pageShowsCurrentContext: () => true
}));

// Kit's `sequence` needs a live request store; run the handles in order instead.
vi.mock('@sveltejs/kit/hooks', () => ({
	sequence:
		(...handles: Array<(i: { event: unknown; resolve: (e: unknown) => unknown }) => unknown>) =>
		({ event, resolve }: { event: unknown; resolve: (e: unknown) => unknown }) => {
			const step = (i: number, ev: unknown): unknown =>
				i === handles.length
					? resolve(ev)
					: handles[i]({ event: ev, resolve: (e) => step(i + 1, e ?? ev) });
			return step(0, event);
		}
}));

afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});
const goError = (status: number, error: string) =>
	json(status, { type: 'x', title: 't', status, error, message: '' });

function jar(values: Record<string, string> = {}) {
	const store = new Map(Object.entries(values));
	return {
		get: (n: string) => store.get(n),
		set: vi.fn((n: string, v: string) => void store.set(n, v)),
		delete: vi.fn((n: string) => void store.delete(n)),
		getAll: () => [],
		serialize: () => ''
	};
}
const form = (fields: Record<string, string>) =>
	new Request('http://x/', {
		method: 'POST',
		body: new URLSearchParams({ scope_context: 'page-fingerprint', ...fields })
	});
type Fail = { status: number; data: Record<string, unknown> };
const run = (fn: unknown, event: object) =>
	(fn as (e: never) => Promise<unknown>)(event as never) as Promise<unknown>;
const asFail = (r: unknown) => r as Fail;
const stubFetch = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
	const fn = vi.fn(impl);
	vi.stubGlobal('fetch', fn);
	return fn;
};
const sentBody = (fn: ReturnType<typeof stubFetch>) =>
	JSON.parse(String(fn.mock.calls[0][1].body)) as Record<string, unknown>;
const redirected = async (p: Promise<unknown>) => {
	try {
		await p;
	} catch (e) {
		return e as { status: number; location: string };
	}
	throw new Error('expected a redirect');
};

const TOKENS = { access_token: 'a', refresh_token: 'r' };
const NEW_PW = 'Sh1ny.NewOne.Strong!';

describe('signin action', () => {
	const signin = (email = 'u@x.co', url = 'http://x/signin') =>
		run(signinActions.default, {
			request: form({ email, password: 'pw' }),
			cookies: jar(),
			url: new URL(url)
		});

	it('423 -> account locked with the Retry-After seconds', async () => {
		stubFetch(() =>
			Promise.resolve(json(423, { error: 'account_locked' }, { 'retry-after': '90' }))
		);
		const r = asFail(await signin());
		expect(r.status).toBe(423);
		expect(r.data.formErrorKey).toBe('auth.errors.accountLocked');
		expect(r.data.retryAfterSeconds).toBe(90);
	});

	it('429 -> rate limited, 401 -> one invalid-credentials copy', async () => {
		stubFetch(() => Promise.resolve(goError(429, 'rate_limited')));
		expect(asFail(await signin()).data.formErrorKey).toBe('auth.errors.rateLimited');
		stubFetch(() => Promise.resolve(goError(401, 'invalid_credentials')));
		const r = asFail(await signin());
		expect(r.status).toBe(401);
		expect(r.data.formErrorKey).toBe('auth.errors.invalidCredentials');
	});

	it.each([502, 504])('Go %i -> same status, generic copy', async (status) => {
		stubFetch(() => Promise.resolve(new Response('', { status })));
		const r = asFail(await signin());
		expect(r.status).toBe(status);
		expect(r.data.formErrorKey).toBe('auth.errors.unexpected');
	});

	it('transport failure -> upstream unavailable; timeout -> 504', async () => {
		stubFetch(() => Promise.reject(new TypeError('fetch failed')));
		const down = asFail(await signin());
		expect([down.status, down.data.formErrorKey]).toEqual([502, 'auth.errors.upstreamUnavailable']);
		stubFetch(() => Promise.reject(new DOMException('t', 'TimeoutError')));
		expect(asFail(await signin()).status).toBe(504);
	});

	it('a 200 without a usable token pair is a 502, no cookie written', async () => {
		stubFetch(() => Promise.resolve(json(200, { access_token: 'a' })));
		const cookies = jar();
		const r = asFail(
			await run(signinActions.default, {
				request: form({ email: 'u@x.co', password: 'pw' }),
				cookies,
				url: new URL('http://x/signin')
			})
		);
		expect(r.status).toBe(502);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('sends a trimmed address Go accepts but a strict check would not (josé@example.com)', async () => {
		const f = stubFetch(() => Promise.resolve(goError(401, 'invalid_credentials')));
		await signin('  josé@example.com ');
		expect(sentBody(f).email).toBe('josé@example.com');
	});

	it('a malformed address is sent to Go and answered like an unknown one (no extra tell)', async () => {
		const f = stubFetch(() => Promise.resolve(goError(401, 'invalid_credentials')));
		const r = asFail(await signin('not-an-email'));
		expect(f).toHaveBeenCalledTimes(1);
		expect(r.data.formErrorKey).toBe('auth.errors.invalidCredentials');
	});

	it('next survives a forced password change', async () => {
		stubFetch(() => Promise.resolve(json(200, { ...TOKENS, must_change_password: true })));
		const r = await redirected(signin('u@x.co', 'http://x/signin?next=%2Fleads%2F42'));
		expect(r.status).toBe(303);
		expect(r.location).toBe('/must-change-password?next=%2Fleads%2F42');
	});

	it('without next, a forced change goes to the bare page; a normal login goes to next', async () => {
		stubFetch(() => Promise.resolve(json(200, { ...TOKENS, must_change_password: true })));
		expect((await redirected(signin())).location).toBe('/must-change-password');
		stubFetch(() => Promise.resolve(json(200, TOKENS)));
		expect((await redirected(signin('u@x.co', 'http://x/signin?next=%2Fleads'))).location).toBe(
			'/leads'
		);
	});
});

describe('forgot-password action', () => {
	const forgot = (email: string) => run(forgotActions.default, { request: form({ email }) });

	it('sends a trimmed, Go-valid address and answers submitted', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		expect(await forgot(' josé@example.com ')).toEqual({ submitted: true });
		expect(sentBody(f).email).toBe('josé@example.com');
	});

	it('a malformed address is not rejected (the answer is the same as for an unknown one)', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		expect(await forgot('not-an-email')).toEqual({ submitted: true });
		expect(f).toHaveBeenCalledTimes(1);
	});

	it('empty -> 422 and Go is not called', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		expect(asFail(await forgot('  ')).status).toBe(422);
		expect(f).not.toHaveBeenCalled();
	});

	it('429 -> rate limited; 5xx -> generic; transport -> upstream unavailable', async () => {
		stubFetch(() => Promise.resolve(goError(429, 'rate_limited')));
		expect(asFail(await forgot('a@b.co')).data.formErrorKey).toBe('auth.errors.rateLimited');
		stubFetch(() => Promise.resolve(new Response('', { status: 503 })));
		const r = asFail(await forgot('a@b.co'));
		expect([r.status, r.data.formErrorKey]).toEqual([503, 'auth.errors.unexpected']);
		stubFetch(() => Promise.reject(new TypeError('fetch failed')));
		expect(asFail(await forgot('a@b.co')).data.formErrorKey).toBe(
			'auth.errors.upstreamUnavailable'
		);
	});
});

describe('reset-password action outages read like sign-in', () => {
	const reset = () =>
		run(resetActions.default, {
			request: form({ new_password: NEW_PW, confirm: NEW_PW }),
			url: new URL('http://x/reset-password?token=t')
		});

	it('transport failure -> upstream unavailable (not "unexpected")', async () => {
		stubFetch(() => Promise.reject(new TypeError('fetch failed')));
		const r = asFail(await reset());
		expect([r.status, r.data.formErrorKey]).toEqual([502, 'auth.errors.upstreamUnavailable']);
	});

	it('429 -> rate limited', async () => {
		stubFetch(() => Promise.resolve(goError(429, 'rate_limited')));
		const r = asFail(await reset());
		expect([r.status, r.data.formErrorKey]).toEqual([429, 'auth.errors.rateLimited']);
	});
});

describe.each([
	[
		'must-change-password',
		mustChangeActions.default,
		{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm: NEW_PW },
		{ confirm: 'x' }
	],
	[
		'security changePassword',
		securityActions.changePassword,
		{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm_password: NEW_PW },
		{ confirm_password: 'x' }
	]
])('%s action outages', (_name, action, fields, mismatch) => {
	const submit = (cookies = jar({ lk_access: 'tok' }), body = fields) =>
		run(action, { request: form(body), cookies, url: new URL('http://x/') });

	it('transport failure is a form error, not a 500 page', async () => {
		stubFetch(() => Promise.reject(new TypeError('fetch failed')));
		const r = asFail(await submit());
		expect([r.status, r.data.formErrorKey]).toEqual([502, 'auth.errors.upstreamUnavailable']);
	});

	it('a refresh outage (access cookie gone, refresh cookie kept) keeps the form: 503, not /signin', async () => {
		stubFetch(() => Promise.resolve(new Response('', { status: 503 })));
		const r = asFail(await submit(jar({ lk_refresh: 'rt-outage' })));
		expect([r.status, r.data.formErrorKey]).toEqual([503, 'auth.errors.upstreamUnavailable']);
	});

	it('429 -> rate limited', async () => {
		stubFetch(() => Promise.resolve(goError(429, 'rate_limited')));
		const r = asFail(await submit());
		expect([r.status, r.data.formErrorKey]).toEqual([429, 'auth.errors.rateLimited']);
	});

	it('mismatched confirmation is caught before Go is called', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		const r = asFail(await submit(jar({ lk_access: 'tok' }), { ...fields, ...mismatch }));
		expect(r.status).toBe(422);
		expect(r.data.fieldKeys).toEqual({
			confirm: 'account.security.changePassword.errors.mismatch'
		});
		expect(f).not.toHaveBeenCalled();
	});
});

describe('security changeEmail action', () => {
	const change = (email: string, cookies = jar({ lk_access: 'tok' })) =>
		run(securityActions.changeEmail, { request: form({ new_email: email }), cookies });

	it('sends a trimmed address Go accepts (josé@example.com)', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		const r = (await change(' josé@example.com ')) as { submitted: boolean };
		expect(r.submitted).toBe(true);
		expect(sentBody(f).new_email).toBe('josé@example.com');
	});

	it('Go 400 invalid_email -> the field message', async () => {
		stubFetch(() => Promise.resolve(goError(400, 'invalid_email')));
		const r = asFail(await change('a@b.co'));
		expect(r.status).toBe(400);
		expect(r.data.fieldKeys).toEqual({ email: 'auth.changeEmail.errors.invalid' });
	});

	it('empty or shapeless input -> 422, Go not called', async () => {
		const f = stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
		expect(asFail(await change('')).status).toBe(422);
		expect(asFail(await change('nope')).status).toBe(422);
		expect(f).not.toHaveBeenCalled();
	});

	it('transport failure -> form error, not a 500 page', async () => {
		stubFetch(() => Promise.reject(new TypeError('fetch failed')));
		const r = asFail(await change('a@b.co'));
		expect([r.status, r.data.formErrorKey]).toEqual([502, 'auth.errors.upstreamUnavailable']);
	});
});

describe('an action reached with an expired access cookie goes through the hook refresh', () => {
	it('the hook renews the cookies first, so the action calls Go with the new Bearer', async () => {
		const cookies = jar({ lk_refresh: 'rt-hook', lk_csrf: 'c' });
		const calls: Array<{ url: string; auth?: string }> = [];
		stubFetch((url, init) => {
			const headers = (init.headers ?? {}) as Record<string, string>;
			calls.push({ url, auth: headers.authorization });
			return Promise.resolve(
				url.endsWith('/auth/refresh')
					? json(200, { access_token: 'fresh-access', refresh_token: 'rt-next' })
					: new Response(null, { status: 204 })
			);
		});
		const event = {
			cookies,
			url: new URL('http://x/settings/account/security'),
			locals: {} as Record<string, unknown>,
			request: form({ new_email: 'a@b.co' })
		};
		const res = await handle({
			event: event as never,
			resolve: async () => {
				await run(securityActions.changeEmail, event);
				return new Response('ok');
			}
		});
		expect(res.status).toBe(200);
		expect(event.locals.refreshOutcome).toBe('renewed');
		expect(calls.map((c) => c.url.split('/api')[1])).toEqual([
			'/v1/auth/refresh',
			'/v1/auth/request-email-change'
		]);
		expect(calls[1].auth).toBe('Bearer fresh-access');
	});
});

describe('pre-auth input maxima (the body limit is 512 KB; Go hashes what it is given)', () => {
	const tooLong = 'p'.repeat(1025);
	const noGo = () => stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));

	it('signin: a password over 1024 characters is refused as a field key, Go is not called', async () => {
		const f = noGo();
		const r = asFail(
			await run(signinActions.default, {
				request: form({ email: 'u@x.co', password: tooLong }),
				cookies: jar(),
				url: new URL('http://x/signin')
			})
		);
		expect([r.status, r.data.fieldKeys]).toEqual([
			422,
			{ password: 'auth.errors.passwordTooLong' }
		]);
		expect(f).not.toHaveBeenCalled();
	});

	it('signin: empty fields are required keys; the email is echoed back', async () => {
		const f = noGo();
		const r = asFail(
			await run(signinActions.default, {
				request: form({ email: ' ', password: '' }),
				cookies: jar(),
				url: new URL('http://x/signin')
			})
		);
		expect(r.data.fieldKeys).toEqual({
			email: 'auth.errors.emailRequired',
			password: 'auth.errors.passwordRequired'
		});
		expect(r.data.values).toEqual({ email: ' ' });
		expect(f).not.toHaveBeenCalled();
	});

	it('forgot-password: an email over 254 characters is a key, Go is not called', async () => {
		const f = noGo();
		const r = asFail(
			await run(forgotActions.default, { request: form({ email: 'a'.repeat(255) }) })
		);
		expect(r.data.fieldKeys).toEqual({ email: 'auth.errors.emailTooLong' });
		expect(f).not.toHaveBeenCalled();
	});

	it('reset-password: a token over 512 characters is the invalid-link banner, Go is not called', async () => {
		const f = noGo();
		const r = asFail(
			await run(resetActions.default, {
				request: form({ new_password: NEW_PW, confirm: NEW_PW }),
				url: new URL(`http://x/reset-password?token=${'t'.repeat(513)}`)
			})
		);
		expect([r.status, r.data.formErrorKey]).toEqual([
			400,
			'auth.resetPassword.errors.invalidToken'
		]);
		expect(f).not.toHaveBeenCalled();
	});

	it('reset-password: a new password over 1024 characters is a key, Go is not called', async () => {
		const f = noGo();
		const r = asFail(
			await run(resetActions.default, {
				request: form({ new_password: tooLong, confirm: tooLong }),
				url: new URL('http://x/reset-password?token=t')
			})
		);
		expect(r.data.fieldKeys).toEqual({ new_password: 'auth.errors.passwordTooLong' });
		expect(f).not.toHaveBeenCalled();
	});

	it('change-password (forced and settings): over 1024 is a key, Go is not called', async () => {
		const f = noGo();
		const r = asFail(
			await run(mustChangeActions.default, {
				request: form({ current_password: tooLong, new_password: NEW_PW, confirm: NEW_PW }),
				cookies: jar({ lk_access: 'tok' }),
				url: new URL('http://x/must-change-password')
			})
		);
		expect(r.data.fieldKeys).toEqual({ current: 'auth.errors.passwordTooLong' });
		expect(f).not.toHaveBeenCalled();
	});
});

describe('every form action fails in ONE shape: { values, fieldKeys, fieldMessages, formErrorKey }', () => {
	const SHAPE = ['fieldKeys', 'fieldMessages', 'formErrorKey', 'values'];
	const keys = (r: unknown) =>
		Object.keys(asFail(r).data)
			.filter((k) => k !== 'which' && k !== 'retryAfterSeconds')
			.sort();

	it('sign-in, forgot, reset, forced change, settings password and email', async () => {
		stubFetch(() => Promise.resolve(goError(401, 'invalid_credentials')));
		const results = [
			await run(signinActions.default, {
				request: form({ email: 'u@x.co', password: 'pw' }),
				cookies: jar(),
				url: new URL('http://x/signin')
			}),
			await run(forgotActions.default, { request: form({ email: ' ' }) }),
			await run(resetActions.default, {
				request: form({ new_password: 'a', confirm: 'b' }),
				url: new URL('http://x/reset-password?token=t')
			}),
			await run(mustChangeActions.default, {
				request: form({ current_password: 'a', new_password: 'b', confirm: 'c' }),
				cookies: jar({ lk_access: 'tok' }),
				url: new URL('http://x/must-change-password')
			}),
			await run(securityActions.changePassword, {
				request: form({ current_password: 'a', new_password: 'b', confirm_password: 'c' }),
				cookies: jar({ lk_access: 'tok' })
			}),
			await run(securityActions.changeEmail, {
				request: form({ new_email: 'nope' }),
				cookies: jar({ lk_access: 'tok' })
			})
		];
		for (const r of results) expect(keys(r)).toEqual(SHAPE);
	});
});
