/**
 * Forgot-password form action — replaces the browser-side
 * `requestPasswordReset()` fetch wrapper for the page flow.
 *
 * BFF preserved: this action runs server-side in adapter-node, calls
 * Go's POST /api/v1/auth/request-password-reset directly, and returns
 * a typed `form` prop. The legacy /auth/request-password-reset
 * +server.ts BFF endpoint stays in place for any non-browser caller.
 *
 * Anti-enumeration: Go returns 204 regardless of whether the email is
 * registered (Auth0/Okta canon). The action returns `submitted: true`
 * on any 2xx so the form shows identical success copy either way.
 */
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from '$lib/server/config';
import type { Actions } from './$types';

const emailSchema = z.string().min(1, 'Email is required').email('Invalid email format');

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = (formData.get('email') ?? '').toString();

		const parsed = emailSchema.safeParse(email);
		if (!parsed.success) {
			return fail(422, {
				email,
				fieldError: parsed.error.issues[0]?.message ?? 'Invalid email'
			});
		}

		let resp: Response;
		try {
			resp = await fetch(`${config.GO_API_URL}/api/v1/auth/request-password-reset`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: parsed.data })
			});
		} catch {
			return fail(502, {
				email,
				formError: 'Check your network connection and try again.'
			});
		}

		if (!resp.ok && resp.status !== 204) {
			// Anti-enumeration: Go normally returns 204; if it doesn't, still
			// behave as success unless it's a clearly server-side fault.
			if (resp.status === 422) {
				return fail(422, { email, fieldError: 'Invalid email format.' });
			}
			if (resp.status >= 500) {
				return fail(resp.status, { email, formError: 'auth.errors.unexpected' });
			}
		}

		return { submitted: true };
	}
};
