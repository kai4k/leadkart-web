import type { RoleDto } from './types';

export function isProtectedRole(role: RoleDto): boolean {
	return role.is_super_admin || role.is_system_default;
}

export function roleBadgeVariant(role: RoleDto): {
	label: string;
	variant: 'brand' | 'info' | 'warning' | 'neutral';
} {
	if (role.is_super_admin) return { label: 'SuperAdmin', variant: 'warning' };
	if (role.is_system_default) return { label: 'System', variant: 'info' };
	return { label: 'Custom', variant: 'neutral' };
}

/**
 * Returns the set of permissions held by `role` from the given
 * catalogue (used for the PermissionTree's checked-state derivation).
 */
export function rolePermissionSet(role: RoleDto): Set<string> {
	return new Set(role.permissions);
}

/**
 * Member-count helper — counts active users assigned this role.
 * (Roster passed in by the caller; pure transform.)
 */
export function roleMemberCount(
	role: RoleDto,
	roster: ReadonlyArray<{ role_ids: string[]; status: string }>
): number {
	return roster.filter((u) => u.status === 'active' && u.role_ids.includes(role.id)).length;
}
