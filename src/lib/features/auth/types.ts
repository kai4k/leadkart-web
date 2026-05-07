/**
 * Auth feature types — mirrors the leadkart-go Identity HTTP DTOs.
 * Until OpenAPI codegen lands (`openapi-typescript api/openapi.yaml`),
 * these are hand-typed against the .NET `security.md` "Login flow"
 * contract that leadkart-go has shipped.
 */

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	person_id: string;
	tenant_id: string;
	membership_id: string;
}

export interface RefreshRequest {
	refresh_token: string;
}

export interface RefreshResponse {
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
}

export interface SessionPrincipal {
	personId: string;
	tenantId: string;
	membershipId: string;
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: Date;
}
