/**
 * Principal tier classification — derives the high-level user
 * population from the JWT claims persisted on the session.
 *
 * Per docs/reference/dotnet-BRD.md §3 + docs/adr/0036-permission-model.md,
 * the system has two populations:
 *
 *   1. Platform team — Membership in the "platform" tenant, JWT
 *      carries `is_platform: true`. SuperAdmin role additionally
 *      sets `is_super_user: true` (god-mode bypass).
 *
 *   2. Tenant users — Membership in their own tenant, `is_platform`
 *      is false. Within the tenant, CompanyOwner / OfficeAdministrator
 *      hold the `tenant.admin` meta-permission, granting admin-tier
 *      access to settings + users + roles.
 *
 * The `tier` is the FRONTEND'S router signal — which sidebar to show,
 * which dashboard variant to render, which routes to gate. It is
 * NEVER the authorization decision (the server's RLS + permission
 * middleware is). Tier is a UX hint; the server is the gate.
 */

import type { SessionPrincipal } from './types';

export type PrincipalTier =
	/** SuperAdmin in the "platform" tenant. Sees god-mode operator UI. */
	| 'platform-super'
	/** PlatformManager / LeadAgent. Cross-tenant read, no god-mode. */
	| 'platform-staff'
	/** CompanyOwner / OfficeAdministrator. Tenant admin scope. */
	| 'tenant-admin'
	/** SalesExecutive / PurchaseExecutive / DispatchExecutive / HrExecutive / general user. */
	| 'tenant-user'
	/** Not signed in. */
	| 'unknown';

/** Permission constant referenced by the tenant-admin check. Mirrors
 *  leadkart-go `permission.IdentityPermissions.Meta.TenantAdmin`. */
const PERM_TENANT_ADMIN = 'tenant.admin';

/**
 * Classifies the principal. Precedence:
 *
 *   1. No principal → 'unknown'
 *   2. is_platform=true AND is_super_user=true → 'platform-super'
 *   3. is_platform=true → 'platform-staff'
 *   4. permissions includes 'tenant.admin' OR is_super_user (the
 *      legacy SuperAdmin-seeded-into-tenant case from pre-v0.3) →
 *      'tenant-admin'
 *   5. Otherwise → 'tenant-user'
 */
export function tierOf(principal: SessionPrincipal | null): PrincipalTier {
	if (!principal) return 'unknown';
	if (principal.isPlatform) {
		return principal.isSuperUser ? 'platform-super' : 'platform-staff';
	}
	if (principal.isSuperUser) return 'tenant-admin';
	if (principal.permissions?.includes(PERM_TENANT_ADMIN)) return 'tenant-admin';
	return 'tenant-user';
}

/**
 * Permission check with the SuperUser short-circuit per ADR 0036.
 * Always returns true when `principal.isSuperUser` is set, regardless
 * of whether the permission appears in the claim list.
 *
 * Frontend usage:
 *   {#if hasPermission(session.principal, 'identity.users.create')}
 *     <Button onclick={…}>Add user</Button>
 *   {/if}
 *
 * This is a UX hint only — the server's RequirePermission middleware
 * is the actual gate. Hiding a button the user can't use is courtesy,
 * not security.
 */
export function hasPermission(principal: SessionPrincipal | null, permissionName: string): boolean {
	if (!principal) return false;
	if (principal.isSuperUser) return true;
	return principal.permissions?.includes(permissionName) ?? false;
}

/** Returns true if the principal is Platform-tier (either super or staff). */
export function isPlatformTier(principal: SessionPrincipal | null): boolean {
	const t = tierOf(principal);
	return t === 'platform-super' || t === 'platform-staff';
}

/** Returns true if the principal is tenant-admin or higher (incl. SuperUser). */
export function isTenantAdmin(principal: SessionPrincipal | null): boolean {
	const t = tierOf(principal);
	return t === 'tenant-admin' || t === 'platform-super';
}
