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
	userDtoSchema,
	listSessionsResponseSchema,
	capabilitiesSchema
} from './schemas';
import type { LoginRequest, UserDto, SessionDto, UpdateProfileRequest } from './types';
import { z } from 'zod';

export type Capabilities = z.output<typeof capabilitiesSchema>;

/**
 * Browser-visible login result. `must_change_password` is set when the
 * user's account requires a fresh password before any other operation
 * (ADR 0053: invite-issued passwords, expired credentials, admin force).
 * Caller redirects to /must-change-password when true.
 */
export interface LoginResult {
	ok: true;
	must_change_password: boolean;
}

/**
 * Login error subclass — carries the Retry-After header from 423
 * responses so the signin form can render a countdown.
 */
export class LoginError extends Error {
	status: number;
	code?: string;
	retryAfterSeconds?: number;
	constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
		super(message);
		this.status = status;
		this.code = code;
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

/**
 * BFF login — POSTs credentials to /auth/login (SvelteKit BFF endpoint,
 * not Go directly). The BFF forwards to Go and sets httpOnly cookies.
 * Returns `{ ok, must_change_password }` on success; browser never sees
 * tokens.
 *
 * On 423 (account locked per ADR 0053), the BFF forwards Go's
 * Retry-After header — surfaced on the thrown LoginError so the form
 * can render "try again in N seconds".
 */
export async function login(body: LoginRequest): Promise<LoginResult> {
	loginRequestSchema.parse(body);

	const raw = await fetch('/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (!raw.ok) {
		const text = await raw.text();
		let parsed: { code?: string; message?: string } = {};
		try {
			parsed = JSON.parse(text);
		} catch {
			/* non-JSON */
		}
		const retryAfterRaw = raw.headers.get('retry-after');
		const retryAfterSeconds =
			retryAfterRaw && !Number.isNaN(Number(retryAfterRaw)) ? Number(retryAfterRaw) : undefined;
		throw new LoginError(
			parsed.message ?? 'Login failed',
			raw.status,
			parsed.code,
			retryAfterSeconds
		);
	}
	const result = (await raw.json()) as { ok: true; must_change_password?: boolean };
	return { ok: true, must_change_password: result.must_change_password ?? false };
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
 * Authenticated. Initiates an email change. Go emails a one-shot
 * confirmation link to the NEW address; the change does not apply until
 * the user clicks the link (handled by confirmEmailChange below). Returns
 * 204 on success; backend may emit 409 if the new email is already in use.
 */
export async function requestEmailChange(body: { new_email: string }): Promise<void> {
	await api.post<void>('/v1/auth/request-email-change', body);
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
	throw await readBffError(resp, 'Email change confirmation failed');
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
 * Public — no auth required. Forwards to Go's POST /api/v1/auth/request-password-reset.
 * Go always returns 204 regardless of whether the email is registered
 * (Auth0/Okta canon — defeats account enumeration). The caller cannot
 * distinguish "email valid" from "email unknown" and must show identical
 * success copy either way.
 */
export async function requestPasswordReset(body: { email: string }): Promise<void> {
	const resp = await fetch('/auth/request-password-reset', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (resp.ok) return;
	throw await readBffError(resp, 'Could not send reset email');
}

/**
 * Public — no auth required. Confirms a password reset using the signed
 * token Go emailed. Token is single-use and time-boxed server-side.
 *
 * Failure modes (server-mapped — caller switches on err.status + err.code):
 *   400 invalid_token / token_consumed / token_expired → top banner
 *   422 password_breached → field error on new_password
 *   422 password_same     → field error on new_password
 *   422 weak_password     → field error on new_password
 */
export async function resetPassword(body: { token: string; new_password: string }): Promise<void> {
	const resp = await fetch('/auth/reset-password', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (resp.ok) return;
	throw await readBffError(resp, 'Reset failed');
}

async function readBffError(resp: Response, fallback: string): Promise<Error> {
	const text = await resp.text();
	let parsed: { code?: string; message?: string; error?: string } = {};
	try {
		parsed = JSON.parse(text);
	} catch {
		/* non-JSON */
	}
	const err = new Error(parsed.message ?? parsed.error ?? fallback);
	(err as Error & { status: number; code?: string }).status = resp.status;
	(err as Error & { status: number; code?: string }).code = parsed.code ?? parsed.error;
	return err;
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
