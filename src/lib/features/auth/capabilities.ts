/**
 * Pure capability-check helpers — no SvelteKit or TanStack deps.
 * Extracted from queries.ts so unit tests can import this without
 * pulling in the toast / $app/* chain.
 *
 * hasCapability is the canonical permission-check helper.
 * The superuser short-circuit mirrors ADR 0036 §4.1.
 *
 * deriveTier synthesises the principal's tier from the backend CapabilitiesDto
 * fields (is_platform, is_super_user, permissions). The backend does NOT send
 * a `tier` field — it is a frontend-only concept used to select the sidebar
 * catalogue and the dashboard variant.
 */

import type { Capabilities } from './api';

export type { Capabilities };

/**
 * The five principal tiers the frontend distinguishes.
 * Derived client-side from CapabilitiesDto; NOT a wire field.
 */
export type PrincipalTier =
	| 'platform-super'
	| 'platform-staff'
	| 'tenant-admin'
	| 'tenant-user'
	| 'unknown';

/**
 * Derives the principal's tier from the backend CapabilitiesDto.
 * Mirrors the old `tierOf()` logic:
 *   platform + super_user → platform-super (full operator access)
 *   platform only         → platform-staff (read-only operator)
 *   super_user only       → tenant-admin   (tenant owner / super-admin role)
 *   tenant.admin perm     → tenant-admin
 *   else                  → tenant-user
 *   undefined             → unknown
 */
export function deriveTier(caps: Capabilities | undefined): PrincipalTier {
	if (!caps) return 'unknown';
	if (caps.is_platform && caps.is_super_user) return 'platform-super';
	if (caps.is_platform) return 'platform-staff';
	if (caps.is_super_user) return 'tenant-admin';
	if (caps.permissions.includes('tenant.admin')) return 'tenant-admin';
	return 'tenant-user';
}

/**
 * Returns true if the capabilities set includes the requested permission.
 * Short-circuits to true for super-users per ADR 0036.
 * Returns false when caps is undefined (query not yet resolved).
 *
 * Usage (component):
 *   const capsQuery = myCapabilitiesQuery();
 *   const canManage = $derived(hasCapability(capsQuery.data, 'platform.tenants.manage'));
 */
export function hasCapability(caps: Capabilities | undefined, permission: string): boolean {
	if (!caps) return false;
	if (caps.is_super_user) return true;
	return caps.permissions.includes(permission);
}
