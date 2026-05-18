/**
 * Pure transforms — UserDto / RoleDto → render-ready shapes.
 * No async, no DOM, no side effects.
 */
import type { UserDto, RoleDto } from './types';
import { displayName } from '$features/auth/view-models';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function userStatusBadge(status: UserDto['status']): {
	label: string;
	variant: StatusVariant;
} {
	switch (status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
		case 'pending':
			return { label: 'Pending', variant: 'warning' };
		case 'inactive':
			return { label: 'Inactive', variant: 'neutral' };
	}
}

export function userRoleBadges(
	user: UserDto,
	catalogue: ReadonlyArray<RoleDto>
): Array<{ id: string; name: string }> {
	return user.role_ids.map((id) => {
		const found = catalogue.find((r) => r.id === id);
		return { id, name: found?.name ?? id };
	});
}

export function managerLabel(user: UserDto, roster: ReadonlyArray<UserDto>): string | null {
	if (!user.reports_to) return null;
	const mgr = roster.find((u) => u.membership_id === user.reports_to);
	return mgr ? displayName(mgr) : user.reports_to;
}

export function canDeactivate(user: UserDto): boolean {
	return user.status === 'active';
}

export function canRevokeRole(role: RoleDto): boolean {
	return !role.is_super_admin;
}
