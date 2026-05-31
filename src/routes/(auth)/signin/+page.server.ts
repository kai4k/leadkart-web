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
 *      renders a countdown.
 *
 * Progressive enhancement: works without JS (standard POST + redirect)
 * AND with JS (use:enhance keeps it on-page + updates `form` prop).
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */
import { fail, redirect } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { setAuthCookies } from '$lib/server/cookies';
import { loginRequestSchema } from '$features/auth/schemas';
import type { Actions } from './$types';

interface GoTokens {
	access_token: string;
	refresh_token: string;
	must_change_password?: boolean;
}

function safeNextPath(raw: string | null): string {
	if (!raw) return '/dashboard';
	const decoded = decodeURIComponent(raw);
	// Only allow same-origin paths (defence against open-redirect).
	return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : '/dashboard';
}

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

		let resp: Response;
		try {
			resp = await fetch(`${config.GO_API_URL}/api/v1/auth/login`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(parsed.data)
			});
		} catch {
			return fail(502, {
				email,
				formError: 'auth.errors.upstreamUnavailable'
			});
		}

		if (!resp.ok) {
			if (resp.status === 423) {
				const retryAfterRaw = resp.headers.get('retry-after');
				const retryAfterSeconds =
					retryAfterRaw && !Number.isNaN(Number(retryAfterRaw)) ? Number(retryAfterRaw) : undefined;
				return fail(423, {
					email,
					formError: 'auth.errors.accountLocked',
					retryAfterSeconds
				});
			}
			if (resp.status === 401) {
				return fail(401, { email, formError: 'auth.errors.invalidCredentials' });
			}
			return fail(resp.status, { email, formError: 'auth.errors.unexpected' });
		}

		const tokens = (await resp.json()) as GoTokens;
		setAuthCookies(cookies, tokens.access_token, tokens.refresh_token);

		const target = tokens.must_change_password
			? `/must-change-password${url.searchParams.get('next') ? `?next=${url.searchParams.get('next')}` : ''}`
			: safeNextPath(url.searchParams.get('next'));

		// SvelteKit form actions throw redirect() to navigate post-action.
		throw redirect(303, target);
	}
};
