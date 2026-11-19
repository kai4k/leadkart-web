// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { passwordErrorKey, RESET_TOKEN_INVALID } from '#lib/server/auth-errors.ts';

describe('passwordErrorKey', () => {
	it('maps password_same_as_current (Go 422) to the new-password field', () => {
		expect(passwordErrorKey(422, 'password_same_as_current')).toEqual({
			field: 'new',
			key: 'auth.resetPassword.errors.same'
		});
	});

	it('maps incorrect_current_password (Go 401) to the current-password field', () => {
		expect(passwordErrorKey(401, 'incorrect_current_password')).toEqual({
			field: 'current',
			key: 'account.security.changePassword.errors.incorrectCurrent'
		});
	});

	it('maps password_breached and invalid_password', () => {
		expect(passwordErrorKey(422, 'password_breached')?.key).toBe(
			'auth.resetPassword.errors.breached'
		);
		expect(passwordErrorKey(400, 'invalid_password')).toEqual({
			field: 'new',
			key: 'auth.resetPassword.errors.weak'
		});
	});

	it('does not read Go codes that never exist (password_same, a bare 422)', () => {
		expect(passwordErrorKey(422, 'password_same')).toBeNull();
		expect(passwordErrorKey(422, undefined)).toBeNull();
	});

	it('returns null for invalid_body and unknown codes (caller shows the generic error)', () => {
		expect(passwordErrorKey(400, 'invalid_body')).toBeNull();
		expect(passwordErrorKey(500, 'internal_error')).toBeNull();
		expect(passwordErrorKey(401, 'invalid_credentials')).toBeNull();
	});

	it('exposes the reset-token code Go sends', () => {
		expect(RESET_TOKEN_INVALID).toBe('reset_token_invalid');
	});
});
