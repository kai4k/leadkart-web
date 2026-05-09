/**
 * Tiny JWT payload decoder — extracts principal claims from a leadkart-go
 * access token. The Identity module's LoginResponse intentionally
 * ships ONLY `{access_token, refresh_token, access_token_expires_at,
 * token_type}` (per security.md "BFF cookie" — refresh-token plaintext
 * in body, principal claims in JWT). Everything the SPA needs about
 * the signed-in user is encoded in the access token's claims.
 *
 * Claims shape mirrors leadkart-go `internal/identity/app/jwt/jwt.go`:
 *
 *   sub             → person ID (RegisteredClaims.Subject)
 *   tenant_id       → tenant ID (custom)
 *   tenant_slug     → tenant slug (custom)
 *   membership_id   → membership ID (custom)
 *   security_stamp  → for cache invalidation on credential rotation
 *   is_platform     → operator flag (Platform-tier endpoints gate on this)
 *   is_super_user   → tenant-level SuperAdmin flag
 *   permission      → multi-valued permission claim
 *   exp             → expiry (RegisteredClaims.ExpiresAt, unix seconds)
 *
 * Why client-side decode (vs jwt-decode npm pkg ~1.6 KB gzip): the
 * job is one base64url-decode + one JSON.parse. The dep is heavier
 * than the code it replaces. We DO NOT verify the signature — the
 * server already verified it before returning the token; the client
 * trusts what the server signed. Verification on the client is
 * security theatre (the client could just lie to itself).
 */

export interface JwtPrincipalClaims {
	personId: string;
	tenantId: string;
	tenantSlug?: string;
	membershipId: string;
	securityStamp?: string;
	isPlatform?: boolean;
	isSuperUser?: boolean;
	permissions?: string[];
	/** Unix seconds when the token expires. */
	expiresAt: number;
}

export class JwtDecodeError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'JwtDecodeError';
	}
}

/**
 * Decodes the payload segment of a JWT (the middle of the three
 * dot-separated base64url segments). Does NOT verify the signature.
 *
 * Throws [JwtDecodeError] when the token is malformed, the payload
 * isn't valid base64url, or the JSON is broken — a well-formed
 * server-issued token is guaranteed to satisfy all three.
 */
export function decodeJwtPrincipal(token: string): JwtPrincipalClaims {
	const segments = token.split('.');
	if (segments.length !== 3) {
		throw new JwtDecodeError(`expected 3 JWT segments, got ${segments.length}`);
	}
	const payloadSegment = segments[1];
	let payload: Record<string, unknown>;
	try {
		const json = base64UrlDecode(payloadSegment);
		payload = JSON.parse(json) as Record<string, unknown>;
	} catch (cause) {
		throw new JwtDecodeError('payload is not valid base64url-encoded JSON', cause);
	}

	const sub = stringField(payload, 'sub');
	const tenantId = stringField(payload, 'tenant_id');
	const membershipId = stringField(payload, 'membership_id');
	const exp = numberField(payload, 'exp');

	if (!sub) throw new JwtDecodeError('JWT missing required `sub` claim');
	if (!tenantId) throw new JwtDecodeError('JWT missing required `tenant_id` claim');
	if (!membershipId) throw new JwtDecodeError('JWT missing required `membership_id` claim');
	if (!exp) throw new JwtDecodeError('JWT missing required `exp` claim');

	return {
		personId: sub,
		tenantId,
		tenantSlug: optionalString(payload, 'tenant_slug'),
		membershipId,
		securityStamp: optionalString(payload, 'security_stamp'),
		isPlatform: optionalBoolean(payload, 'is_platform'),
		isSuperUser: optionalBoolean(payload, 'is_super_user'),
		permissions: optionalStringArray(payload, 'permission'),
		expiresAt: exp
	};
}

function base64UrlDecode(segment: string): string {
	// JWT uses base64url (RFC 4648 §5): '-' instead of '+', '_' instead of '/',
	// padding stripped. Convert to standard base64 then decode.
	const normalised = segment.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
	// atob is sync + universal in browsers + Node 16+. No Buffer dep needed.
	const binary = atob(padded);
	// JWT payloads are UTF-8; atob produces a binary string — re-encode.
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder('utf-8').decode(bytes);
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
	const v = obj[key];
	return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function numberField(obj: Record<string, unknown>, key: string): number | undefined {
	const v = obj[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
	return stringField(obj, key);
}

function optionalBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
	const v = obj[key];
	return typeof v === 'boolean' ? v : undefined;
}

function optionalStringArray(obj: Record<string, unknown>, key: string): string[] | undefined {
	const v = obj[key];
	if (!Array.isArray(v)) return undefined;
	return v.every((s) => typeof s === 'string') ? (v as string[]) : undefined;
}
