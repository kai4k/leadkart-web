import { describe, expect, it } from 'vitest';
import {
	createRoleRequestSchema,
	listRolesResponseSchema,
	ROLE_LEVEL_MAX,
	ROLE_LEVEL_MIN,
	roleDtoSchema
} from '#lib/features/roles/schemas.ts';

describe('roleDtoSchema', () => {
	it('parses a role', () => {
		const raw = {
			id: '00000000-0000-4000-8000-000000000001',
			tenant_id: '00000000-0000-4000-8000-000000000002',
			name: 'SalesExecutive',
			is_system_default: false,
			is_super_admin: false,
			hierarchy_level: 3,
			permissions: ['crm.leads.view'],
			created_at: '2026-01-01T00:00:00Z'
		};
		expect(roleDtoSchema.parse(raw).name).toBe('SalesExecutive');
	});
});

describe('listRolesResponseSchema', () => {
	it('parses empty roles list', () => {
		expect(listRolesResponseSchema.parse({ roles: [] }).roles).toEqual([]);
	});
});

describe('role level bounds (derived from the generated contract, not repeated in forms)', () => {
	const req = (hierarchy_level: number) => ({ name: 'Sales', hierarchy_level });
	it('the max is the contract max; custom roles start at 1 (0 is the system Owner level)', () => {
		expect(ROLE_LEVEL_MAX).toBe(99);
		expect(ROLE_LEVEL_MIN).toBe(1);
	});
	it('the contract accepts the max and rejects one above it', () => {
		expect(createRoleRequestSchema.safeParse(req(ROLE_LEVEL_MAX)).success).toBe(true);
		expect(createRoleRequestSchema.safeParse(req(ROLE_LEVEL_MAX + 1)).success).toBe(false);
	});
});
