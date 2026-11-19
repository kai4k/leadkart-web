import { describe, expect, it } from 'vitest';
import {
	SPEC_OVERRIDES,
	UNVALIDATED_PATHS,
	assertFixtures,
	validateFixture
} from '../../e2e/helpers/contract.ts';
import {
	CapabilitiesDto,
	LoginResponse,
	SessionDto,
	TenantDto,
	UserDto
} from '#lib/api/generated/index.ts';
import {
	fakeCapabilitiesResponse,
	fakeLoginResponse,
	fakeSessionDto,
	fakeTenantDto,
	fakeUserDto,
	TEST_MEMBERSHIP_ID
} from '../../e2e/helpers/fake-jwt.ts';
import type { MockFixture } from '../../e2e/helpers/mock.ts';

const fx = (
	f: Partial<MockFixture> & Pick<MockFixture, 'method' | 'path' | 'status'>
): MockFixture => f;

describe('validateFixture', () => {
	it('accepts a body that parses with the Go schema', () => {
		expect(
			validateFixture(
				fx({
					method: 'GET',
					path: '/api/v1/users',
					status: 200,
					body: { users: [], has_more: false }
				})
			)
		).toBeNull();
	});

	it('rejects a body that is not the Go shape (legacy cursor envelope)', () => {
		const err = validateFixture(
			fx({
				method: 'GET',
				path: '/api/v1/users',
				status: 200,
				body: { users: [], next_cursor: null }
			})
		);
		expect(err).toContain('has_more');
	});

	it('rejects a route that is not in the Go spec', () => {
		expect(
			validateFixture(fx({ method: 'GET', path: '/api/v1/no/such/route', status: 200, body: {} }))
		).toContain('not a route');
	});

	it('skips the unvalidated areas by default and validates them when strict', () => {
		const f = fx({ method: 'GET', path: '/api/v1/identity/memberships', status: 200, body: {} });
		expect(validateFixture(f)).toBeNull();
		expect(validateFixture(f, { strict: true })).toContain('not a route');
		const orders = fx({ method: 'GET', path: '/api/v1/orders/orders', status: 200, body: {} });
		expect(validateFixture(orders)).toBeNull();
		expect(validateFixture(orders, { strict: true })).toContain('not a route');
	});

	it('rejects a body on a 204 route', () => {
		expect(
			validateFixture(
				fx({
					method: 'POST',
					path: `/api/v1/users/${TEST_MEMBERSHIP_ID}/deactivate`,
					status: 200,
					body: { membership_id: TEST_MEMBERSHIP_ID }
				})
			)
		).toContain('answers 204');
	});

	it('accepts a bodyless 204 on a 204 route and rejects 200-without-204 status', () => {
		const path = `/api/v1/users/${TEST_MEMBERSHIP_ID}/deactivate`;
		expect(validateFixture(fx({ method: 'POST', path, status: 204 }))).toBeNull();
		expect(validateFixture(fx({ method: 'POST', path, status: 200 }))).toContain('answers 204');
	});

	it('rejects a 204 fixture on a route that returns a body', () => {
		expect(validateFixture(fx({ method: 'GET', path: '/api/v1/users', status: 204 }))).toContain(
			'returns a body'
		);
	});

	it('accepts every tenant status Go can send', () => {
		for (const status of ['pending_deletion', 'suspended', 'active']) {
			expect(
				validateFixture(
					fx({
						method: 'GET',
						path: `/api/v1/tenants/${fakeTenantDto().id}`,
						status: 200,
						body: fakeTenantDto({ status })
					})
				)
			).toBeNull();
		}
	});

	it("requires Go's ErrorResponse on error statuses", () => {
		const err = validateFixture(
			fx({
				method: 'POST',
				path: '/api/v1/auth/login',
				status: 401,
				body: { code: 'invalid_credentials' }
			})
		);
		expect(err).toContain('ErrorResponse');
		expect(
			validateFixture(
				fx({
					method: 'POST',
					path: '/api/v1/auth/login',
					status: 401,
					body: { error: 'invalid_credentials' }
				})
			)
		).toBeNull();
	});

	it('accepts a redirect on a real route and rejects one on a route Go does not have', () => {
		const id = TEST_MEMBERSHIP_ID;
		const headers = { location: '/elsewhere' };
		const ok = fx({ method: 'GET', path: `/api/v1/users/${id}`, status: 302, headers });
		expect(validateFixture(ok)).toBeNull();
		const ghost = fx({ method: 'GET', path: '/api/v1/things/1', status: 302, headers });
		expect(validateFixture(ghost)).toContain('not a route');
	});

	it('matches wildcard fixtures against routes under the prefix', () => {
		expect(
			validateFixture(
				fx({
					method: 'GET',
					path: '/api/v1/users*',
					status: 200,
					body: { users: [], has_more: false }
				})
			)
		).toBeNull();
		expect(
			validateFixture(
				fx({ method: 'GET', path: '/api/v1/nothing*', status: 404, body: { error: 'x' } })
			)
		).toContain('not a route');
	});

	it('assertFixtures lists every offending fixture', () => {
		expect(() =>
			assertFixtures([
				fx({
					method: 'GET',
					path: '/api/v1/users',
					status: 200,
					body: { users: [], has_more: false }
				}),
				fx({ method: 'GET', path: '/api/v1/ghost', status: 200, body: {} })
			])
		).toThrow(/GET \/api\/v1\/ghost \[200\]/);
	});
});

describe('fake builders are Go-valid', () => {
	it.each([
		['fakeTenantDto', TenantDto, fakeTenantDto()],
		['fakeUserDto', UserDto, fakeUserDto()],
		['fakeSessionDto', SessionDto, fakeSessionDto()],
		['fakeCapabilitiesResponse', CapabilitiesDto, fakeCapabilitiesResponse()],
		['fakeLoginResponse', LoginResponse, fakeLoginResponse()]
	])('%s parses with the generated Go schema', (_n, schema, body) => {
		const r = schema.safeParse(body);
		expect(r.success, r.success ? '' : r.error.message).toBe(true);
	});
});

describe('guard configuration', () => {
	it('keeps the unvalidated list exactly as agreed (each later task deletes its own entry)', () => {
		expect(UNVALIDATED_PATHS.map((re) => re.source)).toEqual(EXPECTED_UNVALIDATED);
	});

	it('every spec override names the Go file that proves it', () => {
		for (const o of SPEC_OVERRIDES) expect(o.reason).toMatch(/leadkart-go[\\/].+\.go/);
	});
});

// Pinned on purpose: adding an entry here must be a reviewed change.
const EXPECTED_UNVALIDATED: string[] = [
	String.raw`^\/api\/v1\/crm\/`,
	String.raw`^\/api\/v1\/identity\/memberships$`,
	String.raw`^\/api\/v1\/orders(\/|$)`,
	String.raw`^\/api\/v1\/dispatch\/`,
	String.raw`^\/api\/v1\/inventory\/`,
	String.raw`^\/api\/v1\/auth\/me\/activity$`,
	String.raw`^\/api\/v1\/tenants\/[^/]+\/activity$`,
	String.raw`^\/api\/v1\/platform\/persons\/[^/]+\/activity$`,
	String.raw`^\/api\/v1\/platform\/persons$`
];
