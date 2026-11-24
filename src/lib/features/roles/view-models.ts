import { defineStatusMap } from '#lib/utils/status.ts';
import type { RoleDto } from './types';

export function isProtectedRole(role: RoleDto): boolean {
	return role.is_super_admin || role.is_system_default;
}

export type RoleKind = 'super_admin' | 'system' | 'custom';

export function roleKindKey(role: RoleDto): RoleKind {
	if (role.is_super_admin) return 'super_admin';
	if (role.is_system_default) return 'system';
	return 'custom';
}

export const roleKind = defineStatusMap<RoleKind>({
	super_admin: { label: 'SuperAdmin', variant: 'warning' },
	system: { label: 'System', variant: 'info' },
	custom: { label: 'Custom', variant: 'neutral' }
});

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

/**
 * The line under a refused role delete (409 `role_in_use`): how many people hold the role and the first
 * names Go sent (up to 5). `null` when Go sent no count, so the dialog says nothing it was not told.
 */
export function roleHoldersLine(
	holders: number | undefined,
	names: readonly string[]
): string | null {
	if (holders === undefined || holders <= 0) return null;
	const count = holders === 1 ? '1 person holds' : `${holders} people hold`;
	if (names.length === 0) return `${count} this role.`;
	const more = holders - names.length;
	const list = names.join(', ') + (more > 0 ? ` and ${more} more` : '');
	return `${count} this role: ${list}.`;
}
