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
 * Surface covers authenticated-user flows: logout, change-password, plus
 * profile read/update and session list/revoke.
 */
import { api } from '#lib/api/client.ts';
import { ApiError, type ApiErrorBody } from '$api/errors';
import {
	userDtoSchema,
	listSessionsResponseSchema,
	capabilitiesSchema,
	revokeOtherSessionsResponseSchema
} from './schemas';
import type { UserDto, SessionDto, UpdateProfileRequest } from './types';
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
	// Read CSRF token from the non-httpOnly cookie for the mutation header
	const csrf =
		typeof document !== 'undefined'
			? (document.cookie.match(/(?:^|; )lk_csrf=([^;]+)/)?.[1] ?? '')
			: '';
	await fetch('/auth/logout', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(csrf ? { 'x-csrf-token': csrf } : {})
		},
		credentials: 'same-origin'
	});
}

/**
 * Authenticated. Returns the caller's capability set — tier, permissions,
 * features — synthesized from JWT claims server-side per ADR 0038 N1.
 * staleTime 5 min in the query layer; gcTime 30 min.
 *
 * Goes through /api/[...path] BFF proxy which injects Bearer from cookie.
 */
export function getMyCapabilities(signal?: AbortSignal): Promise<Capabilities> {
	return api.get('/v1/auth/me/capabilities', capabilitiesSchema, { signal });
}

/**
 * Authenticated. Initiates an email change. Go emails a one-shot
 * confirmation link to the NEW address; the change does not apply until
 * the user clicks the link (handled by confirmEmailChange below). Returns
 * 204 on success; backend may emit 409 if the new email is already in use.
 */
export async function requestEmailChange(body: { new_email: string }): Promise<void> {
	await api.post('/v1/auth/request-email-change', body);
}

/**
 * Public — no auth required. Confirms the email change using the token
 * Go emailed. Single-use, time-boxed server-side. 204 on success.
 *
 * Failure modes (server-mapped — caller switches on err.status):
 *   400 invalid_token / token_consumed / token_expired → top banner
 *   409 email_in_use → top banner
 */
export async function confirmEmailChange(body: { token: string }): Promise<void> {
	const resp = await fetch('/auth/confirm-email-change', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (resp.ok) return;
	throw await readBffError(resp);
}

/**
 * Authenticated. The server verifies current_password even with a
 * valid bearer (per security.md "Password change") so a stolen access
 * token can't permanently take over an account.
 */
export function changePassword(body: {
	current_password: string;
	new_password: string;
}): Promise<void> {
	return api.post('/v1/auth/change-password', body);
}

/**
 * Read a non-OK BFF response and surface it as a typed `ApiError`
 * subclass (AuthError / ValidationError / ConflictError / ServerError /
 * NotFoundError / generic ApiError). The factory does the discriminated-
 * union dispatch on `resp.status` + parsed body; callers pattern-match
 * on `instanceof <Subclass>` rather than poking at monkey-patched fields.
 *
 * Message resolution is owned by `ApiError.fromResponse` — RFC 9457
 * `detail` / `title` → legacy `message` → `statusText` fallback — so
 * the gateway no longer needs to inject a per-endpoint fallback string.
 */
async function readBffError(resp: Response): Promise<ApiError> {
	const text = await resp.text();
	let parsed: ApiErrorBody | null = null;
	try {
		parsed = text.length > 0 ? (JSON.parse(text) as ApiErrorBody) : null;
	} catch {
		/* non-JSON */
	}
	return ApiError.fromResponse(resp, parsed);
}

/**
 * Authenticated. Server scopes to the caller's own membership when
 * `membershipId` matches the JWT's `membership_id` claim.
 */
export function getMyProfile(membershipId: string, signal?: AbortSignal): Promise<UserDto> {
	return api.get(`/v1/users/${membershipId}`, userDtoSchema, { signal });
}

/**
 * PATCH the caller's own designation / department / status_message.
 */
export async function updateMyProfile(
	membershipId: string,
	patch: UpdateProfileRequest
): Promise<void> {
	await api.patch(`/v1/users/${membershipId}/profile`, patch);
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
	await api.delete(`/v1/auth/sessions/${familyId}`);
}

/**
 * Revoke all OTHER sessions (keeps the caller's current session
 * alive — Auth0 / Okta canon for "sign me out of other devices").
 */
export async function revokeOtherSessions(reason?: string): Promise<{ revoked_count: number }> {
	const body: { except_current: true; reason?: string } = { except_current: true };
	if (reason) body.reason = reason;
	return api.deleteJson('/v1/auth/sessions', body, revokeOtherSessionsResponseSchema);
}
