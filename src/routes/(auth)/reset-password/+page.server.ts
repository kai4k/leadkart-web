/**
 * Reset-password form action — replaces the browser-side `resetPassword()`
 * fetch wrapper for the page flow.
 *
 * BFF preserved: action runs server-side in adapter-node, calls Go's
 * POST /api/v1/auth/reset-password directly.
 *
 * The token comes from the URL query string (`?token=...`) — read via
 * the load function and passed as a hidden form field, OR re-read from
 * `url.searchParams` in the action. We do the latter so the token
 * doesn't have to round-trip through hidden inputs.
 */
import { newPasswordField, tokenField } from '#lib/api/request-schema.ts';
import { passwordErrorKey, RESET_TOKEN_INVALID } from '#lib/server/auth-errors.ts';
import { callGoForAction, failForm, failOutage, goFailureKey } from '#lib/server/form-action.ts';
import { goAuthFetch, readGoFailure } from '#lib/server/go.ts';
import type { Actions } from './$types';

/** 422: the password does not satisfy the tenant's policy (the same code `auth-errors.ts` names for change-password). */
const PASSWORD_POLICY_VIOLATION = 'password_policy_violation';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const token = url.searchParams.get('token') ?? '';
		const formData = await request.formData();
		const newPassword = (formData.get('new_password') ?? '').toString();
		const confirmPassword = (formData.get('confirm') ?? '').toString();

		if (!tokenField.safeParse(token).success) {
			return failForm(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		if (newPassword !== confirmPassword) {
			return failForm(422, { fieldKeys: { confirm: 'auth.resetPassword.errors.mismatch' } });
		}
		const parsed = newPasswordField.safeParse(newPassword);
		if (!parsed.success) {
			const tooLong = parsed.error.issues.some((i) => i.code === 'too_big');
			return failForm(422, {
				fieldKeys: {
					new_password: tooLong
						? 'auth.errors.passwordTooLong'
						: 'auth.resetPassword.newPasswordHint'
				}
			});
		}

		const call = await callGoForAction(() =>
			goAuthFetch('/v1/auth/reset-password', { body: { token, new_password: parsed.data } })
		);
		if (!call.ok) return failOutage(call);
		const resp = call.resp;

		if (resp.ok || resp.status === 204) {
			return { success: true };
		}

		const failure = await readGoFailure(resp);
		const { status, code } = failure;
		if (resp.status === 400 && code === RESET_TOKEN_INVALID) {
			return failForm(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		// 422 password_policy_violation: Go lists the unmet rule codes under `new_password`; the first is
		// the field's message (the same line change-password shows). Only the code travels, never Go's text.
		const rule = code === PASSWORD_POLICY_VIOLATION ? failure.fields.new_password : undefined;
		if (rule !== undefined) return failForm(status, { fieldMessages: { new_password: rule } });

		const mapped = passwordErrorKey(status, code);
		if (mapped) return failForm(status, { fieldKeys: { new_password: mapped.key } });
		// No field to blame: the line of the code when the table has one (503 service_busy reads
		// calmly), else of the status class.
		return failForm(status, { formErrorKey: goFailureKey(status, code) });
	}
};
