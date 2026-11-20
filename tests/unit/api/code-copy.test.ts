/**
 * ONE table maps a Go (or BFF) error code to an i18n key. The client describer (toasts, banners) and
 * the server-action failure helper both read it, so a form that posts through a server action tells
 * the user the same thing as one that posts through the API client. Status-class keys stay the
 * fallback for a code the table does not know. No text here is Go's.
 */
import { describe, expect, it } from 'vitest';
import en from '#lib/i18n/locales/en.json';
import hi from '#lib/i18n/locales/hi.json';
import { ApiError, describeError } from '#lib/api/errors.ts';
import { GO_CODE_KEYS, goCodeKey } from '#lib/api/code-copy.ts';
import { goFailureKey } from '#lib/server/form-action.ts';

const dig = (tree: unknown, key: string): unknown =>
	key
		.split('.')
		.reduce<unknown>((n, part) => (n as Record<string, unknown> | undefined)?.[part], tree);

describe('the code table', () => {
	it('has an English and a Hindi line for every key, none of them empty', () => {
		expect(GO_CODE_KEYS.size).toBeGreaterThan(25);
		for (const [code, key] of GO_CODE_KEYS) {
			for (const [name, locale] of [
				['en', en],
				['hi', hi]
			] as const) {
				const text = dig(locale, key);
				expect(typeof text, `${name} ${code}`).toBe('string');
				expect((text as string).trim().length, `${name} ${code}`).toBeGreaterThan(0);
			}
		}
	});

	it('knows the codes this round brings and role_name_taken', () => {
		for (const code of [
			'ownership_authority_required',
			'role_level_breaks_reporting',
			'person_memberships_changing',
			'role_name_taken',
			'insufficient_rank',
			'grant_exceeds_authority',
			'impersonation_not_allowed'
		]) {
			expect(goCodeKey(code), code).toBeDefined();
		}
		expect(goCodeKey('some_new_code')).toBeUndefined();
	});

	it('the server helper and the client describer say the same thing for a code', () => {
		for (const code of ['insufficient_rank', 'role_name_taken', 'grant_exceeds_authority']) {
			const key = goFailureKey(403, code);
			const err = ApiError.fromResponse(new Response(null, { status: 403 }), { error: code });
			expect(describeError(err)).toBe(dig(en, key));
		}
	});

	it('an unknown code falls back to its status class (never Go text)', () => {
		expect(goFailureKey(403, 'some_new_code')).toBe('auth.errors.forbidden');
		expect(goFailureKey(409, 'some_new_code')).toBe('auth.errors.conflict');
		expect(goFailureKey(403)).toBe('auth.errors.forbidden');
		expect(goFailureKey(429, 'insufficient_rank')).toBe('auth.errors.rateLimited');
	});
});
