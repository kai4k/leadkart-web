/**
 * Typed wrappers around the leadkart-go Identity auth endpoints.
 * Per `architecture.md` "Cross-cutting query contracts": typed feature
 * API calls, NOT raw fetch in components.
 *
 * Each response is parsed through its Zod schema before being handed
 * to callers — boundary validation per industry canon (Stripe SDK,
 * tRPC, TanStack Query). Schema mismatch surfaces here, not deep in
 * the call stack.
 */
import { api } from '$api/client';
import { loginResponseSchema, refreshResponseSchema } from './schemas';
import type {
	ConfirmEmailChangeRequest,
	LoginRequest,
	LoginResponse,
	RefreshRequest,
	RefreshResponse,
	RequestPasswordResetRequest,
	ResetPasswordRequest
} from './types';

export async function login(body: LoginRequest): Promise<LoginResponse> {
	const raw = await api.post<unknown>('/v1/auth/login', body, { auth: false });
	return loginResponseSchema.parse(raw);
}

export async function refresh(body: RefreshRequest): Promise<RefreshResponse> {
	const raw = await api.post<unknown>('/v1/auth/refresh', body, { auth: false });
	return refreshResponseSchema.parse(raw);
}

export function logout(refreshToken: string): Promise<void> {
	return api.post<void>('/v1/auth/logout', { refresh_token: refreshToken });
}

/**
 * Anonymous endpoint. Always resolves on a 2xx (the server returns 204
 * regardless of whether the email is registered, per Auth0 / Okta
 * enumeration-safety canon).
 */
export function requestPasswordReset(body: RequestPasswordResetRequest): Promise<void> {
	return api.post<void>('/v1/auth/request-password-reset', body, { auth: false });
}

/**
 * Anonymous endpoint. Server validates the token + applies the new
 * password. Errors:
 *   400 reset_token_invalid          — bad / expired / already-used token
 *   422 password_breached            — present in HIBP-style breach DB
 *   422 password_same_as_current     — must differ from the current one
 */
export function confirmPasswordReset(body: ResetPasswordRequest): Promise<void> {
	return api.post<void>('/v1/auth/reset-password', body, { auth: false });
}

/**
 * Authenticated. The server verifies current_password even with a
 * valid bearer (per security.md "Password change") so a stolen access
 * token can't permanently take over an account.
 *   401 incorrect_current_password   — wrong current_password (also
 *                                      collapses with "user disabled"
 *                                      for timing safety)
 *   422 password_breached
 *   422 password_same_as_current
 */
export function changePassword(body: {
	current_password: string;
	new_password: string;
}): Promise<void> {
	return api.post<void>('/v1/auth/change-password', body);
}

/**
 * Authenticated. Server emails the confirmation link to the NEW
 * address; the recipient confirms via confirmEmailChange (anonymous).
 *   400 invalid_email
 *   400 email_change_rejected         — domain rule rejected
 *   409 email_already_taken
 */
export function requestEmailChange(body: { new_email: string }): Promise<void> {
	return api.post<void>('/v1/auth/request-email-change', body);
}

/**
 * Anonymous. The token IS the proof of email ownership — works with
 * or without an active session.
 *   400 email_change_token_invalid    — bad / expired / already-used
 */
export function confirmEmailChange(body: ConfirmEmailChangeRequest): Promise<void> {
	return api.post<void>('/v1/auth/confirm-email-change', body, { auth: false });
}
