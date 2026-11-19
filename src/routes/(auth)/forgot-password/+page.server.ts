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
import { lookupEmailField } from '#lib/api/request-schema.ts';
import { goFailureKey, upstreamFailure } from '#lib/server/auth-errors.ts';
import { goAuthFetch } from '#lib/server/go.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = (formData.get('email') ?? '').toString();

		const parsed = lookupEmailField.safeParse(email);
		if (!parsed.success) {
			return fail(422, {
				email,
				fieldError: parsed.error.issues[0]?.message ?? 'Invalid email'
			});
		}

		let resp: Response;
		try {
			resp = await goAuthFetch('/v1/auth/request-password-reset', { body: { email: parsed.data } });
		} catch (err) {
			const { status, key } = upstreamFailure(err);
			return fail(status, { email, formError: key });
		}

		// Go answers 204 for every email, registered or not (even malformed or an
		// internal error), so the only non-2xx it can send here are transport-level:
		// the IP rate limiter (429) or a gateway fault. Anything else reads as sent.
		if (resp.status === 429 || resp.status >= 500) {
			return fail(resp.status, { email, formError: goFailureKey(resp.status) });
		}

		return { submitted: true };
	}
};
