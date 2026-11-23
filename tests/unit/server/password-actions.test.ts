import { afterEach, describe, expect, it, vi } from 'vitest';
import { actions as resetActions } from '../../../src/routes/(auth)/reset-password/+page.server.ts';
import { actions as mustChangeActions } from '../../../src/routes/(app)/must-change-password/+page.server.ts';
import { actions as securityActions } from '../../../src/routes/(app)/settings/account/security/+page.server.ts';
import { fieldText, readFailure } from '#lib/utils/form-failure.ts';
import en from '../../../src/lib/i18n/locales/en.json';

// These tests are about how Go's answers map to form copy. That the form comes from the page of the
// SAME person and context is the subject of self-service-actions.test.ts, with the real scope code:
// here every form carries a fingerprint (the field is required) and the comparison is stubbed true.
vi.mock('#lib/server/scope-context.ts', () => ({
	pageShowsContext: () => true,
	pageShowsCurrentContext: () => true
}));

/**
 * Go's real envelope: the code is in `error` (leadkart-go 44ff2b16 internal/identity/ports/http.go:1021
 * writeError); a policy violation adds `errors.<field>: [rule codes]` (http.go:408 writePasswordPolicyError).
 */
const goError = (status: number, error: string, errors?: Record<string, string[]>) =>
	Promise.resolve(
		new Response(
			JSON.stringify({
				type: 'x',
				title: 't',
				status,
				error,
				message: '',
				...(errors && { errors })
			}),
			{ status, headers: { 'content-type': 'application/json' } }
		)
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

/** The sentence the form shows under a field: the catalogue through the one reader, as the page does. */
const at = (key: string): string => {
	const v = key
		.split('.')
		.reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
	return typeof v === 'string' ? v : key;
};
const shown = (r: Fail, field: string) => fieldText(readFailure(r.data), field, at);

/** The six rule codes Go has (internal/identity/domain/tenant/settings.go:185-190) and what the person reads. */
const RULES: Array<[string, string]> = [
	['min_length', 'The password is too short.'],
	['max_length', 'The password is too long.'],
	['requires_uppercase', 'Add an uppercase letter.'],
	['requires_lowercase', 'Add a lowercase letter.'],
	['requires_digit', 'Add a digit.'],
	['requires_symbol', 'Add a symbol (a space is not a symbol).']
];

describe('reset-password action: Go codes -> messages', () => {
	const run = (status: number, code: string, errors?: Record<string, string[]>) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(status, code, errors))
		);
		return call(resetActions.default, {
			request: form({ new_password: NEW_PW, confirm: NEW_PW }),
			url: new URL('http://x/reset-password?token=t')
		}).then(asFail);
	};

	// http.go:896: expired, unknown, used, a suspended person's, and (after the 5th refused password,
	// BFF_API_CHANGES row 29) a spent token all answer this one code.
	it('reset_token_invalid (400) -> "This link can no longer be used. Request a new one."', async () => {
		const r = await run(400, 'reset_token_invalid');
		expect(r.status).toBe(400);
		expect(r.data.formErrorKey).toBe('auth.resetPassword.errors.invalidToken');
		expect(at('auth.resetPassword.errors.invalidToken')).toBe(
			'This link can no longer be used. Request a new one.'
		);
	});

	it.each([
		[422, 'password_breached', 'auth.resetPassword.errors.breached'],
		[400, 'invalid_password', 'auth.resetPassword.errors.weak']
	])('%i %s -> new_password field', async (status, code, key) => {
		const r = await run(status, code);
		expect(r.status).toBe(status);
		expect(r.data.fieldKeys).toEqual({ new_password: key });
	});

	it('422 password_policy_violation -> the new-password field says the rules are not met', async () => {
		const r = await run(422, 'password_policy_violation', {
			new_password: ['min_length', 'requires_symbol']
		});
		expect(r.status).toBe(422);
		expect(shown(r, 'new_password')).toBe('The new password does not meet the password rules.');
	});

	// Row 29: "Resetting to the current password is now accepted (`password_same_as_current` is
	// change-password only). Remove any handling from the reset screen."
	it('password_same_as_current is not a reset answer: no field is blamed for it', async () => {
		const r = await run(422, 'password_same_as_current');
		expect(r.data.fieldKeys).toEqual({});
		expect(r.data.fieldMessages).toEqual({});
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
	const run = (
		status: number,
		code: string,
		errors?: Record<string, string[]>,
		body: Record<string, string> = fields
	) => {
		const fetchFn = vi.fn(() => goError(status, code, errors));
		vi.stubGlobal('fetch', fetchFn);
		return call(action, {
			request: form(body),
			cookies: cookies(),
			url: new URL('http://x/')
		}).then((r) => Object.assign(asFail(r), { fetchFn }));
	};

	// http.go:674-702 handleChangePassword
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

	// http.go:675 -> writePasswordPolicyError (http.go:408): 422 with `errors.new_password: [rule codes]`
	it.each(RULES)(
		'422 password_policy_violation [%s] -> "%s" under the new password',
		async (rule, sentence) => {
			const r = await run(422, 'password_policy_violation', { new_password: [rule] });
			expect(r.status).toBe(422);
			expect(r.data.fieldMessages).toEqual({ new: rule });
			expect(r.data.fieldKeys).toEqual({});
			expect(r.data.formErrorKey).toBeNull();
			expect(shown(r, 'new')).toBe(sentence);
			expect(sentence.endsWith('.')).toBe(true);
		}
	);

	it('several unmet rules: the first one Go names is the message (the hint lists the whole policy)', async () => {
		const r = await run(422, 'password_policy_violation', {
			new_password: ['requires_uppercase', 'requires_digit', 'requires_symbol']
		});
		expect(r.data.fieldMessages).toEqual({ new: 'requires_uppercase' });
		expect(shown(r, 'new')).toBe('Add an uppercase letter.');
	});

	it('a rule code this side does not know never shows the code or Go text', async () => {
		const r = await run(422, 'password_policy_violation', { new_password: ['requires_emoji'] });
		expect(shown(r, 'new')).toBe(en.form.invalid);
	});

	it('a policy violation that names no rule still marks the new password', async () => {
		const r = await run(422, 'password_policy_violation');
		expect(shown(r, 'new')).toBe('The new password does not meet the password rules.');
		expect(r.data.formErrorKey).toBeNull();
	});

	// http.go:438 writePasswordWorkRefusal: 503 service_busy + Retry-After (BFF_API_CHANGES rows 13, 24)
	it('503 service_busy -> a calm banner, no field blamed, the form kept', async () => {
		const r = await run(503, 'service_busy');
		expect(r.status).toBe(503);
		expect(r.data.formErrorKey).toBe('errors.code.service_busy');
		expect(at('errors.code.service_busy')).toBe('The service is busy. Try again in a moment.');
		expect(r.data.fieldKeys).toEqual({});
	});

	// authn/session_policy.go:45 (row 24: "Not allowed in an impersonation session")
	it('403 impersonation_not_allowed -> its own line, not "no permission"', async () => {
		const r = await run(403, 'impersonation_not_allowed');
		expect([r.status, r.data.formErrorKey]).toEqual([403, 'errors.code.impersonation_not_allowed']);
	});

	it('invalid_body -> generic error', async () => {
		const r = await run(400, 'invalid_body');
		expect(r.data.formErrorKey).toBe('auth.errors.unexpected');
	});

	it('an empty current password is asked for in a sentence (never the field label), Go is not called', async () => {
		const r = await run(204, 'unused', undefined, { ...fields, current_password: '' });
		expect(r.status).toBe(422);
		expect(r.data.fieldKeys).toEqual({ current: 'auth.errors.currentPasswordRequired' });
		expect(shown(r, 'current')).toBe('Enter your current password.');
		expect(shown(r, 'current')).not.toBe(en.account.security.changePassword.currentPassword);
		expect(r.fetchFn).not.toHaveBeenCalled();
	});
});
