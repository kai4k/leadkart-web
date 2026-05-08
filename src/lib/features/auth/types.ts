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

// Password reset (anonymous) — request emails a reset link; confirm
// exchanges the token for a password update. Both 204 on success.
export interface RequestPasswordResetRequest {
	email: string;
}

export interface ResetPasswordRequest {
	token: string;
	new_password: string;
}

// Email-change confirmation (anonymous) — the token is the proof of
// email ownership; no auth required.
export interface ConfirmEmailChangeRequest {
	token: string;
}
