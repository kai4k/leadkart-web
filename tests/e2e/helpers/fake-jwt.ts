/**
 * Test helper — mints JWT fixtures and DTO fakes for e2e and unit tests.
 *
 * BFF model (2026-05-20): the browser no longer decodes JWTs. However,
 * these helpers are still needed because:
 *   1. The BFF proxy makes server-to-server calls to Go using Bearer JWTs.
 *      A mock Go server (for e2e) needs to return structurally valid tokens.
 *   2. Unit tests for lib/api/jwt.ts (the decoder used server-side) still
 *      need fakeAccessToken() to produce valid inputs.
 *   3. fakeCapabilitiesResponse(), fakeUserDto(), etc. are the canonical
 *      DTO fakes used everywhere — independent of the auth transport.
 *
 * Note: fakeRefreshToken() is kept because the mock Go server needs to
 * return a refresh token that the BFF can forward back to Go on refresh.
 * The browser no longer decodes the refresh token (it's httpOnly).
 *
 * DTO fakes for the canonical Phase D/E/F endpoints:
 *   GET /v1/auth/me/capabilities  → fakeCapabilitiesResponse()
 *   GET /v1/users/:id             → fakeUserDto()
 *   GET /v1/auth/sessions         → fakeSessionDto()
 *   GET /v1/tenants/:id           → fakeTenantDto()
 *
 * Every builder returns a body that parses with Go's GENERATED schema
 * (src/lib/api/generated; asserted in tests/unit/contract/fixture-contract.test.ts),
 * so the web's own schemas are exercised on bodies Go could really send.
 */

export const TEST_TENANT_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_PERSON_ID = '00000000-0000-4000-8000-000000000a01';
export const TEST_MEMBERSHIP_ID = '00000000-0000-4000-8000-000000000b01';
export const TEST_TENANT_SLUG = 'acme';
/** Fake refresh-token family ID — used to populate fake session DTOs. */
export const TEST_FAMILY_ID = '00000000-0000-4000-8000-000000000f01';

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
	must_change_password: boolean;
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	token_type: string;
} {
	return {
		access_token: fakeAccessToken(claimOverrides),
		refresh_token: fakeRefreshToken(),
		access_token_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
		token_type: 'Bearer',
		must_change_password: false
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
 * `effective_permissions` is what the web authorises on (Go expands
 * tenant.admin / super-user authority into it server-side); `rank` and
 * `tier` are Go's seniority, presentation only.
 */
/** Go's default password rules (`GET /auth/me/capabilities` `password_policy`). */
export const DEFAULT_PASSWORD_RULES = {
	min_length: 8,
	max_length: 1024,
	requires_uppercase: true,
	requires_lowercase: true,
	requires_digit: true,
	requires_symbol: true
};

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
	/** What Go computed for the caller; defaults to `permissions` (no expansion). */
	effective_permissions?: Permission[];
	/** Seniority (0 = owner, 99 = no role) and its band; presentation only. */
	rank?: number;
	tier?: 'owner' | 'admin' | 'manager' | 'team_lead' | 'user';
	must_change_password?: boolean;
	/** Only an impersonation session's own token carries it. */
	impersonation?: { session_id: string; tenant_display_name: string };
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
		effective_permissions: overrides?.effective_permissions ?? overrides?.permissions ?? [],
		roles: overrides?.roles ?? [],
		rank: overrides?.rank ?? 99,
		tier: overrides?.tier ?? 'user',
		must_change_password: overrides?.must_change_password ?? false,
		// the caller's own tenant's rules (the 8-character default of the owner's ruling, 2026-11-21)
		password_policy: DEFAULT_PASSWORD_RULES,
		...(overrides?.impersonation ? { impersonation: overrides.impersonation } : {})
	};
}

/**
 * Canonical UserDto matching userDtoSchema (GET /v1/users/:membership_id).
 * Go omits empty optional fields (omitzero), so left_at / reports_to are absent by default.
 */
export interface UserDto {
	membership_id: string;
	person_id: string;
	tenant_id: string;
	email: string;
	first_name: string;
	last_name: string;
	status: 'active' | 'inactive';
	designation?: string;
	department?: string;
	status_message?: string;
	joined_at: string;
	left_at?: string;
	reports_to?: string;
	role_ids: string[];
}

/**
 * What Go does for an `omitzero` string: an empty value is ABSENT from the JSON, never `''`.
 * Applied to every builder's output (overrides included), so a fixture cannot send what Go never sends.
 */
function omitEmptyStrings<T extends object>(dto: T, keys: ReadonlyArray<keyof T>): T {
	const out = { ...dto };
	for (const key of keys) if ((out[key] as unknown) === '') delete out[key];
	return out;
}

const USER_OMITZERO = [
	'designation',
	'department',
	'status_message',
	'left_at',
	'reports_to'
] as const;

export function fakeUserDto(overrides?: Partial<UserDto>): UserDto {
	return omitEmptyStrings(
		{
			membership_id: TEST_MEMBERSHIP_ID,
			person_id: TEST_PERSON_ID,
			tenant_id: TEST_TENANT_ID,
			email: 'test@example.com',
			first_name: 'Test',
			last_name: 'User',
			status: 'active',
			joined_at: '2026-01-01T00:00:00Z',
			role_ids: [],
			...overrides
		},
		USER_OMITZERO
	);
}

/**
 * Canonical SessionDto matching sessionDtoSchema.
 */
export interface SessionDto {
	family_id: string;
	tenant_id: string;
	device_label: string;
	last_used_at: string;
	is_current: boolean;
	last_used_at: string;
}

export function fakeSessionDto(overrides?: Partial<SessionDto>): SessionDto {
	return {
		family_id: TEST_FAMILY_ID,
		tenant_id: TEST_TENANT_ID,
		device_label: 'Test Browser',
		created_at: '2026-05-01T10:00:00Z',
		last_used_at: '2026-05-18T10:00:00Z',
		is_current: true,
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
	locale?: string;
	time_zone?: string;
	date_format?: string;
	currency?: string;
}

const TENANT_OMITZERO = [
	'gst_number',
	'pan_number',
	'drug_licence_number',
	'admin_phone',
	'locale',
	'time_zone',
	'date_format',
	'currency'
] as const;

/**
 * The policy Go reports for a company that never saved one: `DefaultPasswordPolicy()` at
 * leadkart-go 6ebcddf (internal/identity/domain/tenant/settings.go) projected on every read
 * (query/tenant.go). 8 characters, all four classes, 5 attempts, 15 minutes.
 */
export const DEFAULT_PASSWORD_POLICY: TenantDto['password_policy'] = {
	min_length: 8,
	require_uppercase: true,
	require_lowercase: true,
	require_digit: true,
	require_symbol: true,
	max_failed_attempts: 5,
	lockout_minutes: 15
};

export function fakeTenantDto(overrides?: Partial<TenantDto>): TenantDto {
	return omitEmptyStrings(
		{
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
			locale: 'en-IN',
			time_zone: 'Asia/Kolkata',
			date_format: 'DD/MM/YYYY',
			currency: 'INR',
			...overrides
		},
		TENANT_OMITZERO
	);
}
