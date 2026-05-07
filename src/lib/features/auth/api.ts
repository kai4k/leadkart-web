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
