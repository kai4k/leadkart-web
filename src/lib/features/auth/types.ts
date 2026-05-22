import type { z } from 'zod';
import type {
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema,
	updateProfileRequestSchema,
	resetWithOldPasswordSchema
} from './schemas';

/**
 * Auth feature types — mirrors the leadkart-go Identity HTTP DTOs.
 *
 * BFF model: login/logout no longer surface tokens to the browser.
 * LoginResponse is now { ok: true } — tokens are in httpOnly cookies
 * managed by the SvelteKit BFF. SessionPrincipal no longer carries
 * accessToken/refreshToken/accessTokenExpiresAt — those are opaque
 * to the browser. Principal is derived from SSR-bootstrapped capabilities.
 */

export interface LoginRequest {
	email: string;
	password: string;
}

/** BFF login success — just an acknowledgement. Tokens are in cookies. */
export interface LoginResponse {
	ok: true;
}

export interface SessionPrincipal {
	personId: string;
	tenantId: string;
	tenantSlug?: string;
	membershipId: string;
	/** Captured from capabilities endpoint — email is in the server-side payload. */
	email: string;
	isPlatform?: boolean;
	isSuperUser?: boolean;
	permissions?: string[];
}

export type UserDto = z.output<typeof userDtoSchema>;
export type SessionDto = z.output<typeof sessionDtoSchema>;
export type ListSessionsResponse = z.output<typeof listSessionsResponseSchema>;
export type UpdateProfileRequest = z.output<typeof updateProfileRequestSchema>;
export type ResetWithOldPasswordRequest = z.output<typeof resetWithOldPasswordSchema>;
