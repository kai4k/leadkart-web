import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { DEFAULT_PASSWORD_RULES, passwordPolicyHint } from '#lib/features/auth/password-policy.ts';

const say = (p: Parameters<typeof passwordPolicyHint>[0]) =>
	passwordPolicyHint(p, (k, o) => get(_)(k, o));

describe('the one password hint', () => {
	it('the default (Go: 8 characters, all four classes)', () => {
		expect(say(null)).toBe(
			'At least 8 characters, with an uppercase letter, a lowercase letter, a digit, and a symbol.'
		);
		expect(say(DEFAULT_PASSWORD_RULES)).toBe(say(undefined));
	});
	it('a tenant policy says what it says', () => {
		expect(
			say({
				min_length: 12,
				requires_uppercase: true,
				requires_lowercase: false,
				requires_digit: true,
				requires_symbol: false
			})
		).toBe('At least 12 characters, with an uppercase letter and a digit.');
	});
	it('a policy with no classes is the length alone', () => {
		expect(
			say({
				min_length: 10,
				requires_uppercase: false,
				requires_lowercase: false,
				requires_digit: false,
				requires_symbol: false
			})
		).toBe('At least 10 characters.');
	});
});
