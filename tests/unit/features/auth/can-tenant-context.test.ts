import { describe, expect, it } from 'vitest';
import { can } from '#lib/features/auth/capabilities.ts';
import { P } from '#lib/features/auth/permissions.ts';
import { persona } from '../../../support/go-personas.ts';

/** Go answers 403 to every crm / orders / inventory READ made in another tenant by a non-super operator. */
describe('can() in tenant context', () => {
	const operator = persona({ isPlatform: true, grants: [P.platformTenantsView, P.crmLeadsRead] });

	it('a non-super operator holding crm.leads.read has it at home but not inside a tenant', () => {
		expect(can(operator, P.crmLeadsRead, false)).toBe(true);
		expect(can(operator, P.crmLeadsRead, true)).toBe(false);
	});

	it('what they hold at platform level still works inside a tenant', () => {
		expect(can(operator, P.platformTenantsView, true)).toBe(true);
		expect(can(operator, P.identityTenantsView, true)).toBe(true);
	});

	it('a super user keeps the reads inside a tenant, but never the writes', () => {
		const sup = persona({ isPlatform: true, isSuperUser: true });
		expect(can(sup, P.crmLeadsRead, true)).toBe(true);
		expect(can(sup, P.crmLeadsManage, true)).toBe(false);
	});
});
