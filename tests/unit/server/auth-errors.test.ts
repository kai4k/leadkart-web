// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { passwordErrorKey, RESET_TOKEN_INVALID } from '#lib/server/auth-errors.ts';

/**
 * Go's password answers (leadkart-go 44ff2b16 internal/identity/ports/http.go: handleChangePassword
 * lines 674-702, the reset handler lines 890-910; codes in errcodes.go) as status + code -> the field
 * and its sentence, per screen. Rule codes of a policy violation travel as field messages and are
 * covered with the actions (password-actions.test.ts).
 */
describe('passwordErrorKey', () => {
	const SAME = { field: 'new', key: 'auth.resetPassword.errors.same' };
	const BREACHED = { field: 'new', key: 'auth.resetPassword.errors.breached' };
	const WEAK = { field: 'new', key: 'auth.resetPassword.errors.weak' };
	const RULES = { field: 'new', key: 'auth.resetPassword.newPasswordHint' };
	const CURRENT = {
		field: 'current',
		key: 'account.security.changePassword.errors.incorrectCurrent'
	};

	it.each([
		// change-password and the forced change
		['change', 401, 'incorrect_current_password', CURRENT],
		['change', 422, 'password_breached', BREACHED],
		['change', 422, 'password_same_as_current', SAME],
		['change', 400, 'invalid_password', WEAK],
		['change', 422, 'password_policy_violation', RULES],
		// reset: the same, except that "same as current" is change-password only (BFF_API_CHANGES row 29)
		['reset', 422, 'password_breached', BREACHED],
		['reset', 422, 'password_same_as_current', null],
		['reset', 400, 'invalid_password', WEAK],
		['reset', 422, 'password_policy_violation', RULES],
		// not a field's fault on either screen: the caller shows a banner
		['change', 400, 'invalid_body', null],
		['reset', 400, 'invalid_body', null],
		['change', 503, 'service_busy', null],
		['reset', 503, 'service_busy', null],
		['change', 429, 'rate_limited', null],
		['change', 403, 'impersonation_not_allowed', null],
		['reset', 400, RESET_TOKEN_INVALID, null],
		['change', 500, 'internal_error', null],
		['change', 401, 'invalid_credentials', null],
		// codes Go never had
		['change', 422, 'password_same', null],
		['reset', 422, undefined, null]
	] as const)('%s: %i %s', (flow, status, code, expected) => {
		expect(passwordErrorKey(status, code, flow)).toEqual(expected);
	});

	it('a caller that names no screen gets the reset mapping (the stricter one: no "same as current")', () => {
		expect(passwordErrorKey(422, 'password_same_as_current')).toBeNull();
		expect(passwordErrorKey(422, 'password_breached')).toEqual(BREACHED);
		expect(passwordErrorKey(401, 'incorrect_current_password')).toEqual(CURRENT);
	});

	it('exposes the reset-token code Go sends', () => {
		expect(RESET_TOKEN_INVALID).toBe('reset_token_invalid');
	});
});
