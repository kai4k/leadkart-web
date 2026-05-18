/**
 * Pure capability-check helpers — no SvelteKit or TanStack deps.
 * Extracted from queries.ts so unit tests can import this without
 * pulling in the toast / $app/* chain.
 *
 * hasCapability is the canonical permission-check helper.
 * The superuser
 * short-circuit mirrors ADR 0036 §4.1.
 */

import type { Capabilities } from './api';

export type { Capabilities };

/**
 * The tier field from the capabilities DTO — used by nav.ts to pick
 * the correct sidebar catalogue. Derived from capabilitiesSchema so
 * there is one canonical definition of the five values.
 */
export type PrincipalTier = Capabilities['tier'];

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
