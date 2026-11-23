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
 *      renders a countdown; 429 and 503 service_busy → the same countdown in
 *      their own words; any other 401 → one uniform invalid-credentials
 *      message (no enumeration); 403 tenant_suspended / tenant_not_active
 *      (sent only after the password was verified) → the company's own line.
 *
 * Progressive enhancement: works without JS (standard POST + redirect)
 * AND with JS (use:enhance keeps it on-page + updates `form` prop).
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */
import { redirect } from '@sveltejs/kit';
import { parseRetryAfter } from '#lib/api/errors.ts';
import { validationFieldKeys } from '#lib/server/auth-errors.ts';
import { takeSigninNotice } from '#lib/server/cookies.ts';
import {
	callGoForAction,
	failForm,
	failFromStatus,
	failOutage,
	goFailureKey
} from '#lib/server/form-action.ts';
import { goAuthFetch, readGoError } from '#lib/server/go.ts';
import { establishSession, tokenPairSchema } from '#lib/server/auth-refresh.ts';
import { safeRedirectPath } from '#lib/server/redirect.ts';
import { loginRequestSchema } from '$features/auth/schemas';
import type { Actions, PageServerLoad } from './$types';

/**
 * Why the person is here again (the session ended, the company cannot sign in, the password was
 * changed): the one-word notice the BFF left when it ended the session. Taken once: the cookie is
 * deleted with this answer, so a reload shows nothing. No call to Go.
 */
export const load: PageServerLoad = ({ cookies }) => ({ notice: takeSigninNotice(cookies) });

/**
 * Go's two "this company's members cannot sign in" answers (403; leadkart-go
 * internal/identity/ports/http.go handleLogin) and their sentences. Sign-in's own lines: never the
 * operator-scope `errors.code.tenant_not_active` ("This tenant is not active. Changes are disabled.").
 */
const COMPANY_REFUSAL_KEYS: ReadonlyMap<string, string> = new Map([
	['tenant_suspended', 'auth.errors.tenantSuspended'],
	['tenant_not_active', 'auth.errors.tenantNotActive']
]);

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = (formData.get('email') ?? '').toString();
		const password = (formData.get('password') ?? '').toString();

		const values = { email };

		const parsed = loginRequestSchema.safeParse({ email, password });
		if (!parsed.success) {
			return failForm(422, { values, fieldKeys: validationFieldKeys(parsed.error) });
		}

		const call = await callGoForAction(() => goAuthFetch('/v1/auth/login', { body: parsed.data }));
		if (!call.ok) return failOutage(call, values);
		const resp = call.resp;

		if (!resp.ok) {
			// Go: 423 account_locked (+ Retry-After) is the one deliberate difference;
			// unknown email, wrong password and a malformed email all answer the same
			// 401 invalid_credentials, so there is one copy for all of them.
			const retryAfterSeconds = parseRetryAfter(resp.headers.get('retry-after'));
			if (resp.status === 423) {
				return failForm(
					423,
					{ values, formErrorKey: 'auth.errors.accountLocked' },
					{ retryAfterSeconds }
				);
			}
			if (resp.status === 401) {
				return failForm(401, { values, formErrorKey: 'auth.errors.invalidCredentials' });
			}
			// 429 is Go's rate limiter (rate_limited + Retry-After): the form counts the wait down.
			if (resp.status === 429) {
				return retryAfterSeconds
					? failForm(
							429,
							{ values, formErrorKey: 'auth.errors.rateLimitedWait' },
							{ retryAfterSeconds }
						)
					: failFromStatus(resp, values);
			}
			const code = (await readGoError(resp)).error;
			// 403 tenant_suspended / tenant_not_active: Go answers these only AFTER the password was
			// verified, so naming the company's state tells a stranger nothing. Not a wrong password,
			// and nothing to retry.
			const companyRefusal = resp.status === 403 ? COMPANY_REFUSAL_KEYS.get(code ?? '') : undefined;
			if (companyRefusal) return failForm(403, { values, formErrorKey: companyRefusal });
			// 503 service_busy (+ Retry-After): the password-work gate was full. Nothing was done or
			// counted, and Go answers it on every branch, so it says nothing about the account.
			if (resp.status === 503 && code === 'service_busy') {
				return retryAfterSeconds
					? failForm(
							503,
							{ values, formErrorKey: 'auth.errors.serviceBusyWait' },
							{ retryAfterSeconds }
						)
					: failForm(503, { values, formErrorKey: goFailureKey(503, code) });
			}
			return failFromStatus(resp, values);
		}

		const parsedTokens = tokenPairSchema.safeParse(await resp.json().catch(() => null));
		if (!parsedTokens.success) {
			return failForm(502, { values, formErrorKey: 'auth.errors.unexpected' });
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
