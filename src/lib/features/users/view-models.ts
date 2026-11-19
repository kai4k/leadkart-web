/**
 * Pure transforms — UserDto / RoleDto → render-ready shapes.
 * No async, no DOM, no side effects.
 */
import type { UserDto, RoleDto, BulkStatusAction, BulkStatusResult } from './types';
import { displayName } from '#lib/utils/person-name.ts';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function userStatusBadge(status: UserDto['status']): {
	label: string;
	variant: StatusVariant;
} {
	switch (status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
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

/**
 * "3 deactivated, 1 failed: <reason of the first failure>" / "2 reactivated"; empty when nothing
 * was attempted (no toast). The reason is the shared describer's line, never Go's raw text.
 */
export function bulkSummary(action: BulkStatusAction, r: BulkStatusResult): string {
	if (r.succeeded + r.failed === 0) return '';
	const done = `${r.succeeded} ${action === 'deactivate' ? 'deactivated' : 'reactivated'}`;
	if (r.failed === 0) return done;
	const reason = r.firstFailureReason ? `: ${r.firstFailureReason}` : '';
	return `${done}, ${r.failed} failed${reason}`;
}
