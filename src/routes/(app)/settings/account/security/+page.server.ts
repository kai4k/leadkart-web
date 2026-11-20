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
import { formEmailField } from '#lib/api/request-schema.ts';
import { changePasswordViaGo, fieldValidationKeys } from '#lib/server/auth-errors.ts';
import {
	authoriseSelfService,
	callGoForAction,
	failForm,
	failFromStatus,
	failOutage
} from '#lib/server/form-action.ts';
import { setMustChangePassword } from '#lib/server/cookies.ts';
import { goFetch, readGoError } from '#lib/server/go.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	changePassword: async ({ request, cookies }) => {
		const formData = await request.formData();
		// Own account, no permission; bound to the page of the person the browser holds now. No values
		// are kept: never a password.
		const refused = await authoriseSelfService({ cookies }, formData, {});
		if (refused) return refused;
		const result = await changePasswordViaGo(cookies, {
			current: (formData.get('current_password') ?? '').toString(),
			next: (formData.get('new_password') ?? '').toString(),
			confirm: (formData.get('confirm_password') ?? '').toString()
		});
		if (!result.ok) {
			return failForm(result.status, result.parts, { which: 'changePassword' as const });
		}
		setMustChangePassword(cookies, false);
		return { which: 'changePassword' as const, success: true };
	},

	changeEmail: async ({ request, cookies }) => {
		const formData = await request.formData();
		const newEmail = (formData.get('new_email') ?? '').toString();

		const values = { email: newEmail };
		const which = { which: 'changeEmail' as const };

		const refused = await authoriseSelfService({ cookies }, formData, values);
		if (refused) return refused;

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
