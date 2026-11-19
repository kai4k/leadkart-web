/**
 * Signin form action — replaces the legacy /auth/login +server.ts BFF
 * endpoint for the page flow. Form actions ARE BFF endpoints; running
 * server-side in adapter-node gives us cookie-set + redirect + typed
 * `form` prop in one place per SvelteKit canon (see "form actions" docs).
 *
 * Three post-submit branches (per ADR 0053, unchanged):
 *   1. 200 with must_change_password=true → redirect to /must-change-password
 *   2. 200 with must_change_password=false → redirect to /dashboard (or ?next=)
 *   3. 423 locked → return fail() with `retryAfterSeconds` so the form
 *      renders a countdown; 429 → rate-limited copy; any other 401 → one
 *      uniform invalid-credentials message (no enumeration).
 *
 * Progressive enhancement: works without JS (standard POST + redirect)
 * AND with JS (use:enhance keeps it on-page + updates `form` prop).
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */
import { fail, redirect } from '@sveltejs/kit';
import { parseRetryAfter } from '#lib/api/errors.ts';
import { callGoForAction, goFailureKey } from '#lib/server/form-action.ts';
import { goAuthFetch, goErrorStatus } from '#lib/server/go.ts';
import { establishSession, tokenPairSchema } from '#lib/server/auth-refresh.ts';
import { safeRedirectPath } from '#lib/server/redirect.ts';
import { loginRequestSchema } from '$features/auth/schemas';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = (formData.get('email') ?? '').toString();
		const password = (formData.get('password') ?? '').toString();

		const parsed = loginRequestSchema.safeParse({ email, password });
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			return fail(422, {
				email,
				errors: {
					email: flat.email?.[0],
					password: flat.password?.[0]
				}
			});
		}

		const call = await callGoForAction(() => goAuthFetch('/v1/auth/login', { body: parsed.data }));
		if (!call.ok) return fail(call.status, { email, formError: call.key });
		const resp = call.resp;

		if (!resp.ok) {
			// Go: 423 account_locked (+ Retry-After) is the one deliberate difference;
			// unknown email, wrong password and a malformed email all answer the same
			// 401 invalid_credentials, so there is one copy for all of them.
			if (resp.status === 423) {
				return fail(423, {
					email,
					formError: 'auth.errors.accountLocked',
					retryAfterSeconds: parseRetryAfter(resp.headers.get('retry-after'))
				});
			}
			if (resp.status === 401) {
				return fail(401, { email, formError: 'auth.errors.invalidCredentials' });
			}
			// 429 is Go's IP rate limiter (rate_limited + Retry-After).
			return fail(goErrorStatus(resp), { email, formError: goFailureKey(resp.status) });
		}

		const parsedTokens = tokenPairSchema.safeParse(await resp.json().catch(() => null));
		if (!parsedTokens.success) {
			return fail(502, { email, formError: 'auth.errors.unexpected' });
		}
		const tokens = parsedTokens.data;
		establishSession(cookies, tokens);

		const next = safeRedirectPath(url.searchParams.get('next'), url.origin);
		const target = tokens.must_change_password
			? next === '/dashboard'
				? '/must-change-password'
				: `/must-change-password?next=${encodeURIComponent(next)}`
			: next;

		// SvelteKit form actions throw redirect() to navigate post-action.
		throw redirect(303, target);
	}
};
