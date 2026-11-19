/**
 * One mapping for every Go password error (reset, change, forced change).
 * Codes are Go's `error` values: leadkart-go internal/identity/ports/errcodes.go.
 * `invalid_body` (undecodable JSON) is deliberately not mapped: it is a bug,
 * not something the user can fix, so callers show the generic message.
 */
import type { Cookies } from '@sveltejs/kit';
import { changePasswordSchema } from '#lib/features/auth/schemas.ts';
import { goErrorStatus, goFetch, readGoError } from './go.ts';
import { callGoForAction, goFailureKey } from './form-action.ts';

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

export type PasswordFormFailure = {
	status: number;
	body: {
		fieldKeys?: Partial<Record<'current' | 'new' | 'confirm', string>>;
		formErrorKey?: string;
	};
};

/**
 * The one change-password action body (forced change and settings): check the confirmation,
 * validate, call Go, map its answer. Each action adds only its own field names and what happens
 * on success. A redirect from goFetch (session over) propagates; every other failure is a form
 * error so the typed password survives.
 */
export async function changePasswordViaGo(
	cookies: Cookies,
	input: { current: string; next: string; confirm: string }
): Promise<{ ok: true } | ({ ok: false } & PasswordFormFailure)> {
	if (input.next !== input.confirm) {
		return {
			ok: false,
			status: 422,
			body: { fieldKeys: { confirm: 'account.security.changePassword.errors.mismatch' } }
		};
	}

	const parsed = changePasswordSchema.safeParse({
		current_password: input.current,
		new_password: input.next
	});
	if (!parsed.success) {
		const flat = parsed.error.flatten().fieldErrors;
		return {
			ok: false,
			status: 422,
			body: {
				fieldKeys: {
					current: flat.current_password?.[0]
						? 'account.security.changePassword.currentPassword'
						: undefined,
					new: flat.new_password?.[0]
						? 'account.security.changePassword.newPasswordHint'
						: undefined
				}
			}
		};
	}

	// Any 401 goFetch returns here is a wrong current password (an expiry 401 is refreshed).
	const call = await callGoForAction(() =>
		goFetch(cookies, '/v1/auth/change-password', {
			method: 'POST',
			body: JSON.stringify(parsed.data),
			scoped: false
		})
	);
	if (!call.ok) return { ok: false, status: call.status, body: { formErrorKey: call.key } };
	const resp = call.resp;
	if (resp.ok) return { ok: true };

	const mapped = passwordErrorKey(resp.status, (await readGoError(resp)).error);
	if (mapped) {
		return { ok: false, status: resp.status, body: { fieldKeys: { [mapped.field]: mapped.key } } };
	}
	return {
		ok: false,
		status: goErrorStatus(resp),
		body: { formErrorKey: goFailureKey(resp.status) }
	};
}
