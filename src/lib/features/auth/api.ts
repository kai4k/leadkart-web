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
 * BFF auth model: login/logout POST to BFF endpoints (/auth/login,
 * /auth/logout) which handle cookie management. All other API calls
 * go through /api/[...path] proxy which injects Bearer from cookie.
 * The browser never sees access_token or refresh_token.
 *
 * Surface covers authenticated-user flows: login, logout,
 * change-password, plus profile read/update and session list/revoke.
 * Public reset-with-old-password (see `resetWithOldPassword` below) is
 * the self-serve recovery path — chosen over email-link reset to avoid
 * the transactional-email dependency for v0.5.
 *
 *   - Self-serve registration is DISABLED.
 *   - Email-link forgot-password is DISABLED (use reset-with-old).
 *   - Self-service email change is DISABLED.
 */
import { api, parseResponse } from '$api/client';
import {
	loginRequestSchema,
	resetWithOldPasswordSchema,
	userDtoSchema,
	listSessionsResponseSchema,
	capabilitiesSchema
} from './schemas';
import type {
	LoginRequest,
	UserDto,
	SessionDto,
	UpdateProfileRequest,
	ResetWithOldPasswordRequest
} from './types';
import { z } from 'zod';

export type Capabilities = z.output<typeof capabilitiesSchema>;

/**
 * BFF login — POSTs credentials to /auth/login (SvelteKit BFF endpoint,
 * not Go directly). The BFF forwards to Go and sets httpOnly cookies.
 * Returns { ok: true } on success; browser never sees tokens.
 *
 * Validates the request shape client-side before sending so Zod errors
 * surface immediately (don't require a round-trip).
 */
export async function login(body: LoginRequest): Promise<{ ok: true }> {
	// Validate locally first — catches blank fields before the network call
	loginRequestSchema.parse(body);

	const raw = await fetch('/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (!raw.ok) {
		// Re-throw as a plain error so the SigninForm catch block handles it.
		// The BFF forwards Go's ProblemDetails body verbatim.
		const text = await raw.text();
		let parsed: { code?: string; message?: string } = {};
		try {
			parsed = JSON.parse(text);
		} catch {
			/* non-JSON */
		}
		const err = new Error(parsed.message ?? 'Login failed');
		(err as Error & { status: number; code?: string }).status = raw.status;
		(err as Error & { status: number; code?: string }).code = parsed.code;
		throw err;
	}
	return { ok: true };
}

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
export async function getMyCapabilities(): Promise<Capabilities> {
	const raw = await api.get<unknown>('/v1/auth/me/capabilities');
	return parseResponse(capabilitiesSchema, raw);
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
	return api.post<void>('/v1/auth/change-password', body);
}

/**
 * Public — no auth required. Mirrors the login bootstrap pattern: hits
 * the dedicated SvelteKit BFF endpoint at /auth/reset-with-old-password
 * (NOT the catch-all proxy, which requires a CSRF cookie the un-signed
 * user doesn't have yet). The BFF forwards to Go; 204 on success.
 *
 * Validates locally first so blank inputs don't round-trip.
 *
 * Failure modes (server-mapped — caller switches on err.status + err.code):
 *   401 invalid_credentials   — email + old password don't match
 *   422 password_breached     — new password fails HIBP check
 *   422 password_same         — new == old
 *   429 rate_limited          — too many attempts (account or IP)
 */
export async function resetWithOldPassword(body: ResetWithOldPasswordRequest): Promise<void> {
	resetWithOldPasswordSchema.parse(body);
	const resp = await fetch('/auth/reset-with-old-password', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (resp.ok) return;
	const text = await resp.text();
	let parsed: { code?: string; message?: string; error?: string } = {};
	try {
		parsed = JSON.parse(text);
	} catch {
		/* non-JSON */
	}
	const err = new Error(parsed.message ?? parsed.error ?? 'Reset failed');
	(err as Error & { status: number; code?: string }).status = resp.status;
	(err as Error & { status: number; code?: string }).code = parsed.code ?? parsed.error;
	throw err;
}

/**
 * Authenticated. Server scopes to the caller's own membership when
 * `membershipId` matches the JWT's `membership_id` claim.
 */
export async function getMyProfile(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return parseResponse(userDtoSchema, raw);
}

/**
 * PATCH the caller's own designation / department / status_message.
 */
export async function updateMyProfile(
	membershipId: string,
	patch: UpdateProfileRequest
): Promise<void> {
	await api.patch<void>(`/v1/users/${membershipId}/profile`, patch);
}

/**
 * List active session families for the caller.
 */
export async function listSessions(): Promise<SessionDto[]> {
	const raw = await api.get<unknown>('/v1/auth/sessions');
	return parseResponse(listSessionsResponseSchema, raw).sessions;
}

/**
 * Revoke a single session family by ID. 204 on success.
 */
export async function revokeSession(familyId: string): Promise<void> {
	await api.delete<void>(`/v1/auth/sessions/${familyId}`);
}

/**
 * Revoke all OTHER sessions (keeps the caller's current session
 * alive — Auth0 / Okta canon for "sign me out of other devices").
 */
export async function revokeOtherSessions(reason?: string): Promise<{ revoked_count: number }> {
	const body: { except_current: true; reason?: string } = { except_current: true };
	if (reason) body.reason = reason;
	const raw = await api.delete<unknown>('/v1/auth/sessions', body);
	return parseResponse(z.object({ revoked_count: z.number().int().nonnegative() }), raw);
}
