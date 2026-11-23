/**
 * Pure transforms — UserDto / RoleDto → render-ready shapes.
 * No async, no DOM, no side effects.
 */
import type { UserDto, RoleDto, BulkStatusAction, BulkStatusResult } from './types';
import { displayName } from '#lib/utils/person-name.ts';

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

/**
 * A member's seniority as Go ranks it (`authority.RankOf`): the LOWEST level among their roles, lower = more senior.
 * `null` = not known here (a role missing from the list, or a level-0 role, which Go counts as the owner's only on
 * the Company Owner system role): an unknown rank never excludes anyone. No role at all is the least senior rank.
 */
function memberRank(user: UserDto, roles: ReadonlyArray<RoleDto>): number | null {
	let best = Number.POSITIVE_INFINITY;
	for (const id of user.role_ids) {
		const role = roles.find((r) => r.id === id);
		if (!role || role.hierarchy_level <= 0) return null;
		best = Math.min(best, role.hierarchy_level);
	}
	return best;
}

/**
 * Who may be picked as `user`'s manager: Go's `maySetManager` takes an ACTIVE member of the same tenant who is
 * STRICTLY more senior (no lateral or upward link). Offering anyone else is offering a refusal
 * (`manager_not_eligible`). When either rank is unknown the member stays in the list and Go decides.
 */
export function eligibleManagers(
	user: UserDto,
	roster: ReadonlyArray<UserDto>,
	roles: ReadonlyArray<RoleDto>
): UserDto[] {
	const own = memberRank(user, roles);
	return roster.filter((candidate) => {
		if (candidate.membership_id === user.membership_id || candidate.status !== 'active')
			return false;
		const rank = memberRank(candidate, roles);
		return own === null || rank === null || rank < own;
	});
}

/**
 * What a bulk status action sends: the selected ids that are still LOADED and whose status the action changes
 * (Deactivate: active ones; Reactivate: inactive ones). `unloaded` are selected ids no longer in the list
 * (changed from a row menu, or filtered away): the selection forgets them, nothing is sent for them.
 */
export function bulkTargets(
	action: BulkStatusAction,
	selected: ReadonlyArray<string>,
	loaded: ReadonlyArray<Pick<UserDto, 'membership_id' | 'status'>>
): { ids: string[]; unloaded: string[] } {
	const byId = new Map(loaded.map((u) => [u.membership_id, u]));
	const changes = action === 'deactivate' ? 'active' : 'inactive';
	const ids: string[] = [];
	const unloaded: string[] = [];
	for (const id of selected) {
		const u = byId.get(id);
		if (!u) unloaded.push(id);
		else if (u.status === changes) ids.push(id);
	}
	return { ids, unloaded };
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
