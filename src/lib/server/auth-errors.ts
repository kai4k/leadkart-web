/**
 * One mapping for every Go password error (reset, change, forced change).
 * Codes are Go's `error` values: leadkart-go internal/identity/ports/errcodes.go.
 * `invalid_body` (undecodable JSON) is deliberately not mapped: it is a bug,
 * not something the user can fix, so callers show the generic message.
 */
import type { Cookies } from '@sveltejs/kit';
import type { z } from 'zod';
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

/**
 * The i18n key for a failed pre-auth / credential field, by what the schema objected to. The same
 * table serves sign-in, forgot-password and change-email, so "email too long" is worded once.
 */
const FIELD_ISSUE_KEYS: Record<string, Record<string, string>> = {
	email: {
		too_small: 'auth.errors.emailRequired',
		too_big: 'auth.errors.emailTooLong',
		invalid_format: 'auth.changeEmail.errors.invalid'
	},
	password: {
		too_small: 'auth.errors.passwordRequired',
		too_big: 'auth.errors.passwordTooLong'
	}
};

function issueKey(field: string, code: string): string {
	return FIELD_ISSUE_KEYS[field]?.[code] ?? 'auth.errors.validation';
}

/** `field -> i18n key` for the first issue of each failed field of an object request schema. */
export function validationFieldKeys(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const field = String(issue.path[0] ?? '');
		if (field && !(field in out)) out[field] = issueKey(field, issue.code);
	}
	return out;
}

/** The same for a bare field schema (`lookupEmailField`): `{ [field]: key }` from its first issue. */
export function fieldValidationKeys(field: string, error: z.ZodError): Record<string, string> {
	return { [field]: issueKey(field, error.issues[0]?.code ?? '') };
}

/** What `failForm` takes beyond the status: the field keys and the banner key. */
export type PasswordFormFailure = {
	status: number;
	parts: { fieldKeys?: Record<string, string>; formErrorKey?: string };
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
			parts: { fieldKeys: { confirm: 'account.security.changePassword.errors.mismatch' } }
		};
	}

	const parsed = changePasswordSchema.safeParse({
		current_password: input.current,
		new_password: input.next
	});
	if (!parsed.success) {
		const tooLong = (field: string) =>
			parsed.error.issues.some((i) => i.path[0] === field && i.code === 'too_big');
		const failed = new Set(parsed.error.issues.map((i) => i.path[0]));
		return {
			ok: false,
			status: 422,
			parts: {
				fieldKeys: {
					...(failed.has('current_password') && {
						current: tooLong('current_password')
							? 'auth.errors.passwordTooLong'
							: 'account.security.changePassword.currentPassword'
					}),
					...(failed.has('new_password') && {
						new: tooLong('new_password')
							? 'auth.errors.passwordTooLong'
							: 'account.security.changePassword.newPasswordHint'
					})
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
	if (!call.ok) return { ok: false, status: call.status, parts: { formErrorKey: call.key } };
	const resp = call.resp;
	if (resp.ok) return { ok: true };

	const mapped = passwordErrorKey(resp.status, (await readGoError(resp)).error);
	if (mapped) {
		return { ok: false, status: resp.status, parts: { fieldKeys: { [mapped.field]: mapped.key } } };
	}
	return {
		ok: false,
		status: goErrorStatus(resp),
		parts: { formErrorKey: goFailureKey(resp.status) }
	};
}
