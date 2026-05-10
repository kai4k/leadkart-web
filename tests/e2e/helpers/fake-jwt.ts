/**
 * Test helper — mints a base64url-encoded JWT with the leadkart-go
 * principal-claim shape so e2e specs can mock /v1/auth/login without
 * a real backend. The token is structurally valid (3 dot-separated
 * base64url segments, decodable JSON payload, required claims
 * present) so `lib/api/jwt.ts` decodeJwtPrincipal() accepts it. The
 * signature is a placeholder — the SPA never verifies signatures
 * client-side (the server already did).
 *
 * Without this, every e2e mockLogin call ships
 * `access_token: 'fake-access-token'` which fails JWT decode → the
 * SigninForm catch block → /dashboard redirect never fires → every
 * subsequent step in the test suite times out.
 */

export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000a01';
export const TEST_MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000b01';
export const TEST_TENANT_SLUG = 'acme';

/**
 * Mints a fake-but-decodable JWT. Caller can override individual
 * claims (e.g. is_platform: true) for permission-gated tests.
 */
export function fakeAccessToken(overrides: Record<string, unknown> = {}): string {
	const nowSec = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'test-key' }));
	const payload = base64url(
		JSON.stringify({
			sub: TEST_PERSON_ID,
			tenant_id: TEST_TENANT_ID,
			tenant_slug: TEST_TENANT_SLUG,
			membership_id: TEST_MEMBERSHIP_ID,
			security_stamp: 'test-stamp',
			is_platform: false,
			is_super_user: false,
			permission: [],
			iat: nowSec,
			nbf: nowSec,
			exp: nowSec + 3600,
			iss: 'leadkart-identity-test',
			aud: ['leadkart-api'],
			jti: 'test-jti',
			...overrides
		})
	);
	return `${header}.${payload}.fake-signature-not-verified`;
}

/**
 * Wire shape of leadkart-go's `POST /v1/auth/login` 200 response
 * (per `internal/identity/ports/dto.go` LoginResponse). The principal
 * lives in the JWT, not the body.
 *
 * Optional `claimOverrides` lets a test mint a tier-specific JWT
 * (e.g. `{ is_platform: true }` for Platform-tier tests, or
 * `{ permission: ['tenant.admin'] }` for tenant-admin tier).
 */
export function fakeLoginResponse(claimOverrides: Record<string, unknown> = {}): {
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	token_type: string;
} {
	return {
		access_token: fakeAccessToken(claimOverrides),
		refresh_token: 'fake-refresh-token',
		access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
		token_type: 'Bearer'
	};
}

function base64url(s: string): string {
	return Buffer.from(s, 'utf-8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
