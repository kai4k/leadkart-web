/**
 * Response data is never format-checked beyond its type (Go's email.New accepts addresses
 * Zod's `.email()` rejects). Since the Go spec dropped `format: email` from its response DTOs the
 * rule is structural: the GENERATED DTOs accept them, no per-schema override. If a resync
 * reintroduces the format on a response, the first describe fails and a helper is due again.
 */
import { describe, expect, it } from 'vitest';
import { CapabilitiesDto, PersonDto, SearchPersonHit, UserDto } from '#lib/api/generated/index.ts';
import {
	capabilitiesSchema,
	loginRequestSchema,
	userDtoSchema
} from '#lib/features/auth/schemas.ts';
import { crmLeadDtoSchema } from '#lib/features/leads/schemas.ts';
import { personDtoSchema } from '#lib/features/operator/people/schemas.ts';
import { searchPersonHitSchema, searchResponseSchema } from '#lib/features/search/schemas.ts';
import {
	membershipSearchResultSchema,
	listUsersResponseSchema
} from '#lib/features/users/schemas.ts';

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const GO_ONLY_ADDRESSES = [
	'josé@example.com',
	'u@münchen.de',
	'a!b@x.com',
	'u@ex_ample.com',
	'u@x.c'
];

const user = (email: string) => ({
	membership_id: UUID(1),
	person_id: UUID(2),
	tenant_id: UUID(3),
	email,
	first_name: 'Ada',
	last_name: 'Lovelace',
	status: 'active',
	role_ids: []
});

const capsBase = {
	person_id: UUID(1),
	membership_id: UUID(2),
	tenant_id: UUID(3),
	tenant_slug: 'acme',
	is_platform: false,
	is_super_user: false,
	permissions: [],
	effective_permissions: [],
	roles: []
};
const person = {
	id: UUID(2),
	first_name: 'Ada',
	last_name: 'Lovelace',
	is_active: true,
	is_anonymised: false,
	is_globally_suspended: false,
	created_at: '2026-01-01T00:00:00Z',
	global_suspension_reason: ''
};
const hit = {
	id: UUID(2),
	first_name: 'Ada',
	last_name: 'Lovelace',
	created_at: '2026-01-01T00:00:00Z'
};

describe.each(GO_ONLY_ADDRESSES)('the generated response DTOs accept %s as they are', (email) => {
	it.each([
		['CapabilitiesDto', CapabilitiesDto, { ...capsBase, email }],
		['UserDto', UserDto, user(email)],
		['PersonDto', PersonDto, { ...person, email }],
		['SearchPersonHit', SearchPersonHit, { ...hit, email }]
	])('%s', (_name, schema, value) => {
		expect(schema.safeParse(value).success).toBe(true);
	});
});

describe.each(GO_ONLY_ADDRESSES)('response schemas accept %s', (email) => {
	it('capabilities', () => {
		const r = capabilitiesSchema.safeParse({
			person_id: UUID(1),
			membership_id: UUID(2),
			tenant_id: UUID(3),
			tenant_slug: 'acme',
			is_platform: false,
			is_super_user: false,
			permissions: [],
			effective_permissions: [],
			roles: [],
			email
		});
		expect(r.success).toBe(true);
	});
	it('user and the users list', () => {
		expect(userDtoSchema.safeParse(user(email)).success).toBe(true);
		expect(
			listUsersResponseSchema.safeParse({ users: [user(email)], has_more: false }).success
		).toBe(true);
	});
	it('person', () => {
		const r = personDtoSchema.safeParse({
			id: UUID(2),
			email,
			first_name: 'Ada',
			last_name: 'Lovelace',
			is_active: true,
			is_anonymised: false,
			is_globally_suspended: false,
			created_at: '2026-01-01T00:00:00Z'
		});
		expect(r.success).toBe(true);
	});
	it('search person hit and the search response', () => {
		const hit = {
			id: UUID(2),
			email,
			first_name: 'Ada',
			last_name: 'Lovelace',
			created_at: '2026-01-01T00:00:00Z'
		};
		expect(searchPersonHitSchema.safeParse(hit).success).toBe(true);
		expect(
			searchResponseSchema.safeParse({ persons: [hit], tenants: [], has_partial: false }).success
		).toBe(true);
	});
	it('membership search result and the CRM lead', () => {
		expect(
			membershipSearchResultSchema.safeParse({
				id: UUID(1),
				person_id: UUID(2),
				first_name: 'A',
				last_name: 'B',
				email
			}).success
		).toBe(true);
		const lead = crmLeadDtoSchema.safeParse({ email });
		expect(lead.error?.issues.filter((i) => i.path[0] === 'email')).toEqual([]);
	});
});

describe('request schemas', () => {
	it('the login form only requires a non-empty email (Go answers a malformed one like an unknown one)', () => {
		expect(loginRequestSchema.safeParse({ email: '', password: 'x' }).success).toBe(false);
		expect(loginRequestSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(
			true
		);
		expect(loginRequestSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
	});
});
