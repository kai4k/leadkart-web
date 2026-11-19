/**
 * /settings/account/security — two named form actions.
 *
 * `?/changePassword` — POST /v1/auth/change-password (authenticated;
 *                       server verifies current_password per security.md).
 * `?/changeEmail`    — POST /v1/auth/request-email-change (sends a
 *                       confirmation link to the NEW address; the change
 *                       does NOT apply until the user clicks the link).
 *
 * Both call Go directly via goFetch (cookie → Bearer).
 */
import { fail } from '@sveltejs/kit';
import { formEmailField } from '#lib/api/request-schema.ts';
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { callGoForAction, goFailureKey } from '#lib/server/form-action.ts';
import { setMustChangePassword } from '#lib/server/cookies.ts';
import { goErrorStatus, goFetch, readGoError } from '#lib/server/go.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ request, cookies }) => {
		const formData = await request.formData();
		const result = await changePasswordViaGo(cookies, {
			current: (formData.get('current_password') ?? '').toString(),
			next: (formData.get('new_password') ?? '').toString(),
			confirm: (formData.get('confirm_password') ?? '').toString()
		});
		if (!result.ok) {
			return fail(result.status, { which: 'changePassword' as const, ...result.body });
		}
		setMustChangePassword(cookies, false);
		return { which: 'changePassword' as const, success: true };
	},

	changeEmail: async ({ request, cookies }) => {
		const formData = await request.formData();
		const newEmail = (formData.get('new_email') ?? '').toString();

		const parsed = formEmailField.safeParse(newEmail);
		if (!parsed.success) {
			return fail(422, {
				which: 'changeEmail' as const,
				email: newEmail,
				fieldError: parsed.error.issues[0]?.message ?? 'Invalid email'
			});
		}

		const call = await callGoForAction(() =>
			goFetch(cookies, '/v1/auth/request-email-change', {
				method: 'POST',
				body: JSON.stringify({ new_email: parsed.data }),
				scoped: false
			})
		);
		if (!call.ok) {
			return fail(call.status, {
				which: 'changeEmail' as const,
				email: newEmail,
				formErrorKey: call.key
			});
		}
		const resp = call.resp;

		if (resp.ok || resp.status === 204) {
			return { which: 'changeEmail' as const, submitted: true };
		}

		const body = await readGoError(resp);
		// Go: 400 invalid_email. A taken or rejected address collapses to 204 there
		// (anti-enumeration), so there is no 409 to read.
		if (resp.status === 400 && body.error === 'invalid_email') {
			return fail(400, {
				which: 'changeEmail' as const,
				email: newEmail,
				fieldErrorKey: 'auth.changeEmail.errors.invalid'
			});
		}
		return fail(goErrorStatus(resp), {
			which: 'changeEmail' as const,
			email: newEmail,
			formErrorKey: goFailureKey(resp.status)
		});
	}
};
