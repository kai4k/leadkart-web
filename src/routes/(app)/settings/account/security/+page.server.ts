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
import { z } from 'zod';
import { passwordErrorKey } from '#lib/server/auth-errors.ts';
import { setMustChangePassword } from '#lib/server/cookies.ts';
import { goErrorStatus, goFetch, readGoError } from '#lib/server/go.ts';
import { changePasswordSchema } from '$features/auth/schemas';
import type { Actions } from './$types';

const emailSchema = z.string().min(1, 'Email is required').email('Invalid email format');

export const actions: Actions = {
	changePassword: async ({ request, cookies }) => {
		const formData = await request.formData();
		const currentPassword = (formData.get('current_password') ?? '').toString();
		const newPassword = (formData.get('new_password') ?? '').toString();
		const confirmPassword = (formData.get('confirm_password') ?? '').toString();

		if (newPassword !== confirmPassword) {
			return fail(422, {
				which: 'changePassword' as const,
				fieldKeys: { confirm: 'account.security.changePassword.errors.mismatch' }
			});
		}

		const parsed = changePasswordSchema.safeParse({
			current_password: currentPassword,
			new_password: newPassword
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			return fail(422, {
				which: 'changePassword' as const,
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

		const resp = await goFetch(cookies, '/v1/auth/change-password', {
			method: 'POST',
			body: JSON.stringify(parsed.data),
			scoped: false
		});

		if (resp.ok || resp.status === 204) {
			setMustChangePassword(cookies, false);
			return { which: 'changePassword' as const, success: true };
		}

		const body = await readGoError(resp);
		const mapped = passwordErrorKey(resp.status, body.error);
		if (mapped) {
			return fail(resp.status, {
				which: 'changePassword' as const,
				fieldKeys: { [mapped.field]: mapped.key }
			});
		}
		return fail(goErrorStatus(resp), {
			which: 'changePassword' as const,
			formErrorKey: 'auth.errors.unexpected'
		});
	},

	changeEmail: async ({ request, cookies }) => {
		const formData = await request.formData();
		const newEmail = (formData.get('new_email') ?? '').toString();

		const parsed = emailSchema.safeParse(newEmail);
		if (!parsed.success) {
			return fail(422, {
				which: 'changeEmail' as const,
				email: newEmail,
				fieldError: parsed.error.issues[0]?.message ?? 'Invalid email'
			});
		}

		const resp = await goFetch(cookies, '/v1/auth/request-email-change', {
			method: 'POST',
			body: JSON.stringify({ new_email: parsed.data }),
			scoped: false
		});

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
			formErrorKey: 'auth.errors.unexpected'
		});
	}
};
