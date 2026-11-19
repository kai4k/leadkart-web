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
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { setMustChangePassword } from '#lib/server/cookies.ts';
import { safeRedirectPath } from '#lib/server/redirect.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const result = await changePasswordViaGo(cookies, {
			current: (formData.get('current_password') ?? '').toString(),
			next: (formData.get('new_password') ?? '').toString(),
			confirm: (formData.get('confirm') ?? '').toString()
		});
		if (!result.ok) return fail(result.status, result.body);

		setMustChangePassword(cookies, false);
		throw redirect(303, safeRedirectPath(url.searchParams.get('next'), url.origin));
	}
};
