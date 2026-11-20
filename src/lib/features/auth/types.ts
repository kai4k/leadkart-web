import type { z } from 'zod';
import type { userDtoSchema, sessionDtoSchema, listSessionsResponseSchema } from './schemas';

/**
 * Auth feature types — mirrors the leadkart-go Identity HTTP DTOs.
 *
 * BFF model: login/logout no longer surface tokens to the browser.
 * LoginResponse is now { ok: true } — tokens are in httpOnly cookies
 * managed by the SvelteKit BFF. SessionPrincipal no longer carries
 * accessToken/refreshToken/accessTokenExpiresAt — those are opaque
 * to the browser. Principal is derived from SSR-bootstrapped capabilities.
 */

/** BFF login success — just an acknowledgement. Tokens are in cookies. */
export interface LoginResponse {
	ok: true;
}

export interface SessionPrincipal {
	personId: string;
	tenantId: string;
	tenantSlug?: string;
	membershipId: string;
	/** From the capabilities payload; Go omits it when empty (omitzero), so it may be absent. */
	email?: string;
	isPlatform?: boolean;
	/** Presentation only (badges, wording): never authorise on these. */
	tier?: 'owner' | 'admin' | 'manager' | 'team_lead' | 'user';
	rank?: number;
}

export type UserDto = z.output<typeof userDtoSchema>;
export type SessionDto = z.output<typeof sessionDtoSchema>;
export type ListSessionsResponse = z.output<typeof listSessionsResponseSchema>;
