/**
 * Reset-password form action — replaces the browser-side `resetPassword()`
 * fetch wrapper for the page flow.
 *
 * BFF preserved: action runs server-side in adapter-node, calls Go's
 * POST /api/v1/auth/reset-password directly. The legacy
 * /auth/reset-password +server.ts BFF endpoint stays in place for any
 * non-browser caller.
 *
 * The token comes from the URL query string (`?token=...`) — read via
 * the load function and passed as a hidden form field, OR re-read from
 * `url.searchParams` in the action. We do the latter so the token
 * doesn't have to round-trip through hidden inputs.
 */
import { fail } from '@sveltejs/kit';
import { newPasswordField } from '#lib/api/request-schema.ts';
import {
	goFailureKey,
	passwordErrorKey,
	RESET_TOKEN_INVALID,
	upstreamFailure
} from '#lib/server/auth-errors.ts';
import { goAuthFetch, goErrorStatus, readGoError } from '#lib/server/go.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const token = url.searchParams.get('token') ?? '';
		const formData = await request.formData();
		const newPassword = (formData.get('new_password') ?? '').toString();
		const confirmPassword = (formData.get('confirm') ?? '').toString();

		if (!token) {
			return fail(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		if (newPassword !== confirmPassword) {
			return fail(422, { fieldKeys: { confirm: 'auth.resetPassword.errors.mismatch' } });
		}
		const parsed = newPasswordField.safeParse(newPassword);
		if (!parsed.success) {
			return fail(422, {
				fieldKeys: { new_password: 'auth.resetPassword.newPasswordHint' }
			});
		}

		let resp: Response;
		try {
			resp = await goAuthFetch('/v1/auth/reset-password', {
				body: { token, new_password: parsed.data }
			});
		} catch (err) {
			const { status, key } = upstreamFailure(err);
			return fail(status, { formErrorKey: key });
		}

		if (resp.ok || resp.status === 204) {
			return { success: true };
		}

		const body = await readGoError(resp);
		if (resp.status === 400 && body.error === RESET_TOKEN_INVALID) {
			return fail(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		const mapped = passwordErrorKey(resp.status, body.error);
		if (mapped) {
			return fail(resp.status, { fieldKeys: { new_password: mapped.key } });
		}
		return fail(goErrorStatus(resp), { formErrorKey: goFailureKey(resp.status) });
	}
};
