import { describe, expect, it } from 'vitest';
import {
	mayConferPlatformManaged,
	PERMISSION_CATALOGUE,
	PLATFORM_MANAGED_ROLE,
	unchangeablePermissions
} from '#lib/features/roles/permissions-catalogue.ts';

const staff = { is_platform: true };
const impersonation = {
	is_platform: false,
	impersonation: { session_id: 's', tenant_display_name: 'Acme' }
};
const company = { is_platform: false };

describe('mayConferPlatformManaged (Go mayConferManaged: LeadKart staff, in LeadKart own tenant)', () => {
	it('is true only for a platform operator, not an impersonation session, outside a company scope', () => {
		expect(mayConferPlatformManaged(staff, false)).toBe(true);
		expect(mayConferPlatformManaged(staff, true), 'operator acting in a company').toBe(false);
		expect(
			mayConferPlatformManaged({ ...staff, impersonation: impersonation.impersonation }, false),
			'impersonation'
		).toBe(false);
		expect(mayConferPlatformManaged(impersonation, false)).toBe(false);
		expect(mayConferPlatformManaged(company, false), 'company admin').toBe(false);
		expect(mayConferPlatformManaged(null, false)).toBe(false);
	});
});

describe('unchangeablePermissions and the platform-managed names', () => {
	const reasons = { reserved: 'r', notHeld: 'n', platformManaged: 'Only LeadKart can hold this.' };

	it('refuses exactly the three names, with the new reason, even when the caller holds them', () => {
		const refused = unchangeablePermissions(() => true, reasons, false);
		expect(Object.keys(refused).sort()).toEqual([...PLATFORM_MANAGED_ROLE].sort());
		for (const n of PLATFORM_MANAGED_ROLE) expect(refused[n]).toBe(reasons.platformManaged);
		for (const n of PLATFORM_MANAGED_ROLE) {
			expect(PERMISSION_CATALOGUE.some((e) => e.name === n)).toBe(true);
		}
	});

	it('refuses nothing extra when the caller may confer them', () => {
		expect(unchangeablePermissions(() => true, reasons, true)).toEqual({});
		expect(unchangeablePermissions(() => true, reasons)).toEqual({});
	});
});
