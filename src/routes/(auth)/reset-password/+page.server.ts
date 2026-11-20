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
import { callGoForAction, failForm, failFromStatus, failOutage } from '#lib/server/form-action.ts';
import { goAuthFetch, readGoError } from '#lib/server/go.ts';
import type { Actions } from './$types';

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

		const body = await readGoError(resp);
		if (resp.status === 400 && body.error === RESET_TOKEN_INVALID) {
			return failForm(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		const mapped = passwordErrorKey(resp.status, body.error);
		if (mapped) {
			return failForm(resp.status, { fieldKeys: { new_password: mapped.key } });
		}
		return failFromStatus(resp);
	}
};
