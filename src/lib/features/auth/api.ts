/**
 * Typed wrappers around the leadkart-go Identity auth endpoints.
 * Per `architecture.md` "Cross-cutting query contracts": typed feature
 * API calls, NOT raw fetch in components.
 *
 * Each response is parsed through its Zod schema before being handed
 * to callers — boundary validation per industry canon (Stripe SDK,
 * tRPC, TanStack Query). Schema mismatch surfaces here, not deep in
 * the call stack.
 *
 * BFF auth model: sign-in, forgot / reset password and the forced change are
 * form actions (src/routes/(auth)/*, (app)/must-change-password); logout POSTs
 * to /auth/logout, which handles cookie management. All other API calls
 * go through /api/[...path] proxy which injects Bearer from cookie.
 * The browser never sees access_token or refresh_token.
 *
 * Surface covers authenticated-user flows: logout, profile read and session list/revoke.
 * Password change and profile update are form actions (src/routes/(app)/settings/account/*).
 */
import { seg } from '#lib/utils/path-segment.ts';
import { api } from '#lib/api/client.ts';
import { getCsrfToken } from '#lib/api/csrf.ts';
import {
	userDtoSchema,
	listSessionsResponseSchema,
	revokeOtherSessionsResponseSchema,
	type capabilitiesSchema
} from './schemas';
import type { UserDto, SessionDto } from './types';
import type { z } from 'zod';

export type Capabilities = z.output<typeof capabilitiesSchema>;

// Login was migrated to a SvelteKit form action at
// src/routes/(auth)/signin/+page.server.ts — per the "per-route shape"
// principle (forms → form actions, lists → TanStack). The action runs
// server-side, calls Go directly, sets cookies, and redirects in one
// handler. No browser-facing login() function is needed.

/**
 * BFF logout — POSTs to /auth/logout (BFF) which revokes server-side
 * and clears all three cookies. After this returns, the browser has
 * no auth state.
 */
export async function logout(): Promise<void> {
	const csrf = getCsrfToken();
	await fetch('/auth/logout', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(csrf ? { 'x-csrf-token': csrf } : {})
		},
		credentials: 'same-origin'
	});
}

/** What the confirm-email-change link did, as the page needs it. */
export type ConfirmEmailChangeOutcome = 'success' | 'invalid' | 'unreachable' | 'rateLimited';

/**
 * Public — no auth. Confirms the email change with the token Go emailed (single-use, time-boxed
 * server-side) through the BFF route `/auth/confirm-email-change`. Never throws: the page shows a
 * state, not an error. `fetchFn` is SvelteKit's load `fetch`.
 *   2xx → success · 429 → rateLimited (token still valid, retry) · 5xx / network → unreachable
 *   (token still valid, retry) · any other 4xx → invalid (expired / consumed / malformed).
 */
export async function confirmEmailChange(
	token: string,
	fetchFn: typeof fetch = fetch
): Promise<ConfirmEmailChangeOutcome> {
	try {
		const resp = await fetchFn('/auth/confirm-email-change', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ token })
		});
		if (resp.ok) return 'success';
		if (resp.status === 429) return 'rateLimited';
		if (resp.status >= 500) return 'unreachable';
		return 'invalid';
	} catch {
		return 'unreachable';
	}
}

/**
 * Authenticated. Server scopes to the caller's own membership when
 * `membershipId` matches the JWT's `membership_id` claim.
 */
export function getMyProfile(membershipId: string, signal?: AbortSignal): Promise<UserDto> {
	return api.get(`/v1/users/${seg(membershipId)}`, userDtoSchema, { signal });
}

/**
 * List active session families for the caller.
 */
export async function listSessions(signal?: AbortSignal): Promise<SessionDto[]> {
	return (await api.get('/v1/auth/sessions', listSessionsResponseSchema, { signal })).sessions;
}

/**
 * Revoke a single session family by ID. 204 on success.
 */
export async function revokeSession(familyId: string): Promise<void> {
	await api.delete(`/v1/auth/sessions/${seg(familyId)}`);
}

/**
 * Asks Go to revoke all OTHER sessions (`except_current`). Go does not honour the flag yet
 * (identity/ports/http.go: it cannot tell which family is the current one), so EVERY session is
 * revoked, the caller's included: the UI says "Sign out everywhere" until it does.
 */
export async function revokeOtherSessions(reason?: string): Promise<{ revoked_count: number }> {
	const body: { except_current: true; reason?: string } = { except_current: true };
	if (reason) body.reason = reason;
	return api.deleteJson('/v1/auth/sessions', body, revokeOtherSessionsResponseSchema);
}
