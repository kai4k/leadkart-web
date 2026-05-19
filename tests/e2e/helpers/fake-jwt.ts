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
 *
 * Also exports DTO fakes for the canonical Phase D/E/F endpoints:
 *   GET /v1/auth/me/capabilities  → fakeCapabilitiesResponse()
 *   GET /v1/users/:id             → fakeUserDto()
 *   GET /v1/auth/sessions         → fakeSessionDto()
 *   GET /v1/tenants/:id           → fakeTenantDto()
 *
 * All shapes are derived directly from the Zod schemas in
 * src/lib/features/auth/schemas.ts so they parse without errors.
 */

export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000a01';
export const TEST_MEMBERSHIP_ID = '00000000-0000-0000-0000-000000000b01';
export const TEST_TENANT_SLUG = 'acme';
/** Fake refresh-token family ID — used by SessionsStore.activeFamilyId to badge "This device". */
export const TEST_FAMILY_ID = 'test-family-id';

// ── Tier / Permission types ────────────────────────────────────────

export type Tier = 'platform-super' | 'platform-staff' | 'tenant-admin' | 'tenant-user' | 'unknown';
export type Permission = string;

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
 * Mints a fake-but-decodable refresh token JWT. The `fam` claim is
 * used by SessionStore.activeFamilyId to identify the current device
 * row in SessionsList without an extra API round-trip.
 */
export function fakeRefreshToken(familyId: string = TEST_FAMILY_ID): string {
	const nowSec = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'test-key' }));
	const payload = base64url(
		JSON.stringify({
			sub: TEST_PERSON_ID,
			tenant_id: TEST_TENANT_ID,
			fam: familyId,
			iat: nowSec,
			exp: nowSec + 86400,
			iss: 'leadkart-identity-test',
			aud: ['leadkart-api'],
			jti: 'test-refresh-jti'
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
		refresh_token: fakeRefreshToken(),
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

// ── Canonical DTO fakes — derived from schemas.ts ─────────────────

/**
 * Canonical GET /v1/auth/me/capabilities response matching
 * capabilitiesSchema. Must be returned by every (app) route that
 * signs in — the Sidebar + UserMenu query this on mount.
 *
 * NOTE: `tier` is NOT a backend field — it is derived client-side via
 * deriveTier(). Do not pass `tier` here; pass is_platform + is_super_user
 * + permissions instead so deriveTier() produces the right result.
 */
export function fakeCapabilitiesResponse(overrides?: {
	permissions?: Permission[];
	is_platform?: boolean;
	is_super_user?: boolean;
	tenant_id?: string;
	tenant_slug?: string;
	membership_id?: string;
	person_id?: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	roles?: Array<{ id: string; name: string; is_super_admin: boolean }>;
}) {
	return {
		person_id: overrides?.person_id ?? TEST_PERSON_ID,
		membership_id: overrides?.membership_id ?? TEST_MEMBERSHIP_ID,
		tenant_id: overrides?.tenant_id ?? TEST_TENANT_ID,
		tenant_slug: overrides?.tenant_slug ?? TEST_TENANT_SLUG,
		email: overrides?.email ?? 'test@example.com',
		first_name: overrides?.first_name ?? 'Test',
		last_name: overrides?.last_name ?? 'User',
		is_platform: overrides?.is_platform ?? false,
		is_super_user: overrides?.is_super_user ?? false,
		permissions: overrides?.permissions ?? [],
		roles: overrides?.roles ?? []
	};
}

/**
 * Canonical UserDto matching userDtoSchema (GET /v1/users/:membership_id).
 * All nullable fields default to null; optional arrays default to [].
 */
export interface UserDto {
	membership_id: string;
	person_id: string;
	tenant_id: string;
	email: string;
	first_name: string;
	last_name: string;
	status: 'active' | 'inactive' | 'pending';
	designation: string;
	department: string;
	status_message: string;
	joined_at: string;
	left_at: string | null;
	reports_to: string | null;
	role_ids: string[];
}

export function fakeUserDto(overrides?: Partial<UserDto>): UserDto {
	return {
		membership_id: TEST_MEMBERSHIP_ID,
		person_id: TEST_PERSON_ID,
		tenant_id: TEST_TENANT_ID,
		email: 'test@example.com',
		first_name: 'Test',
		last_name: 'User',
		status: 'active',
		designation: '',
		department: '',
		status_message: '',
		joined_at: '2026-01-01T00:00:00Z',
		left_at: null,
		reports_to: null,
		role_ids: [],
		...overrides
	};
}

/**
 * Canonical SessionDto matching sessionDtoSchema.
 */
export interface SessionDto {
	family_id: string;
	tenant_id: string;
	device_label: string;
	created_at: string;
	last_used_at: string;
}

export function fakeSessionDto(overrides?: Partial<SessionDto>): SessionDto {
	return {
		family_id: TEST_FAMILY_ID,
		tenant_id: TEST_TENANT_ID,
		device_label: 'Test Browser',
		created_at: '2026-05-01T10:00:00Z',
		last_used_at: '2026-05-18T10:00:00Z',
		...overrides
	};
}

/**
 * Canonical TenantDto — mirrors the shape the existing spec fixtures use
 * plus the fields the tenantDtoSchema requires for Zod parsing.
 */
export interface TenantDto {
	id: string;
	slug: string;
	legal_name: string;
	display_name: string;
	status: string;
	created_at: string;
	admin_address: {
		street?: string;
		city?: string;
		district?: string;
		state?: string;
		state_code?: string;
		pincode?: string;
	};
	password_policy: {
		min_length: number;
		require_uppercase: boolean;
		require_lowercase: boolean;
		require_digit: boolean;
		require_symbol: boolean;
		max_failed_attempts: number;
		lockout_minutes: number;
	};
	gst_number?: string;
	pan_number?: string;
	drug_licence_number?: string;
	admin_phone?: string;
	admin_email?: string;
	locale?: string;
	time_zone?: string;
	date_format?: string;
	currency?: string;
}

export function fakeTenantDto(overrides?: Partial<TenantDto>): TenantDto {
	return {
		id: TEST_TENANT_ID,
		slug: TEST_TENANT_SLUG,
		legal_name: 'Test Tenant Pvt Ltd',
		display_name: 'Test Tenant',
		status: 'active',
		created_at: '2026-01-01T00:00:00Z',
		admin_address: {},
		password_policy: {
			min_length: 8,
			require_uppercase: false,
			require_lowercase: false,
			require_digit: false,
			require_symbol: false,
			max_failed_attempts: 5,
			lockout_minutes: 15
		},
		gst_number: '',
		pan_number: '',
		drug_licence_number: '',
		admin_phone: '',
		admin_email: '',
		locale: 'en-IN',
		time_zone: 'Asia/Kolkata',
		date_format: 'DD/MM/YYYY',
		currency: 'INR',
		...overrides
	};
}

/**
 * Cursor-paginated empty result for list endpoints.
 * The key must match what the page's query returns.
 */
export function fakeEmptyListResponse(
	key: 'users' | 'tenants' | 'roles' | 'sessions' | 'memberships' | 'items'
) {
	return { [key]: [], next_cursor: null };
}
