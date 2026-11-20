import { afterEach, describe, expect, it, vi } from 'vitest';
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

/** Go's real envelope: the code is in `error` (identity/ports/http.go writeError). */
const goError = (status: number, error: string) =>
	Promise.resolve(
		new Response(JSON.stringify({ type: 'x', title: 't', status, error, message: '' }), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	);

afterEach(() => vi.unstubAllGlobals());

const cookies = () => {
	const store = new Map([['lk_access', 'tok']]);
	return {
		get: (n: string) => store.get(n),
		set: vi.fn(),
		delete: vi.fn(),
		getAll: () => [],
		serialize: () => ''
	} as never;
};

const form = (fields: Record<string, string>) =>
	new Request('http://x/', {
		method: 'POST',
		body: new URLSearchParams({ scope_context: 'page-fingerprint', ...fields })
	});

type Fail = { status: number; data: Record<string, unknown> };
const asFail = (r: unknown) => r as Fail;
const call = (fn: unknown, event: object) => (fn as (e: never) => Promise<unknown>)(event as never);

const NEW_PW = 'Sh1ny.NewOne.Strong!';

describe('reset-password action: Go codes -> messages', () => {
	const run = (status: number, code: string) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(status, code))
		);
		return call(resetActions.default, {
			request: form({ new_password: NEW_PW, confirm: NEW_PW }),
			url: new URL('http://x/reset-password?token=t')
		}).then(asFail);
	};

	it('reset_token_invalid (400) -> invalid/expired link banner', async () => {
		const r = await run(400, 'reset_token_invalid');
		expect(r.status).toBe(400);
		expect(r.data.formErrorKey).toBe('auth.resetPassword.errors.invalidToken');
	});

	it.each([
		[422, 'password_breached', 'auth.resetPassword.errors.breached'],
		[422, 'password_same_as_current', 'auth.resetPassword.errors.same'],
		[400, 'invalid_password', 'auth.resetPassword.errors.weak']
	])('%i %s -> new_password field', async (status, code, key) => {
		const r = await run(status, code);
		expect(r.status).toBe(status);
		expect(r.data.fieldKeys).toEqual({ new_password: key });
	});

	it('invalid_body -> generic error, no field', async () => {
		const r = await run(400, 'invalid_body');
		expect(r.data.formErrorKey).toBe('auth.errors.unexpected');
		expect(r.data.fieldKeys).toEqual({});
	});
});

describe.each([
	[
		'must-change-password',
		mustChangeActions.default,
		{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm: NEW_PW }
	],
	[
		'security changePassword',
		securityActions.changePassword,
		{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm_password: NEW_PW }
	]
])('%s action: Go codes -> messages', (_name, action, fields) => {
	const run = (status: number, code: string) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(status, code))
		);
		return call(action, {
			request: form(fields),
			cookies: cookies(),
			url: new URL('http://x/')
		}).then(asFail);
	};

	it.each([
		[
			401,
			'incorrect_current_password',
			{ current: 'account.security.changePassword.errors.incorrectCurrent' }
		],
		[422, 'password_breached', { new: 'auth.resetPassword.errors.breached' }],
		[422, 'password_same_as_current', { new: 'auth.resetPassword.errors.same' }],
		[400, 'invalid_password', { new: 'auth.resetPassword.errors.weak' }]
	])('%i %s -> field message', async (status, code, fieldKeys) => {
		const r = await run(status, code);
		expect(r.status).toBe(status);
		expect(r.data.fieldKeys).toEqual(fieldKeys);
	});

	it('invalid_body -> generic error', async () => {
		const r = await run(400, 'invalid_body');
		expect(r.data.formErrorKey).toBe('auth.errors.unexpected');
	});
});
