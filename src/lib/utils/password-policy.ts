/**
 * The one place a password rule is put into words. The hint under a "new password" field says what the policy that
 * applies to the person says (`capabilities.password_policy` for a signed-in flow); where none is known (reset before
 * sign-in, Register tenant: Go checks the DEFAULT policy there) it says the default.
 *
 * The client validates only what is true for EVERY policy (the length floor and the 1024-byte ceiling, from the
 * generated request schemas): Go checks the tenant's classes, so a web form is never stricter than the server.
 */
export type PolicyRules = {
	min_length: number;
	requires_uppercase: boolean;
	requires_lowercase: boolean;
	requires_digit: boolean;
	requires_symbol: boolean;
};

/** Go's `DefaultPasswordPolicy()`: 8 characters, all four classes. */
export const DEFAULT_PASSWORD_RULES: PolicyRules = {
	min_length: 8,
	requires_uppercase: true,
	requires_lowercase: true,
	requires_digit: true,
	requires_symbol: true
};

/** A tenant read carries its policy as `require_*` (the settings shape); the hint speaks `requires_*` (capabilities). */
export function rulesOfTenantPolicy(p: {
	min_length: number;
	require_uppercase: boolean;
	require_lowercase: boolean;
	require_digit: boolean;
	require_symbol: boolean;
}): PolicyRules {
	return {
		min_length: p.min_length,
		requires_uppercase: p.require_uppercase,
		requires_lowercase: p.require_lowercase,
		requires_digit: p.require_digit,
		requires_symbol: p.require_symbol
	};
}

/**
 * The rule codes a password fails, in the order Go reports them (tenant `PasswordPolicy.Check`: length in characters,
 * then uppercase, lowercase, digit, symbol; a symbol is Unicode punctuation or a symbol, a space is none). ONLY for a
 * form where the policy is known to be exactly this one (Register tenant: Go always checks the default there).
 */
export function unmetPasswordRules(password: string, rules: PolicyRules): string[] {
	const unmet: string[] = [];
	if ([...password].length < rules.min_length) unmet.push('min_length');
	if (rules.requires_uppercase && !/\p{Lu}/u.test(password)) unmet.push('requires_uppercase');
	if (rules.requires_lowercase && !/\p{Ll}/u.test(password)) unmet.push('requires_lowercase');
	if (rules.requires_digit && !/\p{Nd}/u.test(password)) unmet.push('requires_digit');
	if (rules.requires_symbol && !/[\p{P}\p{S}]/u.test(password)) unmet.push('requires_symbol');
	return unmet;
}

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
