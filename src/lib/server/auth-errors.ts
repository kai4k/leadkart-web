/**
 * One mapping for every Go password error (reset, change, forced change).
 * Codes are Go's `error` values: leadkart-go internal/identity/ports/errcodes.go.
 * `invalid_body` (undecodable JSON) is deliberately not mapped: it is a bug,
 * not something the user can fix, so callers show the generic message.
 */
export const RESET_TOKEN_INVALID = 'reset_token_invalid';

export function passwordErrorKey(
	status: number,
	code: string | undefined
): { field: 'new' | 'current'; key: string } | null {
	if (status === 401 && code === 'incorrect_current_password')
		return { field: 'current', key: 'account.security.changePassword.errors.incorrectCurrent' };
	if (code === 'password_breached')
		return { field: 'new', key: 'auth.resetPassword.errors.breached' };
	if (code === 'password_same_as_current')
		return { field: 'new', key: 'auth.resetPassword.errors.same' };
	if (code === 'invalid_password') return { field: 'new', key: 'auth.resetPassword.errors.weak' };
	return null;
}
