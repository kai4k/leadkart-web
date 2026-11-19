import { describe, expect, it } from 'vitest';
import { roleDtoSchema, listRolesResponseSchema } from '#lib/features/roles/schemas.ts';

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
