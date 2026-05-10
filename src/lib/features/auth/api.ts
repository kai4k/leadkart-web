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
 * Surface intentionally minimal: only the authenticated-user flows
 * (login, silent refresh, logout, change-password) are wired. Per
 * the LeadKart auth model:
 *
 *   - Self-serve registration is DISABLED. SuperAdmin creates tenants;
 *     TenantOwner / TenantAdmin / SuperAdmin create users within
 *     tenants. No `/register` route exists.
 *   - Forgot-password email-link flow is DISABLED. Users who forget
 *     their password ask their admin to reset it (admin-tier endpoint
 *     to be added later). The only self-service password update is
 *     `changePassword` (requires current password).
 *   - Self-service email change is DISABLED. Email changes happen via
 *     admin tooling only (admin-tier endpoint to be added later).
 *
 * Backend endpoints `request-password-reset`, `reset-password`,
 * `request-email-change`, `confirm-email-change` still exist on
 * leadkart-go but are not exposed in this SPA.
 */
import { api } from '$api/client';
import { loginResponseSchema, refreshResponseSchema } from './schemas';
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from './types';

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
