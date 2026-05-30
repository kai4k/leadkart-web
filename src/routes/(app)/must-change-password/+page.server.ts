/**
 * Must-change-password form action — forced password rotation per ADR 0053.
 *
 * BFF preserved: action runs server-side in adapter-node, reads the
 * httpOnly access cookie, and calls Go's
 * POST /api/v1/auth/change-password directly with Bearer auth.
 *
 * Reached when login returns `must_change_password=true`. Successful
 * rotation redirects to `?next=` or `/dashboard`.
 */
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from '$lib/server/config';
import { ACCESS_COOKIE } from '$lib/server/cookies';
import type { Actions } from './$types';

const schema = z.object({
	current_password: z.string().min(1),
	new_password: z.string().min(12)
});

interface GoErrorBody {
	code?: string;
	message?: string;
}

function safeNextPath(raw: string | null): string {
	if (!raw) return '/dashboard';
	return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
}

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const currentPassword = (formData.get('current_password') ?? '').toString();
		const newPassword = (formData.get('new_password') ?? '').toString();
		const confirmPassword = (formData.get('confirm') ?? '').toString();

		if (newPassword !== confirmPassword) {
			return fail(422, {
				fieldKeys: { confirm: 'account.security.changePassword.errors.mismatch' }
			});
		}

		const parsed = schema.safeParse({
			current_password: currentPassword,
			new_password: newPassword
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			return fail(422, {
				fieldKeys: {
					current: flat.current_password?.[0]
						? 'account.security.changePassword.currentPassword'
						: undefined,
					new: flat.new_password?.[0]
						? 'account.security.changePassword.newPasswordHint'
						: undefined
				}
			});
		}

		const access = cookies.get(ACCESS_COOKIE());
		if (!access) {
			throw redirect(303, '/signin');
		}

		let resp: Response;
		try {
			resp = await fetch(`${config.GO_API_URL}/api/v1/auth/change-password`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${access}`
				},
				body: JSON.stringify(parsed.data)
			});
		} catch {
			return fail(502, { formErrorKey: 'auth.errors.unexpected' });
		}

		if (resp.ok || resp.status === 204) {
			throw redirect(303, safeNextPath(url.searchParams.get('next')));
		}

		const body = (await resp.json().catch(() => ({}))) as GoErrorBody;
		const code = body.code ?? '';

		if (resp.status === 401) {
			return fail(401, {
				fieldKeys: { current: 'account.security.changePassword.errors.incorrectCurrent' }
			});
		}
		if (resp.status === 422 && code === 'password_breached') {
			return fail(422, { fieldKeys: { new: 'auth.resetPassword.errors.breached' } });
		}
		if (resp.status === 422 && code === 'password_same') {
			return fail(422, { fieldKeys: { new: 'auth.resetPassword.errors.same' } });
		}
		if (resp.status === 422) {
			return fail(422, { fieldKeys: { new: 'auth.resetPassword.errors.weak' } });
		}
		return fail(resp.status, { formErrorKey: 'auth.errors.unexpected' });
	}
};
