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

/**
 * Wire shape of leadkart-go's `POST /v1/auth/login` 200 body. Mirrors
 * `internal/identity/ports/dto.go` LoginResponse exactly — principal
 * claims (person_id / tenant_id / membership_id) are NOT echoed in
 * the body; they live in the access_token JWT payload and are
 * extracted client-side via `lib/api/jwt.ts` decodeJwtPrincipal().
 */
export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	token_type: string;
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
	tenantSlug?: string;
	membershipId: string;
	/** Captured at login-form submit time — server doesn't echo it. */
	email: string;
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: Date;
	isPlatform?: boolean;
	isSuperUser?: boolean;
	permissions?: string[];
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
