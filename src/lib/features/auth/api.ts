/**
 * Typed wrappers around the leadkart-go Identity auth endpoints.
 * Per `architecture.md` "Cross-cutting query contracts": typed feature
 * API calls, NOT raw fetch in components.
 */
import { api } from '$api/client';
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from './types';

export function login(body: LoginRequest): Promise<LoginResponse> {
	return api.post<LoginResponse>('/v1/auth/login', body, { auth: false });
}

export function refresh(body: RefreshRequest): Promise<RefreshResponse> {
	return api.post<RefreshResponse>('/v1/auth/refresh', body, { auth: false });
}

export function logout(refreshToken: string): Promise<void> {
	return api.post<void>('/v1/auth/logout', { refresh_token: refreshToken });
}
