/**
 * The one place a password rule is put into words. The hint under a "new password" field says what the policy that
 * applies to the person says (`capabilities.password_policy` for a signed-in flow); where none is known (reset before
 * sign-in, Register tenant: Go checks the DEFAULT policy there) it says the default.
 *
 * The client validates only what is true for EVERY policy (the length floor and the 1024-byte ceiling, from the
 * generated request schemas): Go checks the tenant's classes, so a web form is never stricter than the server.
 */
import type { Capabilities } from './api';

export type PolicyRules = Pick<
	Capabilities['password_policy'],
	'min_length' | 'requires_uppercase' | 'requires_lowercase' | 'requires_digit' | 'requires_symbol'
>;

/** Go's `DefaultPasswordPolicy()`: 8 characters, all four classes. */
export const DEFAULT_PASSWORD_RULES: PolicyRules = {
	min_length: 8,
	requires_uppercase: true,
	requires_lowercase: true,
	requires_digit: true,
	requires_symbol: true
};

type Translate = (key: string, options?: { values?: Record<string, string | number> }) => string;

export function passwordPolicyHint(policy: PolicyRules | null | undefined, t: Translate): string {
	const rules = policy ?? DEFAULT_PASSWORD_RULES;
	const classes = [
		rules.requires_uppercase && t('form.passwordPolicy.uppercase'),
		rules.requires_lowercase && t('form.passwordPolicy.lowercase'),
		rules.requires_digit && t('form.passwordPolicy.digit'),
		rules.requires_symbol && t('form.passwordPolicy.symbol')
	].filter((c): c is string => typeof c === 'string');
	const min = rules.min_length;
	if (classes.length === 0) return t('form.passwordPolicy.length', { values: { min } });
	const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(classes);
	return t('form.passwordPolicy.withClasses', { values: { min, classes: list } });
}
