/**
 * The web's one authorisation rule — a pure module (no SvelteKit, no TanStack, no
 * icons) so server guards, the nav config and unit tests import it directly.
 *
 *   can(permission)  ⇔  the name is in `capabilities.effective_permissions`.
 *
 * Go computes that list per caller: it already holds everything `tenant.admin`
 * implies inside the caller's own tenant, everything a super user may do, and
 * leaves platform-reserved names out for non-operators. The web applies NO
 * implication of its own: no "tenant.admin grants identity.*", no
 * `is_super_user` shortcut, no `is_platform` shortcut, nothing derived from
 * tier or rank.
 *
 * `tier` and `rank` are presentation only (badges, wording, dashboard variant).
 *
 * One restriction, layered on top and only ever subtracting: while an operator
 * acts inside another tenant ("tenant context", the BFF sends X-Tenant-Id),
 * capabilities still describe the operator's own account, but Go refuses the
 * writes of several modules and the permission-request routes
 * (`tenant_scope_read_only` / `tenant_scope_not_supported`). `inTenantContext`
 * applies exactly that, in this one place (see `isBlockedInTenantContext`).
 */
import type { Capabilities } from './api';
import { isBlockedInTenantContext } from './permissions.ts';

export type { Capabilities };

type Caps = Capabilities | null | undefined;

/** Go's seniority band (ADR 0069). Presentation only. */
export type Tier = Capabilities['tier'];

export function can(caps: Caps, permission: string, inTenantContext = false): boolean {
	if (!caps) return false;
	if (inTenantContext && isBlockedInTenantContext(permission)) return false;
	return caps.effective_permissions.includes(permission);
}

export function canAny(
	caps: Caps,
	permissions: readonly string[],
	inTenantContext = false
): boolean {
	return permissions.some((permission) => can(caps, permission, inTenantContext));
}

/**
 * Which dashboard to render. A layout choice, not an authorisation: every action
 * and widget on the dashboards is still gated by `can`.
 */
export type DashboardVariant = 'platform' | 'tenant-admin' | 'tenant-user';
export function dashboardVariant(caps: Caps): DashboardVariant {
	if (caps?.is_platform) return 'platform';
	return caps?.tier === 'owner' || caps?.tier === 'admin' ? 'tenant-admin' : 'tenant-user';
}
