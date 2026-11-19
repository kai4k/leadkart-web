/**
 * One mapping for every Go password error (reset, change, forced change).
 * Codes are Go's `error` values: leadkart-go internal/identity/ports/errcodes.go.
 * `invalid_body` (undecodable JSON) is deliberately not mapped: it is a bug,
 * not something the user can fix, so callers show the generic message.
 */
import { isHttpError, isRedirect, type Cookies } from '@sveltejs/kit';
import { changePasswordSchema } from '#lib/features/auth/schemas.ts';
import { goErrorStatus, goFetch, readGoError } from './go.ts';
import { isUpstreamTimeout } from './proxy.ts';

export const RESET_TOKEN_INVALID = 'reset_token_invalid';

/**
 * One reading of "the call to Go did not come back" for every pre-login / password action: a
 * transport failure (502) or timeout (504), or the 503 goFetch throws when it could not renew the
 * session. The copy is `auth.errors.upstreamUnavailable`; the form is kept either way.
 */
export function upstreamFailure(err: unknown): { status: number; key: string } {
	const key = 'auth.errors.upstreamUnavailable';
	if (isHttpError(err)) return { status: err.status, key };
	return { status: isUpstreamTimeout(err) ? 504 : 502, key };
}

/** Copy for a non-2xx Go answer no code explains: Go's rate limiter (429), else generic. */
export function goFailureKey(status: number): string {
	return status === 429 ? 'auth.errors.rateLimited' : 'auth.errors.unexpected';
}

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
	let resp: Response;
	try {
		resp = await goFetch(cookies, '/v1/auth/change-password', {
			method: 'POST',
			body: JSON.stringify(parsed.data),
			scoped: false
		});
	} catch (err) {
		if (isRedirect(err)) throw err;
		const { status, key } = upstreamFailure(err);
		return { ok: false, status, body: { formErrorKey: key } };
	}
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
