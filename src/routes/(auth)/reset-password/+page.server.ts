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
import { z } from 'zod';
import { config } from '$lib/server/config';
import type { Actions } from './$types';

const newPasswordSchema = z.string().min(12);

interface GoErrorBody {
	code?: string;
	message?: string;
}

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
		const parsed = newPasswordSchema.safeParse(newPassword);
		if (!parsed.success) {
			return fail(422, {
				fieldKeys: { new_password: 'auth.resetPassword.newPasswordHint' }
			});
		}

		let resp: Response;
		try {
			resp = await fetch(`${config.GO_API_URL}/api/v1/auth/reset-password`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token, new_password: parsed.data })
			});
		} catch {
			return fail(502, { formErrorKey: 'auth.errors.unexpected' });
		}

		if (resp.ok || resp.status === 204) {
			return { success: true };
		}

		const body = (await resp.json().catch(() => ({}))) as GoErrorBody;
		const code = body.code ?? '';

		if (
			resp.status === 400 &&
			(code === 'invalid_token' || code === 'token_consumed' || code === 'token_expired')
		) {
			return fail(400, { formErrorKey: 'auth.resetPassword.errors.invalidToken' });
		}
		if (resp.status === 422 && code === 'password_breached') {
			return fail(422, { fieldKeys: { new_password: 'auth.resetPassword.errors.breached' } });
		}
		if (resp.status === 422 && code === 'password_same') {
			return fail(422, { fieldKeys: { new_password: 'auth.resetPassword.errors.same' } });
		}
		if (resp.status === 422) {
			return fail(422, { fieldKeys: { new_password: 'auth.resetPassword.errors.weak' } });
		}
		return fail(resp.status, { formErrorKey: 'auth.errors.unexpected' });
	}
};
