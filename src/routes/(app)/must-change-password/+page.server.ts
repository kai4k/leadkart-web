/**
 * Must-change-password form action — forced password rotation per ADR 0053.
 *
 * BFF preserved: action runs server-side in adapter-node, reads the
 * httpOnly access cookie, and calls Go's
 * POST /api/v1/auth/change-password directly with Bearer auth.
 *
 * Reached when login returns `must_change_password=true`. Go revokes every
 * session of the person on a successful change, so the session here is ended
 * (`changePasswordViaGo`) and the person signs in again with the new password;
 * `?next=` travels on to sign-in.
 */
import { redirect } from '@sveltejs/kit';
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { authoriseSelfService, failForm } from '#lib/server/form-action.ts';
import { safeRedirectPath } from '#lib/server/redirect.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		// Own account, no permission; bound to the page of the person the browser holds now.
		const refused = await authoriseSelfService(event, formData, {});
		if (refused) return refused;
		const { cookies, url } = event;
		const result = await changePasswordViaGo(cookies, {
			current: (formData.get('current_password') ?? '').toString(),
			next: (formData.get('new_password') ?? '').toString(),
			confirm: (formData.get('confirm') ?? '').toString()
		});
		if (!result.ok) return failForm(result.status, result.parts);

		// The session is over (cookies cleared, notice set): sign in again, then on to where they were going.
		const next = safeRedirectPath(url.searchParams.get('next'), url.origin);
		throw redirect(
			303,
			next === '/dashboard' ? '/signin' : `/signin?next=${encodeURIComponent(next)}`
		);
	}
};
