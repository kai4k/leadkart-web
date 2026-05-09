/**
 * Tests for the JWT principal-claims decoder. Fixtures are real
 * base64url-encoded JWTs (no signature verification — the decoder
 * only reads the payload segment).
 *
 * These tests pin the contract: any future leadkart-go change to the
 * `Claims` struct in `internal/identity/app/jwt/jwt.go` that renames
 * a custom claim (tenant_id, membership_id, …) breaks here, surfacing
 * the wire-shape drift before the SPA fails to mount in production.
 */
import { describe, expect, it } from 'vitest';
import { decodeJwtPrincipal, JwtDecodeError } from '$lib/api/jwt';

/**
 * Builds a fake JWT with the given payload object. Header + signature
 * are static placeholders — the decoder ignores both.
 */
function fakeJwt(payload: Record<string, unknown>): string {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'k1' }));
	const body = base64url(JSON.stringify(payload));
	const sig = 'fake-signature-not-verified';
	return `${header}.${body}.${sig}`;
}

function base64url(s: string): string {
	// btoa needs a binary string; encode UTF-8 first via TextEncoder.
	const bytes = new TextEncoder().encode(s);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('decodeJwtPrincipal', () => {
	it('extracts the full leadkart-go claim shape', () => {
		const token = fakeJwt({
			sub: 'person-uuid-1',
			tenant_id: 'tenant-uuid-1',
			tenant_slug: 'acme',
			membership_id: 'membership-uuid-1',
			security_stamp: 'stamp-1',
			is_platform: false,
			is_super_user: true,
			permission: ['identity.tenants.update', 'identity.users.create'],
			exp: 1_900_000_000,
			iat: 1_899_999_000,
			iss: 'leadkart-identity',
			aud: ['leadkart-api']
		});

		const claims = decodeJwtPrincipal(token);

		expect(claims).toEqual({
			personId: 'person-uuid-1',
			tenantId: 'tenant-uuid-1',
			tenantSlug: 'acme',
			membershipId: 'membership-uuid-1',
			securityStamp: 'stamp-1',
			isPlatform: false,
			isSuperUser: true,
			permissions: ['identity.tenants.update', 'identity.users.create'],
			expiresAt: 1_900_000_000
		});
	});

	it('handles UTF-8 in claims (e.g. Hindi / emoji in tenant_slug)', () => {
		const token = fakeJwt({
			sub: 'person-1',
			tenant_id: 'tenant-1',
			tenant_slug: 'मेड-स्टोर',
			membership_id: 'm-1',
			exp: 1_900_000_000
		});

		const claims = decodeJwtPrincipal(token);
		expect(claims.tenantSlug).toBe('मेड-स्टोर');
	});

	it('omits optional claims when absent', () => {
		const token = fakeJwt({
			sub: 'person-1',
			tenant_id: 'tenant-1',
			membership_id: 'm-1',
			exp: 1_900_000_000
		});

		const claims = decodeJwtPrincipal(token);
		expect(claims.tenantSlug).toBeUndefined();
		expect(claims.securityStamp).toBeUndefined();
		expect(claims.isPlatform).toBeUndefined();
		expect(claims.permissions).toBeUndefined();
	});

	it('throws JwtDecodeError on malformed token (wrong segment count)', () => {
		expect(() => decodeJwtPrincipal('only.two')).toThrowError(JwtDecodeError);
		expect(() => decodeJwtPrincipal('a.b.c.d')).toThrowError(JwtDecodeError);
		expect(() => decodeJwtPrincipal('')).toThrowError(JwtDecodeError);
	});

	it('throws JwtDecodeError when payload is not valid base64url JSON', () => {
		expect(() => decodeJwtPrincipal('header.not!valid!base64.sig')).toThrowError(JwtDecodeError);
	});

	it('throws JwtDecodeError when required claims are missing', () => {
		const noSub = fakeJwt({ tenant_id: 't-1', membership_id: 'm-1', exp: 1 });
		expect(() => decodeJwtPrincipal(noSub)).toThrowError(/sub/);

		const noTenant = fakeJwt({ sub: 'p-1', membership_id: 'm-1', exp: 1 });
		expect(() => decodeJwtPrincipal(noTenant)).toThrowError(/tenant_id/);

		const noMembership = fakeJwt({ sub: 'p-1', tenant_id: 't-1', exp: 1 });
		expect(() => decodeJwtPrincipal(noMembership)).toThrowError(/membership_id/);

		const noExp = fakeJwt({ sub: 'p-1', tenant_id: 't-1', membership_id: 'm-1' });
		expect(() => decodeJwtPrincipal(noExp)).toThrowError(/exp/);
	});
});
