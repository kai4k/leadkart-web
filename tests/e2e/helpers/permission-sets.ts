/**
 * What Go puts in `effective_permissions` for the standard callers, so fixtures
 * send what the real API sends (the web applies no implication of its own).
 *
 * PLATFORM_RESERVED mirrors leadkart-go `permission/implication.go`
 * platformReserved: `tenant.admin` never implies these.
 */
import { P } from '../../../src/lib/features/auth/permissions.ts';
import { PERMISSION_CATALOGUE } from '../../../src/lib/features/roles/permissions-catalogue.ts';

export const PLATFORM_RESERVED: ReadonlySet<string> = new Set([
	'tenant.admin',
	P.platformTenantsView,
	P.platformTenantsCreate,
	P.platformTenantsManage,
	P.platformUsersView,
	P.platformUsersCreate,
	P.platformUsersManage,
	P.platformRolesView,
	P.platformRolesManage,
	P.platformImpersonationManage,
	'platform.unverified_contacts.manage',
	'platform.lead_credits.topup',
	P.identityTenantsSuspend,
	P.identityTenantsActivate,
	P.identityTenantsDelete,
	P.identityUsersAnonymise
]);

/** Every name in Go's catalogue: a super user's effective permissions. */
export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOGUE.map((e) => e.name);

/** A tenant.admin holder's effective permissions in its own tenant: itself plus everything it implies. */
export const TENANT_ADMIN_EFFECTIVE: string[] = [
	'tenant.admin',
	...ALL_PERMISSIONS.filter((n) => !PLATFORM_RESERVED.has(n))
];

/** An operator super user's effective permissions as the operator pages use them: the platform-reserved names. */
export const OPERATOR_EFFECTIVE: string[] = [...PLATFORM_RESERVED].filter(
	(n) => n !== 'tenant.admin'
);
