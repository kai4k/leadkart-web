import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import {
	DEFAULT_PASSWORD_RULES,
	passwordPolicyHint,
	rulesOfTenantPolicy,
	unmetPasswordRules
} from '#lib/features/auth/password-policy.ts';

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

describe('the unmet rules of a password (Go tenant.PasswordPolicy.Check, in its order)', () => {
	it('names every failed rule, in the server order', () => {
		expect(unmetPasswordRules('abc', DEFAULT_PASSWORD_RULES)).toEqual([
			'min_length',
			'requires_uppercase',
			'requires_digit',
			'requires_symbol'
		]);
	});
	it('a password that satisfies the default has none', () => {
		expect(unmetPasswordRules('Str0ng-Passw0rd!', DEFAULT_PASSWORD_RULES)).toEqual([]);
	});
	it('a space is not a symbol; length counts characters, not bytes', () => {
		expect(unmetPasswordRules('Abcdefg1 ', DEFAULT_PASSWORD_RULES)).toEqual(['requires_symbol']);
		expect(unmetPasswordRules('Aé1!éééé', DEFAULT_PASSWORD_RULES)).toEqual([]);
	});
	it('only the classes the policy requires are checked', () => {
		expect(
			unmetPasswordRules('abcdefgh', {
				...DEFAULT_PASSWORD_RULES,
				requires_uppercase: false,
				requires_digit: false,
				requires_symbol: false
			})
		).toEqual([]);
	});
});

describe('a tenant read carries its policy under other names', () => {
	it('maps require_* to requires_*', () => {
		expect(
			rulesOfTenantPolicy({
				min_length: 9,
				require_uppercase: true,
				require_lowercase: false,
				require_digit: true,
				require_symbol: false
			})
		).toEqual({
			min_length: 9,
			requires_uppercase: true,
			requires_lowercase: false,
			requires_digit: true,
			requires_symbol: false
		});
	});
});
