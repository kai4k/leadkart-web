/**
 * /settings/account/security — two named form actions.
 *
 * `?/changePassword` — POST /v1/auth/change-password (authenticated;
 *                       server verifies current_password per security.md).
 *                       On success the session ends everywhere and the
 *                       person signs in again (redirect to /signin).
 * `?/changeEmail`    — POST /v1/auth/request-email-change (sends a
 *                       confirmation link to the NEW address; the change
 *                       does NOT apply until the user clicks the link).
 *
 * Both call Go directly via goFetch (cookie → Bearer).
 */
import { redirect } from '@sveltejs/kit';
import { formEmailField } from '#lib/api/request-schema.ts';
import { changePasswordViaGo, fieldValidationKeys } from '#lib/server/auth-errors.ts';
import {
	authoriseSelfService,
	callGoForAction,
	failForm,
	failFromStatus,
	failOutage
} from '#lib/server/form-action.ts';
import { goFetch, readGoError } from '#lib/server/go.ts';
import type { Actions } from './$types';

/** The typed new email: what a refused submit gives back to the form. */
const emailValues = (formData: FormData) => ({
	email: (formData.get('new_email') ?? '').toString()
});

export const actions: Actions = {
	changePassword: async (event) => {
		const formData = await event.request.formData();
		// Own account, no permission; bound to the page of the person the browser holds now. No values
		// are kept: never a password.
		const refused = await authoriseSelfService(event, formData, {});
		if (refused) return refused;
		const { cookies } = event;
		const result = await changePasswordViaGo(cookies, {
			current: (formData.get('current_password') ?? '').toString(),
			next: (formData.get('new_password') ?? '').toString(),
			confirm: (formData.get('confirm_password') ?? '').toString()
		});
		if (!result.ok) {
			return failForm(result.status, result.parts, { which: 'changePassword' as const });
		}
		// Go revoked every session of the person; the session here is over (cookies cleared, notice
		// set by `changePasswordViaGo`): the person signs in again with the new password.
		redirect(303, '/signin');
	},

	changeEmail: async (event) => {
		const formData = await event.request.formData();

		const refused = await authoriseSelfService(event, formData, () => emailValues(formData));
		if (refused) return refused;
		const { cookies } = event;
		const values = emailValues(formData);
		const newEmail = values.email;
		const which = { which: 'changeEmail' as const };

		const parsed = formEmailField.safeParse(newEmail);
		if (!parsed.success) {
			return failForm(
				422,
				{ values, fieldKeys: fieldValidationKeys('email', parsed.error) },
				which
			);
		}

		const call = await callGoForAction(() =>
			goFetch(cookies, '/v1/auth/request-email-change', {
				method: 'POST',
				body: JSON.stringify({ new_email: parsed.data }),
				scoped: false
			})
		);
		if (!call.ok) return failOutage(call, values, which);
		const resp = call.resp;

		if (resp.ok || resp.status === 204) {
			return { which: 'changeEmail' as const, submitted: true };
		}

		const body = await readGoError(resp);
		// Go: 400 invalid_email. A taken or rejected address collapses to 204 there
		// (anti-enumeration), so there is no 409 to read.
		if (resp.status === 400 && body.error === 'invalid_email') {
			return failForm(
				400,
				{ values, fieldKeys: { email: 'auth.changeEmail.errors.invalid' } },
				which
			);
		}
		return failFromStatus(resp, values, which);
	}
};
