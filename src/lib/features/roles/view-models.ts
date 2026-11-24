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

export interface RoleHoldersMessage {
	/** An en.json key (ICU: plural on `count`, and on `more` for the names). */
	key: 'reasonConfirm.deleteRole.holders' | 'reasonConfirm.deleteRole.holdersNamed';
	values: { count: number; names?: string; more?: number };
}

/**
 * The detail under a refused role delete (409 `role_in_use`): how many people hold the role and the first
 * names Go sent (up to 5), as an i18n key and its values. `null` when Go sent no count, so the dialog says
 * nothing it was not told.
 */
export function roleHoldersMessage(
	holders: number | undefined,
	names: readonly string[]
): RoleHoldersMessage | null {
	if (holders === undefined || holders <= 0) return null;
	if (names.length === 0)
		return { key: 'reasonConfirm.deleteRole.holders', values: { count: holders } };
	return {
		key: 'reasonConfirm.deleteRole.holdersNamed',
		values: { count: holders, names: names.join(', '), more: Math.max(0, holders - names.length) }
	};
}
